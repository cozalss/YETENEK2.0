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
    <div
      className="rounded-2xl border-2 p-5"
      style={{
        background: 'var(--color-surface-elevated)',
        borderColor: 'var(--color-line)',
      }}
    >
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <p
            className="text-xs font-bold tracking-[0.25em] uppercase"
            style={{
              color: 'var(--color-ink-3)',
              fontFamily: 'var(--font-display)',
            }}
          >
            Süreklilik
          </p>
          <p
            className="mt-1 text-2xl font-black"
            style={{
              color: 'var(--form-navy)',
              fontFamily: 'var(--font-display)',
            }}
          >
            {totalActive}{' '}
            <span
              className="text-sm font-medium"
              style={{ color: 'var(--color-ink-3)' }}
            >
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
              className="aspect-square rounded-md text-[10px] flex items-center justify-center font-bold"
              style={
                wasTested
                  ? {
                      background: 'var(--track-mustard)',
                      color: 'var(--form-navy)',
                    }
                  : isToday
                    ? {
                        background: 'var(--color-canvas)',
                        color: 'var(--form-navy)',
                        border: '2px solid var(--track-mustard)',
                      }
                    : {
                        background: 'var(--color-canvas)',
                        color: 'var(--color-ink-3)',
                        border: '1px solid var(--color-line)',
                      }
              }
              title={d.iso}
            >
              {d.dayLabel}
            </div>
          );
        })}
      </div>

      <p
        className="mt-3 text-xs"
        style={{ color: 'var(--color-ink-3)' }}
      >
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
