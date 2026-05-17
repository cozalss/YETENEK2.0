/**
 * Streak rozeti — "🔥 N gün" gösterir. Pasif okuma, kayıt yapmaz.
 *
 * Üç görsel durum:
 *   - Aktif bugün       → mustard, "Bugün aktif"
 *   - Aktif dün         → pink uyarı, "Bugün de bir ders yap"
 *   - Sıfırlanmış       → gri, "Yeniden başla"
 */

'use client';

import { useEffect, useState } from 'react';
import { getStreakSnapshot, type StreakSnapshot } from '@/lib/lessons/streak';

interface Props {
  childId: string;
  compact?: boolean;
}

export function StreakBadge({ childId, compact = false }: Props) {
  const [snapshot, setSnapshot] = useState<StreakSnapshot | null>(null);

  useEffect(() => {
    setSnapshot(getStreakSnapshot(childId));
  }, [childId]);

  if (!snapshot) {
    return (
      <div
        className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-xs font-bold opacity-60"
        style={{ background: 'rgba(44, 62, 107, 0.08)' }}
      >
        ⏳ Seri yükleniyor…
      </div>
    );
  }

  const { current, longest, isActiveToday, dormant } = snapshot;

  let bg = 'var(--track-mustard)';
  const fg = 'var(--form-navy)';
  let icon = '🔥';
  let subtitle: string;
  let title: string;

  if (current === 0 || dormant) {
    bg = 'rgba(44, 62, 107, 0.08)';
    icon = '🌱';
    title = 'Seri sıfırlandı';
    subtitle =
      longest > 0
        ? `Bir gün ara verildi — yeniden başla (en yüksek: ${longest})`
        : 'İlk dersini bugün yap';
  } else if (isActiveToday) {
    title = `${current} günlük seri`;
    subtitle =
      longest > current
        ? `Bugün aktif · en yüksek ${longest}`
        : 'Bugün aktif — devam et!';
  } else {
    bg = 'rgba(244, 182, 194, 0.35)';
    title = `${current} günlük seri`;
    subtitle = 'Bugün bir ders daha yap — seriyi koru';
  }

  return (
    <div
      className="inline-flex items-center gap-3 rounded-2xl border px-4 py-2.5"
      style={{
        background: bg,
        borderColor: 'rgba(44, 62, 107, 0.18)',
        color: fg,
      }}
      role="status"
      aria-live="polite"
    >
      <span className="text-2xl" aria-hidden="true">
        {icon}
      </span>
      <div className="flex flex-col leading-tight">
        <span
          className="font-black tracking-wide uppercase"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {title}
        </span>
        {!compact && <span className="text-[11px] opacity-75">{subtitle}</span>}
      </div>
    </div>
  );
}
