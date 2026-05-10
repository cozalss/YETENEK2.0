/**
 * Streak (süreklilik) göstergesi.
 *
 * Son 14 gün içinde test yapılan günleri ateş emojisi grid'i ile gösterir.
 * Demo'da "viral organik geri gelme" mekanizmasını ima eder.
 */

interface Props {
  /** ISO tarih string'leri (YYYY-MM-DD) — son 14 gün içinde test yapılan günler */
  recentDates: string[];
}

const STREAK_WINDOW_DAYS = 14;

export function StreakIndicator({ recentDates }: Props) {
  const days = generateLast14Days();
  const tested = new Set(recentDates);
  const totalActive = recentDates.length;

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wider text-amber-400 uppercase">
            Süreklilik
          </p>
          <p className="mt-1 text-2xl font-bold">
            {totalActive}{' '}
            <span className="text-sm font-medium text-neutral-400">
              / {STREAK_WINDOW_DAYS} gün
            </span>
          </p>
        </div>
        {totalActive >= 3 && (
          <span className="text-3xl" aria-hidden="true">
            🔥
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const isToday = d.iso === todayIso();
          const wasTested = tested.has(d.iso);
          return (
            <div
              key={d.iso}
              className={`aspect-square rounded-md text-[10px] flex items-center justify-center ${
                wasTested
                  ? 'bg-amber-400 font-bold text-neutral-950'
                  : isToday
                    ? 'border border-amber-400/40 bg-neutral-900 text-neutral-300'
                    : 'bg-neutral-800/60 text-neutral-400'
              }`}
              title={d.iso}
            >
              {d.dayLabel}
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-neutral-400">
        Düzenli testler profilinin gelişimini takip etmeye yarar.
      </p>
    </div>
  );
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function generateLast14Days(): { iso: string; dayLabel: string }[] {
  const out: { iso: string; dayLabel: string }[] = [];
  const today = new Date();
  for (let i = STREAK_WINDOW_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push({
      iso: d.toISOString().slice(0, 10),
      dayLabel: String(d.getDate()),
    });
  }
  return out;
}
