/**
 * Açı drift chip'i — test sırasında kameranın baseline'a göre oynayıp
 * oynamadığını gösteren küçük "live status" pili.
 *
 * Büyük sapma (major) burada gösterilmez; onu geçerlilik kapısı reddedip
 * `RejectionPanel` ile ele alır. Bu chip yalnız "sabit ✓" ile "hafif oynadı"
 * arasını canlı yansıtır — kullanıcı erken düzeltebilsin.
 */

'use client';

import { motion } from 'motion/react';
import type { DriftReading } from '@/lib/pose/cameraPose';

interface Props {
  readonly drift: DriftReading | null;
  /** A4 şu an kadrajda ve okunuyor mu. Yoksa "referans görünmüyor". */
  readonly detected: boolean;
}

export function AngleDriftChip({ drift, detected }: Props) {
  const severity = drift?.severity ?? (detected ? 'ok' : 'unknown');
  const { label, tone } = describe(severity);

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="absolute top-4 left-1/2 -translate-x-1/2"
    >
      <div
        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-md ${tone}`}
      >
        <span aria-hidden="true" className="text-sm leading-none">
          {severity === 'ok' ? '🎯' : severity === 'minor' ? '⚠️' : '🔍'}
        </span>
        <span>{label}</span>
      </div>
    </motion.div>
  );
}

function describe(severity: DriftReading['severity'] | 'unknown'): {
  label: string;
  tone: string;
} {
  switch (severity) {
    case 'ok':
      return {
        label: 'Kamera açısı sabit',
        tone: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100',
      };
    case 'minor':
      return {
        label: 'Kamera hafif oynadı — sabitle',
        tone: 'border-amber-400/40 bg-neutral-950/55 text-amber-100',
      };
    case 'major':
      return {
        label: 'Kamera açısı değişti',
        tone: 'border-red-400/40 bg-red-500/20 text-red-100',
      };
    default:
      return {
        label: 'Referans (A4) görünmüyor',
        tone: 'border-white/20 bg-neutral-950/55 text-white/80',
      };
  }
}
