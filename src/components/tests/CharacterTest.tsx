/**
 * Karakter / Takım Uyumu Anketi — Hızlı Akış'ın 4. adımı.
 *
 * 14 madde, 5'li Likert (1=Tamamen Katılmıyorum … 5=Tamamen Katılıyorum).
 * Tüm sorular cevaplandığında otomatik onComplete tetiklenmez — kullanıcı
 * "Cevapları Gönder" butonuna basar, böylece son anda değiştirebilir.
 *
 * onComplete sözleşmesi diğer testlerle uyumlu: tek sefer çağrılır,
 * CharacterAnalysis objesi geçer (parent store.recordCharacter ile alır).
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CHARACTER_FACTOR_KEYS,
  CHARACTER_FACTOR_LABELS_TR,
  CHARACTER_QUESTIONS,
  LIKERT_LABELS,
  type CharacterAnswers,
  type LikertValue,
} from '@/lib/character/questions';
import { scoreCharacter, type CharacterAnalysis } from '@/lib/character/score';

interface Props {
  onComplete?: (analysis: CharacterAnalysis) => void;
}

export function CharacterTest({ onComplete }: Props) {
  const [answers, setAnswers] = useState<CharacterAnswers>({});
  const [submitted, setSubmitted] = useState(false);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const analysis = useMemo(() => scoreCharacter(answers), [answers]);
  const total = CHARACTER_QUESTIONS.length;
  const progressPct = Math.round((analysis.answeredCount / total) * 100);

  const setAnswer = (id: number, value: LikertValue) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = () => {
    if (!analysis.complete) return;
    setSubmitted(true);
    onCompleteRef.current?.(analysis);
  };

  return (
    <div className="space-y-6">
      <header
        className="rounded-3xl border-2 p-6"
        style={{
          background: 'rgba(255, 255, 255, 0.75)',
          borderColor: 'rgba(44, 62, 107, 0.18)',
        }}
      >
        <p
          className="text-[10px] font-bold tracking-[0.25em] uppercase"
          style={{
            color: 'var(--color-ink-3, rgba(44, 62, 107, 0.6))',
            fontFamily: 'var(--font-display)',
          }}
        >
          Test 04 · Karakter
        </p>
        <h2
          className="mt-2 text-2xl font-black sm:text-3xl"
          style={{
            color: 'var(--form-navy)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Takım Uyumu Anketi
        </h2>
        <p
          className="mt-3 text-sm leading-relaxed"
          style={{ color: 'var(--color-ink-2, rgba(44, 62, 107, 0.78))' }}
        >
          14 ifadenin her birine 1 (Tamamen Katılmıyorum) — 5 (Tamamen
          Katılıyorum) arasında bir cevap ver. Cevapların önerilen spor
          dallarını dengeleyebilir.
        </p>

        <div
          className="mt-5 h-2 w-full overflow-hidden rounded-full"
          style={{ background: 'rgba(44, 62, 107, 0.12)' }}
        >
          <div
            className="h-full transition-[width] duration-300"
            style={{
              width: `${progressPct}%`,
              background: 'var(--track-mustard)',
            }}
          />
        </div>
        <p
          className="mt-2 text-xs font-bold tracking-wider"
          style={{
            color: 'var(--color-ink-3, rgba(44, 62, 107, 0.6))',
            fontFamily: 'var(--font-display)',
          }}
        >
          {analysis.answeredCount} / {total} cevaplandı
        </p>
      </header>

      <ol className="space-y-4" aria-label="Karakter anketi soruları">
        {CHARACTER_QUESTIONS.map((q) => (
          <QuestionCard
            key={q.id}
            number={q.id}
            text={q.text}
            value={answers[q.id]}
            onChange={(v) => setAnswer(q.id, v)}
          />
        ))}
      </ol>

      {submitted ? (
        <SubmitConfirmation analysis={analysis} />
      ) : (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!analysis.complete}
          className="h-12 w-full rounded-full text-base font-black tracking-wide transition-transform focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          style={
            analysis.complete
              ? {
                  background: 'var(--track-mustard)',
                  color: 'var(--form-navy)',
                  fontFamily: 'var(--font-display)',
                  boxShadow:
                    '0 6px 0 rgba(44, 62, 107, 0.18), 0 18px 36px -12px rgba(242, 201, 76, 0.45)',
                }
              : {
                  background: 'rgba(44, 62, 107, 0.08)',
                  color: 'rgba(44, 62, 107, 0.55)',
                  cursor: 'not-allowed',
                  fontFamily: 'var(--font-display)',
                }
          }
        >
          {analysis.complete
            ? 'Cevapları Gönder →'
            : `${total - analysis.answeredCount} soru kaldı`}
        </button>
      )}
    </div>
  );
}

interface QuestionCardProps {
  number: number;
  text: string;
  value: LikertValue | undefined;
  onChange: (v: LikertValue) => void;
}

function QuestionCard({ number, text, value, onChange }: QuestionCardProps) {
  return (
    <li
      className="rounded-3xl border-2 p-5 sm:p-6"
      style={{
        background: 'rgba(255, 255, 255, 0.7)',
        borderColor:
          value != null
            ? 'rgba(168, 213, 186, 0.65)'
            : 'rgba(44, 62, 107, 0.18)',
        transition: 'border-color 200ms ease',
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-black"
          style={{
            background: 'rgba(44, 62, 107, 0.08)',
            color: 'var(--form-navy)',
            fontFamily: 'var(--font-display)',
          }}
        >
          {number}
        </span>
        <p
          className="pt-1.5 text-sm leading-relaxed sm:text-base"
          style={{ color: 'var(--form-navy)' }}
        >
          {text}
        </p>
      </div>

      <div
        className="mt-4 grid grid-cols-5 gap-2"
        role="radiogroup"
        aria-label={`Soru ${number} cevap seçenekleri`}
      >
        {LIKERT_LABELS.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(opt.value)}
              className="flex h-full min-h-[88px] flex-col items-center justify-start gap-2 rounded-xl border-2 px-2 py-3 text-center transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              style={{
                background: selected
                  ? 'var(--track-mustard)'
                  : 'rgba(255, 255, 255, 0.6)',
                borderColor: selected
                  ? 'var(--track-mustard)'
                  : 'rgba(44, 62, 107, 0.18)',
                color: selected
                  ? 'var(--form-navy)'
                  : 'rgba(44, 62, 107, 0.85)',
                boxShadow: selected
                  ? '0 4px 0 rgba(44, 62, 107, 0.18)'
                  : 'none',
              }}
            >
              <span
                className="text-lg font-black"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {opt.value}
              </span>
              <span
                className="text-[10px] leading-tight font-bold tracking-wider uppercase"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </li>
  );
}

function SubmitConfirmation({ analysis }: { analysis: CharacterAnalysis }) {
  const bandColor =
    analysis.band === 'team'
      ? 'rgba(168, 213, 186, 0.22)'
      : analysis.band === 'individual'
        ? 'rgba(244, 182, 194, 0.22)'
        : 'rgba(242, 201, 76, 0.18)';
  const borderColor =
    analysis.band === 'team'
      ? 'var(--field-mint)'
      : analysis.band === 'individual'
        ? 'var(--mindar-pink)'
        : 'var(--track-mustard)';

  return (
    <div
      className="rounded-3xl border-2 p-6"
      style={{ background: bandColor, borderColor }}
    >
      <p
        className="text-[10px] font-bold tracking-[0.25em] uppercase"
        style={{
          color: 'rgba(44, 62, 107, 0.6)',
          fontFamily: 'var(--font-display)',
        }}
      >
        Anket Tamamlandı
      </p>
      <h3
        className="mt-2 text-2xl font-black"
        style={{
          color: 'var(--form-navy)',
          fontFamily: 'var(--font-display)',
        }}
      >
        Takım uyumu: {analysis.teamAffinity}/100
      </h3>
      <p
        className="mt-3 text-sm leading-relaxed"
        style={{ color: 'rgba(44, 62, 107, 0.85)' }}
      >
        {analysis.summary}
      </p>

      <div className="mt-5 space-y-3">
        <p
          className="text-[10px] font-bold tracking-[0.25em] uppercase"
          style={{
            color: 'rgba(44, 62, 107, 0.6)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Alt Faktörler
        </p>
        {CHARACTER_FACTOR_KEYS.map((f) => (
          <FactorBar
            key={f}
            label={CHARACTER_FACTOR_LABELS_TR[f]}
            value={analysis.factors[f]}
            highlight={
              f === analysis.topFactor
                ? 'top'
                : f === analysis.bottomFactor
                  ? 'bottom'
                  : 'none'
            }
          />
        ))}
      </div>
    </div>
  );
}

function FactorBar({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight: 'top' | 'bottom' | 'none';
}) {
  const barColor =
    highlight === 'top'
      ? 'var(--field-mint)'
      : highlight === 'bottom'
        ? 'var(--mindar-pink)'
        : 'var(--track-mustard)';
  return (
    <div>
      <div
        className="flex items-baseline justify-between text-xs"
        style={{ color: 'var(--form-navy)' }}
      >
        <span
          className="font-bold tracking-wider uppercase"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {label}
        </span>
        <span className="font-mono font-bold">{value}/100</span>
      </div>
      <div
        className="mt-1 h-1.5 w-full overflow-hidden rounded-full"
        style={{ background: 'rgba(44, 62, 107, 0.12)' }}
      >
        <div
          className="h-full transition-[width] duration-500"
          style={{ width: `${value}%`, background: barColor }}
        />
      </div>
    </div>
  );
}
