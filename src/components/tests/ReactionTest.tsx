/**
 * Reaksiyon süresi testi — kamera kullanmaz, sadece tap/click timing.
 *
 * 5 deneme yapılır. Her denemede:
 *   1. WAIT: ekran lacivert, "Bekle..."
 *   2. Random 1.5-4sn sonra GO: ekran yeşile döner.
 *   3. Kullanıcı dokunur → reaksiyon süresi ölçülür.
 *   4. False start: WAIT sırasında dokunulursa, deneme reddedilir, baştan başlar.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type ReactionAnalysis,
  type ReactionTrial,
  analyzeReaction,
  pickWaitDelayMs,
} from '@/lib/tests/reaction';

type Phase = 'idle' | 'wait' | 'go' | 'falseStart' | 'between' | 'result';

interface Props {
  childAgeYears?: number;
  onComplete?: (analysis: ReactionAnalysis) => void;
}

const TOTAL_TRIALS = 5;
const FEEDBACK_MS = 1200;

export function ReactionTest({
  childAgeYears = 12,
  onComplete,
}: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  // Trials state'i yalnızca setTrials ile mutate edilir; read tarafı
  // analysis.trials (analyze sonrası) üzerinden DOM'a düşer.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [trials, setTrials] = useState<ReactionTrial[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastReactionMs, setLastReactionMs] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<ReactionAnalysis | null>(null);

  const goTimestampRef = useRef<number | null>(null);
  const waitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = useRef<Phase>('idle');

  // onComplete'i ref'te sabitle — parent inline arrow ile callback re-create
  // ederse handleTap deps'i değişip eski timer/timeout zincirini etkilemesin.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const clearWaitTimer = () => {
    if (waitTimerRef.current) {
      clearTimeout(waitTimerRef.current);
      waitTimerRef.current = null;
    }
  };

  const startTrial = useCallback(() => {
    setPhase('wait');
    goTimestampRef.current = null;
    const delay = pickWaitDelayMs();
    waitTimerRef.current = setTimeout(() => {
      goTimestampRef.current = performance.now();
      setPhase('go');
    }, delay);
  }, []);

  const start = () => {
    setTrials([]);
    setCurrentIndex(0);
    setLastReactionMs(null);
    setAnalysis(null);
    startTrial();
  };

  const handleTap = useCallback(() => {
    const p = phaseRef.current;

    if (p === 'wait') {
      // False start
      clearWaitTimer();
      setLastReactionMs(null);
      setPhase('falseStart');
      setTimeout(() => {
        // Yeniden dene, index aynı kalır (false start sayılmaz)
        startTrial();
      }, FEEDBACK_MS);
      return;
    }

    if (p === 'go' && goTimestampRef.current != null) {
      const reaction = performance.now() - goTimestampRef.current;
      setLastReactionMs(reaction);

      const newTrial: ReactionTrial = {
        index: currentIndex,
        reactionMs: reaction,
        falseStart: false,
      };

      // Functional setter: setTrials([...trials, ...]) closure'daki eski
      // `trials`'ı yakalar (React 19 concurrent mode'da re-render'lar
      // arası stale olabilir). Functional form prev'i her zaman doğru
      // alır ve içeride completion logic'i çalıştırır.
      setTrials((prev) => {
        const updatedTrials = [...prev, newTrial];
        if (updatedTrials.length >= TOTAL_TRIALS) {
          const result = analyzeReaction(updatedTrials, childAgeYears);
          setAnalysis(result);
          setPhase('result');
          onCompleteRef.current?.(result);
        } else {
          setCurrentIndex((idx) => idx + 1);
          setPhase('between');
          setTimeout(() => startTrial(), FEEDBACK_MS);
        }
        return updatedTrials;
      });
      return;
    }
    // trials kasten dışarıda: functional setTrials ile prev okuyoruz.
    // onComplete ref'ten okunuyor — bkz. JumpTest açıklaması.
  }, [currentIndex, childAgeYears, startTrial]);

  // Cleanup
  useEffect(() => {
    return () => clearWaitTimer();
  }, []);

  if (phase === 'idle') {
    return <Instructions onStart={start} />;
  }

  if (phase === 'result' && analysis) {
    return <ResultPanel analysis={analysis} onRetry={start} />;
  }

  return (
    <ActiveTrialPanel
      phase={phase}
      currentIndex={currentIndex}
      totalTrials={TOTAL_TRIALS}
      lastReactionMs={lastReactionMs}
      onTap={handleTap}
    />
  );
}

function Instructions({ onStart }: { onStart: () => void }) {
  return (
    <div className="space-y-4 rounded-2xl border border-neutral-800 p-6">
      <h2 className="text-xl font-bold">Reaksiyon Testi</h2>
      <ol className="list-inside list-decimal space-y-2 text-sm text-neutral-300">
        <li>5 deneme yapılacak.</li>
        <li>
          Ekran <span className="font-semibold text-sky-300">LACIVERT</span>{' '}
          olduğunda BEKLE.
        </li>
        <li>
          Ekran <span className="font-semibold text-emerald-400">YEŞIL</span>{' '}
          olduğunda HEMEN dokun.
        </li>
        <li>
          Yeşil olmadan dokunursan deneme tekrarlanır (false start).
        </li>
      </ol>
      <button
        type="button"
        onClick={onStart}
        className="h-12 w-full rounded-full bg-amber-400 font-bold text-neutral-950 transition-colors hover:bg-amber-300 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 focus-visible:outline-none"
      >
        Başla
      </button>
    </div>
  );
}

function ActiveTrialPanel({
  phase,
  currentIndex,
  totalTrials,
  lastReactionMs,
  onTap,
}: {
  phase: Phase;
  currentIndex: number;
  totalTrials: number;
  lastReactionMs: number | null;
  onTap: () => void;
}) {
  const bgColor =
    phase === 'go'
      ? 'bg-emerald-500'
      : phase === 'falseStart'
        ? 'bg-red-600'
        : phase === 'between'
          ? 'bg-amber-400'
          : 'bg-sky-900';

  const message =
    phase === 'go'
      ? 'DOKUN!'
      : phase === 'falseStart'
        ? 'Erken dokundun! Tekrar deniyoruz…'
        : phase === 'between'
          ? lastReactionMs != null
            ? `${lastReactionMs.toFixed(0)} ms`
            : ''
          : 'Bekle, ekran yeşil olunca dokun…';

  // Görme engelli kullanıcı için sesli "Dokun" sinyali — yeşile döndüğünde.
  // SSR'da `window` yok, bu yüzden useEffect içinde feature-detect.
  useEffect(() => {
    if (phase !== 'go') return;
    if (typeof window === 'undefined') return;
    if (!('speechSynthesis' in window)) return;
    try {
      const utterance = new SpeechSynthesisUtterance('Dokun');
      utterance.lang = 'tr-TR';
      utterance.rate = 1.4;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('[ReactionTest] TTS başarısız:', err);
    }
  }, [phase]);

  // Renk değil ikon ile de durum bildir (renk körü destek + SR aria-live).
  const phaseIcon = phase === 'go' ? '●' : phase === 'wait' ? '○' : null;

  return (
    <button
      type="button"
      onClick={onTap}
      className={`flex h-96 w-full select-none items-center justify-center rounded-2xl text-3xl font-bold text-white transition-colors duration-100 focus-visible:ring-4 focus-visible:ring-amber-300 focus-visible:ring-offset-4 focus-visible:ring-offset-neutral-950 focus-visible:outline-none md:h-[28rem] ${bgColor}`}
      aria-label={`Reaksiyon test alanı. Deneme ${currentIndex + 1} bölü ${totalTrials}.`}
    >
      <div className="flex flex-col items-center gap-3" aria-hidden="true">
        <div className="text-sm font-medium uppercase tracking-widest opacity-70">
          Deneme {currentIndex + 1} / {totalTrials}
        </div>
        {phaseIcon && <span className="text-6xl leading-none">{phaseIcon}</span>}
        <div>{message}</div>
      </div>
      <span
        className="sr-only"
        role="status"
        aria-live="assertive"
        aria-atomic="true"
      >
        {phase === 'wait'
          ? 'Bekle, ekran yeşil olduğunda dokun.'
          : phase === 'go'
            ? 'Şimdi! Dokun!'
            : phase === 'falseStart'
              ? 'Erken dokundun, deneme tekrarlanıyor.'
              : phase === 'between' && lastReactionMs != null
                ? `Önceki deneme: ${Math.round(lastReactionMs)} milisaniye.`
                : ''}
      </span>
    </button>
  );
}

function ResultPanel({
  analysis,
  onRetry,
}: {
  analysis: ReactionAnalysis;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-emerald-800 bg-emerald-950/20 p-6">
      <h3 className="text-lg font-bold text-emerald-300">Test Tamamlandı</h3>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Metric
          label="Ortalama"
          value={`${analysis.averageMs.toFixed(0)} ms`}
          accent
        />
        <Metric label="En İyi" value={`${analysis.bestMs.toFixed(0)} ms`} />
        <Metric
          label="Tutarlılık"
          value={`${analysis.consistencyScore.toFixed(0)} / 100`}
        />
        <Metric
          label="Yaş Norm"
          value={`${analysis.ageNormScore.toFixed(0)} / 100`}
          accent
        />
      </div>

      <div className="rounded-lg border border-neutral-800 p-3">
        <div className="mb-2 text-xs uppercase tracking-wider text-neutral-400">
          Tüm Denemeler
        </div>
        <div className="flex flex-wrap gap-2">
          {analysis.trials.map((t) => (
            <span
              key={t.index}
              className="rounded-full bg-neutral-900 px-3 py-1 text-xs"
            >
              {t.reactionMs.toFixed(0)} ms
            </span>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onRetry}
        className="h-11 rounded-full bg-amber-400 px-5 font-semibold text-neutral-950 transition-colors hover:bg-amber-300 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 focus-visible:outline-none"
      >
        Tekrar Dene
      </button>
    </div>
  );
}

function Metric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 p-3">
      <div className="text-xs uppercase tracking-wider text-neutral-400">
        {label}
      </div>
      <div
        className={`mt-1 text-xl font-bold ${
          accent ? 'text-amber-400' : 'text-white'
        }`}
      >
        {value}
      </div>
    </div>
  );
}
