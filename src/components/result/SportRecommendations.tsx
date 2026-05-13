/**
 * Top 3 spor önerisini sıralı kart olarak gösterir.
 * En yüksek confidence olan en üstte ve daha büyük.
 *
 * Her kart ayrıca o branş için "Dersleri başla" CTA'sı taşır
 * (→ /lessons/[slug]). Branş adı → slug map'i için SPORT_NAME_TO_SLUG.
 */

import type { SportMatch } from '@/lib/matching/recommend';
import { getCurriculumBySlug } from '@/lib/lessons/curriculum';
import { SportSelectButton } from './SportSelectButton';

interface Props {
  recommendations: SportMatch[];
}

/**
 * `SportMatch.sport` Türkçe görünür ad ("Voleybol", "Masa Tenisi" …).
 * Curriculum / sport content dosyalarında slug ("voleybol", "masa-tenisi" …)
 * kullanılıyor — bu map o köprüyü kurar.
 */
const SPORT_NAME_TO_SLUG: Record<string, string> = {
  Voleybol: 'voleybol',
  Basketbol: 'basketbol',
  Tenis: 'tenis',
  Yüzme: 'yuzme',
  Futbol: 'futbol',
  Atletizm: 'atletizm',
  Cimnastik: 'cimnastik',
  Judo: 'judo',
  Taekwondo: 'taekwondo',
  Boks: 'boks',
  'Masa Tenisi': 'masa-tenisi',
  Badminton: 'badminton',
};

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
  const slug = SPORT_NAME_TO_SLUG[match.sport];
  const hasLessons = slug != null && getCurriculumBySlug(slug) != null;

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border-2 p-4"
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
      <div className="flex items-start gap-4">
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

      {hasLessons && slug && (
        <SportSelectButton slug={slug} sportName={match.sport} isTop={isTop} />
      )}
    </div>
  );
}
