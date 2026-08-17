/**
 * Düzlemsel homografi — zemindeki bilinen bir dörtgenden (A4) görüntü eşlemesi.
 *
 * ## Neden gerekli
 *
 * Tek kameradan ölçüm, kameranın açısına ve ölçeğine bağlı ama bunlar bilinmez.
 * Zemine konan **bilinen boyutta** bir referans (A4 = 210×297 mm) görüntüde
 * tespit edildiğinde, 4 köşesi zemin düzlemi ile görüntü düzlemi arasında bir
 * **homografi** kurar. Homografi iki şeyi verir:
 *
 *   1. Zemin düzleminde **metrik mesafe** (px→mm) — intrinsics gerekmeden.
 *      Broad jump gibi zemin ölçümleri doğrudan doğru.
 *   2. Kamera pozunun (eğim/yatıklık) çıkarılacağı ham veri — bkz. `cameraPose.ts`.
 *
 * ## Değişmez kural
 *
 * Bu modül **saftır**: DOM, kamera, OpenCV yok. Yalnız köşe koordinatlarından
 * matris matematiği. Böylece Vitest ile deterministik test edilir; A4'ü
 * gerçekten tespit etmek adapter'ın (impure) işidir.
 *
 * Koordinat konvansiyonu: zemin noktaları mm cinsinden (Z=0 düzlemi), görüntü
 * noktaları **piksel** cinsinden. Piksel seçildi çünkü poz çözümü (cameraPose)
 * asıl nokta (principal point) ve odak uzaklığını piksel biriminde ister.
 */

/** Görüntü/zemin noktası — [x, y]. */
export type Vec2 = readonly [number, number];

/** 3×3 matris, satır-öncelikli: [h11,h12,h13, h21,h22,h23, h31,h32,h33]. */
export type Mat3 = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

/** Bir zemin noktasının (mm) hangi görüntü noktasına (px) düştüğü. */
export interface Correspondence {
  /** Zemin düzlemi koordinatı (mm), Z=0. */
  readonly floor: Vec2;
  /** Görüntü koordinatı (px). */
  readonly image: Vec2;
}

/**
 * A4'ün kanonik köşeleri (mm) — TL, TR, BR, BL sırasında.
 *
 * Uzun kenar (297 mm) çocuğa doğru bakacak şekilde yere yatırılır varsayımı;
 * tespit köşe sırasını buna göre normalize eder (bkz. adapter). Sıra tutarlı
 * olduğu sürece mutlak yön ölçeği etkilemez.
 */
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
export const A4_CORNERS_MM: readonly [Vec2, Vec2, Vec2, Vec2] = [
  [0, 0],
  [A4_WIDTH_MM, 0],
  [A4_WIDTH_MM, A4_HEIGHT_MM],
  [0, A4_HEIGHT_MM],
] as const;

/**
 * 4+ eşleşmeden homografi çözer (DLT).
 *
 * h33 = 1 sabitlenir; kalan 8 bilinmeyen, her eşleşmenin verdiği 2 denklemle
 * (≥4 nokta → ≥8 denklem) kısmi pivotlu Gauss eliminasyonuyla çözülür. Tam 4
 * nokta beklenir (A4 dört köşe); fazlası verilirse ilk 4 kullanılır — en küçük
 * kareler değil, çünkü A4 köşeleri zaten kesin karşılıklardır.
 *
 * Dejenere konfigürasyon (kolineer köşeler, sıfır alan) → null.
 */
export function homographyFromCorrespondences(
  pts: readonly Correspondence[]
): Mat3 | null {
  if (pts.length < 4) return null;
  const quad = pts.slice(0, 4);

  // 8×8 sistem: A·h = b, h = [h11,h12,h13,h21,h22,h23,h31,h32].
  const A: number[][] = [];
  const b: number[] = [];
  for (const { floor, image } of quad) {
    const [X, Y] = floor;
    const [x, y] = image;
    A.push([X, Y, 1, 0, 0, 0, -x * X, -x * Y]);
    b.push(x);
    A.push([0, 0, 0, X, Y, 1, -y * X, -y * Y]);
    b.push(y);
  }

  const h = solveLinearSystem(A, b);
  if (!h) return null;
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

/** Zemin noktasını (mm) görüntüye (px) taşır. */
export function applyHomography(H: Mat3, p: Vec2): Vec2 {
  const [X, Y] = p;
  const w = H[6] * X + H[7] * Y + H[8];
  if (w === 0) return [0, 0];
  return [(H[0] * X + H[1] * Y + H[2]) / w, (H[3] * X + H[4] * Y + H[5]) / w];
}

/** 3×3 matris tersi. Tekil matris → null. */
export function invertMat3(H: Mat3): Mat3 | null {
  const [a, b, c, d, e, f, g, h, i] = H;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) return null;
  const invDet = 1 / det;
  return [
    A * invDet,
    (c * h - b * i) * invDet,
    (b * f - c * e) * invDet,
    B * invDet,
    (a * i - c * g) * invDet,
    (c * d - a * f) * invDet,
    C * invDet,
    (b * g - a * h) * invDet,
    (a * e - b * d) * invDet,
  ];
}

/**
 * İki görüntü noktası (px) arasındaki **zemin üzerindeki** metrik mesafe (mm).
 *
 * Her iki nokta homografinin tersiyle zemin düzlemine taşınır ve orada
 * Öklid mesafesi alınır. Yalnız zemine değen noktalar için doğrudur (broad
 * jump ayak izi gibi); havadaki bir noktaya uygulanırsa perspektif hatası
 * girer — o yüzden dikey sıçrama bununla ölçülmez.
 */
export function metricDistanceOnFloor(
  Hinv: Mat3,
  imgA: Vec2,
  imgB: Vec2
): number {
  const a = applyHomography(Hinv, imgA);
  const b = applyHomography(Hinv, imgB);
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/**
 * Kısmi pivotlu Gauss eliminasyonu. n×n sistem A·x = b çözer.
 * Tekil/kötü koşullu → null.
 */
function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  // Genişletilmiş matris kopyası — girdi mutasyona uğramaz.
  const m = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    // Kısmi pivot: en büyük mutlak değerli satırı öne al.
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    }
    if (Math.abs(m[pivot][col]) < 1e-12) return null;
    if (pivot !== col) {
      const tmp = m[pivot];
      m[pivot] = m[col];
      m[col] = tmp;
    }

    const pv = m[col][col];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = m[r][col] / pv;
      if (factor === 0) continue;
      for (let c = col; c <= n; c++) m[r][c] -= factor * m[col][c];
    }
  }

  const x = new Array<number>(n);
  for (let i = 0; i < n; i++) x[i] = m[i][n] / m[i][i];
  return x;
}
