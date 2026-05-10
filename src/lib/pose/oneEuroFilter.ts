/**
 * One Euro Filter — sport tracking standardı, MediaPipe landmark jitter
 * için optimize.
 *
 * Casiez et al. 2012 "1€ Filter: A Simple Speed-based Low-pass Filter":
 *   - Yavaş hareketlerde agresif smoothing (jitter kesin atılır)
 *   - Hızlı hareketlerde minimal smoothing (lag kalmaz)
 *   - Adaptif cutoff = mincutoff + beta * |dx/dt|
 *
 * Pose tracking için:
 *   - mincutoff = 1.0 Hz (durağanken çok pürüzsüz)
 *   - beta = 0.04 (hızlı sıçrama/hop'larda lag yapmaz)
 *   - dcutoff = 1.0 Hz (hız tahmin filtresi)
 *
 * Her landmark (33 nokta) için ayrı filtre state'i (x, y, z, visibility).
 * Frame timestamp'ı dt için kullanılıyor (saniye).
 */

import type { Keypoint, PoseFrame } from '@/types';

interface LowPassFilter {
  hatxprev: number;
  xprev: number;
  initialized: boolean;
}

interface OneEuroChannel {
  x: LowPassFilter;
  dx: LowPassFilter;
  lastTimeMs: number;
}

export interface OneEuroParams {
  /** Cutoff frequency at zero velocity (Hz). Lower = smoother but more lag. */
  mincutoff: number;
  /** Speed coefficient — higher = less filtering on fast movement. */
  beta: number;
  /** Cutoff for derivative low-pass (Hz). 1.0 default. */
  dcutoff: number;
}

const DEFAULT_PARAMS: OneEuroParams = {
  mincutoff: 1.0,
  beta: 0.04,
  dcutoff: 1.0,
};

function alpha(cutoff: number, dtSeconds: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dtSeconds);
}

function applyLowPass(
  filter: LowPassFilter,
  value: number,
  a: number
): number {
  if (!filter.initialized) {
    filter.hatxprev = value;
    filter.xprev = value;
    filter.initialized = true;
    return value;
  }
  const hat = a * value + (1 - a) * filter.hatxprev;
  filter.hatxprev = hat;
  filter.xprev = value;
  return hat;
}

function makeChannel(): OneEuroChannel {
  return {
    x: { hatxprev: 0, xprev: 0, initialized: false },
    dx: { hatxprev: 0, xprev: 0, initialized: false },
    lastTimeMs: 0,
  };
}

function filterChannel(
  ch: OneEuroChannel,
  value: number,
  timeMs: number,
  params: OneEuroParams
): number {
  const dtMs =
    ch.lastTimeMs === 0 ? 1000 / 60 : Math.max(1, timeMs - ch.lastTimeMs);
  ch.lastTimeMs = timeMs;
  const dtSec = dtMs / 1000;

  // Derivative
  const dvalue = ch.x.initialized
    ? (value - ch.x.xprev) / dtSec
    : 0;
  const aDx = alpha(params.dcutoff, dtSec);
  const edx = applyLowPass(ch.dx, dvalue, aDx);

  // Adaptive cutoff
  const cutoff = params.mincutoff + params.beta * Math.abs(edx);
  const aX = alpha(cutoff, dtSec);
  return applyLowPass(ch.x, value, aX);
}

/**
 * 33 keypoint × 4 channel (x, y, z, visibility) = 132 channel state.
 * Stateful: aynı instance'ı her frame'de kullan, reset() ile temizle.
 */
export class PoseLandmarkFilter {
  private channels: Array<{
    x: OneEuroChannel;
    y: OneEuroChannel;
    z: OneEuroChannel;
    vis: OneEuroChannel;
  }> = [];
  private worldChannels: Array<{
    x: OneEuroChannel;
    y: OneEuroChannel;
    z: OneEuroChannel;
  }> = [];
  private params: OneEuroParams;

  constructor(params: Partial<OneEuroParams> = {}) {
    this.params = { ...DEFAULT_PARAMS, ...params };
  }

  reset(): void {
    this.channels = [];
    this.worldChannels = [];
  }

  /**
   * Frame'i filtreden geçirip yeni PoseFrame döndürür.
   * Original referans değiştirilmez (immutable).
   */
  apply(frame: PoseFrame): PoseFrame {
    const t = frame.timestamp;
    const filtered: Keypoint[] = frame.landmarks.map((lm, idx) => {
      if (!this.channels[idx]) {
        this.channels[idx] = {
          x: makeChannel(),
          y: makeChannel(),
          z: makeChannel(),
          vis: makeChannel(),
        };
      }
      const ch = this.channels[idx];
      return {
        x: filterChannel(ch.x, lm.x, t, this.params),
        y: filterChannel(ch.y, lm.y, t, this.params),
        z:
          lm.z != null
            ? filterChannel(ch.z, lm.z, t, this.params)
            : undefined,
        visibility:
          lm.visibility != null
            ? // Vis için daha gevşek smoothing (yavaş değişime yumuşak)
              filterChannel(ch.vis, lm.visibility, t, {
                mincutoff: 0.5,
                beta: 0.02,
                dcutoff: 1.0,
              })
            : undefined,
      };
    });

    const filteredWorld =
      frame.worldLandmarks?.map((lm, idx) => {
        if (!this.worldChannels[idx]) {
          this.worldChannels[idx] = {
            x: makeChannel(),
            y: makeChannel(),
            z: makeChannel(),
          };
        }
        const ch = this.worldChannels[idx];
        return {
          x: filterChannel(ch.x, lm.x, t, this.params),
          y: filterChannel(ch.y, lm.y, t, this.params),
          z:
            lm.z != null
              ? filterChannel(ch.z, lm.z, t, this.params)
              : undefined,
          visibility: lm.visibility,
        };
      }) ?? undefined;

    return {
      timestamp: t,
      landmarks: filtered,
      worldLandmarks: filteredWorld,
    };
  }
}

export const ONE_EURO_PRESETS = {
  /** Sport tracking — hızlı hareketleri kaybetme (default). */
  sport: { mincutoff: 1.0, beta: 0.04, dcutoff: 1.0 },
  /** Denge / postür — daha agresif smoothing (jitter sıfır). */
  posture: { mincutoff: 0.6, beta: 0.02, dcutoff: 1.0 },
  /** Refleks / sıçrama — hızlı tepki, minimal smoothing. */
  responsive: { mincutoff: 1.5, beta: 0.07, dcutoff: 1.0 },
} as const satisfies Record<string, OneEuroParams>;
