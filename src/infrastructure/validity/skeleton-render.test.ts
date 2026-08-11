/**
 * İskelet render testleri — gizlilik garantisi dahil.
 *
 * Bu modülün çıktısı, veli ham klip için rıza vermediğinde OpenAI'a giden tek
 * şey. Dolayısıyla "yalnız landmark geometrisi içerir" iddiası bir yorum
 * değil, test edilmesi gereken bir sözleşmedir.
 */

import { describe, expect, it } from 'vitest';
import { POSE_LANDMARKS, type Keypoint, type PoseFrame } from '@/types';
import {
  renderSkeletonSvg,
  selectKeyframes,
  skeletonDataUri,
} from './skeleton-render';

function frame(overrides: Record<number, Partial<Keypoint>> = {}): PoseFrame {
  const landmarks: Keypoint[] = Array.from({ length: 33 }, (_, i) => ({
    x: 0.5,
    y: 0.3 + (i / 33) * 0.6,
    z: 0,
    visibility: 0.9,
  }));
  for (const [k, v] of Object.entries(overrides)) {
    landmarks[Number(k)] = { ...landmarks[Number(k)], ...v };
  }
  return { timestamp: 0, landmarks };
}

describe('renderSkeletonSvg — gizlilik sözleşmesi', () => {
  const svg = renderSkeletonSvg(frame());

  it('yalnızca vektör ilkelleri üretir — gömülü görüntü YOK', () => {
    expect(svg).not.toContain('<image');
    expect(svg).not.toContain('data:image/png');
    expect(svg).not.toContain('data:image/jpeg');
    expect(svg).not.toContain('base64');
    expect(svg).not.toContain('xlink:href');
  });

  it('çalıştırılabilir içerik taşımaz', () => {
    expect(svg).not.toContain('<script');
    expect(svg).not.toContain('onload');
    expect(svg).not.toContain('<foreignObject');
  });

  it('geçerli, kapalı bir SVG belgesi üretir', () => {
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    // Açılan her line/circle tek etiketli; kapanış sayısı tutmalı.
    expect(svg.split('<line').length - 1).toBeGreaterThan(0);
    expect(svg.split('<circle').length - 1).toBeGreaterThan(0);
  });

  it('etiket metnindeki işaretleme karakterlerini temizler', () => {
    const s = renderSkeletonSvg(frame(), { label: '<script>alert(1)</script>' });
    expect(s).not.toContain('<script');
    expect(s).toContain('scriptalert(1)/script');
  });
});

describe('renderSkeletonSvg — görünürlük', () => {
  it('görünmez landmark çizilmez', () => {
    const visible = renderSkeletonSvg(frame());
    const hidden = renderSkeletonSvg(
      frame({
        [POSE_LANDMARKS.LEFT_ANKLE]: { visibility: 0.1 },
        [POSE_LANDMARKS.RIGHT_ANKLE]: { visibility: 0.1 },
      })
    );
    // Gizlenen iki nokta ve onlara bağlı kenarlar kaybolmalı.
    const circles = (s: string) => s.split('<circle').length - 1;
    expect(circles(hidden)).toBeLessThan(circles(visible));
  });

  it('yer çizgisi istenirse çizilir', () => {
    const s = renderSkeletonSvg(frame(), { groundY: 0.95 });
    expect(s).toContain('stroke-dasharray');
    expect(s).toContain('yer');
  });
});

describe('skeletonDataUri', () => {
  it('SVG data URI üretir', () => {
    const uri = skeletonDataUri(frame());
    expect(uri.startsWith('data:image/svg+xml;base64,')).toBe(true);
    const decoded = Buffer.from(uri.split(',')[1], 'base64').toString('utf8');
    expect(decoded.startsWith('<svg')).toBe(true);
  });
});

describe('selectKeyframes', () => {
  const frames = Array.from({ length: 120 }, (_, i) => {
    // Kalça Y: ortada tepe yapan bir yay (apex ~60. kare).
    const y = 0.6 - 0.15 * Math.sin((i / 120) * Math.PI);
    return frame({
      [POSE_LANDMARKS.LEFT_HIP]: { y },
      [POSE_LANDMARKS.RIGHT_HIP]: { y },
    });
  });

  it('varsayılan olarak 6 kare seçer', () => {
    expect(selectKeyframes(frames)).toHaveLength(6);
  });

  it('kare sayısı 8 ile sınırlı — maliyet kontrolü', () => {
    expect(selectKeyframes(frames, 50).length).toBeLessThanOrEqual(8);
  });

  it('zaman sırasını korur', () => {
    const idx = selectKeyframes(frames).map((k) => k.index);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
  });

  it('apex fazını işaretler', () => {
    const phases = selectKeyframes(frames).map((k) => k.phase);
    expect(phases).toContain('apex');
    expect(phases).toContain('setup');
    expect(phases).toContain('end');
  });

  it('girdi kısa ise hepsini döndürür', () => {
    expect(selectKeyframes(frames.slice(0, 3))).toHaveLength(3);
  });

  it('boş girdide boş döner', () => {
    expect(selectKeyframes([])).toHaveLength(0);
  });
});
