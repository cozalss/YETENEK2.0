/**
 * Test talimatlarının "editorial" sunumu.
 *
 * Tasarım:
 *   - Eyebrow + büyük başlık + meta (süre/zorluk).
 *   - Adımlar vertical timeline: numaralı circle + bağlantı çizgisi.
 *   - Disabled-state'te helper hint, ready-state'te premium glow CTA.
 *   - Skip butonu sessiz text-link, baskın CTA değil.
 */

'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';

interface InstructionsPanelProps {
  eyebrow: string;
  title: string;
  /** Sıralı adımlar (5 ile sınırlandırılmadı, ama 3-6 ideal) */
  steps: string[];
  /** Üst-sağ köşede meta (ör. "~5 sn" veya "30 saniye") */
  meta?: string;
  /** Anahtar CTA — alttaki "Başla" butonu */
  cta: ReactNode;
  /** "Bu testi atla" veya benzeri sessiz aksiyon */
  footer?: ReactNode;
  /** Hazır değilse gösterilecek hint (CTA'nın hemen üstü) */
  helper?: string;
}

export function InstructionsPanel({
  eyebrow,
  title,
  steps,
  meta,
  cta,
  footer,
  helper,
}: InstructionsPanelProps) {
  return (
    <motion.section
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
      className="flex flex-col gap-6 rounded-3xl border p-6 backdrop-blur-sm md:p-7"
      style={{
        background: 'rgba(255, 255, 255, 0.7)',
        borderColor: 'rgba(44, 62, 107, 0.18)',
      }}
      aria-labelledby="test-instructions-title"
    >
      <header
        className="flex items-start justify-between gap-3 border-b pb-5"
        style={{ borderColor: 'rgba(44, 62, 107, 0.12)' }}
      >
        <div>
          <p
            className="text-xs font-bold tracking-[0.25em] uppercase"
            style={{
              color: 'rgba(44, 62, 107, 0.6)',
              fontFamily: 'var(--font-body)',
            }}
          >
            {eyebrow}
          </p>
          <h2
            id="test-instructions-title"
            className="mt-2 text-2xl leading-tight font-black md:text-3xl"
            style={{
              color: 'var(--form-navy)',
              fontFamily: 'var(--font-display)',
            }}
          >
            {title}
          </h2>
        </div>
        {meta && (
          <span
            className="font-mono shrink-0 rounded-full border px-3 py-1 text-[11px] tracking-widest uppercase"
            style={{
              borderColor: 'rgba(44, 62, 107, 0.2)',
              background: 'rgba(255, 255, 255, 0.6)',
              color: 'var(--form-navy)',
            }}
          >
            {meta}
          </span>
        )}
      </header>

      <Timeline steps={steps} />

      {helper && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border px-4 py-3 text-sm leading-relaxed"
          style={{
            background: 'rgba(242, 201, 76, 0.18)',
            borderColor: 'rgba(242, 201, 76, 0.5)',
            color: 'var(--form-navy)',
          }}
        >
          {helper}
        </div>
      )}

      <div className="space-y-3">
        {cta}
        {footer && <div className="flex justify-center">{footer}</div>}
      </div>
    </motion.section>
  );
}

function Timeline({ steps }: { steps: string[] }) {
  return (
    <ol className="relative space-y-4">
      {/* Vertical line connecting numbered circles */}
      <span
        aria-hidden="true"
        className="absolute top-3 bottom-3 left-[15px] w-px"
        style={{
          background:
            'linear-gradient(to bottom, rgba(242, 201, 76, 0.6), rgba(44, 62, 107, 0.18) 60%, transparent)',
        }}
      />
      {steps.map((step, idx) => (
        <li key={idx} className="relative flex gap-4">
          <span
            aria-hidden="true"
            className="relative z-10 mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full font-mono text-xs font-black"
            style={{
              background: 'var(--whistle-cream)',
              boxShadow: '0 0 0 1px var(--track-mustard)',
              color: 'var(--form-navy)',
            }}
          >
            {String(idx + 1).padStart(2, '0')}
          </span>
          <p
            className="pt-1 text-sm leading-relaxed md:text-[15px]"
            style={{ color: 'var(--form-navy)' }}
          >
            {step}
          </p>
        </li>
      ))}
    </ol>
  );
}
