/**
 * CameraReferenceDetector — "zemindeki referans nerede" sorusunun sözleşmesi.
 *
 * ## Neden port
 *
 * Bugün referans bir **A4 kağıdı** (kolay, yazıcı yeter); yarın **ArUco**
 * işareti (köşe kimliğiyle çok daha sağlam tespit) olabilir. İkisi de aynı
 * çıktıyı üretir: görüntüdeki 4 köşe. Tüketici (kalibrasyon hook'u) hangisinin
 * kullanıldığını bilmez; A4→ArUco geçişi **tek adapter değişimidir**.
 *
 * ## Değişmez kural
 *
 * Detektör yalnız **piksel köşe** döndürür — açı/ölçek çıkarımı saf matematik
 * katmanının (`homography.ts`, `cameraPose.ts`) işidir. Böylece adapter
 * (OpenCV.js / js-aruco2) değişse de kamera-pozu mantığı değişmez ve tek yerde
 * test edilir.
 *
 * Girdi bilinçli olarak DOM'suz: ham RGBA tampon. Adapter bir `<video>`/canvas
 * karesinden bunu üretir; port saf kalır ve Vitest'te sentetik tamponla
 * sürülebilir.
 */

import type { Result } from '@/core/types/result';
import type { Vec2, Mat3 } from '@/lib/pose/homography';
import type { CameraPose, Intrinsics } from '@/lib/pose/cameraPose';

/** Detektöre verilen ham görüntü — RGBA, satır-öncelikli. */
export interface ReferenceImage {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
}

/**
 * Tespit edilen referans dörtgeni — köşeler TL, TR, BR, BL sırasında (px),
 * `A4_CORNERS_MM` ile aynı sıra. Detektör bu sırayı normalize etmekle yükümlü.
 */
export interface ReferenceQuad {
  readonly corners: readonly [Vec2, Vec2, Vec2, Vec2];
  readonly imageWidth: number;
  readonly imageHeight: number;
  /** Tespit güveni (0-1). Düşükse hook okumayı yok sayar. */
  readonly confidence: number;
}

export interface CameraReferenceDetector {
  /**
   * Bir karede referansı arar. Bulunamazsa `ok(null)` (hata değil — çocuk
   * A4'ü henüz koymamış olabilir). Yalnız gerçek başarısızlıklarda `err`.
   */
  detect(image: ReferenceImage): Promise<Result<ReferenceQuad | null>>;
  /** Tanı/telemetri için — hangi referans türü. */
  readonly kind: 'a4' | 'aruco';
}

/**
 * Kilitlenmiş kalibrasyon — seans boyunca referans. Testler ölçeği buradan
 * alır, drift buna göre ölçülür.
 */
export interface CalibrationBaseline {
  readonly pose: CameraPose;
  /** Zemin(mm)→görüntü(px) homografisi. Zemin metrik ölçümü için. */
  readonly homography: Mat3;
  readonly intrinsics: Intrinsics;
  readonly imageWidth: number;
  readonly imageHeight: number;
  /** performance.now() — bayatlık kontrolü için. */
  readonly capturedAt: number;
  readonly referenceKind: 'a4' | 'aruco';
}
