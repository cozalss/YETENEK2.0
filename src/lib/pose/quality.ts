/**
 * Pose quality scoring — frame'in ne kadar güvenilir olduğunu sayısal
 * olarak belirler.
 *
 * 0-100 quality score:
 *   - landmark visibility ortalaması
 *   - kritik keypoint kapsamı (hip + ankle + shoulder)
 *   - frame-to-frame stability (rolling buffer)
 *   - persistence (kaç ardışık frame'de pose var)
 *
 * UI hem badge'de göstermek hem de "low quality, retry" tetiklemek için kullanır.
 */

import type { PoseFrame } from '@/types';
import { POSE_LANDMARKS } from '@/types';

const CRITICAL_LANDMARKS = [
  POSE_LANDMARKS.LEFT_HIP,
  POSE_LANDMARKS.RIGHT_HIP,
  POSE_LANDMARKS.LEFT_ANKLE,
  POSE_LANDMARKS.RIGHT_ANKLE,
  POSE_LANDMARKS.LEFT_SHOULDER,
  POSE_LANDMARKS.RIGHT_SHOULDER,
];

export interface QualitySnapshot {
  /** 0-100 toplam kalite */
  score: number;
  /** Critical landmark visibility ortalaması (0-1) */
  criticalVisibility: number;
  /** Frame-to-frame stability (0-1, 1 = sabit) */
  stability: number;
  /** Ardışık geçerli frame sayısı */
  persistenceFrames: number;
  /** Kalite kategorisi */
  category: 'excellent' | 'good' | 'low' | 'unusable';
  /** Kullanıcıya gösterilecek Türkçe ipucu (kategoriye göre) */
  hint: string;
}

const HINT_BY_CATEGORY: Record<QualitySnapshot['category'], string> = {
  excellent: 'Mükemmel — pose net, kayıt güvenli',
  good: 'İyi — pose tespit ediliyor',
  low: 'Düşük — daha iyi ışık veya daha açık çerçeve gerekli',
  unusable: 'Pose net değil — kameraya tam gör, ışığı artır',
};

/**
 * Stateful quality monitor. Frame stream'i izler, rolling stats tutar.
 */
export class PoseQualityMonitor {
  private buffer: Array<{
    visibility: number;
    hipY: number | null;
    timestamp: number;
  }> = [];
  private readonly bufferSize = 20; // ~0.7s @ 30fps
  private persistenceFrames = 0;
  private lastSnapshot: QualitySnapshot | null = null;

  reset(): void {
    this.buffer = [];
    this.persistenceFrames = 0;
    this.lastSnapshot = null;
  }

  observe(frame: PoseFrame | null): QualitySnapshot {
    if (!frame) {
      this.persistenceFrames = 0;
      const snap = unusableSnapshot();
      this.lastSnapshot = snap;
      return snap;
    }

    const criticalVisibility = avgCriticalVisibility(frame);
    const hipMid = midY(frame, POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP);

    this.buffer.push({
      visibility: criticalVisibility,
      hipY: hipMid,
      timestamp: frame.timestamp,
    });
    if (this.buffer.length > this.bufferSize) {
      this.buffer.shift();
    }

    if (criticalVisibility >= 0.5) {
      this.persistenceFrames += 1;
    } else {
      this.persistenceFrames = 0;
    }

    const stability = computeStability(this.buffer);
    const score = scoreFromComponents(
      criticalVisibility,
      stability,
      this.persistenceFrames
    );
    const category = categorize(score);

    const snap: QualitySnapshot = {
      score,
      criticalVisibility,
      stability,
      persistenceFrames: this.persistenceFrames,
      category,
      hint: HINT_BY_CATEGORY[category],
    };
    this.lastSnapshot = snap;
    return snap;
  }

  current(): QualitySnapshot | null {
    return this.lastSnapshot;
  }
}

function unusableSnapshot(): QualitySnapshot {
  return {
    score: 0,
    criticalVisibility: 0,
    stability: 0,
    persistenceFrames: 0,
    category: 'unusable',
    hint: HINT_BY_CATEGORY.unusable,
  };
}

function avgCriticalVisibility(frame: PoseFrame): number {
  let sum = 0;
  let count = 0;
  for (const idx of CRITICAL_LANDMARKS) {
    const lm = frame.landmarks[idx];
    if (lm) {
      sum += lm.visibility ?? 0;
      count += 1;
    }
  }
  return count > 0 ? sum / count : 0;
}

function midY(frame: PoseFrame, idxA: number, idxB: number): number | null {
  const a = frame.landmarks[idxA];
  const b = frame.landmarks[idxB];
  if (!a || !b) return null;
  return (a.y + b.y) / 2;
}

function computeStability(
  buffer: Array<{ hipY: number | null; visibility: number }>
): number {
  // Stability: tekrarlı pose geçerli ve hipY varyansı düşük → 1
  const valid = buffer.filter((b) => b.hipY != null && b.visibility > 0.3);
  if (valid.length < 5) return 0.3;
  const ys = valid.map((b) => b.hipY!);
  const mean = ys.reduce((s, v) => s + v, 0) / ys.length;
  const variance =
    ys.reduce((s, v) => s + (v - mean) ** 2, 0) / ys.length;
  // Tipik durağan pose'da hip Y std ≤ 0.005 (normalize). 0.05+ = aşırı hareket / jitter.
  const std = Math.sqrt(variance);
  return Math.max(0, Math.min(1, 1 - std / 0.05));
}

function scoreFromComponents(
  visibility: number,
  stability: number,
  persistence: number
): number {
  // Persistence: en fazla 30 frame'de tam puan
  const persistenceScore = Math.min(1, persistence / 30);
  // Ağırlıklı ortalama: visibility en kritik
  const composite =
    visibility * 0.55 + stability * 0.3 + persistenceScore * 0.15;
  return Math.round(Math.max(0, Math.min(1, composite)) * 100);
}

function categorize(score: number): QualitySnapshot['category'] {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 35) return 'low';
  return 'unusable';
}
