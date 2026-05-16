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
  correctReactionMs,
  pickWaitDelayMs,
} from '@/lib/tests/reaction';

type Phase = 'idle' | 'wait' | 'go' | 'falseStart' | 'between' | 'result';

interface Props {
  childAgeYears?: number;
  onComplete?: (analysis: ReactionAnalysis) => void;
}

// MIN_VALID_TRIALS=6 ile uyumlu (Dykiert 2012 pediatric önerisi).
// 5 trial demek = analyzeReaction → 0 skor (her zaman). 6 zorunlu.
const TOTAL_TRIALS = 6;
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
  // FEEDBACK_MS setTimeout'larını da tracked tut — trial bittikten sonra
  // phase 'result' iken bu zincir setPhase('wait')→setPhase('go') tetiklemesin
  // (yeşil ekran sonuç ekranı arkasında yanıp sönmesin diye).
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const clearFeedbackTimer = () => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  };

  /** Browser TTS queue'sunu sıfırla — "Dokun" sesleri arka planda çalmasın. */
  const cancelSpeech = () => {
    if (typeof window === 'undefined') return;
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* sessizce yut */
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
      clearFeedbackTimer();
      setLastReactionMs(null);
      setPhase('falseStart');
      feedbackTimerRef.current = setTimeout(() => {
        feedbackTimerRef.current = null;
        // Yeniden dene, index aynı kalır (false start sayılmaz)
        if (phaseRef.current === 'result') return;
        startTrial();
      }, FEEDBACK_MS);
      return;
    }

    if (p === 'go' && goTimestampRef.current != null) {
      const reaction = performance.now() - goTimestampRef.current;
      setLastReactionMs(correctReactionMs(reaction));

      const newTrial: ReactionTrial = {
        index: currentIndex,
        reactionMs: reaction,
        falseStart: false,
      };

      setTrials((prev) => {
        const updatedTrials = [...prev, newTrial];
        if (updatedTrials.length >= TOTAL_TRIALS) {
          const result = analyzeReaction(updatedTrials, childAgeYears);
          // Test bitti — pending tüm timer'ları ve TTS'i iptal et ki sonuç
          // ekranı arkasından "Dokun" sesi gelmesin / yeşil yanıp sönmesin.
          clearWaitTimer();
          clearFeedbackTimer();
          cancelSpeech();
          setAnalysis(result);
          setPhase('result');
          onCompleteRef.current?.(result);
        } else {
          setCurrentIndex((idx) => idx + 1);
          setPhase('between');
          clearFeedbackTimer();
          feedbackTimerRef.current = setTimeout(() => {
            feedbackTimerRef.current = null;
            if (phaseRef.current === 'result') return;
            startTrial();
          }, FEEDBACK_MS);
        }
        return updatedTrials;
      });
      return;
    }
  }, [currentIndex, childAgeYears, startTrial]);

  // Cleanup — unmount'ta tüm async iş tortusunu temizle.
  useEffect(() => {
    return () => {
      clearWaitTimer();
      clearFeedbackTimer();
      cancelSpeech();
    };
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
    <div
      className="space-y-4 rounded-2xl border-2 p-6"
      style={{
        background: 'rgba(255, 255, 255, 0.7)',
        borderColor: 'rgba(44, 62, 107, 0.18)',
      }}
    >
      <h2
        className="text-xl font-black"
        style={{
          color: 'var(--form-navy)',
          fontFamily: 'var(--font-display)',
        }}
      >
        Reaksiyon Testi
      </h2>
      <ol
        className="list-inside list-decimal space-y-2 text-sm leading-relaxed"
        style={{ color: 'var(--color-ink-2)' }}
      >
        <li>6 deneme yapılacak.</li>
        <li>
          Ekran{' '}
          <span
            className="font-bold"
            style={{ color: 'var(--deep-navy)' }}
          >
            LACIVERT
          </span>{' '}
          olduğunda BEKLE.
        </li>
        <li>
          Ekran{' '}
          <span
            className="font-bold"
            style={{ color: '#0e7a4d' }}
          >
            YEŞIL
          </span>{' '}
          olduğunda HEMEN dokun.
        </li>
        <li>Yeşil olmadan dokunursan deneme tekrarlanır (false start).</li>
      </ol>
      <button
        type="button"
        onClick={onStart}
        className="h-12 w-full rounded-full text-base font-black tracking-wide transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style={{
          background: 'var(--track-mustard)',
          color: 'var(--form-navy)',
          fontFamily: 'var(--font-display)',
          boxShadow:
            '0 6px 0 rgba(44, 62, 107, 0.18), 0 18px 36px -12px rgba(242, 201, 76, 0.45)',
        }}
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

  // Sesli "Dokun" sinyali — yeşile döndüğünde. Cleanup'ta cancel() ile
  // queue'yu boşalt; yoksa testin son trial'ında utterance unmount'tan
  // sonra bile arka planda çalmaya devam ediyordu.
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
    return () => {
      // Phase 'go'dan çıkınca (veya component unmount) pending speech'i kes.
      if (typeof window === 'undefined') return;
      if (!('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* sessizce yut */
      }
    };
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
    <div
      className="space-y-4 rounded-2xl border-2 p-6"
      style={{
        background: 'rgba(168, 213, 186, 0.22)',
        borderColor: 'var(--field-mint)',
      }}
    >
      <h3
        className="text-lg font-black"
        style={{
          color: 'var(--form-navy)',
          fontFamily: 'var(--font-display)',
        }}
      >
        Test Tamamlandı
      </h3>

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

      <div
        className="rounded-lg border-2 p-3"
        style={{
          background: 'rgba(255, 255, 255, 0.6)',
          borderColor: 'var(--color-line)',
        }}
      >
        <div
          className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em]"
          style={{
            color: 'var(--color-ink-3)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Tüm Denemeler
        </div>
        <div className="flex flex-wrap gap-2">
          {analysis.trials
            .filter((t) => !t.falseStart)
            .map((t) => (
              <span
                key={t.index}
                className="rounded-full px-3 py-1 text-xs font-bold"
                style={{
                  background: 'var(--color-canvas)',
                  color: 'var(--form-navy)',
                  border: '1px solid var(--color-line)',
                }}
              >
                {correctReactionMs(t.reactionMs).toFixed(0)} ms
              </span>
            ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onRetry}
        className="h-11 rounded-full px-5 text-sm font-black tracking-wide transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
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
    <div
      className="rounded-xl border-2 p-3"
      style={{
        background: 'var(--color-surface-elevated)',
        borderColor: accent ? 'var(--track-mustard)' : 'var(--color-line)',
      }}
    >
      <div
        className="text-[10px] font-bold uppercase tracking-[0.18em]"
        style={{
          color: 'var(--color-ink-3)',
          fontFamily: 'var(--font-display)',
        }}
      >
        {label}
      </div>
      <div
        className="mt-1 text-xl font-black"
        style={{
          color: 'var(--form-navy)',
          fontFamily: 'var(--font-display)',
        }}
      >
        {value}
      </div>
    </div>
  );
}
