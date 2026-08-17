/**
 * Çocuğun 7 boyutlu bio-motor profilini radar grafiğinde gösterir.
 *
 * Eksenler (7 boyut, hepsi 0-100):
 *   - Dikey Patlayıcı   (CMJ)
 *   - Yatay Patlayıcı   (broad jump)
 *   - Denge             (tek bacak)
 *   - Reaksiyon         (refleks)
 *   - Yanal Sıçrama     (lateral hops — 'çeviklik' DEĞİL, bkz. sportProfiles)
 *   - Koordinasyon      (görsel takip)
 *   - Ritim             (jumping jacks — 'dayanıklılık' DEĞİL)
 *
 * Eksiklikleri açık göstermek için: ölçülmemiş boyut için 0 yerine null
 * göndermek istenirse, recharts null değerleri otomatik atlar — fakat
 * pitch'te boş eksen gösteriyor olmamak daha iyi, o yüzden 50 (popülasyon
 * medyanı) ile dolduruyoruz ve "Ölçülmedi" rozeti ayrıca gösteriyoruz.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { DIMENSION_SHORT_LABELS_TR as SHORT } from '@/lib/matching/sportProfiles';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
} from 'recharts';

export interface BioMotorRadarProps {
  explosivePower: number;
  horizontalPower: number;
  balance: number;
  reaction: number;
  agility: number;
  coordination: number;
  endurance: number;
}

export function BioMotorRadar({
  explosivePower,
  horizontalPower,
  balance,
  reaction,
  agility,
  coordination,
  endurance,
}: BioMotorRadarProps) {
  const data = [
    { axis: 'Dikey Güç', value: clamp(explosivePower) },
    { axis: 'Yatay Güç', value: clamp(horizontalPower) },
    { axis: SHORT.agility, value: clamp(agility) },
    { axis: 'Reaksiyon', value: clamp(reaction) },
    { axis: 'Koordinasyon', value: clamp(coordination) },
    { axis: SHORT.endurance, value: clamp(endurance) },
    { axis: 'Denge', value: clamp(balance) },
  ];

  const { containerRef, size, ready } = useSquareSize(280, 448);

  return (
    <div
      ref={containerRef}
      className="w-full max-w-md"
      style={{ minHeight: 280 }}
    >
      {ready && (
        <RadarChart
          width={size}
          height={size}
          data={data}
          outerRadius="62%"
          margin={{ top: 16, right: 32, bottom: 16, left: 32 }}
        >
          <PolarGrid stroke="rgba(44, 62, 107, 0.18)" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: '#2c3e6b', fontSize: 11, fontWeight: 700 }}
            tickSize={10}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: 'rgba(44, 62, 107, 0.55)', fontSize: 10 }}
            stroke="rgba(44, 62, 107, 0.18)"
          />
          <Radar
            name="Profil"
            dataKey="value"
            stroke="#f2c94c"
            fill="#f2c94c"
            fillOpacity={0.45}
            strokeWidth={2}
          />
        </RadarChart>
      )}
    </div>
  );
}

/**
 * Parent genişliğini ölçüp [min, max] arasında kare boyut döner.
 * ResponsiveContainer'ın "width(-1) height(-1)" yarışını engeller —
 * gerçek width'i ResizeObserver ile aldıktan sonra render eder.
 */
function useSquareSize(min: number, max: number) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) {
        setSize(Math.max(min, Math.min(max, w)));
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [min, max]);

  return { containerRef, size, ready: size > 0 };
}

function clamp(v: number): number {
  if (Number.isNaN(v) || !Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}
