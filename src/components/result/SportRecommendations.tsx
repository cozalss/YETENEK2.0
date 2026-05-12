/**
 * Top 3 spor önerisini sıralı kart olarak gösterir.
 * En yüksek confidence olan en üstte ve daha büyük.
 */

import type { SportMatch } from '@/lib/matching/recommend';

interface Props {
  recommendations: SportMatch[];
}

export function SportRecommendations({ recommendations }: Props) {
  return (
    <div className="space-y-3">
      <h3
        className="text-xs font-bold tracking-[0.25em] uppercase"
        style={{
          color: 'var(--color-ink-3)',
          fontFamily: 'var(--font-display)',
        }}
      >
        En Uygun {recommendations.length} Spor
      </h3>
      <div className="space-y-3">
        {recommendations.map((match, idx) => (
          <SportCard key={match.sport} match={match} rank={idx + 1} />
        ))}
      </div>
    </div>
  );
}

function SportCard({ match, rank }: { match: SportMatch; rank: number }) {
  const isTop = rank === 1;
  return (
    <div
      className="flex items-start gap-4 rounded-2xl border-2 p-4"
      style={
        isTop
          ? {
              background: 'rgba(242, 201, 76, 0.18)',
              borderColor: 'var(--track-mustard)',
            }
          : {
              background: 'var(--color-surface-elevated)',
              borderColor: 'var(--color-line)',
            }
      }
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-black"
        style={
          isTop
            ? {
                background: 'var(--track-mustard)',
                color: 'var(--form-navy)',
                fontFamily: 'var(--font-display)',
                boxShadow: '0 4px 12px -2px rgba(242, 201, 76, 0.55)',
              }
            : {
                background: 'var(--color-canvas)',
                color: 'var(--form-navy)',
                fontFamily: 'var(--font-display)',
                border: '1px solid var(--color-line-strong)',
              }
        }
      >
        {rank}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <h4
            className="font-black"
            style={{
              color: 'var(--form-navy)',
              fontSize: isTop ? '1.5rem' : '1.25rem',
              fontFamily: 'var(--font-display)',
            }}
          >
            {match.sport}
          </h4>
          <span
            className="shrink-0 rounded-full px-2.5 py-0.5 font-mono text-xs font-bold"
            style={
              isTop
                ? {
                    background: 'var(--form-navy)',
                    color: 'var(--whistle-cream)',
                  }
                : {
                    background: 'var(--color-canvas)',
                    color: 'var(--form-navy)',
                    border: '1px solid var(--color-line-strong)',
                  }
            }
          >
            %{match.confidencePercent}
          </span>
        </div>
        <p
          className="mt-1 text-sm leading-relaxed"
          style={{ color: 'var(--color-ink-2)' }}
        >
          {match.reason}
        </p>
      </div>
    </div>
  );
}
