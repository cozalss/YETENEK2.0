/**
 * Standing Long Jump (Broad Jump) — premium 2-sütunlu UI.
 *
 * Mantık aynı: yan görüntüde dik dur, çömel, ileri patlayıcı atla, düş.
 * Ankle X delta cmPerUnit ile cm'e çevriliyor.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { CameraStream } from '@/components/camera/CameraStream';
import { checkJumpFraming, type FramingStatus } from '@/lib/pose/framing';
import { cancelSpeech, speak } from '@/lib/a11y/speech';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { TestStage } from '@/components/tests/shared/TestStage';
import { FramingBadge } from '@/components/tests/shared/FramingBadge';
import { InstructionsPanel } from '@/components/tests/shared/InstructionsPanel';
import { StartCTA } from '@/components/tests/shared/StartCTA';
import {
  type BroadJumpAnalysis,
  type BroadJumpSample,
  analyzeBroadJump,
  broadJumpScore,
  calibrateBroadJump,
  frameToBroadJumpSample,
} from '@/lib/tests/broadJump';
import type { PoseFrame } from '@/types';
import { useValidityGate } from '@/hooks/use-validity-gate';
import { RejectionPanel } from '@/components/tests/shared/RejectionPanel';
import { VisionBadge } from '@/components/tests/shared/VisionBadge';
import { logger } from '@/shared/logger/logger';

const log = logger.child('broad-jump-test');

type Phase = 'idle' | 'countdown' | 'capture' | 'analyze' | 'result';

interface Props {
  childAgeYears?: number;
  childSex?: 'male' | 'female';
  onComplete?: (
    analysis: BroadJumpAnalysis & {
      // `number | null`: mesafe hesaplanamadıysa skor da yok. Bunu tipte
      // gizlemek, tüketicide null'ı `number` sanarak kaydetmeye yol açardı.
      score: number | null;
      techniqueMultiplier?: number;
      judgeInjuryWarnings?: readonly string[];
    }
  ) => void;
}

const COUNTDOWN_SECONDS = 3;
const CAPTURE_SECONDS = 6;

const STEPS = [
  'Kamerayı yana koy — vücudunu profilden görsün.',
  'Çerçevenin sol tarafında dik dur. Sağa boş alan kalsın (atlayacağın yer).',
  '3-2-1 geri sayımının ardından 1 saniye sabit dur, sonra ileri doğru atla.',
  'Düştüğün yerde 1 saniye sabit kal — ölçüm tamamlansın.',
];

export function BroadJumpTest({
  childAgeYears = 12,
  childSex = 'male',
  onComplete,
}: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [captureRemaining, setCaptureRemaining] = useState(CAPTURE_SECONDS);
  const [result, setResult] = useState<BroadJumpAnalysis | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [framing, setFraming] = useState<FramingStatus>({
    ready: false,
    hint: 'Pose tespit ediliyor…',
  });
  const reducedMotion = useReducedMotion();

  const samplesRef = useRef<BroadJumpSample[]>([]);
  const captureActiveRef = useRef(false);
  const phaseRef = useRef<Phase>('idle');
  const lastFramingRef = useRef<FramingStatus | null>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement | null>(null);

  // onComplete'i ref'te sabitle (bkz. JumpTest açıklaması).
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => () => cancelSpeech(), []);

  const gate = useValidityGate({ test: 'broadJump' });
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
    const sample = frameToBroadJumpSample(frame);
    if (!sample) return;
    // Hakem ham iskelete bakıyor; indirgenmiş örnek uçuş fazını taşımıyor.
    gateCollect(frame);
    samplesRef.current.push(sample);
  }, [gateCollect]);

  const start = () => {
    gate.reset();
    samplesRef.current = [];
    captureActiveRef.current = false;
    setResult(null);
    setScore(null);
    setCountdown(COUNTDOWN_SECONDS);
    setCaptureRemaining(CAPTURE_SECONDS);
    setPhase('countdown');
  };

  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      speak('Atla', { interrupt: true });
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
      // Geçerlilik kapısı analizden ÖNCE: geçersiz yakalama hiç ölçülmemeli.
      const claimAnalysis = analyzeBroadJump(samplesRef.current);
      const outcome = await gateEvaluate({
        valid: claimAnalysis.valid,
        primaryValue: claimAnalysis.jumpUnits,
        unit: 'score',
      });
      if (cancelled) return;
      if (!outcome.allowed) {
        setPhase('result');
        return;
      }
      runAnalysis(outcome.sigmaMultiplier, outcome.injuryWarnings);
    })();

    return () => {
      cancelled = true;
    };

    function runAnalysis(
      techniqueMultiplier: number,
      judgeInjuryWarnings: readonly string[]
    ) {
    try {
      // Kalibrasyon SADECE worldLandmarks'tan — boy'a hiç bağlı değil (bkz.
      // `calibrateBroadJump` dokümanı: eksen karışıklığı olmadan tek güven
      // kaynağı). worldLandmarks o oturumda yeterince izlenmediyse
      // `jumpDistanceCm` `null` kalır ve ResultCard sayıyı göstermez.
      const analysis = calibrateBroadJump(analyzeBroadJump(samplesRef.current));
      setResult(analysis);
      const computedScore =
        analysis.valid && analysis.jumpDistanceCm != null
          ? broadJumpScore(analysis.jumpDistanceCm, childAgeYears, childSex)
          : null;
      setScore(computedScore);
      setPhase('result');
      // KOŞULSUZ bildir (JumpTest ile aynı). Eskiden `computedScore != null`
      // şartı vardı: mesafe hesaplanamadığında ekran "Atlama kaydedildi"
      // diyor ama batarya bir sonraki teste HİÇ geçmiyordu — hata mesajı
      // olmadan kalıcı çıkmaz. Geçersiz sonucu zaten tüketici eliyor.
      onCompleteRef.current?.({
        ...analysis,
        score: computedScore,
        techniqueMultiplier,
        judgeInjuryWarnings,
      });
    } catch (err) {
      log.error('analiz hatası', {
        cause: err instanceof Error ? err.message : String(err),
      });
      setResult({
        jumpUnits: 0,
        jumpDistanceCm: null,
        startX: 0,
        endX: 0,
        startWorldX: null,
        endWorldX: null,
        valid: false,
        reason: 'Analiz sırasında beklenmedik bir hata oluştu. Tekrar dene.',
      });
      setScore(null);
      setPhase('result');
    }
    }
    // onComplete kasten dışarıda — inline arrow ile çift kayıt olmasın.
  }, [phase, childAgeYears, childSex, gateEvaluate]);

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
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[2px]">
              <motion.div
                key={countdown}
                initial={
                  reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6 }
                }
                animate={
                  reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }
                }
                transition={{ duration: reducedMotion ? 0.15 : 0.3 }}
                className="font-display text-[10rem] leading-none font-black text-amber-400 drop-shadow-[0_8px_30px_rgba(251,191,36,0.4)]"
              >
                {countdown || 'ATLA!'}
              </motion.div>
            </div>
          )}

          {phase === 'capture' && (
            <div className="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-2xl ring-1 ring-red-400/50">
              <span
                className={`h-2 w-2 rounded-full bg-white ${reducedMotion ? '' : 'animate-pulse'}`}
              />
              KAYIT · {captureRemaining}s
            </div>
          )}

          {phase === 'analyze' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/65 backdrop-blur-sm">
              <div className="flex items-center gap-3 rounded-full bg-neutral-900/90 px-5 py-3 text-base text-white ring-1 ring-amber-400/30">
                <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                Analiz ediliyor…
              </div>
            </div>
          )}

          {(phase === 'idle' || phase === 'countdown') && (
            <FramingBadge status={framing} />
          )}
        </>
      }
      sidebar={
        phase === 'result' && gate.rejection ? (
          <RejectionPanel rejection={gate.rejection} onRetry={start} />
        ) : phase === 'result' && result ? (
          <div>
          <ResultCard
            result={result}
            score={score}
            onRetry={start}
            headingRef={resultHeadingRef}
          />
            <VisionBadge applied={gate.visionApplied} />
          </div>
        ) : phase === 'idle' ? (
          <InstructionsPanel
            eyebrow="Test 02 · Yatay Patlayıcı"
            title="Uzun Atlama"
            meta="~6 sn"
            steps={STEPS}
            helper={!framing.ready ? framing.hint : undefined}
            cta={<StartCTA onStart={start} canStart={framing.ready} compact />}
            footer={
              <p
                className="text-center text-xs"
                style={{ color: 'var(--color-ink-3)' }}
              >
                Sprint, futbol, judo gibi sporlar için kritik boyut.
              </p>
            }
          />
        ) : (
          <PhaseStatusCard phase={phase} />
        )
      }
    />
  );
}

function PhaseStatusCard({ phase }: { phase: Phase }) {
  const messages: Record<
    Phase,
    { eyebrow: string; title: string; body: string }
  > = {
    idle: { eyebrow: '', title: '', body: '' },
    countdown: {
      eyebrow: 'Sırada',
      title: 'Hazırlanıyorsun',
      body: 'Geri sayım bittiğinde ileri doğru patlayıcı şekilde atla.',
    },
    capture: {
      eyebrow: 'Kayıt aktif',
      title: 'Atlayışın ölçülüyor',
      body: 'Düştüğün noktada 1 saniye sabit dur — mesafe ankle X delta ile hesaplanıyor.',
    },
    analyze: {
      eyebrow: 'Hesaplanıyor',
      title: 'Sonuç hazırlanıyor',
      body: 'Yaş normu ile karşılaştırılıyor — yatay patlayıcı güç skoru çıkıyor.',
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

function ResultCard({
  result,
  score,
  onRetry,
  headingRef,
}: {
  result: BroadJumpAnalysis;
  score: number | null;
  onRetry: () => void;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
}) {
  if (!result.valid) {
    return (
      <div
        className="rounded-3xl border-2 p-7"
        style={{
          background: 'rgba(244, 182, 194, 0.22)',
          borderColor: 'var(--mindar-pink)',
        }}
      >
        <h3
          ref={headingRef}
          tabIndex={-1}
          className="text-xl font-black focus-visible:outline-none"
          style={{
            color: 'var(--form-navy)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Geçerli atlama algılanamadı
        </h3>
        <p
          className="mt-3 text-sm leading-relaxed"
          style={{ color: 'var(--color-ink-2)' }}
        >
          {result.reason}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 h-11 rounded-full px-6 text-sm font-black tracking-wide transition-transform hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          style={{
            background: 'var(--track-mustard)',
            color: 'var(--form-navy)',
            fontFamily: 'var(--font-display)',
            boxShadow: '0 4px 0 rgba(44, 62, 107, 0.18)',
          }}
        >
          Tekrar Dene
        </button>
      </div>
    );
  }
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
        Tamam · 02
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
        Atlama kaydedildi
      </h3>
      <dl className="mt-5 space-y-3">
        {result.jumpDistanceCm != null ? (
          <Stat
            label="Atlama mesafesi"
            value={`${result.jumpDistanceCm.toFixed(0)} cm`}
            accent
          />
        ) : (
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--color-ink-2)' }}
          >
            Mesafe hesaplanamadı — bu videoda 3D vücut izleme yeterli değildi.
            Kameraya tam gör, yandan çek ve tekrar dene.
          </p>
        )}
        {score != null && (
          <Stat
            label="Yaş norm skoru"
            value={`${score.toFixed(0)} / 100`}
            accent
          />
        )}
      </dl>
      {result.jumpDistanceCm != null && (
        <p
          className="mt-5 text-xs leading-relaxed"
          style={{ color: 'var(--color-ink-2)' }}
        >
          Bu mesafe telefonun 3D poz tahmininden hesaplandı; santimetrik
          kesinlik iddia etmiyoruz — yaklaşık okuyun.
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
        Tekrar Dene
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
