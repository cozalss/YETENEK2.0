/**
 * Sayı-topraklama kapısı — LLM metnini yayınlamadan önce doğrular.
 *
 * ## Sorun
 *
 * Rapor metni serbest metin olarak üretiliyor ve **hiçbir çıktı doğrulaması
 * yok**: model "42 cm sıçradın" yazarsa, oturumda 28 cm yazsa bile o cümle
 * veliye gider. Prompt'a "uydurma" yazmak bir dilek, kontrol değil.
 *
 * ## Çözüm
 *
 * Metindeki her sayı ve her spor adı, karar katmanının ürettiği veri kümesinde
 * bulunmak zorunda. Bulunamıyorsa metin reddedilir. Deterministik, ucuz ve
 * model-bağımsız: hangi sağlayıcıyı kullanırsak kullanalım aynı garanti.
 *
 * ## Bilinçli tolerans
 *
 * - Yuvarlama serbest: 28.4 cm için "28" de "28.4" de geçerli.
 * - Küçük tam sayılar (≤ 12) beyaz listede: "3 spor", "iki hafta", "5 dakika"
 *   gibi anlatı sayıları ölçüm iddiası değil. Eşik bilinçli olarak düşük —
 *   ölçüm değerleri (cm, ms, persentil) neredeyse her zaman bunun üstünde.
 * - Yaş serbest: çocuğun yaşı zaten girdide var.
 */

/** Metnin doğrulanacağı olgu kümesi. */
export interface NarrativeFacts {
  /** Metinde geçmesine izin verilen sayısal değerler. */
  readonly numbers: readonly number[];
  /** Metinde geçmesine izin verilen spor adları. */
  readonly sports: readonly string[];
}

export type GroundingFailure =
  | { readonly reason: 'ungrounded-number'; readonly invented: readonly number[] }
  | { readonly reason: 'ungrounded-sport'; readonly unknown: readonly string[] };

/**
 * Anlatı sayısı sayılan üst sınır. Bunun altındaki tam sayılar ("3 spor",
 * "2 kez") ölçüm iddiası değil. Ölçüm değerleri (cm, ms, %) pratikte daha
 * büyük olduğu için bu muafiyet gerçek bir halüsinasyonu kaçırmıyor.
 */
const NARRATIVE_INT_MAX = 12;

/** Yuvarlama toleransı — 28.4 için "28" kabul edilir. */
const ROUNDING_TOLERANCE = 0.51;

/** Metindeki tüm sayıları çıkarır (ondalık ayırıcı olarak hem `.` hem `,`). */
export function extractNumbers(text: string): number[] {
  const out: number[] = [];
  // Sayı: isteğe bağlı işaret, basamaklar, isteğe bağlı ondalık kısım.
  // Yüzde ve birim ekleri ayrıca yakalanmıyor — değerin kendisi yeterli.
  const re = /-?\d+(?:[.,]\d+)?/g;
  for (const m of text.matchAll(re)) {
    const normalized = m[0].replace(',', '.');
    const v = Number.parseFloat(normalized);
    if (Number.isFinite(v)) out.push(v);
  }
  return out;
}

function isGrounded(value: number, allowed: readonly number[]): boolean {
  // Anlatı sayısı muafiyeti.
  if (Number.isInteger(value) && Math.abs(value) <= NARRATIVE_INT_MAX) {
    return true;
  }
  return allowed.some((a) => Math.abs(a - value) < ROUNDING_TOLERANCE);
}

/**
 * Metni olgu kümesine karşı doğrular.
 *
 * @returns `null` → metin temiz; aksi hâlde ihlal.
 */
export function checkGrounding(
  text: string,
  facts: NarrativeFacts
): GroundingFailure | null {
  const claimed = extractNumbers(text);
  const invented = claimed.filter((n) => !isGrounded(n, facts.numbers));
  if (invented.length > 0) {
    return { reason: 'ungrounded-number', invented: [...new Set(invented)] };
  }

  const lower = text.toLocaleLowerCase('tr-TR');
  const known = facts.sports.map((s) => s.toLocaleLowerCase('tr-TR'));
  // Yalnız bilinen spor listesindeki adları arıyoruz; metinde geçen ama
  // listede olmayan bir spor adını genel olarak tespit etmek sözlük
  // gerektirir. Bunun yerine ters kontrol: bilinen 12 sporun dışında kalan
  // spor adları `SPORT_VOCABULARY` ile sınırlı biçimde denetleniyor.
  const unknown = SPORT_VOCABULARY.filter(
    (s) => !known.includes(s.toLocaleLowerCase('tr-TR')) &&
      lower.includes(s.toLocaleLowerCase('tr-TR'))
  );
  if (unknown.length > 0) {
    return { reason: 'ungrounded-sport', unknown };
  }

  return null;
}

/**
 * Sistemin tanıdığı ama **önerilmemiş** olabilecek spor adları.
 *
 * Model "sana hentbol öneriyorum" derse yakalanmalı — hentbol profil
 * listesinde yok. Liste bilinçli olarak dar: amaç her spor adını yasaklamak
 * değil, karar katmanının üretmediği bir öneriyi metnin uydurmasını
 * engellemek.
 */
export const SPORT_VOCABULARY: readonly string[] = [
  'Voleybol', 'Basketbol', 'Tenis', 'Yüzme', 'Futbol', 'Atletizm',
  'Cimnastik', 'Jimnastik', 'Judo', 'Taekwondo', 'Boks', 'Masa Tenisi',
  'Badminton', 'Hentbol', 'Güreş', 'Halter', 'Okçuluk', 'Eskrim',
  'Binicilik', 'Kayak', 'Buz Pateni', 'Ragbi', 'Hokey', 'Kürek',
];

/**
 * Karar çıktısından olgu kümesi kurar.
 *
 * Metnin kullanmasına izin verilen tüm sayılar burada toplanır: ölçüm
 * değerleri, persentiller, olasılıklar ve bunların yuvarlanmış hâlleri.
 */
export function factsFromSession(session: {
  child?: { ageYears?: number; heightCm?: number | null; weightKg?: number | null };
  jump?: {
    jumpHeightCm?: number | null;
    jumpHeightSigmaCm?: number | null;
    score?: number;
  } | null;
  broadJump?: { jumpDistanceCm?: number | null; score?: number } | null;
  balance?: { averageScore?: number; asymmetryPercent?: number } | null;
  reaction?: { averageMs?: number; bestMs?: number; ageNormScore?: number } | null;
  lateralHops?: { hopCount?: number; score?: number } | null;
  coordination?: { score?: number } | null;
  endurance?: { totalReps?: number; score?: number } | null;
  recommendations?: readonly { sport: string; confidencePercent: number }[] | null;
}): NarrativeFacts {
  const numbers: number[] = [];
  const push = (v: number | null | undefined) => {
    if (v == null || !Number.isFinite(v)) return;
    numbers.push(v);
    numbers.push(Math.round(v));
  };

  push(session.child?.ageYears);
  push(session.child?.heightCm);
  push(session.child?.weightKg);
  push(session.jump?.jumpHeightCm);
  push(session.jump?.score);
  // Nokta tahmin yerine aralık: σ varsa alt/üst sınırlar da olgu kümesine
  // giriyor. Bu sayede metin "28-36 cm" diyebiliyor — tek bir ondalıklı
  // sayı yerine, gerçekten hesaplanmış bir belirsizliği yansıtarak.
  if (session.jump?.jumpHeightCm != null && session.jump?.jumpHeightSigmaCm != null) {
    const margin = Math.max(1, Math.round(session.jump.jumpHeightSigmaCm));
    push(Math.round(session.jump.jumpHeightCm) - margin);
    push(Math.round(session.jump.jumpHeightCm) + margin);
  }
  push(session.broadJump?.jumpDistanceCm);
  push(session.broadJump?.score);
  push(session.balance?.averageScore);
  push(session.balance?.asymmetryPercent);
  push(session.reaction?.averageMs);
  push(session.reaction?.bestMs);
  push(session.reaction?.ageNormScore);
  push(session.lateralHops?.hopCount);
  push(session.lateralHops?.score);
  push(session.coordination?.score);
  push(session.endurance?.totalReps);
  push(session.endurance?.score);

  const sports: string[] = [];
  for (const r of session.recommendations ?? []) {
    sports.push(r.sport);
    push(r.confidencePercent);
  }

  return { numbers: [...new Set(numbers)], sports };
}

/** İhlali insan-okunur bir sebebe çevirir (loglama için). */
export function describeGroundingFailure(f: GroundingFailure): string {
  return f.reason === 'ungrounded-number'
    ? `Metin veride bulunmayan sayı içeriyor: ${f.invented.join(', ')}`
    : `Metin önerilmemiş spor adı içeriyor: ${f.unknown.join(', ')}`;
}
