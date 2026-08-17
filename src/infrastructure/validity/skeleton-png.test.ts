/**
 * İskelet PNG testleri — **gizlilik sözleşmesi dahil**.
 *
 * Bu modülün çıktısı, OpenAI'a giden tek görsel. "Yalnız landmark
 * geometrisi içerir" iddiası bir yorum değil, test edilmesi gereken bir
 * sözleşme: girdisi sayıdan ibaret olduğu için ham görüntü teknik olarak
 * sızamaz, ve bu testler o kısıtı sabitliyor.
 */

import { describe, expect, it } from 'vitest';
import { POSE_LANDMARKS, type Keypoint, type PoseFrame } from '@/types';
import { renderSkeletonPng, skeletonPngDataUri } from './skeleton-png';

function frame(overrides: Record<number, Partial<Keypoint>> = {}): PoseFrame {
  const landmarks: Keypoint[] = Array.from({ length: 33 }, (_, i) => ({
    x: 0.35 + (i % 5) * 0.07,
    y: 0.2 + (i / 33) * 0.7,
    z: 0,
    visibility: 0.9,
  }));
  for (const [k, v] of Object.entries(overrides)) {
    landmarks[Number(k)] = { ...landmarks[Number(k)], ...v };
  }
  return { timestamp: 0, landmarks };
}

describe('gizlilik sözleşmesi', () => {
  it('girdi yalnız sayıdan ibaret — ham görüntü teknik olarak sızamaz', () => {
    // `renderSkeletonPng` yalnız `PoseFrame` alıyor; içinde görüntü verisi
    // taşıyacak bir alan yok. Bu test sözleşmeyi tipte değil davranışta
    // sabitliyor: aynı landmark'lar her zaman aynı çıktıyı veriyor.
    const a = renderSkeletonPng(frame());
    const b = renderSkeletonPng(frame());
    expect(a.equals(b)).toBe(true);
  });

  it('geçerli PNG üretir (OpenAI kabul ettiği biçim)', () => {
    const png = renderSkeletonPng(frame());
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });

  it('data URI png MIME tipiyle etiketleniyor — svg DEĞİL', () => {
    const uri = skeletonPngDataUri(frame());
    expect(uri.startsWith('data:image/png;base64,')).toBe(true);
    expect(uri).not.toContain('svg');
  });

  it('payload makul boyutta — 8 kare isteği şişmemeli', () => {
    const png = renderSkeletonPng(frame());
    expect(png.length).toBeLessThan(25_000);
  });
});

describe('görünürlük ve içerik', () => {
  it('görünmez landmark çizilmez — çıktı değişir', () => {
    const visible = renderSkeletonPng(frame());
    const hidden = renderSkeletonPng(
      frame({
        [POSE_LANDMARKS.LEFT_ANKLE]: { visibility: 0.1 },
        [POSE_LANDMARKS.RIGHT_ANKLE]: { visibility: 0.1 },
        [POSE_LANDMARKS.LEFT_KNEE]: { visibility: 0.1 },
        [POSE_LANDMARKS.RIGHT_KNEE]: { visibility: 0.1 },
      })
    );
    expect(hidden.equals(visible)).toBe(false);
  });

  it('yer çizgisi istenirse çıktıyı değiştirir', () => {
    const without = renderSkeletonPng(frame());
    const withGround = renderSkeletonPng(frame(), { groundY: 0.95 });
    expect(withGround.equals(without)).toBe(false);
  });

  it('farklı poz farklı görüntü üretir', () => {
    const a = renderSkeletonPng(frame());
    const b = renderSkeletonPng(
      frame({ [POSE_LANDMARKS.LEFT_WRIST]: { x: 0.1, y: 0.1 } })
    );
    expect(a.equals(b)).toBe(false);
  });

  it('özel boyut isteği çalışıyor', () => {
    const small = renderSkeletonPng(frame(), { width: 160, height: 200 });
    const big = renderSkeletonPng(frame(), { width: 320, height: 420 });
    expect(small.length).toBeLessThan(big.length);
  });

  it('bozuk/eksik landmark ile çökmez', () => {
    const broken: PoseFrame = { timestamp: 0, landmarks: [] };
    expect(() => renderSkeletonPng(broken)).not.toThrow();
  });
});
