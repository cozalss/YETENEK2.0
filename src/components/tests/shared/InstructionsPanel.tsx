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
      className="flex flex-col gap-6 rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6 backdrop-blur-sm md:p-7"
      aria-labelledby="test-instructions-title"
    >
      <header className="flex items-start justify-between gap-3 border-b border-neutral-800/80 pb-5">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-amber-400 uppercase">
            {eyebrow}
          </p>
          <h2
            id="test-instructions-title"
            className="mt-2 text-2xl leading-tight font-bold text-white md:text-3xl"
          >
            {title}
          </h2>
        </div>
        {meta && (
          <span className="font-mono shrink-0 rounded-full border border-neutral-700/80 bg-neutral-950/40 px-3 py-1 text-[11px] tracking-widest text-neutral-200 uppercase">
            {meta}
          </span>
        )}
      </header>

      <Timeline steps={steps} />

      {helper && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-amber-100"
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
        className="absolute top-3 bottom-3 left-[15px] w-px bg-gradient-to-b from-amber-400/40 via-neutral-700 to-transparent"
      />
      {steps.map((step, idx) => (
        <li key={idx} className="relative flex gap-4">
          <span
            aria-hidden="true"
            className="relative z-10 mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neutral-950 ring-1 ring-amber-400/40 font-mono text-xs font-bold text-amber-300"
          >
            {String(idx + 1).padStart(2, '0')}
          </span>
          <p className="pt-1 text-sm leading-relaxed text-neutral-200 md:text-[15px]">
            {step}
          </p>
        </li>
      ))}
    </ol>
  );
}
