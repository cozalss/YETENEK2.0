/**
 * OpenAI Vision geçerlilik hakemi — **niteliksel** protokol denetimi.
 *
 * ## Sınırları
 *
 * Bu hakem kural hakeminin yerine geçmez, üstüne biner. Kural hakemi fizik ve
 * geometriyle yakalanabilen her şeyi zaten yakalıyor (iki ayak yerde, uçuş
 * fazı yok, genlik yetersiz). Görsel hakem yalnız iskelet geometrisinden
 * çıkarılamayanı üstlenir:
 *
 *   - kol savurma (CMJ'de yükseklik şişirir)
 *   - uçuşta diz çekme (uçuş süresini uzatır, kütle merkezini yükseltmez)
 *   - kısmi hareket açıklığı
 *   - kadrajda ikinci kişi, yanlış egzersiz, kamera kayması
 *
 * ## Değişmez kural
 *
 * Şemada **birimli sayı alanı yok**. Model "38 cm sıçradı" diyemez çünkü
 * diyeceği alan yok. `strict: true` bunu API seviyesinde zorlar.
 *
 * ## Bağımlılık tercihi
 *
 * SDK yerine tek `fetch` çağrısı: Responses API basit bir HTTP isteği, SDK
 * eklemek paket ağırlığı ve sürüm sürüklenmesi getirirdi. Anahtar yoksa
 * hakem sessizce devre dışı kalır — hata değil, "değerlendirmedim" döner.
 */

import 'server-only';

import type {
  Compensation,
  JudgeRequest,
  ProtocolViolation,
  TestVerdict,
  ValidityJudge,
} from '@/core/ports/validity-judge';
import { err, ok, type Result } from '@/core/types/result';
import { getEnv } from '@/shared/config/env';
import { logger } from '@/shared/logger/logger';
import type { TestType } from '@/types';
import { selectKeyframes, skeletonDataUri } from './skeleton-render';

const log = logger.child('validity:openai');

const API_URL = 'https://api.openai.com/v1/responses';
const REQUEST_TIMEOUT_MS = 20_000;

/**
 * Model kimliği ve anahtar, Zod ile doğrulanmış env katmanından okunur —
 * `process.env`'e doğrudan dokunulmaz.
 *
 * Vision + strict structured outputs desteği modelden modele değişiyor.
 * Sabitlemek yerine `OPENAI_VISION_MODEL` ile pin'leyip kurulumdan sonra bir
 * smoke-test ile doğrulayın (docs/ARCHITECTURE-V3.md §3.6).
 */
function getModel(): string {
  return getEnv().OPENAI_VISION_MODEL;
}

function getApiKey(): string | null {
  return getEnv().OPENAI_API_KEY ?? null;
}

/**
 * Görsel hakem kullanılabilir mi?
 *
 * `false` dönmesi bir hata durumu DEĞİL: kural tabanlı hakem tek başına
 * çalışmaya devam eder ve protokol ihlallerinin çoğunu yakalar.
 */
export function isVisionJudgeConfigured(): boolean {
  return getApiKey() != null;
}

const VIOLATION_VALUES: readonly ProtocolViolation[] = [
  'both_feet_down', 'foot_touched_down', 'hand_on_support',
  'no_flight_phase', 'stepped_not_jumped', 'heel_raise_only', 'non_ballistic',
  'insufficient_amplitude', 'finger_resting', 'not_tracking', 'partial_rom',
  'out_of_frame', 'multiple_people', 'wrong_exercise', 'camera_moved',
  'insufficient_data',
];

const COMPENSATION_VALUES: readonly Compensation[] = [
  'knee_valgus', 'trunk_lean', 'asymmetric_landing', 'stiff_landing',
];

/**
 * Strict JSON şema.
 *
 * OpenAI strict modu şu kısıtları zorunlu kılıyor: tüm alanlar `required`,
 * her nesnede `additionalProperties: false`, iç içe ≤ 10 seviye. Şema bu
 * yüzden bilinçli olarak düz tutuldu.
 */
const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'performed',
    'protocolViolations',
    'techniqueScore',
    'stanceConfirmed',
    'compensations',
    'judgeConfidence',
    'notes',
  ],
  properties: {
    performed: {
      type: 'boolean',
      description: 'Çocuk istenen testi gerçekten yaptı mı?',
    },
    protocolViolations: {
      type: 'array',
      items: { type: 'string', enum: VIOLATION_VALUES },
      description: 'Gözlenen protokol ihlalleri. Yoksa boş dizi.',
    },
    techniqueScore: {
      type: 'integer',
      description:
        'Hareketin NİTEL teknik kalitesi, 0-100. Bu bir ölçüm değildir; ' +
        'santimetre, milisaniye veya persentil DEĞİLDİR.',
    },
    stanceConfirmed: {
      type: ['boolean', 'null'],
      description:
        'Denge testi için: gerçekten tek ayak üstünde miydi? ' +
        'Diğer testlerde veya değerlendirilemiyorsa null.',
    },
    compensations: {
      type: 'array',
      items: { type: 'string', enum: COMPENSATION_VALUES },
      description: 'Sakatlanma riski işaretleri.',
    },
    judgeConfidence: {
      type: 'number',
      description: 'Kendi kararına güven, 0-1.',
    },
    notes: {
      type: 'string',
      description: 'Tek cümlelik Türkçe gerekçe.',
    },
  },
} as const;

const TEST_INSTRUCTIONS: Readonly<Record<TestType, string>> = {
  jump: 'Counter-movement jump (CMJ): çocuk çömelip iki ayağıyla dikey olarak patlayıcı biçimde sıçramalı. Kol savurma, uçuşta diz çekme ve yalnızca topuk kaldırma ihlaldir.',
  broadJump: 'Standing long jump: çocuk iki ayağıyla birlikte öne doğru sıçramalı. Adım atmak veya yürümek ihlaldir.',
  balance: 'Tek bacak denge: çocuk tek ayak üstünde durmalı, tutunmamalı. İki ayağın da yerde olması, bir yere tutunmak veya havadaki ayağın yere değmesi ihlaldir.',
  lateralHops: 'Yanal sıçramalar: çocuk orta çizginin iki yanına belirgin genlikte zıplamalı. Kaydırarak adım atmak veya yerinde titremek ihlaldir.',
  endurance: 'Jumping jack: kollar tam yukarı, ayaklar tam açık. Yarım hareket açıklığı ihlaldir.',
  coordination: 'Görsel takip: parmak ekrandaki hareketli noktayı takip etmeli. Parmağı sabit tutmak ihlaldir.',
  reaction: 'Reaksiyon testi: görsel uyarana dokunma. Poz görüntüsü genellikle bilgi taşımaz.',
};

function buildPrompt(test: TestType, claim: JudgeRequest['measurementClaim']): string {
  const claimLine = claim
    ? `\nÖlçüm katmanının iddiası: ${claim.valid ? 'geçerli' : 'geçersiz'}` +
      (claim.primaryValue != null ? `, birincil değer ${claim.primaryValue} ${claim.unit}.` : '.')
    : '';

  return [
    'Sen bir çocuk spor testi hakemisin. Sana bir testin anahtar kareleri',
    'iskelet çizimi olarak veriliyor. Görevin SADECE testin protokole uygun',
    'yapılıp yapılmadığını değerlendirmek.',
    '',
    'KESİN KURAL: Hiçbir ölçüm yapma. Sıçrama yüksekliği, mesafe veya süre',
    'TAHMİN ETME. Bu sayıları başka bir katman ölçüyor. Sen yalnızca hareketin',
    'geçerli olup olmadığına ve teknik kalitesine bakıyorsun.',
    '',
    `Test: ${TEST_INSTRUCTIONS[test]}`,
    claimLine,
    '',
    'Kareler zaman sırasına göre veriliyor ve her birinin fazı etiketli.',
    'Emin olamadığın durumda judgeConfidence değerini düşük ver.',
  ].join('\n');
}

interface RawVerdict {
  performed: boolean;
  protocolViolations: string[];
  techniqueScore: number;
  stanceConfirmed: boolean | null;
  compensations: string[];
  judgeConfidence: number;
  notes: string;
}

function coerce(raw: RawVerdict): TestVerdict {
  const violations = raw.protocolViolations.filter((v): v is ProtocolViolation =>
    (VIOLATION_VALUES as readonly string[]).includes(v)
  );
  const compensations = raw.compensations.filter((c): c is Compensation =>
    (COMPENSATION_VALUES as readonly string[]).includes(c)
  );
  return {
    performed: raw.performed,
    protocolViolations: violations,
    techniqueScore: Math.max(0, Math.min(100, Math.round(raw.techniqueScore))),
    stanceConfirmed: raw.stanceConfirmed,
    compensations,
    judgeConfidence: Math.max(0, Math.min(1, raw.judgeConfidence)),
    source: 'vision',
    notes: raw.notes,
  };
}

/** Test/enjeksiyon için: HTTP katmanı dışarıdan verilebilir. */
export type FetchLike = (
  input: string,
  init: RequestInit
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export class OpenAiVisionValidityJudge implements ValidityJudge {
  constructor(private readonly fetchImpl: FetchLike = fetch as unknown as FetchLike) {}

  async judge(req: JudgeRequest): Promise<Result<TestVerdict>> {
    const apiKey = getApiKey();
    if (!apiKey) {
      return err({ code: 'config.missing', key: 'OPENAI_API_KEY' });
    }

    const keyframes = selectKeyframes(req.frames, 6);
    if (keyframes.length === 0) {
      return err({ code: 'validation.failed', issues: [{ path: ['frames'], message: 'Kare yok.' }] });
    }

    // Rıza yolu: burada iskelet render'ı kullanılıyor. Ham kare yolu açık
    // rıza altında `JudgeFrame.kind = 'photo'` ile beslenir; bu adapter her
    // iki durumda da yalnız `data:` URI görür.
    const groundY = estimateGroundY(req);
    const content: unknown[] = [
      { type: 'input_text', text: buildPrompt(req.test, req.measurementClaim) },
    ];
    for (const kf of keyframes) {
      content.push({
        type: 'input_image',
        image_url: skeletonDataUri(kf.frame, { groundY, label: kf.phase }),
      });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    req.signal?.addEventListener('abort', () => controller.abort(), { once: true });

    try {
      const res = await this.fetchImpl(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: getModel(),
          input: [{ role: 'user', content }],
          text: {
            format: {
              type: 'json_schema',
              name: 'test_verdict',
              strict: true,
              schema: VERDICT_SCHEMA,
            },
          },
          // KVKK: OpenAI tarafında saklama yok.
          store: false,
        }),
      });

      if (!res.ok) {
        log.warn('vision judge http error', { status: res.status });
        return err(
          res.status === 429
            ? { code: 'llm.rate-limit' }
            : { code: 'llm.unavailable', reason: `HTTP ${res.status}` }
        );
      }

      const body = (await res.json()) as { output_text?: string };
      const text = extractOutputText(body);
      if (!text) return err({ code: 'llm.empty-response' });

      const parsed = JSON.parse(text) as RawVerdict;
      return ok(coerce(parsed));
    } catch (cause) {
      if (cause instanceof Error && cause.name === 'AbortError') {
        return err({ code: 'llm.timeout' });
      }
      log.error('vision judge failed', {
        cause: cause instanceof Error ? cause.message : String(cause),
      });
      return err({ code: 'unexpected', cause });
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * Yer çizgisini kestirir — hakem "ayak yerde mi" sorusuna bakabilsin diye.
 * İlk karelerde en alttaki ayak bileği Y'sinin medyanı.
 */
function estimateGroundY(req: JudgeRequest): number | undefined {
  const ys: number[] = [];
  for (const f of req.frames.slice(0, 30)) {
    const l = f.landmarks[27];
    const r = f.landmarks[28];
    const candidates = [l?.y, r?.y].filter((v): v is number => v != null);
    if (candidates.length > 0) ys.push(Math.max(...candidates));
  }
  if (ys.length === 0) return undefined;
  ys.sort((a, b) => a - b);
  return ys[Math.floor(ys.length / 2)];
}

/** Responses API çıktısını iki olası şekilden de çıkarır. */
function extractOutputText(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string; type?: string }> }>;
  };
  if (typeof b.output_text === 'string' && b.output_text.length > 0) {
    return b.output_text;
  }
  const chunks: string[] = [];
  for (const item of b.output ?? []) {
    for (const c of item.content ?? []) {
      if (typeof c.text === 'string') chunks.push(c.text);
    }
  }
  const joined = chunks.join('').trim();
  return joined.length > 0 ? joined : null;
}

/** Şemayı test ve doğrulama için dışa aç. */
export { VERDICT_SCHEMA };
