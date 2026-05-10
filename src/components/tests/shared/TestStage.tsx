/**
 * Premium kamera çerçevesi + 2-sütunlu test sayfası shell'i.
 *
 * Tasarım kararları:
 *   - Kamera çerçevesi: rounded-3xl + amber ambient glow (shadow), inner
 *     gradient ring, üst köşelerde "viewfinder" SVG bracket'ları → cinematic
 *     hava. Yere oturan "frame artistik bir yapım" hissi veriyor.
 *   - Layout: lg:grid-cols-5 → kamera 3, sidebar 2. Mobile'da stack.
 *   - Sidebar `lg:sticky top-6` ile scroll'da kalıyor; uzun talimatlarda kullanışlı.
 *   - motion/react ile mount-time fade+slide reveal: amatör flat hissi yerine
 *     editorial bir "yüklendi" sinyali.
 */

'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';

interface TestStageProps {
  /** Sağ sidebar — talimatlar + start CTA + skip link */
  sidebar: ReactNode;
  /** Kamera viewport'u (CameraStream + overlay'ler) */
  cameraSlot: ReactNode;
  /** Kameranın altında: test sonucu, "kaydedildi" rozeti vb */
  belowCameraSlot?: ReactNode;
}

export function TestStage({
  sidebar,
  cameraSlot,
  belowCameraSlot,
}: TestStageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="grid gap-6 lg:grid-cols-5"
    >
      <div className="space-y-4 lg:col-span-3">
        <CameraFrame>{cameraSlot}</CameraFrame>
        {belowCameraSlot}
      </div>

      <aside className="lg:col-span-2">
        <div className="lg:sticky lg:top-6">{sidebar}</div>
      </aside>
    </motion.div>
  );
}

/**
 * Kamera viewport'unu saran "viewfinder" çerçeve.
 * Dış glow + iç amber ring + 4 köşede bracket → premium "studio" hissi.
 */
function CameraFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      {/* Atmospheric ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-amber-400/20 via-transparent to-emerald-400/10 blur-2xl"
      />

      {/* Frame body */}
      <div className="relative overflow-hidden rounded-3xl bg-neutral-950 ring-1 ring-amber-400/25 shadow-[0_30px_80px_-25px_rgba(251,191,36,0.45)]">
        {/* Inner amber gradient border (ince, sadece üst kısımda parlama) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-amber-400/15 via-transparent to-transparent"
        />

        {/* Subtle scanline / atmosphere overlay */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-3xl opacity-[0.04] mix-blend-overlay"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(255,255,255,0.6) 0 1px, transparent 1px 3px)',
          }}
        />

        {/* Camera content */}
        <div className="relative">{children}</div>

        {/* Viewfinder corner brackets */}
        <CornerBracket position="tl" />
        <CornerBracket position="tr" />
        <CornerBracket position="bl" />
        <CornerBracket position="br" />
      </div>
    </div>
  );
}

function CornerBracket({
  position,
}: {
  position: 'tl' | 'tr' | 'bl' | 'br';
}) {
  const base =
    'pointer-events-none absolute h-6 w-6 border-amber-400/70 transition-opacity';
  const map: Record<typeof position, string> = {
    tl: 'top-3 left-3 border-t-2 border-l-2 rounded-tl-lg',
    tr: 'top-3 right-3 border-t-2 border-r-2 rounded-tr-lg',
    bl: 'bottom-3 left-3 border-b-2 border-l-2 rounded-bl-lg',
    br: 'bottom-3 right-3 border-b-2 border-r-2 rounded-br-lg',
  };
  return <span aria-hidden="true" className={`${base} ${map[position]}`} />;
}
