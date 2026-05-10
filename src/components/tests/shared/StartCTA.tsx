/**
 * Premium başlat CTA'sı.
 *
 * Hazır olunca:
 *   - Tam amber dolgu + soft outer glow + hover'da scale 1.02
 *   - Sağda animated arrow chevron
 * Hazır değilse (canStart=false):
 *   - Sessiz dark surface, "henüz hazır değil" hissi
 *   - aria-disabled (focus-able kalsın, SR de görsün)
 */

'use client';

import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';

interface StartCTAProps {
  onStart: () => void;
  canStart: boolean;
  readyLabel?: string;
  notReadyLabel?: string;
}

export function StartCTA({
  onStart,
  canStart,
  readyLabel = 'Hazırım, Başla',
  notReadyLabel = 'Vücudun tam görünmüyor',
}: StartCTAProps) {
  return (
    <motion.button
      type="button"
      onClick={onStart}
      aria-disabled={!canStart}
      onMouseDownCapture={(e) => {
        if (!canStart) e.preventDefault();
      }}
      whileHover={canStart ? { scale: 1.015 } : undefined}
      whileTap={canStart ? { scale: 0.985 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 24 }}
      className={`group relative flex h-14 w-full items-center justify-center gap-2 rounded-full text-base font-bold transition-colors focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 focus-visible:outline-none ${
        canStart
          ? 'bg-amber-400 text-neutral-950 shadow-[0_15px_45px_-10px_rgba(251,191,36,0.65)] hover:bg-amber-300'
          : 'cursor-not-allowed bg-neutral-800/80 text-neutral-300 ring-1 ring-neutral-700'
      }`}
    >
      {canStart && (
        <span
          aria-hidden="true"
          className="absolute inset-0 -z-10 rounded-full bg-amber-400/40 blur-2xl"
        />
      )}
      <span>{canStart ? readyLabel : notReadyLabel}</span>
      {canStart && (
        <ArrowRight
          aria-hidden="true"
          className="h-5 w-5 transition-transform group-hover:translate-x-1"
        />
      )}
    </motion.button>
  );
}
