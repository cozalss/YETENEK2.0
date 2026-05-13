/**
 * Tüm test sonuçlarını birleştiren ana sonuç ekranı.
 *
 * Yapı:
 *   - Hero (her zaman üstte)
 *   - BadgeReveal (mount-time animasyon)
 *   - InjuryWarning (kritik güvenlik bilgisi, gizleme)
 *   - Tabs:
 *       1. Profil & Sonuç  → Radar + Öneriler + Metrikler
 *       2. AI Asistan      → Rapor + Koç chat
 *       3. Paylaş & Devam  → Share + PDF + Sıradakiler
 *
 * Sebep: önceki haliyle 11 alt-bileşen tek scroll'da yığılıyordu, veli
 * "ne yapacağım?" gözlerini kaybediyordu. Tab ile bilişsel yük 1/3'e iner.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SessionSummary } from '@/lib/session/store';
import { computeBadgesForSession, type Badge } from '@/lib/gamification/badges';
import { gamificationStore } from '@/lib/gamification/store';
import { BadgeReveal } from '@/components/gamification/BadgeReveal';
import dynamic from 'next/dynamic';
import { AiReportPanel } from './AiReportPanel';
import { SportRecommendations } from './SportRecommendations';

// BioMotorRadar Recharts'ı içeriyor (~70 KB gzip). Sadece result ekranında
// gerekli — diğer sayfalardan main bundle'a sızmasın diye dynamic.
const BioMotorRadar = dynamic(
  () => import('./BioMotorRadar').then((m) => m.BioMotorRadar),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden="true"
        className="aspect-square w-full max-w-md animate-pulse rounded-2xl bg-[var(--color-surface)]"
      />
    ),
  }
);
import { InjuryWarning } from './InjuryWarning';
import {
  filterReferences,
  type ScienceReference,
} from '@/lib/content/bibliography';
import { ShareButton } from './ShareButton';
import { CoachChat } from './CoachChat';

const PdfExportButton = dynamic(
  () => import('./PdfExportButton').then((m) => m.PdfExportButton),
  { ssr: false, loading: () => <PdfExportSkeleton /> }
);

interface Props {
  session: SessionSummary;
  /**
   * Hangi çocuk için test yapıldı — sport enrollment per-child.
   * Demo/anonim akışlarda atlanırsa "Bu sporu seç" CTA'sı gizlenir.
   */
  childId?: string;
  /**
   * Önceden hazırlanmış rapor (mock/backup için). Verilirse API çağrısı
   * yapılmaz, doğrudan gösterilir.
   */
  precomputedReport?: string;
  precomputedReportSource?: 'claude' | 'fallback';
}

type TabKey = 'profile' | 'ai' | 'share';

const TABS: Array<{ key: TabKey; label: string; eyebrow: string }> = [
  { key: 'profile', label: 'Profil & Sonuç', eyebrow: '01' },
  { key: 'ai', label: 'AI Asistan', eyebrow: '02' },
  { key: 'share', label: 'Paylaş & Devam', eyebrow: '03' },
];

export function ResultScreen({
  session,
  childId,
  precomputedReport,
  precomputedReportSource,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('profile');
  // Eksik boyutlar 50 (popülasyon medyanı) ile gösterilir; "Ölçülmedi"
  // rozeti ayrıca aşağıda metric grid'inde belirir.
  const radarValues = useMemo(
    () => ({
      explosivePower: session.jump?.score ?? 50,
      horizontalPower: session.broadJump?.score ?? 50,
      balance: session.balance?.averageScore ?? 50,
      reaction: session.reaction?.ageNormScore ?? 50,
      agility: session.lateralHops?.score ?? 50,
      coordination: session.coordination?.score ?? 50,
      endurance: session.endurance?.score ?? 50,
    }),
    [session]
  );

  const topSport = session.recommendations?.[0];

  // Gamification: bu oturumda kazanılan rozetleri hesapla, store'a kaydet,
  // sadece YENİ olanlar reveal animasyonunda gösterilir.
  const [newBadges, setNewBadges] = useState<Badge[]>([]);
  const [totalBadgeCount, setTotalBadgeCount] = useState(0);
  useEffect(() => {
    const earned = computeBadgesForSession(session);
    const result = gamificationStore.unlock(earned);
    gamificationStore.recordSession();
    setNewBadges(result.newlyUnlocked);
    setTotalBadgeCount(result.allUnlocked.length);
  }, [session]);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section
        className="rounded-3xl border-2 p-8"
        style={{
          background:
            'linear-gradient(135deg, var(--color-surface-elevated) 0%, var(--color-surface) 100%)',
          borderColor: 'var(--color-line)',
        }}
      >
        <p
          className="text-xs font-bold tracking-[0.3em] uppercase"
          style={{
            color: 'var(--color-ink-3)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Yetenek Profili
        </p>
        <h1
          className="mt-2 text-4xl font-black md:text-5xl"
          style={{
            color: 'var(--form-navy)',
            fontFamily: 'var(--font-display)',
          }}
        >
          {session.child.name}
          <span style={{ color: 'var(--color-ink-3)' }}>
            {' · '}
            {session.child.ageYears} yaş
          </span>
        </h1>
        {topSport && (
          <p
            className="mt-4 max-w-2xl text-lg leading-relaxed md:text-xl"
            style={{ color: 'var(--color-ink-2)' }}
          >
            En güçlü uyumun{' '}
            <span
              className="font-black"
              style={{ color: 'var(--form-navy)' }}
            >
              {topSport.sport}
            </span>{' '}
            ile{' '}
            <span style={{ color: 'var(--color-ink-3)' }}>
              (%{topSport.confidencePercent} eşleşme)
            </span>
            . {topSport.reason}
          </p>
        )}
      </section>

      {/* Yeni kazanılan rozetler — her zaman üstte (mount-time animasyon) */}
      <BadgeReveal
        newlyUnlocked={newBadges}
        totalUnlocked={totalBadgeCount}
        onWalletClick={() => router.push('/profile')}
      />

      {/* Asimetri uyarısı — kritik, hep görünür */}
      {session.balance && (
        <InjuryWarning
          warnings={session.injuryWarnings}
          weakerSide={session.balance.weakerSide}
          asymmetryPercent={session.balance.asymmetryPercent}
        />
      )}

      {/* Tabs */}
      <TabBar tab={tab} onChange={setTab} />

      {/* Tab içerikleri */}
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'profile' && (
          <ProfileTab
            session={session}
            radarValues={radarValues}
            childId={childId}
          />
        )}
        {tab === 'ai' && (
          <div className="space-y-8">
            <AiReportPanel
              session={session}
              initialReport={precomputedReport}
              initialSource={precomputedReportSource}
            />
            <CoachChat session={session} />
          </div>
        )}
        {tab === 'share' && (
          <div className="space-y-8">
            <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <ShareButton session={session} />
              <PdfExportButton session={session} badges={newBadges} />
            </section>
            <NextSteps session={session} />
          </div>
        )}
      </div>
    </div>
  );
}

function TabBar({
  tab,
  onChange,
}: {
  tab: TabKey;
  onChange: (next: TabKey) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Sonuç ekranı bölümleri"
      className="flex flex-wrap gap-1 rounded-full border-2 p-1.5"
      style={{
        background: 'var(--color-surface-elevated)',
        borderColor: 'var(--color-line)',
      }}
    >
      {TABS.map((t) => {
        const active = tab === t.key;
        return (
          <button
            key={t.key}
            id={`tab-${t.key}`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={`panel-${t.key}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.key)}
            onKeyDown={(e) => {
              const idx = TABS.findIndex((x) => x.key === tab);
              if (e.key === 'ArrowRight') {
                e.preventDefault();
                onChange(TABS[(idx + 1) % TABS.length].key);
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                onChange(TABS[(idx - 1 + TABS.length) % TABS.length].key);
              }
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold tracking-wide transition-colors focus-visible:outline-none"
            style={{
              background: active ? 'var(--color-signal)' : 'transparent',
              color: active
                ? 'var(--form-navy)'
                : 'var(--color-ink-2)',
              boxShadow: active
                ? '0 4px 12px -4px rgba(242, 201, 76, 0.5)'
                : 'none',
              fontFamily: 'var(--font-display)',
            }}
          >
            <span
              aria-hidden="true"
              className="font-mono text-[10px] tracking-widest"
              style={{
                color: active
                  ? 'rgba(44, 62, 107, 0.55)'
                  : 'var(--color-ink-3)',
              }}
            >
              {t.eyebrow}
            </span>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

interface RadarValues {
  explosivePower: number;
  horizontalPower: number;
  balance: number;
  reaction: number;
  agility: number;
  coordination: number;
  endurance: number;
}

function ProfileTab({
  session,
  radarValues,
  childId,
}: {
  session: SessionSummary;
  radarValues: RadarValues;
  childId?: string;
}) {
  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div
          className="rounded-3xl border-2 p-6"
          style={{
            background: 'var(--color-surface-elevated)',
            borderColor: 'var(--color-line)',
          }}
        >
          <h3
            className="mb-4 text-xs font-bold tracking-[0.25em] uppercase"
            style={{
              color: 'var(--color-ink-3)',
              fontFamily: 'var(--font-display)',
            }}
          >
            Bio-Motor Profili
          </h3>
          <div className="flex justify-center">
            <BioMotorRadar {...radarValues} />
          </div>
        </div>

        <div>
          {session.recommendations && (
            <SportRecommendations
              recommendations={session.recommendations}
              childId={childId}
            />
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {session.jump && (
          <Metric
            label="Dikey Sıçrama"
            value={
              session.jump.jumpHeightCm != null
                ? `${session.jump.jumpHeightCm.toFixed(1)} cm`
                : `${session.jump.score.toFixed(0)}/100`
            }
            sub={
              session.jump.method
                ? `${session.jump.score.toFixed(0)} skor · ${methodLabel(session.jump.method)}`
                : `${session.jump.score.toFixed(0)} skor`
            }
            citationTag="jump"
            confidence={
              session.jump.consistent === false ? 'low' : 'high'
            }
          />
        )}
        {session.broadJump && (
          <Metric
            label="Uzun Atlama"
            value={
              session.broadJump.jumpDistanceCm != null
                ? `${session.broadJump.jumpDistanceCm.toFixed(0)} cm`
                : `${session.broadJump.score.toFixed(0)}/100`
            }
            sub={`${session.broadJump.score.toFixed(0)} skor`}
            citationTag="broadJump"
          />
        )}
        {session.balance && (
          <>
            <Metric
              label="Sağ Denge"
              value={`${session.balance.rightScore.toFixed(0)}`}
              sub="0-100"
              citationTag="balance"
            />
            <Metric
              label="Sol Denge"
              value={`${session.balance.leftScore.toFixed(0)}`}
              sub="0-100"
              citationTag="balance"
            />
          </>
        )}
        {session.reaction && (
          <Metric
            label="Reaksiyon"
            value={`${session.reaction.averageMs.toFixed(0)} ms`}
            sub={`En iyi ${session.reaction.bestMs.toFixed(0)}ms`}
            citationTag="reaction"
          />
        )}
        {session.lateralHops && (
          <Metric
            label="Çeviklik"
            value={`${session.lateralHops.hopCount}`}
            sub={`${session.lateralHops.score.toFixed(0)} skor · 15sn`}
            citationTag="agility"
          />
        )}
        {session.coordination && (
          <Metric
            label="Koordinasyon"
            value={`${session.coordination.score.toFixed(0)}`}
            sub={`${session.coordination.trackingEvents} dokunma`}
            citationTag="coordination"
          />
        )}
        {session.endurance && (
          <Metric
            label="Dayanıklılık"
            value={`${session.endurance.totalReps}`}
            sub={`30sn · %${session.endurance.decayPercent} yorgunluk`}
            citationTag="endurance"
          />
        )}
      </section>
    </div>
  );
}

function PdfExportSkeleton() {
  return (
    <div className="rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6 animate-pulse">
      <div className="h-3 w-16 rounded bg-[var(--color-line-strong)]" />
      <div className="mt-2 h-6 w-40 rounded bg-[var(--color-line-strong)]" />
      <div className="mt-2 h-4 w-full rounded bg-[var(--color-line-strong)]" />
      <div className="mt-5 h-11 w-full rounded-full bg-[var(--color-line-strong)]" />
    </div>
  );
}

/**
 * Jump test method'unu kullanıcı dostu Türkçe label'a çevirir.
 */
function methodLabel(
  method: 'flight-time' | 'hip-displacement' | 'consensus'
): string {
  switch (method) {
    case 'flight-time':
      return 'uçuş süresi';
    case 'hip-displacement':
      return 'kalça yer değişimi';
    case 'consensus':
      return 'çift doğrulama';
  }
}

/**
 * Metrik kartı + bilimsel kaynak rozeti + güven indikatörü.
 *
 * - `citationTag` verilirse ilgili tag'tedki ilk kaynak küçük rozet olarak
 *   gösterilir. Hover'da tam atıf native `title` ile çıkar.
 * - `confidence === 'low'` ise "düşük güven" rozeti görünür → kullanıcıya
 *   ölçümün doğruluğu hakkında dürüst sinyal.
 *
 * KISS: Popover/Modal yerine native title — dokunmatik, ekran okuyucu
 * uyumlu ve sıfır JS bağımlılığı.
 */
function Metric({
  label,
  value,
  sub,
  citationTag,
  confidence,
}: {
  label: string;
  value: string;
  sub?: string;
  citationTag?: ScienceReference['tags'][number];
  confidence?: 'high' | 'low';
}) {
  const citation = citationTag ? filterReferences(citationTag)[0] : null;
  return (
    <div
      className="rounded-2xl border-2 p-4"
      style={{
        background: 'var(--color-surface-elevated)',
        borderColor: 'var(--color-line)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div
          className="text-[10px] font-bold uppercase tracking-[0.18em]"
          style={{
            color: 'var(--color-ink-3)',
            fontFamily: 'var(--font-display)',
          }}
        >
          {label}
        </div>
        {citation && (
          <span
            className="rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
            style={{
              borderColor: 'rgba(242, 201, 76, 0.5)',
              background: 'rgba(242, 201, 76, 0.18)',
              color: 'var(--form-navy)',
            }}
            title={`${citation.authors} (${citation.year}). ${citation.title}. ${citation.journal}`}
            aria-label={`Bilimsel kaynak: ${citation.authors} ${citation.year}`}
          >
            {citation.authors.split(/[,&]/)[0].split(/\s+/).slice(-1)[0]}{' '}
            {citation.year}
          </span>
        )}
      </div>
      <div
        className="mt-1 text-2xl font-black"
        style={{
          color: 'var(--form-navy)',
          fontFamily: 'var(--font-display)',
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          className="mt-0.5 text-xs"
          style={{ color: 'var(--color-ink-3)' }}
        >
          {sub}
        </div>
      )}
      {confidence === 'low' && (
        <div
          className="mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          style={{
            borderColor: 'rgba(244, 182, 194, 0.7)',
            background: 'rgba(244, 182, 194, 0.25)',
            color: 'var(--deep-navy)',
          }}
          title="Flight-time ve hip-displacement yöntemleri arasında %30'dan fazla fark var. Sahne ışığı veya pozisyon ölçümü etkilemiş olabilir."
          aria-label="Düşük güven uyarısı"
        >
          ⚠ düşük güven
        </div>
      )}
    </div>
  );
}

function NextSteps({ session }: { session: SessionSummary }) {
  // En zayıf boyutu bul → ona özel antrenman programını öne çıkar.
  const dimensions: Array<{
    key: string;
    score: number;
    label: string;
  }> = [];
  if (session.jump)
    dimensions.push({
      key: 'explosivePower',
      score: session.jump.score,
      label: 'Dikey patlayıcı',
    });
  if (session.broadJump)
    dimensions.push({
      key: 'horizontalPower',
      score: session.broadJump.score,
      label: 'Yatay patlayıcı',
    });
  if (session.balance)
    dimensions.push({
      key: 'balance',
      score: session.balance.averageScore,
      label: 'Denge',
    });
  if (session.reaction)
    dimensions.push({
      key: 'reaction',
      score: session.reaction.ageNormScore,
      label: 'Reaksiyon',
    });
  if (session.lateralHops)
    dimensions.push({
      key: 'agility',
      score: session.lateralHops.score,
      label: 'Çeviklik',
    });
  if (session.coordination)
    dimensions.push({
      key: 'coordination',
      score: session.coordination.score,
      label: 'Koordinasyon',
    });
  if (session.endurance)
    dimensions.push({
      key: 'endurance',
      score: session.endurance.score,
      label: 'Dayanıklılık',
    });

  const weakest = [...dimensions].sort((a, b) => a.score - b.score)[0];
  const topSport = session.recommendations?.[0];
  const sportSlug = topSport
    ? topSport.sport
        .toLocaleLowerCase('tr-TR')
        .replace(/—/g, '-')
        .replace(/\s+/g, '-')
        .replace(/ç/g, 'c')
        .replace(/ş/g, 's')
        .replace(/ğ/g, 'g')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ü/g, 'u')
    : null;

  return (
    <div
      className="rounded-3xl border-2 p-6"
      style={{
        background: 'var(--color-surface-elevated)',
        borderColor: 'var(--color-line)',
      }}
    >
      <p
        className="text-xs font-bold tracking-[0.25em] uppercase"
        style={{
          color: 'var(--color-ink-3)',
          fontFamily: 'var(--font-display)',
        }}
      >
        Sonraki Adımlar
      </p>
      <h3
        className="mt-2 text-xl font-black md:text-2xl"
        style={{
          color: 'var(--form-navy)',
          fontFamily: 'var(--font-display)',
        }}
      >
        Test bitti. Şimdi ne yapsak?
      </h3>
      <ul className="mt-5 space-y-3">
        {weakest && (
          <NextStepRow
            href={`/training/${weakest.key}`}
            label={`${weakest.label} antrenmanı`}
            sub={`En düşük skorlu boyut · ${weakest.score.toFixed(0)} / 100`}
          />
        )}
        {sportSlug && (
          <NextStepRow
            href={`/sports/${sportSlug}`}
            label={`${topSport!.sport} rehberi`}
            sub={`Başlama yaşı, donanım, federasyon`}
          />
        )}
        <NextStepRow
          href="/profile"
          label="Yeni test başlat"
          sub="Profilden çocuk seç, ilerlemeyi tekrar ölç"
        />
        <NextStepRow
          href="/profile"
          label="Cüzdanımı aç"
          sub="Rozetlerin ve süreklilik takibin"
        />
      </ul>
    </div>
  );
}

function NextStepRow({
  href,
  label,
  sub,
}: {
  href: string;
  label: string;
  sub: string;
}) {
  return (
    <li>
      <a
        href={href}
        className="group flex items-center justify-between rounded-2xl border-2 p-4 transition-colors hover:bg-[var(--color-surface)]"
        style={{
          background: 'var(--color-canvas)',
          borderColor: 'var(--color-line)',
        }}
      >
        <div className="min-w-0">
          <div
            className="font-bold"
            style={{
              color: 'var(--form-navy)',
              fontFamily: 'var(--font-display)',
            }}
          >
            {label}
          </div>
          <div
            className="mt-0.5 text-xs"
            style={{ color: 'var(--color-ink-2)' }}
          >
            {sub}
          </div>
        </div>
        <span
          aria-hidden="true"
          className="font-bold transition-transform group-hover:translate-x-1"
          style={{ color: 'var(--color-signal)' }}
        >
          →
        </span>
      </a>
    </li>
  );
}
