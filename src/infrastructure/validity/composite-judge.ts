/**
 * Bileşik hakem — kural tabanlı taban + görsel üst katman.
 *
 * ## Birleştirme kuralı: ihlaller BİRLEŞİR, güven ZAYIF HALKAYI izler
 *
 * İki hakem aynı soruya farklı yollardan bakıyor. Bir ihlali *biri* gördüyse
 * ihlal vardır — çünkü ikisi de yanlış pozitif üretmeye değil, kaçamağı
 * yakalamaya ayarlı. Bu, güvenlik sistemlerinin standart "fail-closed"
 * davranışı: şüphede reddet, çocuktan tekrar iste. Bir denemeyi boşuna
 * tekrarlatmanın maliyeti, yapılmamış bir testi ölçmüş gibi raporlamanın
 * maliyetinden çok düşük.
 *
 * ## Görsel hakem yoksa
 *
 * Anahtar yoksa, ağ yoksa, kota dolduysa veya zaman aşımı olursa sistem
 * **kural hakemiyle çalışmaya devam eder**. Görsel katman bir bağımlılık
 * değil, bir iyileştirmedir. Bu, tek sağlayıcıya kilitlenmemenin somut hâli.
 */

import 'server-only';

import type {
  JudgeRequest,
  ProtocolViolation,
  TestVerdict,
  ValidityJudge,
} from '@/core/ports/validity-judge';
import { ok, type Result } from '@/core/types/result';
import { logger } from '@/shared/logger/logger';
import { RuleBasedValidityJudge } from './rule-based-judge';
import {
  OpenAiVisionValidityJudge,
  isVisionJudgeConfigured,
} from './openai-vision-judge';

const log = logger.child('validity:composite');

/**
 * Görsel hakemin çağrılmasının atlanabileceği eşik.
 *
 * Kural hakemi zaten yüksek güvenle karar verdiyse (örneğin iki ayak da açıkça
 * yerdeyse) görsel çağrı bilgi eklemez, yalnız maliyet ve gecikme ekler.
 */
const SKIP_VISION_ABOVE_CONFIDENCE = 0.88;

function mergeViolations(
  a: readonly ProtocolViolation[],
  b: readonly ProtocolViolation[]
): ProtocolViolation[] {
  return [...new Set([...a, ...b])];
}

export class CompositeValidityJudge implements ValidityJudge {
  constructor(
    private readonly rules: ValidityJudge = new RuleBasedValidityJudge(),
    private readonly vision: ValidityJudge = new OpenAiVisionValidityJudge(),
    private readonly visionEnabled: () => boolean = isVisionJudgeConfigured
  ) {}

  async judge(req: JudgeRequest): Promise<Result<TestVerdict>> {
    const ruleResult = await this.rules.judge(req);
    // Kural hakemi tasarımı gereği hata döndürmez; yine de sözleşmeye saygı.
    const ruleVerdict = ruleResult.ok ? ruleResult.value : null;

    const ruleIsDecisive =
      ruleVerdict != null &&
      !ruleVerdict.performed &&
      ruleVerdict.judgeConfidence >= SKIP_VISION_ABOVE_CONFIDENCE;

    if (ruleIsDecisive) {
      // Kaçamak zaten kesin olarak yakalandı — görsel çağrıya gerek yok.
      return ok({ ...ruleVerdict, source: 'composite' });
    }

    if (!this.visionEnabled()) {
      return ok(
        ruleVerdict ?? {
          performed: true,
          protocolViolations: [],
          techniqueScore: 100,
          stanceConfirmed: null,
          compensations: [],
          judgeConfidence: 0,
          source: 'composite',
          notes: 'Hiçbir hakem değerlendirme yapamadı.',
        }
      );
    }

    const visionResult = await this.vision.judge(req);
    if (!visionResult.ok) {
      // Görsel hakem düştü → kural hakemiyle devam. Sistem çalışmaya devam
      // eder, yalnız niteliksel denetim eksik kalır ve bu izlenebilir olur.
      log.warn('vision judge unavailable, falling back to rules', {
        code: visionResult.error.code,
      });
      return ok(
        ruleVerdict
          ? { ...ruleVerdict, source: 'composite', notes: appendNote(ruleVerdict.notes, 'Görsel denetim yapılamadı.') }
          : {
              performed: true,
              protocolViolations: [],
              techniqueScore: 100,
              stanceConfirmed: null,
              compensations: [],
              judgeConfidence: 0,
              source: 'composite',
              notes: 'Görsel denetim yapılamadı, kural denetimi kapsam dışı.',
            }
      );
    }

    const v = visionResult.value;
    if (ruleVerdict == null) return ok({ ...v, source: 'composite' });

    return ok({
      // Fail-closed: biri "yapılmadı" diyorsa yapılmamıştır.
      performed: ruleVerdict.performed && v.performed,
      protocolViolations: mergeViolations(ruleVerdict.protocolViolations, v.protocolViolations),
      // Teknik skorda daha kötümser olanı al.
      techniqueScore: Math.min(ruleVerdict.techniqueScore, v.techniqueScore),
      // Duruş: kural hakemi geometriyle bakıyor, önceliği onda; o
      // değerlendiremediyse görsel hakemin kararı geçerli.
      stanceConfirmed: ruleVerdict.stanceConfirmed ?? v.stanceConfirmed,
      compensations: v.compensations,
      judgeConfidence: Math.max(ruleVerdict.judgeConfidence, v.judgeConfidence),
      source: 'composite',
      notes: appendNote(ruleVerdict.notes, v.notes),
    });
  }
}

function appendNote(a: string | undefined, b: string | undefined): string | undefined {
  const parts = [a, b].filter((s): s is string => !!s && s.length > 0);
  return parts.length > 0 ? parts.join(' ') : undefined;
}

export const compositeValidityJudge = new CompositeValidityJudge();
