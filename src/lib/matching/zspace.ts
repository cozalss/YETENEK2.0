/**
 * z-uzayı birleştirmesi — spor eşleştirmesinin ölçek sorununu çözer.
 *
 * ## Neden gerekliydi
 *
 * Eski eşleştirme 7 boyut arasında `√Σw(c−p)²` hesaplıyordu. Ama boyutlar aynı
 * ölçekte değildi:
 *
 *   - jump / broadJump / lateralHops → z-persentil [1,99]
 *   - reaction / endurance           → doğrusal oran (norm → 50)
 *   - balance                        → sabit eşik `(1 − sway/0.05)`
 *   - coordination                   → `100 − (err−1.5)×7.4`
 *
 * Farklı ölçekli eksenler arasında Öklid mesafesi tanımsızdır: bir boyutta
 * "10 puan" ile diğerinde "10 puan" aynı şeyi ifade etmez, dolayısıyla
 * kareleri toplamak anlamsız bir sayı üretir. Sıralama bu sayıya dayanıyordu.
 *
 * ## Çözüm
 *
 * Her eksen **yaşa ve cinsiyete göre z-skoruna** çevrilir. z ortak ölçektir:
 * "popülasyon ortalamasından kaç standart sapma". Ancak bu ancak norm tablosu
 * hem ortalama hem **yayılım** veriyorsa yapılabilir — ve tablolarımızın hepsi
 * vermiyor. Bu yüzden üç kademeli bir kayıt tutuluyor:
 *
 *   `calibrated`   — ortalama + SD yayınlanmış (jump, broadJump, lateralHops)
 *   `partial`      — ortalama yayınlanmış, SD literatür CV'sinden tahmin
 *                    (reaction, endurance) → belirsizliği şişirilir
 *   `uncalibrated` — norm yok (balance, coordination) → **mesafeden çıkarılır**
 *
 * Kalibre edilmemiş bir ekseni mesafeye sokmayı reddediyoruz. Çıkarılan eksen
 * kullanıcıya açıkça bildirilir; sahte kesinlik yerine şeffaf eksiklik.
 */

import {
  DIMENSION_KEYS,
  type DimensionKey,
  type SportVector,
} from './sportProfiles';
import { percentileToZ } from '@/lib/stats/probit';

export type NormConfidence = 'calibrated' | 'partial' | 'uncalibrated';

export interface DimensionNorm {
  readonly confidence: NormConfidence;
  /**
   * Norm yayılımının kendi belirsizliği (bağıl). SD yayınlanmışsa 0;
   * tahmin edilmişse tahminin bağıl hatası. z belirsizliğine `× |z|` ile
   * katkı verir — yani ortalamaya yakın çocukta küçük, uçlarda büyük.
   */
  readonly spreadRelativeError: number;
  /** Ölçüm gürültüsünün z ölçeğindeki taban katkısı. */
  readonly baseSigmaZ: number;
  readonly source: string;
}

/**
 * Boyut başına norm kalitesi. Bu tablo mimarinin dürüstlük omurgası:
 * hangi eksenin ne kadar gerçek olduğu tek yerde ve açıkça yazılı.
 */
export const DIMENSION_NORMS: Readonly<Record<DimensionKey, DimensionNorm>> = {
  explosivePower: {
    confidence: 'calibrated',
    spreadRelativeError: 0,
    baseSigmaZ: 0.12,
    source: 'Tomkinson 2018 (Br J Sports Med 52:1445) — ortalama + SD',
  },
  horizontalPower: {
    confidence: 'calibrated',
    spreadRelativeError: 0,
    baseSigmaZ: 0.15,
    source: 'Castro-Piñero 2010 / Thomas 2020 — ortalama + SD',
  },
  agility: {
    confidence: 'calibrated',
    spreadRelativeError: 0,
    baseSigmaZ: 0.18,
    source: 'Larsen 2022 pediatric lateral hop — ortalama + SD',
  },
  reaction: {
    confidence: 'partial',
    // SD yayınlanmamış; CV 0.18 tahmini ±%30 belirsizlikle taşınıyor.
    spreadRelativeError: 0.3,
    baseSigmaZ: 0.25,
    source: 'Norm ortalaması yayınlanmış; SD Dykiert 2012 CV≈0.18 tahmini',
  },
  endurance: {
    confidence: 'partial',
    spreadRelativeError: 0.3,
    baseSigmaZ: 0.25,
    source: 'Norm research-grade (burpee ölçekleme); SD CV≈0.20 tahmini',
  },
  balance: {
    confidence: 'uncalibrated',
    spreadRelativeError: 0,
    baseSigmaZ: 0,
    source: 'Yaş/cinsiyet norm tablosu YOK — pilot gerekiyor',
  },
  coordination: {
    confidence: 'uncalibrated',
    spreadRelativeError: 0,
    baseSigmaZ: 0,
    source: 'Yaş/cinsiyet norm tablosu YOK — pilot gerekiyor',
  },
} as const;

/** Mesafe metriğine girmesine izin verilen boyutlar. */
export const SCORED_DIMENSIONS: readonly DimensionKey[] = DIMENSION_KEYS.filter(
  (d) => DIMENSION_NORMS[d].confidence !== 'uncalibrated'
);

/** Norm eksikliği yüzünden dışarıda bırakılan boyutlar. */
export const EXCLUDED_DIMENSIONS: readonly DimensionKey[] =
  DIMENSION_KEYS.filter((d) => DIMENSION_NORMS[d].confidence === 'uncalibrated');

/**
 * Spor profili değeri (0-1) → hedef z.
 *
 * Profil değerleri literatürde "bu sporun elit sporcusu bu boyutta nerede
 * durur" anlamında; yani örtük olarak bir **persentil** ifade ediyorlar
 * (voleybol explosivePower 0.95 = patlayıcı gücün 95. persentili). Bu okuma
 * altında hedef z doğrudan Φ⁻¹(p) olur ve profil tablosunu yeniden yazmak
 * gerekmez.
 */
export function profileValueToZ(value: number): number {
  return percentileToZ(Math.max(0, Math.min(1, value)) * 100);
}

export interface ZProfile {
  /** Boyut → z. Ölçülemeyen boyut anahtarı hiç bulunmaz. */
  readonly z: Readonly<Partial<Record<DimensionKey, number>>>;
  /** Boyut → z belirsizliği (1σ). */
  readonly sigma: Readonly<Partial<Record<DimensionKey, number>>>;
  /** Norm olmadığı için dışarıda bırakılanlar. */
  readonly excludedByNorm: readonly DimensionKey[];
  /** Test yapılmadığı için eksik olanlar. */
  readonly missingMeasurement: readonly DimensionKey[];
}

/**
 * Bir boyutun z belirsizliğini hesaplar.
 *
 * İki bağımsız kaynak var: ölçüm gürültüsü (`baseSigmaZ`) ve norm yayılımının
 * tahmin hatası (`spreadRelativeError × |z|`). Bağımsız belirsizlikler
 * **doğrusal değil, kareler toplamının karekökü** ile birleşir:
 *
 *     σ = √(σ_ölçüm² + σ_norm²)
 *
 * Doğrusal toplama belirsizliği sistematik olarak şişiriyordu — `reaction`
 * için z=1'de %41, z=2'de %31 fazla. Şişmiş σ her kısmi-kalibre ekseni taban
 * orana (3/12) doğru çekiyor, yani reaksiyonu belirleyici olan sporları
 * (Boks, Masa Tenisi, Badminton, Taekwondo, Tenis) tam da ayırt edici
 * eksenlerinden yoksun bırakıyordu.
 */
export function sigmaForDimension(dim: DimensionKey, z: number): number {
  const norm = DIMENSION_NORMS[dim];
  const measurement = norm.baseSigmaZ;
  const normError = norm.spreadRelativeError * Math.abs(z);
  return Math.sqrt(measurement * measurement + normError * normError);
}

/**
 * Ölçülmüş z değerlerinden profil kurar.
 *
 * @param measured Boyut → z. Ölçülemeyen boyutlar `null`/eksik bırakılır.
 */
export function buildZProfile(
  measured: Partial<Record<DimensionKey, number | null>>
): ZProfile {
  const z: Partial<Record<DimensionKey, number>> = {};
  const sigma: Partial<Record<DimensionKey, number>> = {};
  const missing: DimensionKey[] = [];

  for (const dim of SCORED_DIMENSIONS) {
    const value = measured[dim];
    if (value == null || !Number.isFinite(value)) {
      missing.push(dim);
      continue;
    }
    // Norm tablolarının çözünürlüğü ±2.58σ; ötesini iddia etmiyoruz.
    const clamped = Math.max(-2.58, Math.min(2.58, value));
    z[dim] = clamped;
    sigma[dim] = sigmaForDimension(dim, clamped);
  }

  return {
    z,
    sigma,
    excludedByNorm: EXCLUDED_DIMENSIONS,
    missingMeasurement: missing,
  };
}

/**
 * z-uzayında ağırlıklı mesafe.
 *
 * Yalnız hem ölçülmüş hem kalibre boyutlar üzerinden hesaplanır; ağırlık
 * normalizasyonu (`/ Σw`) sayesinde eksik boyutun ağırlığı kalanlara
 * kendiliğinden dağılır.
 *
 * @returns Mesafe (z birimi); ortak boyut yoksa null.
 */
export function zDistance(
  child: ZProfile,
  targetVector: SportVector,
  weights: SportVector
): number | null {
  let sumSq = 0;
  let weightSum = 0;

  for (const dim of SCORED_DIMENSIONS) {
    const cz = child.z[dim];
    if (cz == null) continue;
    const tz = profileValueToZ(targetVector[dim]);
    const w = weights[dim];
    const diff = cz - tz;
    sumSq += w * diff * diff;
    weightSum += w;
  }

  if (weightSum <= 0) return null;
  return Math.sqrt(sumSq / weightSum);
}

/**
 * z-mesafesi → 0-1 benzerlik, Gauss (RBF) çekirdeği.
 *
 *   similarity = exp(−d² / 2τ²)
 *
 * Neden `1 − d` değil: z-mesafesi sınırsızdır, `1 − d` negatife düşer ve
 * kırpılınca bilgi kaybeder. RBF çekirdeği monoton, sınırlı ve
 * ölçek-parametreli — istatistiksel olarak da standart benzerlik ölçüsü.
 *
 * τ = 1.25: her boyutta 1σ sapmış bir çocuk (d = 1) ≈ 0.73 benzerlik alır,
 * 2σ sapmış ≈ 0.28. Eski metriğin 55-75 bandına sıkışan çıktısına kıyasla
 * ayrıştırma belirgin biçimde geniş.
 */
export const SIMILARITY_TAU = 1.25;

/**
 * Bir sporun toplam ağırlığının ne kadarı gerçekten ölçüldü.
 *
 * Kalibresiz eksenleri mesafeden çıkarmak dürüst ama eşit değil: Cimnastik
 * ağırlığının %38.6'sını (balance 1.0 + coordination 0.95 — tam da onu
 * tanımlayan iki eksen), Masa Tenisi %34.9'unu kaybederken Atletizm yalnız
 * %19.8'ini kaybediyor. Yani "güç sporları kimliğini koruyor, teknik sporlar
 * birbirine benziyor". Bu oranı raporlamadan sıralamayı göstermek, eksikliği
 * gizler.
 *
 * @returns 0-1; 1 = sporun tüm ağırlıklı boyutları ölçüldü.
 */
export function weightCoverage(
  child: ZProfile,
  weights: SportVector
): number {
  let total = 0;
  let covered = 0;
  for (const dim of DIMENSION_KEYS) {
    total += weights[dim];
    if (child.z[dim] != null) covered += weights[dim];
  }
  return total > 0 ? covered / total : 0;
}

export function similarityFromZDistance(distance: number): number {
  const t = distance / SIMILARITY_TAU;
  return Math.exp(-(t * t) / 2);
}
