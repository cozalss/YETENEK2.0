/**
 * Çocuğun 7 boyutlu bio-motor profilini radar grafiğinde gösterir.
 *
 * Eksenler (7 boyut, hepsi 0-100):
 *   - Dikey Patlayıcı   (CMJ)
 *   - Yatay Patlayıcı   (broad jump)
 *   - Denge             (tek bacak)
 *   - Reaksiyon         (refleks)
 *   - Çeviklik          (lateral hops)
 *   - Koordinasyon      (görsel takip)
 *   - Dayanıklılık      (jumping jacks)
 *
 * Eksiklikleri açık göstermek için: ölçülmemiş boyut için 0 yerine null
 * göndermek istenirse, recharts null değerleri otomatik atlar — fakat
 * pitch'te boş eksen gösteriyor olmamak daha iyi, o yüzden 50 (popülasyon
 * medyanı) ile dolduruyoruz ve "Ölçülmedi" rozeti ayrıca gösteriyoruz.
 */

'use client';

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
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
    { axis: 'Çeviklik', value: clamp(agility) },
    { axis: 'Reaksiyon', value: clamp(reaction) },
    { axis: 'Koordinasyon', value: clamp(coordination) },
    { axis: 'Dayanıklılık', value: clamp(endurance) },
    { axis: 'Denge', value: clamp(balance) },
  ];

  return (
    <div className="aspect-square w-full max-w-md">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="75%">
          <PolarGrid stroke="#404040" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: '#d4d4d4', fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: '#525252', fontSize: 10 }}
            stroke="#404040"
          />
          <Radar
            name="Profil"
            dataKey="value"
            stroke="#fbbf24"
            fill="#fbbf24"
            fillOpacity={0.4}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function clamp(v: number): number {
  if (Number.isNaN(v) || !Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}
