/**
 * Glassmorphic framing badge — kameranın sol-alt köşesinde "live status".
 *
 * Tasarım kararları:
 *   - backdrop-blur pill: kamera arka planı bulanıklaştırılıp framing
 *     bilgisi öne çıkıyor; "studio HUD" hissi.
 *   - Hazır olunca: emerald glow + ✓ rozeti
 *   - Hazır değilse: amber halka + ! ikonu (icon olarak unicode noktalama)
 *   - motion/react ile state geçişlerinde subtle scale.
 */

'use client';

import { motion } from 'motion/react';
import type { FramingStatus } from '@/lib/pose/framing';

export function FramingBadge({ status }: { status: FramingStatus }) {
  const ready = status.ready;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-sm"
    >
      <div
        className={`flex items-center gap-3 rounded-full border px-4 py-2.5 text-sm font-medium shadow-2xl backdrop-blur-md ${
          ready
            ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100'
            : 'border-amber-400/40 bg-neutral-950/55 text-amber-100'
        }`}
      >
        <StatusIndicator ready={ready} />
        <span className="flex-1 leading-snug">
          {ready ? 'Hazır — başlayabilirsin' : status.hint}
        </span>
      </div>
    </motion.div>
  );
}

function StatusIndicator({ ready }: { ready: boolean }) {
  if (ready) {
    return (
      <span
        aria-hidden="true"
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-400 text-neutral-950 shadow-[0_0_14px_2px_rgba(52,211,153,0.6)]"
      >
        <svg
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5"
        >
          <path d="M2.5 6.5l2.5 2.5 4.5-5" />
        </svg>
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="relative grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-amber-300/70 text-amber-200"
    >
      <span className="absolute inset-0 -z-0 animate-ping rounded-full bg-amber-400/30" />
      <svg
        viewBox="0 0 12 12"
        className="relative h-3 w-3 text-amber-300"
        fill="currentColor"
      >
        <circle cx="6" cy="3" r="1.2" />
        <rect x="5" y="5" width="2" height="4" rx="1" />
      </svg>
    </span>
  );
}
