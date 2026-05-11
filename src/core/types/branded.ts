/**
 * Branded (nominal) types — yapısal eşleşen ama anlamsal olarak farklı
 * primitif değerler birbiriyle karışmasın diye derleme-zamanı işaretler.
 *
 * Örnek: `SessionId` ve `BadgeId` ikisi de string ama getSession(badgeId)
 * yapamayasın diye Branded tag'i farklı.
 *
 * Runtime maliyeti yok — sadece TypeScript tipi. JavaScript'te düz string.
 */

declare const __brand: unique symbol;
type Brand<K, T> = K & { readonly [__brand]: T };

/* ───────── Identity types ───────── */

export type SessionId = Brand<string, 'SessionId'>;
export type HistoryEntryId = Brand<string, 'HistoryEntryId'>;
export type BadgeId = Brand<string, 'BadgeId'>;
export type SportSlug = Brand<string, 'SportSlug'>;
/** Supabase auth user id (Supabase UUID). */
export type UserId = Brand<string, 'UserId'>;
/** Veli'nin eklediği çocuk profili id'si. */
export type ChildId = Brand<string, 'ChildId'>;

/* ───────── Numeric value objects ───────── */

/** 0-100 normalize skor. */
export type Score = Brand<number, 'Score'>;
/** 0-1 normalize oran. */
export type UnitInterval = Brand<number, 'UnitInterval'>;
/** 4-18 yaş aralığı. */
export type AgeYears = Brand<number, 'AgeYears'>;
/** Persentil 0-100. */
export type Percentile = Brand<number, 'Percentile'>;
/** Santimetre. */
export type Cm = Brand<number, 'Cm'>;
/** Milisaniye. */
export type Ms = Brand<number, 'Ms'>;

/* ───────── Smart constructors ───────── */
/* Yalnızca buradan inşa edilebilir, dolayısıyla invariant garantisi var. */

export function makeSessionId(raw: string): SessionId {
  return raw as SessionId;
}

export function makeHistoryEntryId(raw: string): HistoryEntryId {
  return raw as HistoryEntryId;
}

export function makeBadgeId(raw: string): BadgeId {
  return raw as BadgeId;
}

export function makeSportSlug(raw: string): SportSlug {
  return raw.toLocaleLowerCase('tr-TR') as SportSlug;
}

export function makeUserId(raw: string): UserId {
  return raw as UserId;
}

export function makeChildId(raw: string): ChildId {
  return raw as ChildId;
}

export function generateChildId(): ChildId {
  return `c_${Date.now()}_${randomSuffix()}` as ChildId;
}

export function makeScore(raw: number): Score {
  return Math.max(0, Math.min(100, raw)) as Score;
}

export function makeUnitInterval(raw: number): UnitInterval {
  return Math.max(0, Math.min(1, raw)) as UnitInterval;
}

export function makeAgeYears(raw: number): AgeYears | null {
  const v = Math.round(raw);
  if (v < 4 || v > 18) return null;
  return v as AgeYears;
}

export function makePercentile(raw: number): Percentile {
  return Math.max(0, Math.min(100, Math.round(raw))) as Percentile;
}

export function makeCm(raw: number): Cm {
  return raw as Cm;
}

export function makeMs(raw: number): Ms {
  return raw as Ms;
}

/* ───────── Random ID generator (stable across SSR/CSR) ───────── */

export function generateSessionId(): SessionId {
  return `s_${Date.now()}_${randomSuffix()}` as SessionId;
}

export function generateHistoryEntryId(): HistoryEntryId {
  return `h_${Date.now()}_${randomSuffix()}` as HistoryEntryId;
}

function randomSuffix(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}
