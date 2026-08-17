import 'server-only';

/**
 * İskelet çizimini **PNG** olarak üretir.
 *
 * SVG sürümü (`skeleton-render.ts`) hâlâ duruyor ve önizleme/hata ayıklama
 * için kullanışlı, ama OpenAI Vision SVG kabul etmiyor — yalnız jpeg, png,
 * gif, webp. Bu modül aynı çizimi piksel olarak üretiyor.
 *
 * `server-only`: `node:zlib` kullanıyor, tarayıcıya girmemeli. Anahtar kare
 * seçimi (`selectKeyframes`) bilinçli olarak SVG modülünde kaldı çünkü onu
 * istemci de kullanıyor.
 *
 * ## Gizlilik
 *
 * Çizilen tek şey landmark koordinatlarından yeniden oluşturulmuş bir çubuk
 * figür. Ham kamera görüntüsü bu modüle hiç ulaşmıyor — girdisi yalnız sayı.
 */

import { POSE_LANDMARKS, type PoseFrame } from '@/types';
import { PixelCanvas, type Rgb } from './png-encoder';

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
  [L.NOSE, L.LEFT_SHOULDER],
  [L.NOSE, L.RIGHT_SHOULDER],
];

/** Sol taraf ayrı renkte — hakem sol/sağ asimetrisini görebilmeli. */
const LEFT_SIDE = new Set<number>([
  L.LEFT_SHOULDER, L.LEFT_ELBOW, L.LEFT_WRIST,
  L.LEFT_HIP, L.LEFT_KNEE, L.LEFT_ANKLE, L.LEFT_HEEL, L.LEFT_FOOT_INDEX,
]);

const BACKGROUND: Rgb = { r: 15, g: 17, b: 20 };
const RIGHT_COLOR: Rgb = { r: 235, g: 238, b: 242 };
const LEFT_COLOR: Rgb = { r: 78, g: 168, b: 222 };
const GROUND_COLOR: Rgb = { r: 90, g: 100, b: 108 };

const MIN_VISIBILITY = 0.4;

export interface SkeletonPngOptions {
  readonly width?: number;
  readonly height?: number;
  /** Yer çizgisi (normalize Y). Verilirse referans olarak çizilir. */
  readonly groundY?: number;
}

/**
 * Poz karesini PNG'ye çizer.
 *
 * Görünürlüğü eşiğin altındaki noktalar ve onlara bağlı kenarlar çizilmez —
 * hakem "orada bir şey yok" ile "göremiyorum" arasındaki farkı görmeli.
 */
export function renderSkeletonPng(
  frame: PoseFrame,
  opts: SkeletonPngOptions = {}
): Buffer {
  const { width = 320, height = 420, groundY } = opts;
  const canvas = new PixelCanvas(width, height, BACKGROUND);
  const lms = frame.landmarks;

  const isVisible = (i: number) =>
    lms[i] != null && (lms[i].visibility ?? 1) >= MIN_VISIBILITY;
  const px = (i: number) => lms[i].x * width;
  const py = (i: number) => lms[i].y * height;

  if (groundY != null) {
    canvas.drawDashedHLine(groundY * height, 2, 10, 7, GROUND_COLOR);
  }

  for (const [a, b] of EDGES) {
    if (!isVisible(a) || !isVisible(b)) continue;
    const color = LEFT_SIDE.has(a) && LEFT_SIDE.has(b) ? LEFT_COLOR : RIGHT_COLOR;
    canvas.drawLine(px(a), py(a), px(b), py(b), 4, color);
  }

  for (let i = 0; i < lms.length; i++) {
    if (!isVisible(i)) continue;
    const color = LEFT_SIDE.has(i) ? LEFT_COLOR : RIGHT_COLOR;
    canvas.fillCircle(px(i), py(i), 3.5, color);
  }

  return canvas.toPng();
}

/** PNG'yi `data:` URI'ye çevirir — görsel API'lere doğrudan verilebilir. */
export function skeletonPngDataUri(
  frame: PoseFrame,
  opts?: SkeletonPngOptions
): string {
  return `data:image/png;base64,${renderSkeletonPng(frame, opts).toString('base64')}`;
}
