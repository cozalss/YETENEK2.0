/**
 * Sıçrama (CMJ) testi UI bileşeni — premium 2-sütunlu layout.
 *
 * Akış — EN-İYİ-3 protokolü:
 *   1. IDLE      → editorial talimat sidebar'ı + canlı framing rozeti.
 *   2. COUNTDOWN → 3-2-1-BAŞLA geri sayım overlay'i (her deneme için).
 *   3. CAPTURE   → KAYIT pill + 5sn boyunca kalça Y serisi toplanıyor.
 *   4. ANALYZE   → analyzeJump() + geçerlilik kapısı çalışır.
 *   5. BETWEEN   → deneme sonucu kısa özet (~2sn) → otomatik sıradaki deneme.
 *   6. RESULT    → 3 denemenin EN İYİSİ (sidebar'da) + döküm + retry CTA.
 *
 * NEDEN en-iyi-3: spor bilimi CMJ protokolü standardı budur — tek deneme
 * yorgunluk/ısınmamış kas/tesadüfi teknik hatasını ortalamayla süzme şansı
 * bırakmaz. Reddedilen (geçerlilik kapısından geçemeyen) denemeler "en iyi"
 * seçimine girmez ama akışı durdurmaz — 3'ü de biterse en az bir geçerli
 * deneme varsa o gösterilir, hiçbiri geçerli değilse üçünün de kısa
 * gerekçesi listelenir.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { CameraStream } from '@/components/camera/CameraStream';
import { checkJumpFraming, type FramingStatus } from '@/lib/pose/framing';
import { cancelSpeech, speak } from '@/lib/a11y/speech';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { logger } from '@/shared/logger/logger';

const log = logger.child('jump-test');
import { TestStage } from '@/components/tests/shared/TestStage';
import { FramingBadge } from '@/components/tests/shared/FramingBadge';
import { InstructionsPanel } from '@/components/tests/shared/InstructionsPanel';
import { StartCTA } from '@/components/tests/shared/StartCTA';
import { GuideVideo } from '@/components/tests/shared/GuideVideo';
import {
  type HipSample,
  type JumpAnalysis,
  analyzeJump,
  calibrateJumpHeight,
  formatJumpHeightCm,
  frameToHipSample,
  jumpScore,
  pickBestJumpAttempt,
} from '@/lib/tests/jump';
import type { PoseFrame } from '@/types';
import { useValidityGate } from '@/hooks/use-validity-gate';
import { VisionBadge } from '@/components/tests/shared/VisionBadge';

type Phase = 'idle' | 'countdown' | 'capture' | 'analyze' | 'between' | 'result';

interface Props {
  childAgeYears?: number;
  childSex?: 'male' | 'female';
  childHeightCm?: number;
  onComplete?: (
    analysis: JumpAnalysis & {
      score: number | null;
      techniqueMultiplier?: number;
      judgeInjuryWarnings?: readonly string[];
    }
  ) => void;
}

const COUNTDOWN_SECONDS = 3;
const CAPTURE_SECONDS = 5;
/** Spor bilimi CMJ protokolü standardı: en-iyi-3 deneme. */
const TOTAL_ATTEMPTS = 3;
/** "Deneme 2/3 hazırlanıyor" ekranının otomatik ilerlemeden önce kalma süresi. */
const BETWEEN_ATTEMPTS_MS = 2200;

const STEPS = [
  'Telefonu / kamerayı yaklaşık 1.5 m yüksekliğe (sandalye, masa) koy. Yere koyma — kalça ve ayakların net görünsün.',
  'Kameradan 2-3 metre uzakta dik dur; tüm vücudun (baştan ayağa) ekrana sığsın.',
  'Sol-alt rozet "Hazır" yazana kadar pozisyonunu ayarla. Hazır olmadan başlatamazsın.',
  '3 deneme yapacaksın; her birinde 3-2-1 geri sayımının ardından 5 saniyelik kayıt başlar.',
  '1 saniye dik dur — sonra HIZLICA çömelip patlayıcı şekilde zıpla. En iyi denemen sonuç olarak kaydedilir.',
];

/** Tek bir denemenin sonucu — hem "arada" ekranında hem final dökümde kullanılıyor. */
interface AttemptOutcome {
  index: number; // 0-based
  /** "En iyi" seçimine girebilir mi (geçerlilik kapısından geçti + analiz valid). */
  accepted: boolean;
  analysis: JumpAnalysis;
  score: number | null;
  techniqueMultiplier: number;
  judgeInjuryWarnings: readonly string[];
  visionApplied: boolean;
  /** Reddedildiyse somut gerekçe (RejectionPanel'in kullandığı ipucu ya da analiz sebebi). */
  rejectionHint: string | null;
}

function shortAttemptLabel(a: AttemptOutcome): string {
  if (a.accepted && a.analysis.jumpHeightCm != null) {
    return formatJumpHeightCm(a.analysis.jumpHeightCm, a.analysis.jumpHeightSigmaCm);
  }
  return 'sayılmadı';
}

export function JumpTest({
  childAgeYears = 12,
  childSex = 'male',
  childHeightCm,
  onComplete,
}: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [attemptNumber, setAttemptNumber] = useState(1); // 1-based, for display
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [captureRemaining, setCaptureRemaining] = useState(CAPTURE_SECONDS);
  const [attempts, setAttempts] = useState<AttemptOutcome[]>([]);
  const [best, setBest] = useState<AttemptOutcome | null>(null);
  const [allFailed, setAllFailed] = useState(false);
  const [framing, setFraming] = useState<FramingStatus>({
    ready: false,
    hint: 'Pose tespit ediliyor…',
  });
  const reducedMotion = useReducedMotion();

  const samplesRef = useRef<HipSample[]>([]);
  const calibrationFrameRef = useRef<PoseFrame | null>(null);
  const captureActiveRef = useRef(false);
  const phaseRef = useRef<Phase>('idle');
  const lastFramingRef = useRef<FramingStatus | null>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement | null>(null);
  // Kontrol akışı senkron karar vermek zorunda (state güncellemesi async'tir);
  // `attempts` state'i yalnız render için, karar burada verilir.
  const attemptsRef = useRef<AttemptOutcome[]>([]);

  // onComplete'i ref'te sabitle. Parent inline arrow olarak verirse her
  // render'da yeni reference olur → analyze effect deps'ini değiştirir →
  // effect re-fire → sonuç store'a iki kez yazılır. Bu pattern her test
  // bileşeninde aynı şekilde kullanılır.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => () => cancelSpeech(), []);

  const gate = useValidityGate({ test: 'jump' });
  const gateCollect = gate.collect;
  const gateEvaluate = gate.evaluate;

  const handleFrame = useCallback((frame: PoseFrame | null) => {
    if (phaseRef.current === 'idle' || phaseRef.current === 'countdown') {
      const next = checkJumpFraming(frame);
      const prev = lastFramingRef.current;
      if (!prev || prev.ready !== next.ready || prev.hint !== next.hint) {
        lastFramingRef.current = next;
        setFraming(next);
      }
    }
    if (!frame) return;
    if (!captureActiveRef.current) return;
    // Hakem ham iskelete bakıyor: `HipSample` yalnız kalça/ayak Y'sini
    // taşıyor, "gövde ayakla birlikte yükseldi mi" sorusu orada yanıtlanamaz.
    gateCollect(frame);
    const sample = frameToHipSample(frame);
    if (!sample) return;
    if (!calibrationFrameRef.current) {
      calibrationFrameRef.current = frame;
    }
    samplesRef.current.push(sample);
  }, [gateCollect]);

  /** Tek bir denemeyi (countdown → capture) başlatır — hem ilk deneme hem sıradaki. */
  const beginAttempt = useCallback((n: number) => {
    gate.reset();
    samplesRef.current = [];
    calibrationFrameRef.current = null;
    captureActiveRef.current = false;
    setAttemptNumber(n);
    setCountdown(COUNTDOWN_SECONDS);
    setCaptureRemaining(CAPTURE_SECONDS);
    setPhase('countdown');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Baştan başlat: 3 denemelik yeni bir set. "Başla" ve "Tekrar Dene" kullanır. */
  const start = () => {
    attemptsRef.current = [];
    setAttempts([]);
    setBest(null);
    setAllFailed(false);
    beginAttempt(1);
  };

  // Countdown -> capture
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      speak('Zıpla', { interrupt: true });
      captureActiveRef.current = true;
      setPhase('capture');
      return;
    }
    speak(String(countdown), { interrupt: true });
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  useEffect(() => {
    if (phase !== 'capture') return;
    if (captureRemaining <= 0) {
      captureActiveRef.current = false;
      setPhase('analyze');
      return;
    }
    const t = setTimeout(() => setCaptureRemaining((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, captureRemaining]);

  useEffect(() => {
    if (phase !== 'analyze') return;
    let cancelled = false;

    void (async () => {
      // Geçerlilik kapısı analizden ÖNCE: geçersiz bir yakalama hiç
      // ölçülmemeli. Sonradan atılırsa aradaki her adımda geçerli sonuç gibi
      // görünür ve bir gün bir yerden sızar.
      const claimAnalysis = analyzeJump(samplesRef.current);
      const outcome = await gateEvaluate({
        valid: claimAnalysis.valid,
        primaryValue: claimAnalysis.jumpHeightCmFlight,
        unit: 'cm',
      });
      if (cancelled) return;
      finishAttempt(outcome);
    })();

    return () => {
      cancelled = true;
    };

    function finishAttempt(outcome: {
      allowed: boolean;
      sigmaMultiplier: number;
      injuryWarnings: readonly string[];
    }) {
      let attempt: AttemptOutcome;
      try {
        if (!outcome.allowed) {
          attempt = {
            index: attemptsRef.current.length,
            accepted: false,
            analysis: analyzeJump(samplesRef.current),
            score: null,
            techniqueMultiplier: 1,
            judgeInjuryWarnings: [],
            visionApplied: gate.visionApplied,
            rejectionHint: gate.rejection?.retryHint ?? 'Bu deneme sayılmadı.',
          };
        } else {
          let analysis = analyzeJump(samplesRef.current);
          if (
            analysis.valid &&
            childHeightCm != null &&
            calibrationFrameRef.current
          ) {
            analysis = calibrateJumpHeight(
              analysis,
              calibrationFrameRef.current,
              childHeightCm
            );
          }
          const computedScore =
            analysis.valid && analysis.jumpHeightCm != null
              ? jumpScore(analysis.jumpHeightCm, childAgeYears, childSex)
              : null;
          attempt = {
            index: attemptsRef.current.length,
            accepted: analysis.valid && analysis.jumpHeightCm != null,
            analysis,
            score: computedScore,
            techniqueMultiplier: outcome.sigmaMultiplier,
            judgeInjuryWarnings: outcome.injuryWarnings,
            visionApplied: gate.visionApplied,
            rejectionHint: analysis.valid ? null : (analysis.reason ?? null),
          };
        }
      } catch (err) {
        log.error('analiz hatası', {
          cause: err instanceof Error ? err.message : String(err),
        });
        attempt = {
          index: attemptsRef.current.length,
          accepted: false,
          analysis: {
            jumpUnits: 0,
            jumpHeightCm: null,
            jumpHeightCmHip: null,
            jumpHeightCmFlight: null,
            method: 'consensus',
            consistent: true,
            takeoffY: 0,
            apexY: 0,
            flightTimeMs: 0,
            jumpHeightSigmaCm: null,
            flightMethod: null,
            cmPerUnitFromGravity: null,
            ballisticFit: null,
            valid: false,
            reason: 'Analiz sırasında beklenmedik bir hata oluştu.',
          },
          score: null,
          techniqueMultiplier: 1,
          judgeInjuryWarnings: [],
          visionApplied: false,
          rejectionHint: 'Analiz sırasında beklenmedik bir hata oluştu.',
        };
      }

      attemptsRef.current = [...attemptsRef.current, attempt];
      setAttempts(attemptsRef.current);

      if (attemptsRef.current.length < TOTAL_ATTEMPTS) {
        setPhase('between');
        return;
      }

      // Üçüncü (son) deneme bitti — 3'ün en iyisini seç.
      const winner = pickBestJumpAttempt(attemptsRef.current);
      if (winner) {
        setBest(winner);
        setAllFailed(false);
        onCompleteRef.current?.({
          ...winner.analysis,
          score: winner.score,
          techniqueMultiplier: winner.techniqueMultiplier,
          judgeInjuryWarnings: winner.judgeInjuryWarnings,
        });
      } else {
        setBest(null);
        setAllFailed(true);
      }
      setPhase('result');
    }
    // onComplete kasten dışarıda: inline arrow olarak gelirse her parent
    // render'ında deps değişir, analyze etkisi yeniden ateşler ve test
    // sonucu store'a iki kez yazılır. Ref ile sabitledik.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, childAgeYears, childSex, childHeightCm, gateEvaluate]);

  // Between -> sıradaki deneme (otomatik).
  useEffect(() => {
    if (phase !== 'between') return;
    const nextAttempt = attemptsRef.current.length + 1;
    const t = setTimeout(() => beginAttempt(nextAttempt), BETWEEN_ATTEMPTS_MS);
    return () => clearTimeout(t);
  }, [phase, beginAttempt]);

  useEffect(() => {
    if (phase === 'result' && resultHeadingRef.current) {
      resultHeadingRef.current.focus();
    }
  }, [phase]);

  return (
    <TestStage
      cameraSlot={
        <>
          <CameraStream onFrame={handleFrame} width={640} height={480} />

          {phase === 'countdown' && (
            <CountdownOverlay
              value={countdown}
              reducedMotion={reducedMotion}
              attemptNumber={attemptNumber}
            />
          )}

          {phase === 'capture' && (
            <CapturePill
              remaining={captureRemaining}
              reducedMotion={reducedMotion}
              attemptNumber={attemptNumber}
            />
          )}

          {phase === 'analyze' && <AnalyzeOverlay />}

          {phase === 'between' && (
            <BetweenAttemptsOverlay
              lastAttempt={attempts[attempts.length - 1] ?? null}
              nextAttemptNumber={attemptNumber + 1}
            />
          )}

          {(phase === 'idle' || phase === 'countdown') && (
            <FramingBadge status={framing} />
          )}
        </>
      }
      belowCameraSlot={
        <GuideVideo
          src="/videos/cmj-sicrama-rehber.mp4"
          label="CMJ Sıçrama — örnek hareket"
          caption="Dik dur, hızlıca çömel, patlayıcı şekilde zıpla. Videoyu izlerken kendi denemeni yapabilirsin."
        />
      }
      sidebar={
        phase === 'result' && allFailed ? (
          <AllAttemptsFailedPanel attempts={attempts} onRetry={start} />
        ) : phase === 'result' && best ? (
          <div>
            <ResultCard
              best={best}
              attempts={attempts}
              onRetry={start}
              hasCalibration={childHeightCm != null}
              headingRef={resultHeadingRef}
            />
            <VisionBadge applied={best.visionApplied} />
          </div>
        ) : phase === 'idle' ? (
          <InstructionsPanel
            eyebrow="Test 01 · Patlayıcı Güç"
            title="Sıçrama (CMJ)"
            meta={`~30 sn · ${TOTAL_ATTEMPTS} deneme`}
            steps={STEPS}
            helper={!framing.ready ? framing.hint : undefined}
            cta={<StartCTA onStart={start} canStart={framing.ready} compact />}
            footer={
              <p
                className="text-center text-xs"
                style={{ color: 'var(--color-ink-3)' }}
              >
                Kayıt cihazda işlenir, sunucuya video gitmez.
              </p>
            }
          />
        ) : (
          <PhaseStatusCard phase={phase} attemptNumber={attemptNumber} />
        )
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Camera-overlay parçaları

function AttemptPill({ attemptNumber }: { attemptNumber: number }) {
  return (
    <span className="rounded-full bg-black/50 px-2.5 py-1 font-mono text-[10px] font-bold tracking-wider text-white/90 backdrop-blur-sm">
      DENEME {attemptNumber}/{TOTAL_ATTEMPTS}
    </span>
  );
}

function CountdownOverlay({
  value,
  reducedMotion,
  attemptNumber,
}: {
  value: number;
  reducedMotion: boolean;
  attemptNumber: number;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[2px]">
      <div className="absolute top-4 left-4">
        <AttemptPill attemptNumber={attemptNumber} />
      </div>
      <motion.div
        key={value}
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
        animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
        transition={{ duration: reducedMotion ? 0.15 : 0.3, ease: 'easeOut' }}
        className="font-display text-[10rem] leading-none font-black text-amber-400 drop-shadow-[0_8px_30px_rgba(251,191,36,0.4)]"
      >
        {value || 'ZIPLA!'}
      </motion.div>
    </div>
  );
}

function CapturePill({
  remaining,
  reducedMotion,
  attemptNumber,
}: {
  remaining: number;
  reducedMotion: boolean;
  attemptNumber: number;
}) {
  return (
    <>
      <div className="absolute top-4 left-4">
        <AttemptPill attemptNumber={attemptNumber} />
      </div>
      <div className="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-2xl ring-1 ring-red-400/50">
        <span
          className={`h-2 w-2 rounded-full bg-white ${reducedMotion ? '' : 'animate-pulse'}`}
        />
        KAYIT · {remaining}s
      </div>
    </>
  );
}

function AnalyzeOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/65 backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-full bg-neutral-900/90 px-5 py-3 text-base text-white shadow-2xl ring-1 ring-amber-400/30">
        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
        Analiz ediliyor…
      </div>
    </div>
  );
}

function BetweenAttemptsOverlay({
  lastAttempt,
  nextAttemptNumber,
}: {
  lastAttempt: AttemptOutcome | null;
  nextAttemptNumber: number;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-center backdrop-blur-sm">
      <div className="text-sm font-semibold tracking-wide text-white/70 uppercase">
        Deneme {(lastAttempt?.index ?? 0) + 1} sonucu
      </div>
      <div className="font-display text-4xl font-black text-white">
        {lastAttempt ? shortAttemptLabel(lastAttempt) : '—'}
      </div>
      {lastAttempt && !lastAttempt.accepted && (
        <div className="max-w-xs text-xs leading-relaxed text-white/70">
          {lastAttempt.rejectionHint}
        </div>
      )}
      <div className="mt-2 flex items-center gap-2 text-xs text-amber-300">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300" />
        {nextAttemptNumber}. deneme hazırlanıyor…
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar parçaları

function PhaseStatusCard({
  phase,
  attemptNumber,
}: {
  phase: Phase;
  attemptNumber: number;
}) {
  const messages: Record<
    Phase,
    { eyebrow: string; title: string; body: string }
  > = {
    idle: { eyebrow: '', title: '', body: '' },
    countdown: {
      eyebrow: `Deneme ${attemptNumber}/${TOTAL_ATTEMPTS}`,
      title: 'Hazırlanıyorsun',
      body: 'Geri sayım bittiğinde hızlıca patlayıcı bir sıçrama yap. Dik dur, çömel, zıpla.',
    },
    capture: {
      eyebrow: `Deneme ${attemptNumber}/${TOTAL_ATTEMPTS} · Kayıt aktif`,
      title: 'Sıçrayışın ölçülüyor',
      body: 'Kalça hareketin saniyede 30 frame ile kaydediliyor. Zıpladıktan sonra yere indikten sonra dik dur.',
    },
    analyze: {
      eyebrow: 'Hesaplanıyor',
      title: 'Deneme değerlendiriliyor',
      body: 'Sıçrama gerçekten yapılmış mı, ne kadar yükseldi — kontrol ediliyor.',
    },
    between: {
      eyebrow: 'Sırada',
      title: 'Bir sonraki denemeye geçiliyor',
      body: `3 denemenin en iyisi kaydedilecek — biraz nefeslen, ${attemptNumber + 1}. deneme birazdan başlıyor.`,
    },
    result: { eyebrow: '', title: '', body: '' },
  };
  const { eyebrow, title, body } = messages[phase];
  if (!title) return null;
  return (
    <div
      className="rounded-3xl border-2 p-7"
      style={{
        background: 'rgba(255, 255, 255, 0.7)',
        borderColor: 'rgba(44, 62, 107, 0.18)',
      }}
    >
      <p
        className="text-xs font-bold tracking-[0.25em] uppercase"
        style={{
          color: 'var(--color-ink-3)',
          fontFamily: 'var(--font-display)',
        }}
      >
        {eyebrow}
      </p>
      <h2
        className="mt-2 text-2xl font-black"
        style={{
          color: 'var(--form-navy)',
          fontFamily: 'var(--font-display)',
        }}
      >
        {title}
      </h2>
      <p
        className="mt-4 text-sm leading-relaxed"
        style={{ color: 'var(--color-ink-2)' }}
      >
        {body}
      </p>
    </div>
  );
}

/** 3 denemenin hiçbiri geçerli sayılmadığında gösterilen döküm + tekrar CTA'sı. */
function AllAttemptsFailedPanel({
  attempts,
  onRetry,
}: {
  attempts: readonly AttemptOutcome[];
  onRetry: () => void;
}) {
  return (
    <div
      className="rounded-3xl border-2 p-7"
      style={{
        background: 'rgba(244, 182, 194, 0.22)',
        borderColor: 'var(--mindar-pink)',
      }}
    >
      <h3
        className="text-xl font-black"
        style={{ color: 'var(--form-navy)', fontFamily: 'var(--font-display)' }}
      >
        3 denemenin hiçbiri sayılmadı
      </h3>
      <p
        className="mt-3 text-sm leading-relaxed"
        style={{ color: 'var(--color-ink-2)' }}
      >
        Merak etme — yanlış yapılan bir denemeyi kaydetmek yerine tekrar
        etmek sonucun doğru olmasını sağlıyor.
      </p>
      <ul className="mt-4 space-y-2">
        {attempts.map((a) => (
          <li
            key={a.index}
            className="rounded-xl border bg-white/60 p-3 text-xs leading-relaxed"
            style={{ borderColor: 'rgba(44, 62, 107, 0.12)', color: 'var(--color-ink-2)' }}
          >
            <span className="font-bold" style={{ color: 'var(--form-navy)' }}>
              Deneme {a.index + 1}:
            </span>{' '}
            {a.rejectionHint ?? 'Sayılmadı.'}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 h-11 w-full rounded-full text-sm font-black tracking-wide transition-transform hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        style={{
          background: 'var(--track-mustard)',
          color: 'var(--form-navy)',
          fontFamily: 'var(--font-display)',
          boxShadow: '0 4px 0 rgba(44, 62, 107, 0.18)',
        }}
      >
        3 Denemeyi Tekrarla
      </button>
    </div>
  );
}

function ResultCard({
  best,
  attempts,
  onRetry,
  hasCalibration,
  headingRef,
}: {
  best: AttemptOutcome;
  attempts: readonly AttemptOutcome[];
  onRetry: () => void;
  hasCalibration: boolean;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
}) {
  const { analysis: result, score } = best;
  return (
    <div
      className="rounded-3xl border-2 p-7"
      style={{
        background: 'rgba(168, 213, 186, 0.22)',
        borderColor: 'var(--field-mint)',
      }}
    >
      <p
        className="text-xs font-bold tracking-[0.25em] uppercase"
        style={{
          color: 'var(--form-navy)',
          opacity: 0.7,
          fontFamily: 'var(--font-display)',
        }}
      >
        Tamam · 01 · 3 denemenin en iyisi
      </p>
      <h3
        ref={headingRef}
        tabIndex={-1}
        className="mt-2 text-2xl font-black focus-visible:outline-none"
        style={{
          color: 'var(--form-navy)',
          fontFamily: 'var(--font-display)',
        }}
      >
        Sıçrama kaydedildi
      </h3>

      <dl className="mt-5 space-y-3">
        <Stat
          label="Sıçrama yüksekliği"
          value={
            result.jumpHeightCm != null
              ? formatJumpHeightCm(result.jumpHeightCm, result.jumpHeightSigmaCm)
              : `${(result.jumpUnits * 100).toFixed(1)} br`
          }
          accent
        />
        <Stat
          label="Hava süresi (yakl.)"
          value={`${result.flightTimeMs.toFixed(0)} ms`}
        />
        {score != null && (
          <Stat
            label="Yaş norm skoru"
            value={`${score.toFixed(0)} / 100`}
            accent
          />
        )}
      </dl>

      {result.jumpHeightSigmaCm != null && result.jumpHeightCm != null && (
        <p
          className="mt-3 text-xs leading-relaxed"
          style={{ color: 'var(--color-ink-3)' }}
        >
          Gösterilen değer bir aralık: tek telefon kamerasından, tek bir
          denemeden gelen ölçümün belirsizliğini (±) yansıtıyor — nokta bir
          gerçek değil, en olası bant.
        </p>
      )}

      {attempts.length > 1 && (
        <div className="mt-5 border-t pt-4" style={{ borderColor: 'rgba(44, 62, 107, 0.18)' }}>
          <p
            className="text-[10px] font-bold tracking-[0.2em] uppercase"
            style={{ color: 'var(--color-ink-3)', fontFamily: 'var(--font-display)' }}
          >
            3 Denemenin Dökümü
          </p>
          <ul className="mt-2 space-y-1.5">
            {attempts.map((a) => (
              <li
                key={a.index}
                className="flex items-center justify-between text-xs"
                style={{ color: 'var(--color-ink-2)' }}
              >
                <span>Deneme {a.index + 1}</span>
                <span
                  className="font-mono font-bold"
                  style={{
                    color:
                      a.index === best.index
                        ? 'var(--form-navy)'
                        : 'var(--color-ink-3)',
                  }}
                >
                  {shortAttemptLabel(a)}
                  {a.index === best.index ? ' · en iyi' : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!hasCalibration && (
        <p
          className="mt-5 text-xs leading-relaxed"
          style={{ color: 'var(--color-ink-2)' }}
        >
          Çocuk boyu girilmediği için yükseklik yaklaşık. Boy verilirse cm'e
          dönüştürülür.
        </p>
      )}

      <button
        type="button"
        onClick={onRetry}
        className="mt-6 h-11 w-full rounded-full text-base font-black tracking-wide transition-transform hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        style={{
          background: 'var(--track-mustard)',
          color: 'var(--form-navy)',
          fontFamily: 'var(--font-display)',
          boxShadow:
            '0 6px 0 rgba(44, 62, 107, 0.18), 0 18px 36px -12px rgba(242, 201, 76, 0.45)',
        }}
      >
        3 Denemeyi Tekrarla
      </button>
    </div>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className="flex items-baseline justify-between border-b pb-3 last:border-0 last:pb-0"
      style={{ borderColor: 'rgba(44, 62, 107, 0.18)' }}
    >
      <dt
        className="text-[10px] font-bold tracking-[0.2em] uppercase"
        style={{
          color: 'var(--color-ink-3)',
          fontFamily: 'var(--font-display)',
        }}
      >
        {label}
      </dt>
      <dd
        className="font-mono text-base font-bold"
        style={{
          color: accent ? 'var(--form-navy)' : 'var(--color-ink-2)',
        }}
      >
        {value}
      </dd>
    </div>
  );
}
