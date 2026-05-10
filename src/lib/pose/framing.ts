/**
 * Framing checks — kullanıcının vücudunun kameraya tam sığıp sığmadığını anlar.
 *
 * Bir test başlamadan önce kullanıcının "hazır" olması = kalça ve ayak
 * keypoint'lerinin (a) görünür, (b) çerçeve içinde olması gerekiyor.
 */

import type { PoseFrame } from '@/types';
import { POSE_LANDMARKS } from '@/types';

export interface FramingStatus {
  ready: boolean;
  /** Kullanıcıya gösterilecek Türkçe ipucu */
  hint: string;
}

const REQUIRED_FOR_JUMP = [
  POSE_LANDMARKS.LEFT_HIP,
  POSE_LANDMARKS.RIGHT_HIP,
  POSE_LANDMARKS.LEFT_ANKLE,
  POSE_LANDMARKS.RIGHT_ANKLE,
];

const REQUIRED_FOR_BALANCE = [
  POSE_LANDMARKS.LEFT_HIP,
  POSE_LANDMARKS.RIGHT_HIP,
  POSE_LANDMARKS.LEFT_KNEE,
  POSE_LANDMARKS.RIGHT_KNEE,
  POSE_LANDMARKS.LEFT_ANKLE,
  POSE_LANDMARKS.RIGHT_ANKLE,
];

/** Bir keypoint görünür ve çerçeve içinde (kenarlardan biraz içeride) mi? */
function isLandmarkInFrame(
  frame: PoseFrame,
  index: number,
  minVisibility = 0.6
): boolean {
  const lm = frame.landmarks[index];
  if (!lm) return false;
  const v = lm.visibility ?? 0;
  if (v < minVisibility) return false;
  // Frame kenarına 5% yakın olan noktalar genelde dışarı taşmış demektir
  if (lm.y < 0.02 || lm.y > 0.98) return false;
  if (lm.x < 0.02 || lm.x > 0.98) return false;
  return true;
}

export function checkJumpFraming(frame: PoseFrame | null): FramingStatus {
  if (!frame) {
    return { ready: false, hint: 'Pose tespit edilemedi. Kameranın önüne geç.' };
  }

  const hipVisible =
    isLandmarkInFrame(frame, POSE_LANDMARKS.LEFT_HIP) &&
    isLandmarkInFrame(frame, POSE_LANDMARKS.RIGHT_HIP);
  const anklesVisible =
    isLandmarkInFrame(frame, POSE_LANDMARKS.LEFT_ANKLE) &&
    isLandmarkInFrame(frame, POSE_LANDMARKS.RIGHT_ANKLE);

  if (!hipVisible) {
    return {
      ready: false,
      hint: 'Kalçan görünmüyor. Kameradan biraz uzaklaş veya kamerayı yukarı kaldır.',
    };
  }
  if (!anklesVisible) {
    return {
      ready: false,
      hint: 'Ayakların görünmüyor. Kameradan 1-2 adım uzaklaş ki tüm vücudun çerçeveye sığsın.',
    };
  }

  return { ready: true, hint: 'Hazır — sıçrayabilirsin.' };
}

export function checkBalanceFraming(
  frame: PoseFrame | null
): FramingStatus {
  if (!frame) {
    return { ready: false, hint: 'Pose tespit edilemedi.' };
  }
  const allVisible = REQUIRED_FOR_BALANCE.every((idx) =>
    isLandmarkInFrame(frame, idx)
  );
  if (!allVisible) {
    return {
      ready: false,
      hint: 'Vücudun tamamı çerçevede olmalı (kalça, dizler ve ayaklar görünür).',
    };
  }
  return { ready: true, hint: 'Hazır.' };
}

export const JUMP_REQUIRED_LANDMARKS = REQUIRED_FOR_JUMP;
