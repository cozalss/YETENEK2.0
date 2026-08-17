'use client';

/**
 * Geçerlilik kapısı hook'u — poz karesi toplar, hakeme sorar, kararı uygular.
 *
 * ## İki aşamalı
 *
 *   1. **Kural hakemi (cihazda).** Ücretsiz, çevrimdışı, anında. Fizik ve
 *      geometriyle yakalanabilen her şeyi üstlenir: iki ayak üstünde denge,
 *      uçuş fazı olmayan sıçrama, genliksiz hop. Kesin bir ihlal bulursa
 *      orada durur — ağa hiç çıkmaz, çocuk anında geri bildirim alır.
 *
 *   2. **Görsel hakem (sunucu, rıza gerektirir).** Yalnız kural hakeminin
 *      göremediği niteliksel sorunlar için: kol savurma, uçuşta diz çekme,
 *      kısmi hareket açıklığı. Rıza yoksa, ağ yoksa, anahtar yoksa veya
 *      servis düşerse **atlanır** — sistem kural kararıyla çalışmaya devam
 *      eder.
 *
 * ## Veri minimizasyonu
 *
 * Ağa giden şey yakalamanın tamamı değil, `selectKeyframes` ile seçilmiş en
 * fazla 8 karenin landmark koordinatları. Ham görüntü hiçbir zaman cihazdan
 * çıkmaz; iskelet çizimi sunucuda yapılır.
 */

import { useCallback, useRef, useState } from 'react';
import {
  applyVerdict,
  type RejectedMeasurement,
} from '@/core/use-cases/apply-verdict';
import type {
  MeasurementClaim,
  ProtocolViolation,
  TestVerdict,
} from '@/core/ports/validity-judge';
import { mergeVerdicts } from '@/core/use-cases/merge-verdicts';
import { ruleBasedValidityJudge } from '@/infrastructure/validity/rule-based-judge';
import { selectKeyframes } from '@/infrastructure/validity/skeleton-render';
import { isVisionConsentGranted } from '@/lib/consent/visionConsent';
import { logger } from '@/shared/logger/logger';
import type { PoseFrame, TestType } from '@/types';

const log = logger.child('validity-gate');

/** Üst sınır — patolojik uzun yakalamada bellek şişmesin. */
const MAX_RETAINED_FRAMES = 600;

/**
 * Görsel denetim için ağ zaman aşımı. Aşılırsa kural kararıyla devam.
 *
 * Ölçülen gerçek gecikme: 8 kare / CMJ için **~10 saniye**. 12 s'lik ilk
 * değer bu ölçümün hemen üstündeydi — sıradan bir yavaşlama zaman aşımına
 * düşürürdü. Route'un `maxDuration` sınırı 30 s olduğu için 25 s güvenli üst
 * sınır: sunucu zaten kesecek, istemci ondan önce pes etmemeli.
 */
const VISION_TIMEOUT_MS = 25_000;

/**
 * Kural hakemi bu güvenin üstünde reddettiyse görsel çağrı yapılmaz.
 * Kaçamak zaten kesin olarak yakalandı; ağ çağrısı bilgi eklemez.
 */
const SKIP_VISION_ABOVE_CONFIDENCE = 0.88;

export interface UseValidityGateOptions {
  readonly test: TestType;
  /** Kaç karede bir saklansın. 2 = yarısı. */
  readonly sampleEvery?: number;
}

export interface GateOutcome {
  /** Ölçüme devam edilebilir mi. */
  readonly allowed: boolean;
  /**
   * Görsel hakemin gördüğü sakatlanma riski uyarıları (Türkçe metin).
   * Ölçüm sayısından bağımsız bir çıktı — kabul edilen bir denemede bile
   * dolu olabilir.
   */
  readonly injuryWarnings: readonly string[];
  /**
   * Teknik cezası çarpanı (≥1). Değeri **dönüş değerinden** okuyun, state
   * alanından değil: `setState` senkron değil, `await evaluate()` sonrası
   * `gate.sigmaMultiplier` hâlâ önceki render'ın değerini taşır. State alanı
   * yalnız render'da göstermek için var.
   */
  readonly sigmaMultiplier: number;
}

export interface ValidityGate {
  readonly collect: (frame: PoseFrame | null) => void;
  /**
   * Analizden **önce** çağrılır. `allowed: false` → deneme reddedildi,
   * `rejection` dolu.
   */
  readonly evaluate: (claim?: MeasurementClaim) => Promise<GateOutcome>;
  readonly rejection: RejectedMeasurement | null;
  readonly reset: () => void;
  /**
   * Son değerlendirmenin σ çarpanı — **yalnız gösterim için**. Karar akışında
   * `evaluate()`'in dönüşünü kullanın (bkz. `GateOutcome`).
   */
  readonly sigmaMultiplier: number;
  /** Görsel denetim bu denemede gerçekten çalıştı mı — izlenebilirlik. */
  readonly visionApplied: boolean;
}

/** Sunucudan dönen kararı port tipine çevirir. */
function toVerdict(raw: unknown): TestVerdict | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.performed !== 'boolean') return null;
  return {
    performed: r.performed,
    protocolViolations: Array.isArray(r.protocolViolations)
      ? (r.protocolViolations as ProtocolViolation[])
      : [],
    techniqueScore:
      typeof r.techniqueScore === 'number' ? r.techniqueScore : 100,
    stanceConfirmed:
      typeof r.stanceConfirmed === 'boolean' ? r.stanceConfirmed : null,
    compensations: Array.isArray(r.compensations)
      ? (r.compensations as TestVerdict['compensations'])
      : [],
    judgeConfidence:
      typeof r.judgeConfidence === 'number' ? r.judgeConfidence : 0.5,
    source: 'composite',
    notes: typeof r.notes === 'string' ? r.notes : undefined,
  };
}

export function useValidityGate(opts: UseValidityGateOptions): ValidityGate {
  const { test, sampleEvery = 2 } = opts;
  // sampleEvery=0 `% 0` → NaN yapar, hiçbir kare saklanmaz ve kapı sessizce
  // atlanır. Tek bir hatalı prop geçerlilik denetimini devre dışı bırakmasın.
  const stride = Math.max(1, Math.floor(sampleEvery));

  const framesRef = useRef<PoseFrame[]>([]);
  const parityRef = useRef(0);
  const [rejection, setRejection] = useState<RejectedMeasurement | null>(null);
  // σ çarpanı ref değil state: tüketici bunu ölçüm sonucuyla birlikte
  // aktarıyor, yani render'ı ilgilendiriyor.
  const [sigmaMultiplier, setSigmaMultiplier] = useState(1);
  const [visionApplied, setVisionApplied] = useState(false);

  const collect = useCallback(
    (frame: PoseFrame | null) => {
      if (!frame) return;
      parityRef.current++;
      if (parityRef.current % stride !== 0) return;
      if (framesRef.current.length >= MAX_RETAINED_FRAMES) return;
      framesRef.current.push(frame);
    },
    [stride]
  );

  const reset = useCallback(() => {
    framesRef.current = [];
    parityRef.current = 0;
    setSigmaMultiplier(1);
    setVisionApplied(false);
    setRejection(null);
  }, []);

  const evaluate = useCallback(async (claim?: MeasurementClaim) => {
    // --- Aşama 1: kural hakemi, cihazda ---------------------------------
    const judged = await ruleBasedValidityJudge.judge({
      test,
      frames: framesRef.current,
    });

    // Hakem karar veremediyse ölçümü bloklamıyoruz: "değerlendiremedim" ile
    // "geçersiz" farklı şeyler.
    let verdict: TestVerdict | null = judged.ok ? judged.value : null;

    const ruleIsDecisive =
      verdict != null &&
      !verdict.performed &&
      verdict.judgeConfidence >= SKIP_VISION_ABOVE_CONFIDENCE;

    // --- Aşama 2: görsel hakem, rıza varsa -------------------------------
    if (!ruleIsDecisive && isVisionConsentGranted()) {
      const refined = await requestVisionVerdict(
        test,
        framesRef.current,
        claim
      );
      if (refined) {
        setVisionApplied(true);
        verdict = verdict ? mergeVerdicts(verdict, refined) : refined;
      }
    }

    if (verdict == null) {
      setRejection(null);
      setSigmaMultiplier(1);
      return { allowed: true, sigmaMultiplier: 1, injuryWarnings: [] };
    }

    const gated = applyVerdict(test, verdict);
    if (!gated.ok) {
      setRejection(gated.error);
      return { allowed: false, sigmaMultiplier: 1, injuryWarnings: [] };
    }

    const multiplier = gated.value.sigmaMultiplier;
    setRejection(null);
    setSigmaMultiplier(multiplier);
    return {
      allowed: true,
      sigmaMultiplier: multiplier,
      injuryWarnings: gated.value.injuryWarnings,
    };
  }, [test]);

  return {
    collect,
    evaluate,
    rejection,
    reset,
    sigmaMultiplier,
    visionApplied,
  };
}

/**
 * Görsel kararı ister. Başarısız olursa `null` döner ve çağıran kural
 * kararıyla devam eder — görsel katman hiçbir koşulda ölçümü bloklamaz.
 */
async function requestVisionVerdict(
  test: TestType,
  frames: readonly PoseFrame[],
  /**
   * Ölçüm katmanının iddiası. Hakem bunu **kullanmaz**, doğrular: "sen 38 cm
   * diyorsun, gördüğüm hareket buna uyuyor mu?" Birim taşıyan tek yapı budur
   * ve hakeme GİRER, hakemden çıkmaz.
   */
  claim?: MeasurementClaim
): Promise<TestVerdict | null> {
  if (frames.length === 0) return null;

  // Veri minimizasyonu: yakalamanın tamamı değil, karakteristik anlar.
  const keyframes = selectKeyframes(frames, 6).map((k) => ({
    timestamp: k.frame.timestamp,
    landmarks: k.frame.landmarks.map((l) => ({
      x: l.x,
      y: l.y,
      visibility: l.visibility,
    })),
  }));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VISION_TIMEOUT_MS);

  try {
    const res = await fetch('/api/validity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        test,
        frames: keyframes,
        measurementClaim: claim,
      }),
    });

    if (!res.ok) {
      // 503 = anahtar yok / servis düştü. Beklenen bir durum, hata değil.
      log.info('görsel denetim atlandı', { status: res.status });
      return null;
    }
    return toVerdict(await res.json());
  } catch (cause) {
    log.info('görsel denetim ulaşılamadı', {
      cause: cause instanceof Error ? cause.name : String(cause),
    });
    return null;
  } finally {
    clearTimeout(timer);
  }
}
