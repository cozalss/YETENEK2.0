/**
 * Lesson validators — generic, config-driven hareket doğrulayıcılar.
 *
 * Her validator pose frame stream'ini gözlemler ve `ValidatorState`
 * (status, progress, reps, message) raporlar. Mevcut pose pipeline
 * (`src/lib/pose/extractKeypoints.ts`) ve test utility'leri (variance,
 * landmark visibility) reuse edilir.
 *
 * Design: stateful instance per attempt. `createValidator(config)`
 * runtime üretir, `observe(frame)` her yeni frame'de çağrılır.
 */

import { POSE_LANDMARKS } from '@/types';
import type { Keypoint, PoseFrame } from '@/types';
import {
  getHipCenter,
  getShoulderCenter,
  hasVisibleLandmarks,
  variance,
} from '@/lib/pose/extractKeypoints';

import type {
  Direction,
  TrackableLandmark,
  ValidatorConfig,
  ValidatorRuntime,
  ValidatorState,
} from './types';

const LANDMARK_INDEX: Record<TrackableLandmark, number> = {
  leftWrist: POSE_LANDMARKS.LEFT_WRIST,
  rightWrist: POSE_LANDMARKS.RIGHT_WRIST,
  leftAnkle: POSE_LANDMARKS.LEFT_ANKLE,
  rightAnkle: POSE_LANDMARKS.RIGHT_ANKLE,
  leftKnee: POSE_LANDMARKS.LEFT_KNEE,
  rightKnee: POSE_LANDMARKS.RIGHT_KNEE,
  nose: POSE_LANDMARKS.NOSE,
};

// 0.0008 → 0.003: gerçek çocuklar postüral sallanma sergiler (±5-8 piksel,
// 480px frame'de ~0.015 normalize SD). Variance bunun karesi → 0.0002 civarı
// PER axis, combined ~0.0004. 0.0008 eşiği marjinal, kasıtsız sallanmayı bile
// reddediyordu → "Daha sabit dur" mesajı sürekli, 3 sn hold timer hiç başlamıyor.
// 0.003 daha forgiving — gerçek instabilite (>10cm sway) hâlâ tespit edilir.
const DEFAULT_STATIC_VARIANCE = 0.003;
const DEFAULT_VERTICAL_DELTA = 0.08;
// Variance window: tüm requiredFrames yerine son 30 frame (~1 sn). Aksi takdirde
// "warmup" sallanması 3 saniye boyunca buffer'da kalıyor, kullanıcı kımıldamasa
// bile geç stabilite oluyor.
const STATIC_VARIANCE_WINDOW = 30;

function pending(targetReps: number, message: string): ValidatorState {
  return { status: 'pending', progress: 0, reps: 0, targetReps, message };
}

function inProgress(
  progress: number,
  reps: number,
  targetReps: number,
  message: string,
): ValidatorState {
  return {
    status: 'in_progress',
    progress: clamp01(progress),
    reps,
    targetReps,
    message,
  };
}

function completed(reps: number, targetReps: number, message: string): ValidatorState {
  return {
    status: 'completed',
    progress: 1,
    reps,
    targetReps,
    message,
  };
}

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

// ============================================================
// 1. Static Pose Validator — N saniye sabit dur
// ============================================================

function createStaticPoseValidator(
  config: Extract<ValidatorConfig, { type: 'staticPose' }>,
): ValidatorRuntime {
  const maxVar = config.maxVariance ?? DEFAULT_STATIC_VARIANCE;
  // ~30fps × holdMs / 1000 frame; 8s × 30fps = 240 frame
  const requiredFrames = Math.max(15, Math.round((config.holdMs / 1000) * 30));

  let stableStartedAt: number | null = null;
  let xBuffer: number[] = [];
  let yBuffer: number[] = [];
  let currentState: ValidatorState = pending(1, 'Pozisyona geç ve sabit dur.');

  function pickAnchor(frame: PoseFrame): Keypoint | null {
    if (config.subject === 'upperBody') return getShoulderCenter(frame);
    if (config.subject === 'lowerBody') {
      const left = frame.landmarks[POSE_LANDMARKS.LEFT_KNEE];
      const right = frame.landmarks[POSE_LANDMARKS.RIGHT_KNEE];
      if (!left || !right) return null;
      return { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
    }
    return getHipCenter(frame);
  }

  function observe(frame: PoseFrame): ValidatorState {
    if (currentState.status === 'completed') return currentState;
    const anchor = pickAnchor(frame);
    if (!anchor) {
      currentState = pending(1, 'Tüm vücudunun göründüğünden emin ol.');
      return currentState;
    }

    xBuffer.push(anchor.x);
    yBuffer.push(anchor.y);
    // Window stability: son 30 frame'lik kayan pencere. requiredFrames büyük
    // olsa bile (örn. 90), variance sadece son 1 sn'ye bakar.
    if (xBuffer.length > STATIC_VARIANCE_WINDOW) {
      xBuffer = xBuffer.slice(-STATIC_VARIANCE_WINDOW);
      yBuffer = yBuffer.slice(-STATIC_VARIANCE_WINDOW);
    }

    if (xBuffer.length < Math.min(10, STATIC_VARIANCE_WINDOW)) {
      currentState = inProgress(
        xBuffer.length / requiredFrames,
        0,
        1,
        'Hazırlanıyor…',
      );
      return currentState;
    }

    const combinedVar = variance(xBuffer) + variance(yBuffer);
    const stable = combinedVar < maxVar;

    if (!stable) {
      stableStartedAt = null;
      currentState = inProgress(0, 0, 1, 'Daha sabit dur — sallanma yok!');
      return currentState;
    }

    if (stableStartedAt == null) stableStartedAt = frame.timestamp;
    const heldMs = frame.timestamp - stableStartedAt;
    if (heldMs >= config.holdMs) {
      currentState = completed(1, 1, 'Harika! Pozu tuttun.');
      return currentState;
    }
    currentState = inProgress(
      heldMs / config.holdMs,
      0,
      1,
      `Sabit dur… ${Math.ceil((config.holdMs - heldMs) / 1000)} sn`,
    );
    return currentState;
  }

  return {
    observe,
    state: () => currentState,
    reset: () => {
      stableStartedAt = null;
      xBuffer = [];
      yBuffer = [];
      currentState = pending(1, 'Pozisyona geç ve sabit dur.');
    },
  };
}

// ============================================================
// 2. Reach Validator — landmark belirli yönde uzansın (tekme, yumruk)
// ============================================================

function createReachValidator(
  config: Extract<ValidatorConfig, { type: 'reach' }>,
): ValidatorRuntime {
  const landmarkIdx = LANDMARK_INDEX[config.landmark];
  let baseline: Keypoint | null = null;
  let calibrationFrames = 0;
  let inExtension = false;
  let reps = 0;
  let currentState: ValidatorState = pending(
    config.reps,
    `Önce hazır pozisyona geç — ${describeDirection(config.direction)} hareketi yapacaksın.`,
  );

  function offsetIn(direction: Direction, point: Keypoint, ref: Keypoint): number {
    // y artar = aşağı (image coords). Bu yüzden 'up' negatif y delta.
    switch (direction) {
      case 'up':
        return ref.y - point.y; // positive when moved up
      case 'down':
        return point.y - ref.y;
      case 'left':
        return ref.x - point.x; // positive when moved left
      case 'right':
        return point.x - ref.x;
    }
  }

  function observe(frame: PoseFrame): ValidatorState {
    if (currentState.status === 'completed') return currentState;
    const point = frame.landmarks[landmarkIdx];
    if (!point || (point.visibility ?? 1) < 0.4) {
      currentState = inProgress(
        reps / config.reps,
        reps,
        config.reps,
        'Hedef noktan kameraya görünsün.',
      );
      return currentState;
    }

    // Kalibrasyon: ilk 15 frame'de baseline al
    if (calibrationFrames < 15) {
      if (!baseline) baseline = { x: point.x, y: point.y };
      else {
        baseline = {
          x: (baseline.x * calibrationFrames + point.x) / (calibrationFrames + 1),
          y: (baseline.y * calibrationFrames + point.y) / (calibrationFrames + 1),
        };
      }
      calibrationFrames++;
      currentState = inProgress(0, 0, config.reps, 'Hazır pozisyon alınıyor…');
      return currentState;
    }

    if (!baseline) {
      currentState = pending(config.reps, 'Hazırlanıyor…');
      return currentState;
    }

    const offset = offsetIn(config.direction, point, baseline);

    if (!inExtension && offset > config.threshold) {
      inExtension = true;
      reps++;
      if (reps >= config.reps) {
        currentState = completed(reps, config.reps, 'Mükemmel! Tüm tekrarlar tamam.');
        return currentState;
      }
      currentState = inProgress(
        reps / config.reps,
        reps,
        config.reps,
        `Güzel! ${config.reps - reps} tekrar kaldı.`,
      );
      return currentState;
    }

    // Hareket geri toparlanıyor (baseline'a yaklaşma)
    if (inExtension && offset < config.threshold * 0.3) {
      inExtension = false;
    }

    currentState = inProgress(
      reps / config.reps,
      reps,
      config.reps,
      reps === 0
        ? `${describeDirection(config.direction)} hareketi yap!`
        : `${config.reps - reps} tekrar kaldı.`,
    );
    return currentState;
  }

  return {
    observe,
    state: () => currentState,
    reset: () => {
      baseline = null;
      calibrationFrames = 0;
      inExtension = false;
      reps = 0;
      currentState = pending(
        config.reps,
        `Önce hazır pozisyona geç — ${describeDirection(config.direction)} hareketi yapacaksın.`,
      );
    },
  };
}

function describeDirection(d: Direction): string {
  switch (d) {
    case 'up':
      return 'yukarı';
    case 'down':
      return 'aşağı';
    case 'left':
      return 'sola';
    case 'right':
      return 'sağa';
  }
}

// ============================================================
// 3. Vertical Rep — kalça Y delta ile squat / jump sayımı
// ============================================================

function createVerticalRepValidator(
  config: Extract<ValidatorConfig, { type: 'verticalRep' }>,
): ValidatorRuntime {
  const minDelta = config.minDelta ?? DEFAULT_VERTICAL_DELTA;
  let baselineY: number | null = null;
  let calibrationFrames = 0;
  let phase: 'ready' | 'extreme' = 'ready';
  let reps = 0;
  let currentState: ValidatorState = pending(
    config.reps,
    config.pattern === 'squatDown'
      ? 'Dik dur, sonra çömeleceksin.'
      : 'Dik dur, sonra sıçrayacaksın.',
  );

  function observe(frame: PoseFrame): ValidatorState {
    if (currentState.status === 'completed') return currentState;
    if (
      !hasVisibleLandmarks(
        frame,
        [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP],
        0.4,
      )
    ) {
      currentState = inProgress(
        reps / config.reps,
        reps,
        config.reps,
        'Tüm vücudunun göründüğünden emin ol.',
      );
      return currentState;
    }
    const hip = getHipCenter(frame);
    if (!hip) return currentState;

    if (calibrationFrames < 15) {
      baselineY =
        baselineY == null
          ? hip.y
          : (baselineY * calibrationFrames + hip.y) / (calibrationFrames + 1);
      calibrationFrames++;
      currentState = inProgress(0, 0, config.reps, 'Hazır pozisyon alınıyor…');
      return currentState;
    }
    if (baselineY == null) return currentState;

    const delta = config.pattern === 'squatDown' ? hip.y - baselineY : baselineY - hip.y;

    if (phase === 'ready' && delta > minDelta) {
      phase = 'extreme';
    } else if (phase === 'extreme' && delta < minDelta * 0.3) {
      // tam tur tamamlandı
      phase = 'ready';
      reps++;
      if (reps >= config.reps) {
        currentState = completed(reps, config.reps, 'Süper! Tüm tekrarlar tamam.');
        return currentState;
      }
      currentState = inProgress(
        reps / config.reps,
        reps,
        config.reps,
        `${config.reps - reps} tekrar kaldı.`,
      );
      return currentState;
    }

    currentState = inProgress(
      reps / config.reps,
      reps,
      config.reps,
      phase === 'extreme'
        ? config.pattern === 'squatDown'
          ? 'Şimdi yukarı kalk!'
          : 'İniş yap!'
        : config.pattern === 'squatDown'
          ? 'Çömel!'
          : 'Sıçra!',
    );
    return currentState;
  }

  return {
    observe,
    state: () => currentState,
    reset: () => {
      baselineY = null;
      calibrationFrames = 0;
      phase = 'ready';
      reps = 0;
      currentState = pending(
        config.reps,
        config.pattern === 'squatDown'
          ? 'Dik dur, sonra çömeleceksin.'
          : 'Dik dur, sonra sıçrayacaksın.',
      );
    },
  };
}

// ============================================================
// 4. Demo Validator — kamera bağımsız, N ms sonra başarı
// ============================================================

function createDemoValidator(
  config: Extract<ValidatorConfig, { type: 'demo' }>,
): ValidatorRuntime {
  let startedAt: number | null = null;
  let currentState: ValidatorState = pending(1, 'Demo modu — hazır olduğunda başla.');

  function observe(frame: PoseFrame): ValidatorState {
    if (currentState.status === 'completed') return currentState;
    if (startedAt == null) startedAt = frame.timestamp;
    const elapsed = frame.timestamp - startedAt;
    if (elapsed >= config.durationMs) {
      currentState = completed(1, 1, 'Demo başarıyla tamamlandı!');
      return currentState;
    }
    currentState = inProgress(
      elapsed / config.durationMs,
      0,
      1,
      `Devam et… ${Math.ceil((config.durationMs - elapsed) / 1000)} sn`,
    );
    return currentState;
  }

  return {
    observe,
    state: () => currentState,
    reset: () => {
      startedAt = null;
      currentState = pending(1, 'Demo modu — hazır olduğunda başla.');
    },
  };
}

// ============================================================
// Factory
// ============================================================

export function createValidator(config: ValidatorConfig): ValidatorRuntime {
  switch (config.type) {
    case 'staticPose':
      return createStaticPoseValidator(config);
    case 'reach':
      return createReachValidator(config);
    case 'verticalRep':
      return createVerticalRepValidator(config);
    case 'demo':
      return createDemoValidator(config);
  }
}
