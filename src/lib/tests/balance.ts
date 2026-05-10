/**
 * Tek bacak denge testi — postüral kontrol + asimetri tespiti.
 *
 * Çocuk sağ bacağında 15 saniye, sonra sol bacağında 15 saniye duruyor.
 * AI, kalça ve omuz keypoint'lerinin yatay (X) salınımını ölçüyor.
 *
 * Daha düşük varyans = daha stabil duruş = daha yüksek skor.
 *
 * Asimetri:
 *   |sağ - sol| / max(sağ, sol)  > 0.15  →  sakatlanma riski uyarısı.
 *   Bu eşik klinik biyomekanik literatürünün "fonksiyonel asimetri" sınırı
 *   (Croisier 2008, Hewett 2005). Final ürünün mevzu eşiği gerçek veri
 *   üzerinde kalibre edilmeli; demo için %15 makul başlangıç.
 */

import type { PoseFrame } from '@/types';
import { POSE_LANDMARKS } from '@/types';
import {
  getHipCenter,
  getShoulderCenter,
  hasVisibleLandmarks,
  smoothSeries,
  standardDeviation,
} from '@/lib/pose/extractKeypoints';

// İyi denge için tüm vücut görünür olmalı (özellikle ayak/diz/kalça).
const REQUIRED_LANDMARKS = [
  POSE_LANDMARKS.LEFT_HIP,
  POSE_LANDMARKS.RIGHT_HIP,
  POSE_LANDMARKS.LEFT_KNEE,
  POSE_LANDMARKS.RIGHT_KNEE,
  POSE_LANDMARKS.LEFT_ANKLE,
  POSE_LANDMARKS.RIGHT_ANKLE,
];

export type Leg = 'right' | 'left';

export interface PostureSample {
  t: number;
  hipX: number;
  hipY: number;
  shoulderX: number;
  shoulderY: number;
}

export interface LegBalanceResult {
  /** 0-100, 100 = neredeyse hareketsiz */
  score: number;
  /** Kalça X salınımı (normalize) */
  hipSwayX: number;
  /** Omuz X salınımı (normalize) */
  shoulderSwayX: number;
  /** Toplam kullanılabilir frame */
  validFrames: number;
  /** Algoritmaya yetecek kadar frame var mıydı */
  hasEnoughData: boolean;
}

export interface BalanceAnalysis {
  right: LegBalanceResult;
  left: LegBalanceResult;
  /** |R - L| / max(R, L) — 0-1 arası */
  asymmetryRatio: number;
  /** asymmetry > %15 ise true */
  asymmetryWarning: boolean;
  /** Hangi taraf zayıf (asimetri varsa) */
  weakerSide: Leg | null;
  /** Veli/sporcu için Türkçe yorum */
  summary: string;
}

/**
 * Frame'in denge testinde kullanılabilir olup olmadığını söyler.
 */
export function isBalanceFrameUsable(frame: PoseFrame): boolean {
  return hasVisibleLandmarks(frame, REQUIRED_LANDMARKS, 0.5);
}

export function frameToPostureSample(frame: PoseFrame): PostureSample | null {
  if (!isBalanceFrameUsable(frame)) return null;
  const hip = getHipCenter(frame);
  const shoulder = getShoulderCenter(frame);
  if (!hip || !shoulder) return null;
  return {
    t: frame.timestamp,
    hipX: hip.x,
    hipY: hip.y,
    shoulderX: shoulder.x,
    shoulderY: shoulder.y,
  };
}

/**
 * Tek bacak denge skorunu hesaplar.
 *
 * Yöntem:
 *   1. hip_x ve shoulder_x serilerini al
 *   2. Smoothing uygula (jitter kır)
 *   3. Standart sapma → ne kadar salındığı
 *   4. 0-100 skoruna map'le (0 sapma = 100, 0.05+ sapma = 0)
 */
export function analyzeLeg(samples: PostureSample[]): LegBalanceResult {
  if (samples.length < 60) {
    return {
      score: 0,
      hipSwayX: 0,
      shoulderSwayX: 0,
      validFrames: samples.length,
      hasEnoughData: false,
    };
  }

  const hipXs = smoothSeries(
    samples.map((s) => s.hipX),
    5
  );
  const shoulderXs = smoothSeries(
    samples.map((s) => s.shoulderX),
    5
  );

  const hipSwayX = standardDeviation(hipXs);
  const shoulderSwayX = standardDeviation(shoulderXs);

  // Birleşik salınım: kalça + omuz ortalaması (kalça biraz daha ağırlıklı)
  const combinedSway = hipSwayX * 0.6 + shoulderSwayX * 0.4;

  // 0 sapma = 100 skor, 0.05+ = 0 skor (tipik tek bacak duruşunda 0.005-0.03 arası).
  const score = Math.max(0, Math.min(100, (1 - combinedSway / 0.05) * 100));

  return {
    score,
    hipSwayX,
    shoulderSwayX,
    validFrames: samples.length,
    hasEnoughData: true,
  };
}

/**
 * Yaşa göre asimetri uyarı eşiği — Hewett et al. 2005 (Am J Sports Med
 * 33:492) pediatric ACL biomechanik gözlemleri.
 *
 * 8-10 yaş çocuklarda nöromuskuler kontrol gelişmekte → daha yüksek
 * tolerans (%12). 11-15 yaş için kontrol oturmuş, hedef sıkı (%10).
 *
 * Yaş verilmediyse defansif default %13 (middle ground).
 */
function asymmetryThresholdForAge(ageYears: number | undefined): number {
  if (ageYears == null || !Number.isFinite(ageYears)) return 0.13;
  if (ageYears <= 10) return 0.12;
  return 0.10;
}

/**
 * Sağ ve sol bacak sonuçlarını birleştirip asimetri analizi yapar.
 *
 * @param ageYears Opsiyonel — verilirse uyarı eşiği yaşa göre uyarlanır
 *                 (Hewett 2005). Verilmezse %13 default kullanılır.
 */
export function analyzeBalance(
  right: PostureSample[],
  left: PostureSample[],
  ageYears?: number
): BalanceAnalysis {
  const rightResult = analyzeLeg(right);
  const leftResult = analyzeLeg(left);

  const r = rightResult.score;
  const l = leftResult.score;
  const maxScore = Math.max(r, l);
  const asymmetryRatio = maxScore === 0 ? 0 : Math.abs(r - l) / maxScore;
  const threshold = asymmetryThresholdForAge(ageYears);
  const asymmetryWarning = asymmetryRatio > threshold;

  let weakerSide: Leg | null = null;
  if (asymmetryWarning) {
    weakerSide = r < l ? 'right' : 'left';
  }

  let summary = '';
  if (!rightResult.hasEnoughData || !leftResult.hasEnoughData) {
    summary =
      'Yeterli veri toplanamadı. Vücudun kameraya tam görünmüyor olabilir.';
  } else if (asymmetryWarning) {
    const weakerLabel = weakerSide === 'right' ? 'sağ' : 'sol';
    summary = `${weakerLabel} bacak dengesinde belirgin asimetri var (%${(asymmetryRatio * 100).toFixed(0)}, eşik %${(threshold * 100).toFixed(0)}). Uzun vadede sakatlanma riskini artırabilir; tek bacak güçlendirme egzersizleri önerilir.`;
  } else {
    summary = `Denge simetrik ve dengeli. Sağ: ${r.toFixed(0)}/100, sol: ${l.toFixed(0)}/100.`;
  }

  return {
    right: rightResult,
    left: leftResult,
    asymmetryRatio,
    asymmetryWarning,
    weakerSide,
    summary,
  };
}
