/**
 * Session domain'inin tek doğruluk-kaynağı Zod şeması.
 *
 * - Type'lar Zod inference ile çıkarılır → schema değiştiğinde tüm callsite'lar
 *   compile error verir.
 * - Schema hem API route'unda (server-side) hem `localStorage` parse'ında
 *   (client-side) kullanılır.
 * - Numeric alanlar `.finite()` ile NaN/Infinity'i baştan reddeder.
 */

import { z } from 'zod';

/* ───────── Atomic ───────── */

export const sexSchema = z.enum(['male', 'female']);

export const scoreSchema = z.number().finite().min(0).max(100);

const finiteNumber = z.number().finite();

/* ───────── Identity ───────── */

export const childSchema = z.object({
  name: z.string().min(1).max(60),
  ageYears: z.number().int().min(4).max(18),
  sex: sexSchema,
  heightCm: z.number().min(80).max(220).optional(),
  weightKg: z.number().min(15).max(200).optional(),
});
export type ChildSchema = z.infer<typeof childSchema>;

/* ───────── Per-test summaries ───────── */

export const jumpSummarySchema = z.object({
  jumpHeightCm: finiteNumber.nullable(),
  /**
   * 1σ belirsizliği (cm) — fit artığından türetilir (kinematics.ts). Yalnız
   * flight-time (parabolik) yöntemde dolu; hip-displacement fallback'inde
   * belirsizlik modellenmediği için `null`. UI bunu nokta tahmin yerine
   * "32 cm (±4)" gibi bir aralık göstermek için kullanır — uydurulmuş bir
   * kesinlik yerine dürüst bir aralık.
   */
  jumpHeightSigmaCm: finiteNumber.nullable().optional(),
  jumpUnits: finiteNumber,
  flightTimeMs: finiteNumber,
  score: scoreSchema,
  /** Hangi metot ile hesaplandı (raporlamada gösteriliyor). Geriye uyum için optional. */
  method: z.enum(['flight-time', 'hip-displacement', 'consensus']).optional(),
  /**
   * Flight-time ve hip-displacement yöntemleri ±%30 içinde tutarlı mı?
   * `false` ise UI "düşük güven" rozeti gösterir.
   */
  consistent: z.boolean().optional(),
});

export const balanceSummarySchema = z.object({
  rightScore: scoreSchema,
  leftScore: scoreSchema,
  asymmetryPercent: finiteNumber.min(0).max(200),
  asymmetryWarning: z.boolean(),
  weakerSide: z.enum(['right', 'left']).nullable(),
  averageScore: scoreSchema,
});

export const reactionSummarySchema = z.object({
  averageMs: finiteNumber.min(0),
  bestMs: finiteNumber.min(0),
  consistencyScore: scoreSchema,
  ageNormScore: scoreSchema,
});

export const broadJumpSummarySchema = z.object({
  jumpDistanceCm: finiteNumber.nullable(),
  jumpUnits: finiteNumber,
  score: scoreSchema,
});

export const lateralHopsSummarySchema = z.object({
  hopCount: z.number().int().min(0),
  frequencyHz: finiteNumber.min(0),
  score: scoreSchema,
  dataQuality: z.enum(['good', 'low']),
});

export const coordinationSummarySchema = z.object({
  trackingEvents: z.number().int().min(0),
  avgErrorPx: finiteNumber.min(0),
  bestErrorPx: finiteNumber.min(0),
  avgGapMs: finiteNumber.min(0),
  score: scoreSchema,
});

export const enduranceSummarySchema = z.object({
  totalReps: z.number().int().min(0),
  decayPercent: finiteNumber.min(0).max(100),
  durationMs: finiteNumber.min(0),
  score: scoreSchema,
});

export const characterFactorsSchema = z.object({
  cooperation: scoreSchema,
  encouragement: scoreSchema,
  persistence: scoreSchema,
  fairPlay: scoreSchema,
});

export const characterFactorKeySchema = z.enum([
  'cooperation',
  'encouragement',
  'persistence',
  'fairPlay',
]);

export const characterSummarySchema = z.object({
  /** 0-100 ağırlıklı genel takım uyumu skoru (Karakter Likert anketi). */
  teamAffinity: scoreSchema,
  /** Faktör başına 0-100 alt skorlar — v2 ile eklendi. */
  factors: characterFactorsSchema.optional(),
  /** Ham ortalama (1-5 Likert ölçeği). */
  averageScore: finiteNumber.min(1).max(5),
  /** Kategori bandı — bireysel/dengeli/takım. */
  band: z.enum(['individual', 'balanced', 'team']),
  /** Kullanıcıya gösterilen özet metin. */
  summary: z.string().max(400),
  /** En güçlü / en zayıf faktör — özet için. */
  topFactor: characterFactorKeySchema.optional(),
  bottomFactor: characterFactorKeySchema.optional(),
});

/* ───────── Recommendations ───────── */

export const sportMatchSchema = z.object({
  sport: z.string().min(1).max(50),
  description: z.string().max(300),
  similarity: finiteNumber.min(0).max(1),
  // recommendSports() her zaman set eder; sıfır default ile eski payload'ları
  // kabul ediyoruz (geriye dönük uyumluluk).
  anthroBonus: finiteNumber.min(0).max(1).default(0),
  finalScore: finiteNumber.min(0).max(1).default(0),
  /**
   * Kullanıcıya gösterilen yüzde. **Anlamı değişti:** eskiden
   * `round(finalScore × 100)` idi ve istatistiksel karşılığı yoktu; artık
   * "bu sporun ilk 3'te olma olasılığı" (Monte Carlo, bkz. `decide.ts`).
   */
  confidencePercent: z.number().int().min(0).max(100),
  reason: z.string().max(300),

  // ── Olasılıksal karar alanları (yeni) ──────────────────────────────────
  // Eski kayıtlarda yok; opsiyonel bırakılıyor ki geçmiş oturumlar parse
  // edilmeye devam etsin.
  /**
   * İlk 3'te olma olasılığı (0-1). **Yokluğu anlamlıdır:** kanıt tabanı
   * olasılık iddiası için fazla inceyse (yeterli kalibre boyut ölçülmemiş)
   * bu alan boş kalır ve `confidencePercent` yalnız profil yakınlığını
   * gösterir. Tüketici bu ayrımı kullanıcıya yansıtmalı.
   */
  pTopK: finiteNumber.min(0).max(1).optional(),
  /** Birinci olma olasılığı (0-1). Aynı koşulda boş kalır. */
  pTopOne: finiteNumber.min(0).max(1).optional(),
  /**
   * Bu sporun ağırlıklı boyutlarının ne kadarı ölçülebildi (0-1).
   * Kalibresiz eksenler sporları eşit etkilemiyor; düşük kapsamlı bir öneriyi
   * yüksek kapsamlıyla aynı güvenle sunmak yanıltıcı.
   */
  weightCoverage: finiteNumber.min(0).max(1).optional(),
  /** Yüzde iddiası geri çekildiyse sebebi (kullanıcıya gösterilebilir). */
  probabilityWithheldReason: z.string().max(400).optional(),
});

/* ───────── Full session ───────── */

export const testKeySchema = z.enum([
  'jump',
  'balance',
  'reaction',
  'broadJump',
  'lateralHops',
  'coordination',
  'endurance',
  'character',
]);
export type TestKeySchema = z.infer<typeof testKeySchema>;

/** `sportProfiles.ts`'in `DimensionKey`'i ile aynı 7 değer — bkz. o dosyanın
 *  dokümanı. Burada tekrar tanımlı (import yerine): `core/` pure kalsın diye
 *  `lib/`'e bağımlılık kurmuyoruz (bkz. `testKeySchema` için aynı tercih). */
export const dimensionKeySchema = z.enum([
  'explosivePower',
  'horizontalPower',
  'balance',
  'reaction',
  'agility',
  'coordination',
  'endurance',
]);
export type DimensionKeySchema = z.infer<typeof dimensionKeySchema>;

/**
 * Test başına teknik kalitesi çarpanı (σ genişletme).
 *
 * Geçerlilik hakemi kusurlu ama geçerli bir denemeyi kabul ettiğinde ölçüm
 * **değerini değiştirmez**, belirsizliğini büyütür (bkz. `apply-verdict.ts`).
 * Bu çarpan o kararın taşıyıcısı: 1.0 = kusursuz teknik, 2.0 = belirsizlik
 * iki katına çıktı.
 *
 * Boyut başına tutuluyor çünkü her testin kendi tekniği var — sıçraması
 * kusurlu bir çocuğun denge ölçümü de aynı oranda belirsiz değildir.
 */
export const techniqueMultipliersSchema = z.object({
  jump: finiteNumber.min(1).max(3).optional(),
  broadJump: finiteNumber.min(1).max(3).optional(),
  balance: finiteNumber.min(1).max(3).optional(),
  lateralHops: finiteNumber.min(1).max(3).optional(),
  coordination: finiteNumber.min(1).max(3).optional(),
  endurance: finiteNumber.min(1).max(3).optional(),
});
export type TechniqueMultipliers = z.infer<typeof techniqueMultipliersSchema>;

export const sessionSummarySchema = z.object({
  child: childSchema,
  jump: jumpSummarySchema.optional(),
  balance: balanceSummarySchema.optional(),
  reaction: reactionSummarySchema.optional(),
  broadJump: broadJumpSummarySchema.optional(),
  lateralHops: lateralHopsSummarySchema.optional(),
  coordination: coordinationSummarySchema.optional(),
  endurance: enduranceSummarySchema.optional(),
  character: characterSummarySchema.optional(),
  recommendations: z.array(sportMatchSchema).max(20).optional(),
  /**
   * Spor eşleştirme kararına norm tablosu olmadığı için HİÇ katılamayan
   * boyutlar (bkz. `zspace.ts` EXCLUDED_DIMENSIONS — şu an sabit denge +
   * koordinasyon). Sabit kodlamak yerine oturuma yazılıyor ki norm pilotu
   * yapıldığında UI otomatik güncel kalsın. Eski kayıtlarda yok.
   */
  matchExcludedDimensions: z.array(dimensionKeySchema).max(10).optional(),
  /** Bu oturumda test yapılmadığı için karara katılamayan boyutlar. */
  matchMissingDimensions: z.array(dimensionKeySchema).max(10).optional(),
  injuryWarnings: z.array(z.string().max(300)).max(10),
  // .default([]) sayesinde tip required Array<TestKey> olur — UI'da
  // optional-chaining tekrar tekrar yazmaya gerek kalmaz.
  completedTests: z.array(testKeySchema).max(20).default([]),
  /** Hakemin verdiği teknik cezaları — eski kayıtlarda yok. */
  techniqueMultipliers: techniqueMultipliersSchema.optional(),
  startedAt: z.string().max(40),
  completedAt: z.string().max(40).optional(),
});
export type SessionSummarySchema = z.infer<typeof sessionSummarySchema>;
