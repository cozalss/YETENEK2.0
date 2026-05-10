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
      <h3 className="text-sm font-semibold tracking-wider text-amber-400 uppercase">
        En Uygun 3 Spor
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
      className={`flex items-center gap-4 rounded-2xl border p-4 ${
        isTop
          ? 'border-amber-400/40 bg-amber-400/5'
          : 'border-neutral-800 bg-neutral-900/40'
      }`}
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-bold ${
          isTop ? 'bg-amber-400 text-neutral-950' : 'bg-neutral-800 text-white'
        }`}
      >
        {rank}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <h4
            className={`font-bold ${
              isTop ? 'text-2xl text-amber-400' : 'text-xl text-white'
            }`}
          >
            {match.sport}
          </h4>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold ${
              isTop
                ? 'bg-amber-400 text-neutral-950'
                : 'bg-neutral-800 text-neutral-300'
            }`}
          >
            %{match.confidencePercent}
          </span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-neutral-400">
          {match.reason}
        </p>
      </div>
    </div>
  );
}
