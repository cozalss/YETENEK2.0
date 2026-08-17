/**
 * A4 referans detektörü — OpenCV.js ile zemindeki A4 kağıdının 4 köşesini bulur.
 *
 * ## Neden adapter (impure)
 *
 * Köşe tespiti görüntü işleme gerektirir: gri tonlama → kenar → kontur →
 * dörtgen. Bu, `CameraReferenceDetector` portunun tek somut uygulaması. Açı/
 * ölçek çıkarımı buraya ait değil — o saf matematik katmanının işi
 * (`homography.ts`, `cameraPose.ts`). Yarın ArUco'ya geçilirse yalnız bu dosya
 * `aruco-reference-detector.ts` ile değişir; poz mantığı sabit kalır.
 *
 * ## OpenCV.js dinamik yükleme
 *
 * OpenCV.js ağır (~8MB WASM); başlangıç bundle'ına girmemeli. MediaPipe gibi
 * CDN'den, **yalnız ilk kalibrasyon anında** script enjeksiyonuyla yüklenir ve
 * cache'lenir. Yüklenemezse (çevrimdışı, ağ) detektör `ok(null)` döner — çocuk
 * A4'süz akışa (boy-tabanlı ölçek) düşer, uygulama patlamaz.
 *
 * ## Gizlilik
 *
 * Görüntü tamamen cihazda işlenir; OpenCV.js istemcide çalışır, hiçbir kare
 * sunucuya gitmez. KVKK değişmezine uygun.
 */

import { ok, err, type Result } from '@/core/types/result';
import type {
  CameraReferenceDetector,
  ReferenceImage,
  ReferenceQuad,
} from '@/core/ports/camera-reference';
import type { Vec2 } from '@/lib/pose/homography';
import { A4_HEIGHT_MM, A4_WIDTH_MM } from '@/lib/pose/homography';
import { logger } from '@/shared/logger/logger';

const log = logger.child('a4-detector');

/** OpenCV.js CDN. Sürüm sabit — davranış tekrarlanabilir olsun. */
const OPENCV_URL = 'https://docs.opencv.org/4.10.0/opencv.js';
const OPENCV_LOAD_TIMEOUT_MS = 20_000;

/** A4 en-boy oranı (297/210). Tespit adayları buna yakın olmalı. */
const A4_ASPECT = A4_HEIGHT_MM / A4_WIDTH_MM;
const ASPECT_TOLERANCE = 0.35;
/** Aday dörtgen, kare alanının en az bu oranını kaplamalı (çok küçük gürültü elenir). */
const MIN_AREA_FRACTION = 0.01;

/**
 * OpenCV.js'in kullandığımız minimal yüzeyi. Tüm kütüphaneyi tiplemek yerine
 * yalnız çağırdığımız üyeler — `any` yerine dar bir facade.
 */
interface CvMat {
  delete(): void;
  rows: number;
  cols: number;
  data32S: Int32Array;
  size(): { width: number; height: number };
}
interface CvMatVector {
  size(): number;
  get(i: number): CvMat;
  delete(): void;
}
interface OpenCvModule {
  matFromImageData(data: ImageData): CvMat;
  Mat: new () => CvMat;
  MatVector: new () => CvMatVector;
  Size: new (w: number, h: number) => unknown;
  cvtColor(src: CvMat, dst: CvMat, code: number): void;
  GaussianBlur(src: CvMat, dst: CvMat, size: unknown, sigma: number): void;
  Canny(src: CvMat, dst: CvMat, t1: number, t2: number): void;
  findContours(
    src: CvMat,
    contours: CvMatVector,
    hierarchy: CvMat,
    mode: number,
    method: number
  ): void;
  approxPolyDP(
    curve: CvMat,
    approx: CvMat,
    epsilon: number,
    closed: boolean
  ): void;
  arcLength(curve: CvMat, closed: boolean): number;
  contourArea(curve: CvMat, oriented?: boolean): number;
  isContourConvex(curve: CvMat): boolean;
  COLOR_RGBA2GRAY: number;
  RETR_LIST: number;
  CHAIN_APPROX_SIMPLE: number;
}

let cvPromise: Promise<OpenCvModule | null> | null = null;

/** OpenCV.js'i CDN'den bir kez yükler; başarısızlıkta null (retry mümkün). */
function loadOpenCv(): Promise<OpenCvModule | null> {
  if (cvPromise) return cvPromise;
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(null);
  }

  cvPromise = new Promise<OpenCvModule | null>((resolve) => {
    const existing = (window as unknown as { cv?: OpenCvModule }).cv;
    if (existing && typeof existing.matFromImageData === 'function') {
      resolve(existing);
      return;
    }

    const timer = window.setTimeout(() => {
      log.info('OpenCV.js yükleme zaman aşımı — A4 kalibrasyonu atlanıyor');
      cvPromise = null; // sonraki denemeye izin ver
      resolve(null);
    }, OPENCV_LOAD_TIMEOUT_MS);

    const finalize = () => {
      const cv = (window as unknown as { cv?: OpenCvModule }).cv;
      if (!cv) {
        window.clearTimeout(timer);
        cvPromise = null;
        resolve(null);
        return;
      }
      // OpenCV.js WASM asenkron init eder; hazır callback'i bekle.
      const runtime = cv as unknown as { onRuntimeInitialized?: () => void };
      if (typeof cv.matFromImageData === 'function') {
        window.clearTimeout(timer);
        resolve(cv);
      } else {
        runtime.onRuntimeInitialized = () => {
          window.clearTimeout(timer);
          resolve(cv);
        };
      }
    };

    const script = document.createElement('script');
    script.src = OPENCV_URL;
    script.async = true;
    script.onload = finalize;
    script.onerror = () => {
      window.clearTimeout(timer);
      cvPromise = null;
      log.info(
        'OpenCV.js yüklenemedi (ağ/çevrimdışı) — A4 kalibrasyonu atlanıyor'
      );
      resolve(null);
    };
    document.head.appendChild(script);
  });

  return cvPromise;
}

/** Köşeleri TL, TR, BR, BL sırasına dizer (A4_CORNERS_MM ile aynı). */
function orderCorners(pts: readonly Vec2[]): [Vec2, Vec2, Vec2, Vec2] {
  // TL: x+y en küçük, BR: x+y en büyük. TR: x−y en büyük, BL: x−y en küçük.
  let tl = pts[0],
    br = pts[0],
    tr = pts[0],
    bl = pts[0];
  for (const p of pts) {
    if (p[0] + p[1] < tl[0] + tl[1]) tl = p;
    if (p[0] + p[1] > br[0] + br[1]) br = p;
    if (p[0] - p[1] > tr[0] - tr[1]) tr = p;
    if (p[0] - p[1] < bl[0] - bl[1]) bl = p;
  }
  return [tl, tr, br, bl];
}

/** Sıralı köşelerin en-boy oranı A4'e yakın mı? */
function aspectMatchesA4(corners: readonly [Vec2, Vec2, Vec2, Vec2]): boolean {
  const [tl, tr, br, bl] = corners;
  const top = Math.hypot(tr[0] - tl[0], tr[1] - tl[1]);
  const bottom = Math.hypot(br[0] - bl[0], br[1] - bl[1]);
  const left = Math.hypot(bl[0] - tl[0], bl[1] - tl[1]);
  const right = Math.hypot(br[0] - tr[0], br[1] - tr[1]);
  const width = (top + bottom) / 2;
  const height = (left + right) / 2;
  if (width < 1 || height < 1) return false;
  const longSide = Math.max(width, height);
  const shortSide = Math.min(width, height);
  const aspect = longSide / shortSide;
  return Math.abs(aspect - A4_ASPECT) <= ASPECT_TOLERANCE;
}

/**
 * A4'ü tespit eder. Bulunamazsa `ok(null)` (hata değil — kağıt henüz kadrajda
 * olmayabilir). Yalnız OpenCV çağrısı beklenmedik şekilde patlarsa `err`.
 */
async function detectA4(
  image: ReferenceImage
): Promise<Result<ReferenceQuad | null>> {
  const cv = await loadOpenCv();
  if (!cv) return ok(null);

  const imageData = new ImageData(
    new Uint8ClampedArray(image.data),
    image.width,
    image.height
  );

  let src: CvMat | null = null;
  let gray: CvMat | null = null;
  let edges: CvMat | null = null;
  let contours: CvMatVector | null = null;
  let hierarchy: CvMat | null = null;

  try {
    src = cv.matFromImageData(imageData);
    gray = new cv.Mat();
    edges = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0);
    cv.Canny(gray, edges, 60, 180);

    contours = new cv.MatVector();
    hierarchy = new cv.Mat();
    cv.findContours(
      edges,
      contours,
      hierarchy,
      cv.RETR_LIST,
      cv.CHAIN_APPROX_SIMPLE
    );

    const frameArea = image.width * image.height;
    let best: { corners: [Vec2, Vec2, Vec2, Vec2]; area: number } | null = null;

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const approx = new cv.Mat();
      try {
        const peri = cv.arcLength(contour, true);
        cv.approxPolyDP(contour, approx, 0.02 * peri, true);
        if (approx.rows === 4 && cv.isContourConvex(approx)) {
          const area = Math.abs(cv.contourArea(approx));
          if (area >= MIN_AREA_FRACTION * frameArea) {
            const pts: Vec2[] = [];
            for (let k = 0; k < 4; k++) {
              pts.push([approx.data32S[k * 2], approx.data32S[k * 2 + 1]]);
            }
            const corners = orderCorners(pts);
            if (aspectMatchesA4(corners) && (!best || area > best.area)) {
              best = { corners, area };
            }
          }
        }
      } finally {
        approx.delete();
        contour.delete();
      }
    }

    if (!best) return ok(null);

    // Güven: kapladığı alan büyüdükçe (daha yakın, daha net) artar; 0.2'de doyar.
    const confidence = Math.min(1, best.area / (0.2 * frameArea));
    return ok({
      corners: best.corners,
      imageWidth: image.width,
      imageHeight: image.height,
      confidence,
    });
  } catch (cause) {
    return err({ code: 'unexpected', cause });
  } finally {
    src?.delete();
    gray?.delete();
    edges?.delete();
    contours?.delete();
    hierarchy?.delete();
  }
}

export const a4ReferenceDetector: CameraReferenceDetector = {
  kind: 'a4',
  detect: detectA4,
};
