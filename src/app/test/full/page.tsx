/**
 * Tam test akışı v2: profil → 7 test → sonuç.
 *
 * Akış orkestrasyonu:
 *   1. profile        → ProfileForm
 *   2. cmj            → JumpTest (dikey patlayıcı)
 *   3. broadJump      → BroadJumpTest (yatay patlayıcı)
 *   4. balance        → BalanceTest (denge + asimetri)
 *   5. lateralHops    → LateralHopsTest (çeviklik)
 *   6. reaction       → ReactionTest (refleks)
 *   7. coordination   → CoordinationTest (göz-el)
 *   8. endurance      → EnduranceJacksTest (anaerobik)
 *   9. result         → ResultScreen
 *
 * Tek akış var: yedi testin tamamı. Kısaltılmış varyant bilinçli olarak yok —
 * eksik boyutu medyanla doldurmak, ölçülmemiş bir şeyi ölçülmüş gibi
 * raporlamak demekti.
 *
 * Not: bataryada bir 8. adım olarak 14 soruluk bir "Karakter" Likert anketi
 * (öz-bildirim kişilik profili) vardı; kaldırıldı. Bio-motor testler
 * gözlemlenen fiziksel performansı ölçüyor, anket ise çocuğun kendi
 * hakkındaki beyanına dayanıyordu — bu ürünün iddiasıyla (kamerayla ölçülen,
 * gözlemsel bio-motor profil) aynı kategoride değildi. `character/*` analiz
 * kodu ve `Session.character` alanı geçmiş kayıtları bozmamak için duruyor;
 * yalnız akıştan çıkarıldı.
 */

'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { JumpTest } from '@/components/tests/JumpTest';
import { BroadJumpTest } from '@/components/tests/BroadJumpTest';
import { BalanceTest } from '@/components/tests/BalanceTest';
import { LateralHopsTest } from '@/components/tests/LateralHopsTest';
import { ReactionTest } from '@/components/tests/ReactionTest';
import { CoordinationTest } from '@/components/tests/CoordinationTest';
import { EnduranceJacksTest } from '@/components/tests/EnduranceJacksTest';
import { ProfileForm } from '@/components/flow/ProfileForm';
import { PhaseHeader, FULL_FLOW_STEP_LABELS } from '@/components/flow/PhaseHeader';
import { ResultScreen } from '@/components/result/ResultScreen';
import {
  sessionStore,
  type ChildIdentity,
  type SessionSummary,
} from '@/lib/session/store';
import { historyStore } from '@/lib/history/store';
import { disposePoseLandmarker } from '@/lib/pose/detector';
import { computeBadgesForSession } from '@/lib/gamification/badges';
import { recordChildSessionAction } from '@/app/children/[id]/actions';
import type { JumpAnalysis } from '@/lib/tests/jump';
import type { BroadJumpAnalysis } from '@/lib/tests/broadJump';
import type { BalanceAnalysis } from '@/lib/tests/balance';
import type { LateralHopsAnalysis } from '@/lib/tests/lateralHops';
import type { ReactionAnalysis } from '@/lib/tests/reaction';
import type { CoordinationAnalysis } from '@/lib/tests/coordination';
import type { EnduranceJacksAnalysis } from '@/lib/tests/enduranceJacks';

type Phase =
  | 'profile'
  | 'cmj'
  | 'broadJump'
  | 'balance'
  | 'lateralHops'
  | 'reaction'
  | 'coordination'
  | 'endurance'
  | 'result';

const PHASE_ORDER: Phase[] = [
  'cmj',
  'broadJump',
  'balance',
  'lateralHops',
  'reaction',
  'coordination',
  'endurance',
];

interface DoneFlags {
  cmj: boolean;
  broadJump: boolean;
  balance: boolean;
  lateralHops: boolean;
  reaction: boolean;
  coordination: boolean;
  endurance: boolean;
}

const EMPTY_DONE: DoneFlags = {
  cmj: false,
  broadJump: false,
  balance: false,
  lateralHops: false,
  reaction: false,
  coordination: false,
  endurance: false,
};

export default function FullFlowPage() {
  return (
    <Suspense
      fallback={
        <main
          className="min-h-screen p-4"
          style={{
            background: 'var(--whistle-cream)',
            color: 'var(--form-navy)',
          }}
        >
          <div className="mx-auto max-w-5xl pt-12 text-center opacity-70">
            Yükleniyor…
          </div>
        </main>
      }
    >
      <FullFlowInner />
    </Suspense>
  );
}

function FullFlowInner() {
  const searchParams = useSearchParams();
  const childIdParam = searchParams.get('childId');

  const [phase, setPhase] = useState<Phase>('profile');
  const [child, setChild] = useState<ChildIdentity | null>(null);
  const [done, setDone] = useState<DoneFlags>(EMPTY_DONE);
  const [finalSession, setFinalSession] = useState<SessionSummary | null>(null);
  const [childLoadError, setChildLoadError] = useState<string | null>(null);

  // childId query param varsa: profile form'unu atla, child'ı API'den getir,
  // sessionStore'u başlat. Hata olursa form'a düşer ve mesaj gösterilir.
  useEffect(() => {
    if (!childIdParam || child) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/children/${encodeURIComponent(childIdParam)}`
        );
        if (!res.ok) {
          if (cancelled) return;
          const code =
            res.status === 401
              ? 'Önce giriş yap.'
              : res.status === 404
                ? 'Çocuk bulunamadı.'
                : 'Çocuk bilgisi getirilemedi.';
          setChildLoadError(code);
          return;
        }
        const json: {
          child?: {
            displayName: string;
            ageYears: number;
            sex: 'male' | 'female';
            heightCm?: number;
            weightKg?: number;
          };
        } = await res.json();
        if (cancelled || !json.child) return;
        const identity: ChildIdentity = {
          name: json.child.displayName,
          ageYears: json.child.ageYears,
          sex: json.child.sex,
          heightCm: json.child.heightCm,
          weightKg: json.child.weightKg,
        };
        sessionStore.start(identity);
        setChild(identity);
        setPhase(PHASE_ORDER[0]);
      } catch {
        if (!cancelled) {
          setChildLoadError('Bağlantı hatası, tekrar dene.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // child set olduktan sonra yeniden tetiklenmemeli — child guard
    // zaten engelliyor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childIdParam]);

  const currentStepIndex = useMemo(() => {
    if (phase === 'profile' || phase === 'result') return -1;
    return PHASE_ORDER.indexOf(phase);
  }, [phase]);

  // Result fazı: finalize + persist.
  //
  // KAYIT STRATEJİSİ (dual-write):
  //   1. localStorage history (her zaman) → /history sayfası, offline-first
  //      fallback. Anon kullanıcı veya Supabase down → veri burada kalır.
  //   2. Supabase sessions + child_badges (yalnız childId varsa + auth'lı).
  //      → /children/[id] sayfasının kanonik kaynağı, RLS ile veliye kilitli.
  //
  // childIdParam yoksa: tek-seferlik anonim test akışı (örn. demo veya
  // çocuk profili yokken). Sonuç sadece cihazda kalır.
  //
  // MediaPipe PoseLandmarker'ı dispose ediyoruz — GPU/WASM tahsisleri
  // (~10MB) result ekranı boyunca tutulmaya gerek yok, mobile cihazlarda
  // diğer demolarla çakışmayı önler.
  useEffect(() => {
    if (phase !== 'result') return;
    void disposePoseLandmarker();
    const final = sessionStore.finalize();
    if (!final) return;
    setFinalSession(final);
    if (!final.completedAt) return;

    // (1) Her durumda localStorage'a yaz (offline-first fallback).
    historyStore.add(final);

    // (2) Supabase persist — yalnız childId varsa.
    if (!childIdParam) return;
    const earnedBadgeIds = computeBadgesForSession(final).map((b) => b.id);
    void recordChildSessionAction({
      childId: childIdParam,
      summary: final,
      earnedBadgeIds,
      startedAt: final.startedAt,
      completedAt: final.completedAt,
    }).then((result) => {
      // Fire-and-forget; ancak hatayı sessizce yutmuyoruz. Console'a
      // düşürüp Sentry/Logger entegrasyonu eklendiğinde otomatik
      // yakalanacak. Kullanıcı localStorage kopyasını /history'de görür.
      if (!result.ok) {
        console.warn(
          '[test/full] Supabase session kaydı başarısız:',
          result.error
        );
      }
    });
    // phase tek tetikleyici; childIdParam zaten ilk mount'tan sabit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const handleProfileSubmit = (c: ChildIdentity) => {
    sessionStore.start(c);
    setChild(c);
    setPhase(PHASE_ORDER[0]);
  };

  const advanceFrom = (key: keyof DoneFlags) => {
    setDone((d) => ({ ...d, [key]: false }));
    const idx = PHASE_ORDER.indexOf(key as Phase);
    const next = PHASE_ORDER[idx + 1];
    setPhase(next ?? 'result');
  };

  const skipCurrent = () => {
    if (phase === 'profile' || phase === 'result') return;
    const idx = PHASE_ORDER.indexOf(phase);
    const next = PHASE_ORDER[idx + 1];
    setPhase(next ?? 'result');
  };

  const restart = () => {
    sessionStore.clear();
    setChild(null);
    setDone(EMPTY_DONE);
    setFinalSession(null);
    setPhase('profile');
  };

  const stepNumber = currentStepIndex + 1;

  return (
    <main
      className="min-h-screen p-4 sm:p-6 md:p-12"
      style={{
        background: 'var(--whistle-cream)',
        color: 'var(--form-navy)',
      }}
    >
      <div className="mx-auto max-w-5xl space-y-6">
        <BrandHeader />

        {phase === 'profile' && (
          <>
            {childLoadError && (
              <div
                className="mx-auto mb-4 max-w-xl rounded-xl border-2 px-4 py-3 text-sm"
                style={{
                  background: 'rgba(244, 182, 194, 0.2)',
                  borderColor: 'var(--mindar-pink)',
                  color: 'var(--deep-navy)',
                }}
                role="alert"
              >
                {childLoadError}
              </div>
            )}
            {!childIdParam && (
              <div
                className="mx-auto mb-4 flex max-w-xl flex-col items-start gap-2 rounded-xl border-2 px-4 py-3 text-sm md:flex-row md:items-center md:justify-between"
                style={{
                  background: 'rgba(168, 213, 186, 0.18)',
                  borderColor: 'var(--field-mint)',
                  color: 'var(--deep-navy)',
                }}
                role="status"
              >
                <span>
                  Çocuğun bilgisini her test öncesi tekrar girmen gerekmesin
                  diye <strong>profil sayfasında çocuk ekle</strong>.
                </span>
                <a
                  href="/profile"
                  className="inline-flex shrink-0 items-center justify-center rounded-full px-4 py-1.5 text-xs font-bold tracking-widest uppercase transition-transform hover:scale-[1.03]"
                  style={{
                    background: 'var(--track-mustard)',
                    color: 'var(--form-navy)',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  Profil sayfası
                </a>
              </div>
            )}
            <ProfileForm onSubmit={handleProfileSubmit} />
          </>
        )}

        {phase === 'cmj' && child && (
          <PhaseShell
            childName={child.name}
            done={done.cmj}
            onAdvance={() => advanceFrom('cmj')}
            stepNumber={stepNumber}
            stepLabels={FULL_FLOW_STEP_LABELS}
            onSkip={skipCurrent}
            advanceLabel={
              PHASE_ORDER.length === stepNumber
                ? 'Sonuçları Gör'
                : 'Sonraki Teste Geç'
            }
          >
            <JumpTest
              childAgeYears={child.ageYears}
              childSex={child.sex}
              childHeightCm={child.heightCm}
              onComplete={(analysis) => {
                if (!analysis.valid) return;
                sessionStore.recordJump(
                  analysis as JumpAnalysis & { score: number | null },
                  analysis.techniqueMultiplier,
                  analysis.judgeInjuryWarnings
                );
                setDone((d) => ({ ...d, cmj: true }));
              }}
            />
          </PhaseShell>
        )}

        {phase === 'broadJump' && child && (
          <PhaseShell
            childName={child.name}
            done={done.broadJump}
            onAdvance={() => advanceFrom('broadJump')}
            stepNumber={stepNumber}
            stepLabels={FULL_FLOW_STEP_LABELS}
            onSkip={skipCurrent}
          >
            <BroadJumpTest
              childAgeYears={child.ageYears}
              childSex={child.sex}
              childHeightCm={child.heightCm}
              onComplete={(analysis) => {
                // Skor null olabilir (mesafe kalibre edilemedi). Cast'in
                // yalan olmaması için burada eleniyor — test yine de
                // tamamlanmış sayılıyor, kullanıcı çıkmazda kalmıyor.
                if (!analysis.valid || analysis.score == null) return;
                sessionStore.recordBroadJump(
                  analysis as BroadJumpAnalysis & { score: number },
                  analysis.techniqueMultiplier,
                  analysis.judgeInjuryWarnings
                );
                setDone((d) => ({ ...d, broadJump: true }));
              }}
            />
          </PhaseShell>
        )}

        {phase === 'balance' && child && (
          <PhaseShell
            childName={child.name}
            done={done.balance}
            onAdvance={() => advanceFrom('balance')}
            stepNumber={stepNumber}
            stepLabels={FULL_FLOW_STEP_LABELS}
            onSkip={skipCurrent}
          >
            <BalanceTest
              childAgeYears={child.ageYears}
              onComplete={(analysis) => {
                sessionStore.recordBalance(
                  analysis as BalanceAnalysis,
                  analysis.techniqueMultiplier,
                  analysis.judgeInjuryWarnings
                );
                if (
                  analysis.right.hasEnoughData &&
                  analysis.left.hasEnoughData
                ) {
                  setDone((d) => ({ ...d, balance: true }));
                }
              }}
            />
          </PhaseShell>
        )}

        {phase === 'lateralHops' && child && (
          <PhaseShell
            childName={child.name}
            done={done.lateralHops}
            onAdvance={() => advanceFrom('lateralHops')}
            stepNumber={stepNumber}
            stepLabels={FULL_FLOW_STEP_LABELS}
            onSkip={skipCurrent}
          >
            <LateralHopsTest
              childAgeYears={child.ageYears}
              childSex={child.sex}
              onComplete={(analysis) => {
                if (!analysis.valid) return;
                sessionStore.recordLateralHops(
                  analysis as LateralHopsAnalysis & { score: number },
                  analysis.techniqueMultiplier,
                  analysis.judgeInjuryWarnings
                );
                setDone((d) => ({ ...d, lateralHops: true }));
              }}
            />
          </PhaseShell>
        )}

        {phase === 'reaction' && child && (
          <PhaseShell
            childName={child.name}
            done={done.reaction}
            onAdvance={() => advanceFrom('reaction')}
            stepNumber={stepNumber}
            stepLabels={FULL_FLOW_STEP_LABELS}
            onSkip={skipCurrent}
          >
            <ReactionTest
              childAgeYears={child.ageYears}
              onComplete={(analysis) => {
                sessionStore.recordReaction(analysis as ReactionAnalysis);
                setDone((d) => ({ ...d, reaction: true }));
              }}
            />
          </PhaseShell>
        )}

        {phase === 'coordination' && child && (
          <PhaseShell
            childName={child.name}
            done={done.coordination}
            onAdvance={() => advanceFrom('coordination')}
            stepNumber={stepNumber}
            stepLabels={FULL_FLOW_STEP_LABELS}
            onSkip={skipCurrent}
          >
            <CoordinationTest
              onComplete={(analysis) => {
                if (!analysis.valid) return;
                sessionStore.recordCoordination(
                  analysis as CoordinationAnalysis,
                  analysis.techniqueMultiplier,
                  analysis.judgeInjuryWarnings
                );
                setDone((d) => ({ ...d, coordination: true }));
              }}
              onSkip={skipCurrent}
            />
          </PhaseShell>
        )}

        {phase === 'endurance' && child && (
          <PhaseShell
            childName={child.name}
            done={done.endurance}
            onAdvance={() => advanceFrom('endurance')}
            stepNumber={stepNumber}
            stepLabels={FULL_FLOW_STEP_LABELS}
            onSkip={skipCurrent}
            advanceLabel="Sonuçları Gör"
          >
            <EnduranceJacksTest
              childAgeYears={child.ageYears}
              childSex={child.sex}
              onComplete={(analysis) => {
                if (!analysis.valid) return;
                sessionStore.recordEndurance(
                  analysis as EnduranceJacksAnalysis & { score: number },
                  analysis.techniqueMultiplier,
                  analysis.judgeInjuryWarnings
                );
                setDone((d) => ({ ...d, endurance: true }));
              }}
            />
          </PhaseShell>
        )}

        {phase === 'result' &&
          (finalSession ? (
            <ResultStage
              session={finalSession}
              onRestart={restart}
              childId={childIdParam ?? undefined}
            />
          ) : (
            <FinalizingStage />
          ))}
      </div>
    </main>
  );
}

function BrandHeader() {
  return (
    <header
      className="flex items-center justify-between gap-4 border-b pb-5"
      style={{ borderColor: 'rgba(44, 62, 107, 0.2)' }}
    >
      <Link
        href="/"
        className="text-base font-black tracking-[0.3em] sm:text-lg"
        style={{
          color: 'var(--form-navy)',
          fontFamily: 'var(--font-display)',
        }}
      >
        YETENEK
      </Link>
      <div className="flex items-center gap-3 text-[11px]">
        <span
          className="font-mono tracking-[0.25em] uppercase"
          style={{ color: 'rgba(44, 62, 107, 0.6)' }}
        >
          Tam Akış
        </span>
      </div>
    </header>
  );
}

interface PhaseShellProps {
  childName: string;
  done: boolean;
  onAdvance: () => void;
  onSkip?: () => void;
  advanceLabel?: string;
  stepNumber: number;
  stepLabels: string[];
  children: React.ReactNode;
}

function PhaseShell({
  childName,
  done,
  onAdvance,
  onSkip,
  advanceLabel = 'Sonraki Teste Geç',
  stepNumber,
  stepLabels,
  children,
}: PhaseShellProps) {
  // NOT: Eskiden burada ekstra bir Countdown + VoiceCoach vardı; her test
  // componentinin kendi inline countdown'u (TestStage içinde, 3-2-1-ZIPLA!)
  // ve sesli rehberliği (speak()) zaten olduğu için **çift sayım** yaratıyordu.
  // Kaldırıldı — testlerin kendi countdown'u tek doğruluk-kaynağı.
  return (
    <div className="space-y-6">
      <PhaseHeader
        current={stepNumber}
        labels={stepLabels}
        childName={childName}
      />

      {children}
      {/* İlerle barı — HER ZAMAN görünür. done=true ise primary mustard
          "Sonraki Teste Geç", false ise outline "Atla ve İlerle" (test
          tamamlanmasa bile kullanıcı sıkışmasın). */}
      <div
        className="flex flex-col items-start justify-between gap-4 rounded-2xl border-2 p-5 sm:flex-row sm:items-center"
        style={
          done
            ? {
                background: 'rgba(168, 213, 186, 0.22)',
                borderColor: 'var(--field-mint)',
              }
            : {
                background: 'rgba(44, 62, 107, 0.04)',
                borderColor: 'rgba(44, 62, 107, 0.18)',
              }
        }
      >
        <div>
          <p
            className="text-sm font-bold"
            style={{
              color: 'var(--form-navy)',
              fontFamily: 'var(--font-display)',
            }}
          >
            {done ? '✓ Test sonuçları kaydedildi' : 'Test henüz tamamlanmadı'}
          </p>
          <p
            className="mt-0.5 text-xs"
            style={{ color: 'rgba(44, 62, 107, 0.7)' }}
          >
            {done
              ? 'Hazır olduğunda devam et. Daha iyi yapabileceğini düşünüyorsan testi tekrar deneyebilirsin.'
              : 'Sorun yaşıyorsan veya geçmek istiyorsan İlerle ile sonraki adıma geçebilirsin.'}
          </p>
        </div>
        <button
          type="button"
          onClick={done ? onAdvance : (onSkip ?? onAdvance)}
          className="h-11 shrink-0 rounded-full px-5 text-sm font-black tracking-wide transition-transform hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          style={
            done
              ? {
                  background: 'var(--track-mustard)',
                  color: 'var(--form-navy)',
                  fontFamily: 'var(--font-display)',
                  boxShadow: '0 4px 0 rgba(44, 62, 107, 0.18)',
                }
              : {
                  background: 'rgba(255, 255, 255, 0.85)',
                  color: 'var(--form-navy)',
                  border: '2px solid var(--form-navy)',
                  fontFamily: 'var(--font-display)',
                }
          }
        >
          {/* Hangi yöne gittiğini de söyle — "İlerle"den daha bilgilendirici. */}
          {advanceLabel} →
        </button>
      </div>
      {!done && onSkip && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onSkip}
            className="rounded-full border px-4 py-2 text-xs font-bold tracking-wider uppercase transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            style={{
              borderColor: 'rgba(44, 62, 107, 0.3)',
              color: 'rgba(44, 62, 107, 0.75)',
              fontFamily: 'var(--font-display)',
            }}
          >
            Bu testi atla
          </button>
        </div>
      )}
    </div>
  );
}

function FinalizingStage() {
  return (
    <div
      className="rounded-3xl border-2 p-12 text-center"
      style={{
        background: 'rgba(255, 255, 255, 0.6)',
        borderColor: 'rgba(44, 62, 107, 0.18)',
      }}
    >
      <div
        className="text-2xl font-black"
        style={{
          color: 'var(--form-navy)',
          fontFamily: 'var(--font-display)',
        }}
      >
        Sonuçlar hazırlanıyor…
      </div>
      <div className="mt-2 text-sm" style={{ color: 'rgba(44, 62, 107, 0.7)' }}>
        AI tüm test verilerini birleştiriyor.
      </div>
    </div>
  );
}

function ResultStage({
  session,
  onRestart,
  childId,
}: {
  session: SessionSummary;
  onRestart: () => void;
  childId?: string;
}) {
  const ageDescription = useMemo(
    () => `${session.child.name} · ${session.child.ageYears} yaş`,
    [session.child]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold" style={{ color: 'var(--form-navy)' }}>
          {ageDescription}
        </p>
        <button
          type="button"
          onClick={onRestart}
          className="rounded-full border px-4 py-2 text-xs font-bold tracking-wider uppercase transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          style={{
            borderColor: 'rgba(44, 62, 107, 0.3)',
            color: 'var(--form-navy)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Yeni Test
        </button>
      </div>
      <ResultScreen session={session} childId={childId} />
    </div>
  );
}
