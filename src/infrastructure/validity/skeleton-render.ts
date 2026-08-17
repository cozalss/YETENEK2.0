/**
 * Anahtar kare seçimi.
 *
 * ## Neden burada çizim yok
 *
 * Bu dosyada bir SVG iskelet render'ı vardı ve kaldırıldı: OpenAI Vision SVG
 * kabul etmiyor (yalnız jpeg/png/gif/webp) ve gerçek bir çağrıda 400 ile
 * yakalandı. Çizim artık `skeleton-png.ts` içinde, PNG olarak üretiliyor.
 *
 * Kullanılmayan bir alternatif render'ı bırakmak riskliydi: biri onu tekrar
 * bağlayıp aynı hatayı sessizce geri getirebilirdi.
 *
 * Kare seçimi burada kalıyor çünkü **istemci de** kullanıyor (ağa gönderilecek
 * kareleri seçmek için) ve saf hesaplama — `node:zlib` gerektiren PNG
 * modülünün aksine tarayıcıda çalışabilir.
 */

import { POSE_LANDMARKS, type PoseFrame } from '@/types';

const L = POSE_LANDMARKS;

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
