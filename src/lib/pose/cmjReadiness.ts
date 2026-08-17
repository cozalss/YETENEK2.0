/**
 * CMJ başlatma kapıları — test ÖNCESİ sert, kayıt sırasında yok.
 *
 * Eğim / yaw / kamera yüksekliği / eller belde başlatmayı bloklar.
 * Sensör yoksa (masaüstü CI) kapı sessizce atlanır; metin talimatı kalır.
 */

import type { PoseFrame } from '@/types';
import { POSE_LANDMARKS } from '@/types';
import { checkJumpFraming, type FramingStatus } from './framing';

const YAW_Y_DIFF = 0.045;
const HIP_Y_MIN = 0.38;
const HIP_Y_MAX = 0.68;
const HANDS_ON_HIPS_FRAC = 0.14;
const DARK_BRIGHTNESS = 0.18;
const SHAKE_DELTA = 0.12;

function lm(frame: PoseFrame, i: number) {
  return frame.landmarks[i];
}

function visible(frame: PoseFrame, i: number, min = 0.55): boolean {
  const p = lm(frame, i);
  return p != null && (p.visibility ?? 1) >= min;
}

function pairYDiff(
  frame: PoseFrame,
  left: number,
  right: number
): number | null {
  if (!visible(frame, left) || !visible(frame, right)) return null;
  return Math.abs(lm(frame, left).y - lm(frame, right).y);
}

function hipMidY(frame: PoseFrame): number | null {
  if (
    !visible(frame, POSE_LANDMARKS.LEFT_HIP) ||
    !visible(frame, POSE_LANDMARKS.RIGHT_HIP)
  ) {
    return null;
  }
  return (
    (lm(frame, POSE_LANDMARKS.LEFT_HIP).y +
      lm(frame, POSE_LANDMARKS.RIGHT_HIP).y) /
    2
  );
}

function legScale(frame: PoseFrame): number {
  const hip = hipMidY(frame);
  const ankles = [POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.RIGHT_ANKLE]
    .filter((i) => visible(frame, i))
    .map((i) => lm(frame, i).y);
  if (hip == null || ankles.length === 0) return 0.4;
  const len = Math.max(...ankles) - hip;
  return len > 0.05 && len < 0.9 ? len : 0.4;
}

function handsOnHips(frame: PoseFrame): boolean | null {
  if (
    !visible(frame, POSE_LANDMARKS.LEFT_WRIST) ||
    !visible(frame, POSE_LANDMARKS.RIGHT_WRIST)
  ) {
    return null;
  }
  const hip = hipMidY(frame);
  if (hip == null) return null;
  const scale = legScale(frame);
  const dL = Math.abs(hip - lm(frame, POSE_LANDMARKS.LEFT_WRIST).y);
  const dR = Math.abs(hip - lm(frame, POSE_LANDMARKS.RIGHT_WRIST).y);
  return dL < HANDS_ON_HIPS_FRAC * scale && dR < HANDS_ON_HIPS_FRAC * scale;
}

export interface SceneSample {
  readonly brightness: number;
  readonly delta: number;
}

export interface CmjGateExtras {
  /** true = düz, false = eğik, null = sensör yok / atlandı */
  readonly tiltOk: boolean | null;
  readonly scene: SceneSample | null;
}

/**
 * CMJ'ye özgü başlatma kapısı. Broad jump `checkJumpFraming` kullanmaya devam eder.
 */
export function checkCmjReadiness(
  frame: PoseFrame | null,
  extras: CmjGateExtras = { tiltOk: null, scene: null }
): FramingStatus {
  const base = checkJumpFraming(frame);
  if (!base.ready) return base;
  if (!frame) return base;

  if (
    !visible(frame, POSE_LANDMARKS.LEFT_WRIST) ||
    !visible(frame, POSE_LANDMARKS.RIGHT_WRIST)
  ) {
    return { ready: false, hint: 'Kolların kadrajda olsun — ellerini beline koy.' };
  }

  const shoulderYaw = pairYDiff(
    frame,
    POSE_LANDMARKS.LEFT_SHOULDER,
    POSE_LANDMARKS.RIGHT_SHOULDER
  );
  const hipYaw = pairYDiff(
    frame,
    POSE_LANDMARKS.LEFT_HIP,
    POSE_LANDMARKS.RIGHT_HIP
  );
  if (
    (shoulderYaw != null && shoulderYaw > YAW_Y_DIFF) ||
    (hipYaw != null && hipYaw > YAW_Y_DIFF)
  ) {
    return { ready: false, hint: 'Telefonu tam karşına al — omuzların aynı hizada olsun.' };
  }

  const hipY = hipMidY(frame);
  if (hipY != null && hipY < HIP_Y_MIN) {
    return { ready: false, hint: 'Kamerayı biraz yukarı kaldır veya bir adım uzaklaş.' };
  }
  if (hipY != null && hipY > HIP_Y_MAX) {
    return { ready: false, hint: 'Kamerayı biraz aşağı indir — kalçan kadrajın ortasında olsun.' };
  }

  const hands = handsOnHips(frame);
  if (hands === false) {
    return { ready: false, hint: 'Ellerini beline koy ve orada tut.' };
  }
  if (hands === null) {
    return { ready: false, hint: 'Kolların kadrajda olsun — ellerini beline koy.' };
  }

  if (extras.tiltOk === false) {
    return { ready: false, hint: 'Telefonu dik tut, duvara yasla — yan yatmasın.' };
  }

  if (extras.scene) {
    if (extras.scene.brightness < DARK_BRIGHTNESS) {
      return { ready: false, hint: 'Işık yetersiz. Yüzünü pencereye veya lamba tarafına dön.' };
    }
    if (extras.scene.delta > SHAKE_DELTA) {
      return { ready: false, hint: 'Kamera sabit değil. Telefonu yasla, elde tutma.' };
    }
  }

  return { ready: true, hint: 'Hazır — eller belde, sıçrayabilirsin.' };
}

/**
 * 32×32 offscreen örnek — ortalama parlaklık ve kare-kare mutlak fark.
 * Saniyede bir, idle fazında. Canvas yoksa (test) null.
 */
export function sampleScene(
  video: HTMLVideoElement,
  prev: Uint8ClampedArray | null
): { sample: SceneSample; pixels: Uint8ClampedArray } | null {
  if (video.readyState < 2 || video.videoWidth === 0) return null;
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, 32, 32);
  const { data } = ctx.getImageData(0, 0, 32, 32);
  let sum = 0;
  let diff = 0;
  const n = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    const y = (data[i] + data[i + 1] + data[i + 2]) / 3;
    sum += y;
    if (prev) {
      const py = (prev[i] + prev[i + 1] + prev[i + 2]) / 3;
      diff += Math.abs(y - py);
    }
  }
  return {
    sample: {
      brightness: sum / n / 255,
      delta: prev ? diff / n / 255 : 0,
    },
    pixels: data,
  };
}
