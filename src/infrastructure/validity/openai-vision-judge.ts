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
import { selectKeyframes } from './skeleton-render';
// SVG değil PNG: OpenAI Vision yalnız jpeg/png/gif/webp kabul ediyor.
// Gerçek bir çağrıyla yapılan smoke-test'te yakalandı.
import { skeletonPngDataUri } from './skeleton-png';

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

/**
 * Test başına **izinli** ihlal etiketleri.
 *
 * Şema enum'u tüm testlerin ihlallerini içeriyor (strict mod tek bir enum
 * listesi istiyor). Bu, modelin sıçrama testi için `both_feet_down`
 * döndürmesini engellemiyordu. Liste iki işi birden yapıyor: prompt'ta
 * modele hangi seçeneklerin geçerli olduğunu söylüyor, ve dönüşte teste
 * uymayan etiketleri eliyor.
 */
const ALLOWED_VIOLATIONS: Readonly<Record<TestType, readonly ProtocolViolation[]>> = {
  jump: ['heel_raise_only', 'non_ballistic', 'no_flight_phase'],
  broadJump: ['no_flight_phase', 'stepped_not_jumped'],
  balance: ['both_feet_down', 'foot_touched_down', 'hand_on_support'],
  lateralHops: ['insufficient_amplitude', 'no_flight_phase'],
  endurance: ['partial_rom'],
  coordination: ['finger_resting', 'not_tracking'],
  reaction: [],
} as const;

/** Teste bağlı olmayan, her zaman geçerli ihlaller. */
const UNIVERSAL_ALLOWED: readonly ProtocolViolation[] = [
  'out_of_frame',
  'multiple_people',
  'wrong_exercise',
  'camera_moved',
  'insufficient_data',
];

/**
 * Test protokolü + hakemin **özellikle** araması gerekenler.
 *
 * Tek satırlık talimat yerine ayrıntı veriliyor çünkü görsel hakemin işi tam
 * da kural hakeminin göremediği ince ayrımlar. "Uçuşta diz çekme" gibi bir
 * ihlali modelin kendiliğinden akıl etmesini beklemek yerine ne arayacağını
 * söylemek, doğruluğu doğrudan artırıyor.
 */
const TEST_PROTOCOLS: Readonly<Record<TestType, string>> = {
  jump: `Counter-movement jump (CMJ). Dogru uygulama: cocuk dik durur, hizla comelir ve iki ayagiyla birlikte dikey olarak patlayici bicimde sicrar; eller bel hizasinda sabit kalir.
OZELLIKLE SUNLARA BAK:
- Kollar yukari savruldu mu? (yuksekligi yapay artirir)
- Ucus sirasinda dizler karina cekildi mi? Havada kalma suresini uzatir ama kutle merkezini yukseltmez - olcumu sisiren en sinsi hata.
- Yalnizca topuklar mi kalkti, govde yerinde mi kaldi?
- Iniste dizler ice kapandi mi, govde yana egildi mi, inis sert mi yapildi?`,
  broadJump: `Standing long jump. Dogru uygulama: iki ayak birlikte, one dogru tek bir sicrama; inis iki ayak ustunde ve dengeli.
OZELLIKLE SUNLARA BAK:
- Sicrama yerine adim mi atildi, yurudu mu?
- Indikten sonra dengeyi tutmak icin ek adim atildi mi?
- Iniste dizler ice kapandi mi, inis tek bacaga mi bindi?`,
  balance: `Tek bacak denge durusu. Dogru uygulama: bir ayak yerde, digeri havada; hicbir yere tutunmadan, govde dik.
OZELLIKLE SUNLARA BAK:
- Gercekten tek ayak ustunde mi, yoksa iki ayak da yerde mi?
- Havadaki ayak arada yere degdi mi?
- Duvara, sandalyeye veya kendi bacagina tutundu mu?
- Govde dengeyi tutmak icin asiri yana egiliyor mu?`,
  lateralHops: `Yanal sicramalar. Dogru uygulama: orta cizginin iki yanina, belirgin genlikte, iki ayak birlikte, ritmik sicrama.
OZELLIKLE SUNLARA BAK:
- Ayaklar gercekten yerden kesiliyor mu, yoksa kaydirarak mi gidiliyor?
- Yanal mesafe anlamli mi, yoksa yerinde titreme mi?`,
  endurance: `Jumping jack (30 saniye). Dogru uygulama: kollar bas ustunde birlesir, ayaklar omuz genisliginden fazla acilir; her tekrar tam yapilir.
OZELLIKLE SUNLARA BAK:
- Kollar tam yukari cikiyor mu, yoksa omuz hizasinda mi kaliyor?
- Ayaklar tam aciliyor mu?
- Yorulunca hareket acikligi belirgin daraliyor mu? Bu bir IHLAL degil, techniqueScore'u dusuren bir kalite sinyali.`,
  coordination: `Ekran uzerinde gorsel takip testi. Poz goruntusu genellikle bilgi tasimaz; kadrajda anormal bir durum yoksa performed=true ve yuksek techniqueScore ver.`,
  reaction: `Reaksiyon testi - dokunmatik ekran tabanli. Poz goruntusu bilgi tasimaz; kadrajda anormal bir durum yoksa performed=true ver.`,
};

function buildPrompt(test: TestType, claim: JudgeRequest['measurementClaim']): string {
  const allowed = ALLOWED_VIOLATIONS[test];
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
    `TEST: ${TEST_PROTOCOLS[test]}`,
    '',
    'Bu test için kullanabileceğin protocolViolations değerleri (başkasını KULLANMA):',
    allowed.length > 0 ? allowed.join(', ') : '(teste özgü ihlal yok)',
    `Her testte geçerli olanlar: ${UNIVERSAL_ALLOWED.join(', ')}`,
    'İhlal görmediysen boş dizi döndür — zorlama.',
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

function coerce(raw: RawVerdict, test: TestType): TestVerdict {
  // İki aşamalı filtre: önce enum'da var mı, sonra BU test için geçerli mi.
  // İkincisi olmadan model sıçrama testine `both_feet_down` yazabiliyordu ve
  // `applyVerdict` onu ölümcül sayıp geçerli bir ölçümü çöpe atardı.
  const validForTest = new Set<string>([
    ...ALLOWED_VIOLATIONS[test],
    ...UNIVERSAL_ALLOWED,
  ]);
  const violations = raw.protocolViolations.filter(
    (v): v is ProtocolViolation =>
      (VIOLATION_VALUES as readonly string[]).includes(v) && validForTest.has(v)
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
        image_url: skeletonPngDataUri(kf.frame, { groundY }),
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
        // Hata gövdesi olmadan 400 teşhis edilemez: model kimliği mi yanlış,
        // şema mı reddedildi, görüntü mü kabul edilmedi — hepsi 400.
        // OpenAI mesajı hassas veri içermiyor; kısaltılarak loglanıyor.
        const detail = await readErrorDetail(res);
        log.warn('vision judge http error', { status: res.status, detail });
        return err(
          res.status === 429
            ? { code: 'llm.rate-limit' }
            : {
                code: 'llm.unavailable',
                reason: `HTTP ${res.status}${detail ? ` — ${detail}` : ''}`,
              }
        );
      }

      const body = (await res.json()) as { output_text?: string };
      const text = extractOutputText(body);
      if (!text) return err({ code: 'llm.empty-response' });

      const parsed = JSON.parse(text) as RawVerdict;
      return ok(coerce(parsed, req.test));
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
 * Hata yanıtından okunabilir bir açıklama çıkarır.
 *
 * OpenAI hataları `{ error: { message, code, param } }` biçiminde geliyor.
 * Mesaj 300 karaktere kısaltılıyor — log'u şişirmeden teşhise yetecek kadar.
 */
async function readErrorDetail(res: {
  json: () => Promise<unknown>;
}): Promise<string | null> {
  try {
    const body = (await res.json()) as {
      error?: { message?: string; code?: string; param?: string };
    };
    const e = body?.error;
    if (!e) return null;
    const parts = [e.message, e.code, e.param].filter(Boolean);
    return parts.length > 0 ? parts.join(' | ').slice(0, 300) : null;
  } catch {
    return null;
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
