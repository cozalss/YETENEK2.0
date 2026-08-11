/**
 * İskelet render — poz karesini görsel hakeme gönderilebilir bir görüntüye
 * çevirir; **ham kamera görüntüsü olmadan**.
 *
 * ## Neden SVG, canvas değil
 *
 * Canvas hem tarayıcıya hem `node-canvas` gibi bir bağımlılığa bağlar. SVG saf
 * string birleştirmesiyle üretilir: sunucuda da tarayıcıda da aynı kodla
 * çalışır, sıfır bağımlılık, deterministik çıktı (birim testlenebilir).
 *
 * ## Gizlilik rolü
 *
 * Veli ham klip için açık rıza vermediğinde hakeme giden şey budur: yüz yok,
 * arka plan yok, oda yok, kıyafet yok — yalnız 33 nokta ve aralarındaki
 * çizgiler. Bu, "kişisel veri işlemiyoruz" savunmasını teknik olarak
 * doğrulanabilir kılar. Rıza yolu bu yüzden birinci sınıf bir yol, ikinci
 * seçenek değil.
 */

import { POSE_LANDMARKS, type PoseFrame } from '@/types';

const L = POSE_LANDMARKS;

/** İskelet kenarları — MediaPipe topolojisinin gövde alt kümesi. */
const EDGES: ReadonlyArray<readonly [number, number]> = [
  [L.LEFT_SHOULDER, L.RIGHT_SHOULDER],
  [L.LEFT_SHOULDER, L.LEFT_ELBOW],
  [L.LEFT_ELBOW, L.LEFT_WRIST],
  [L.RIGHT_SHOULDER, L.RIGHT_ELBOW],
  [L.RIGHT_ELBOW, L.RIGHT_WRIST],
  [L.LEFT_SHOULDER, L.LEFT_HIP],
  [L.RIGHT_SHOULDER, L.RIGHT_HIP],
  [L.LEFT_HIP, L.RIGHT_HIP],
  [L.LEFT_HIP, L.LEFT_KNEE],
  [L.LEFT_KNEE, L.LEFT_ANKLE],
  [L.LEFT_ANKLE, L.LEFT_HEEL],
  [L.LEFT_HEEL, L.LEFT_FOOT_INDEX],
  [L.RIGHT_HIP, L.RIGHT_KNEE],
  [L.RIGHT_KNEE, L.RIGHT_ANKLE],
  [L.RIGHT_ANKLE, L.RIGHT_HEEL],
  [L.RIGHT_HEEL, L.RIGHT_FOOT_INDEX],
];

/** Ayrı renklenen noktalar — hakem sol/sağ ayrımını görebilmeli. */
const LEFT_SIDE = new Set<number>([
  L.LEFT_SHOULDER, L.LEFT_ELBOW, L.LEFT_WRIST,
  L.LEFT_HIP, L.LEFT_KNEE, L.LEFT_ANKLE, L.LEFT_HEEL, L.LEFT_FOOT_INDEX,
]);

const MIN_VISIBILITY = 0.4;

export interface SkeletonRenderOptions {
  readonly width?: number;
  readonly height?: number;
  /** Yer çizgisi (normalize Y). Verilirse referans olarak çizilir. */
  readonly groundY?: number;
  /** Kareye yazılacak etiket (faz adı gibi). */
  readonly label?: string;
}

function fmt(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}

/**
 * Poz karesini SVG işaretlemesine çevirir.
 *
 * Görünürlüğü eşiğin altındaki noktalar ve onlara bağlı kenarlar çizilmez —
 * hakem "orada bir şey yok" ile "orada bir şey var ama göremiyorum" arasındaki
 * farkı görmeli.
 */
export function renderSkeletonSvg(
  frame: PoseFrame,
  opts: SkeletonRenderOptions = {}
): string {
  const { width = 360, height = 480, groundY, label } = opts;
  const lms = frame.landmarks;

  const isVisible = (i: number) =>
    lms[i] != null && (lms[i].visibility ?? 1) >= MIN_VISIBILITY;
  const px = (i: number) => lms[i].x * width;
  const py = (i: number) => lms[i].y * height;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" fill="#0f1114"/>`
  );

  if (groundY != null) {
    const gy = groundY * height;
    parts.push(
      `<line x1="0" y1="${fmt(gy)}" x2="${width}" y2="${fmt(gy)}" stroke="#3a4248" stroke-width="1.5" stroke-dasharray="6 4"/>`,
      `<text x="6" y="${fmt(gy - 6)}" fill="#5d666c" font-family="monospace" font-size="11">yer</text>`
    );
  }

  for (const [a, b] of EDGES) {
    if (!isVisible(a) || !isVisible(b)) continue;
    const color = LEFT_SIDE.has(a) && LEFT_SIDE.has(b) ? '#4ea8de' : '#e0e4e8';
    parts.push(
      `<line x1="${fmt(px(a))}" y1="${fmt(py(a))}" x2="${fmt(px(b))}" y2="${fmt(py(b))}" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`
    );
  }

  for (let i = 0; i < lms.length; i++) {
    if (!isVisible(i)) continue;
    const color = LEFT_SIDE.has(i) ? '#4ea8de' : '#f4f6f8';
    parts.push(
      `<circle cx="${fmt(px(i))}" cy="${fmt(py(i))}" r="3.5" fill="${color}"/>`
    );
  }

  if (label) {
    const safe = label.replace(/[<>&]/g, '');
    parts.push(
      `<text x="8" y="20" fill="#8b949b" font-family="monospace" font-size="13">${safe}</text>`
    );
  }

  parts.push('</svg>');
  return parts.join('');
}

/** SVG'yi `data:` URI'ye çevirir — görsel API'lere doğrudan verilebilir. */
export function skeletonDataUri(
  frame: PoseFrame,
  opts?: SkeletonRenderOptions
): string {
  const svg = renderSkeletonSvg(frame, opts);
  const base64 =
    typeof Buffer !== 'undefined'
      ? Buffer.from(svg, 'utf8').toString('base64')
      : btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${base64}`;
}

export type KeyframePhase =
  | 'setup'
  | 'takeoff'
  | 'apex'
  | 'landing'
  | 'mid'
  | 'end';

export interface Keyframe {
  readonly frame: PoseFrame;
  readonly phase: KeyframePhase;
  readonly index: number;
}

/**
 * Hakeme gönderilecek anahtar kareleri seçer.
 *
 * Tüm kareleri göndermek hem pahalı hem gereksiz: hakem "ne oldu" sorusuna
 * bakıyor, bunun için hareketin karakteristik anları yeter. Kalça Y'sinin
 * uç noktaları hareketin fazlarını verir.
 *
 * @param count Hedef kare sayısı (4-8 arası tutulur).
 */
export function selectKeyframes(
  frames: readonly PoseFrame[],
  count = 6
): Keyframe[] {
  const n = frames.length;
  if (n === 0) return [];
  const target = Math.max(2, Math.min(8, count));
  if (n <= target) {
    return frames.map((frame, index) => ({ frame, phase: 'mid' as const, index }));
  }

  // Kalça Y serisi — hareketin ana ekseni.
  const hipY = frames.map((f) => {
    const lh = f.landmarks[L.LEFT_HIP];
    const rh = f.landmarks[L.RIGHT_HIP];
    if (lh == null || rh == null) return Number.NaN;
    return (lh.y + rh.y) / 2;
  });

  let apexIdx = 0;
  let lowIdx = 0;
  for (let i = 0; i < n; i++) {
    if (Number.isNaN(hipY[i])) continue;
    if (Number.isNaN(hipY[apexIdx]) || hipY[i] < hipY[apexIdx]) apexIdx = i;
    if (Number.isNaN(hipY[lowIdx]) || hipY[i] > hipY[lowIdx]) lowIdx = i;
  }

  const picks = new Map<number, KeyframePhase>();
  const setIfAbsent = (idx: number, phase: KeyframePhase) => {
    if (!picks.has(idx)) picks.set(idx, phase);
  };

  // Ayırt edici anlar önce: hakemin kararı bunlara dayanıyor.
  if (apexIdx > 0 && apexIdx < n - 1) setIfAbsent(apexIdx, 'apex');
  // En derin nokta apex'ten önceyse çömelme/kalkış, sonraysa iniş emilimi.
  //
  // Sınırdaki bir ekstremum hareket fazı DEĞİLDİR — kaydın başladığı ya da
  // bittiği yerdir. Ona 'takeoff' demek hakemi yanıltır, o yüzden yalnız iç
  // karelerde etiketlenir.
  if (lowIdx > 0 && lowIdx < n - 1) {
    setIfAbsent(lowIdx, lowIdx < apexIdx ? 'takeoff' : 'landing');
  }
  // Bağlam kareleri: ilk kare her zaman kurulum, son kare her zaman bitiş.
  setIfAbsent(0, 'setup');
  setIfAbsent(n - 1, 'end');

  // Kalan kotayı zamana eşit yayılmış karelerle doldur.
  for (let k = 1; picks.size < target && k < target * 3; k++) {
    const idx = Math.round((k / target) * (n - 1));
    setIfAbsent(idx, 'mid');
  }

  return [...picks.entries()]
    .sort((a, b) => a[0] - b[0])
    .slice(0, target)
    .map(([index, phase]) => ({ frame: frames[index], phase, index }));
}
