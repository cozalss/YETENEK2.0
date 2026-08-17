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
  /** Header yanına sığacak küçük varyant (h-10, auto-genişlik). */
  compact?: boolean;
}

export function StartCTA({
  onStart,
  canStart,
  // Kısa label'lar — compact butonda başlığın yanına sığsın diye. Tam
  // açıklama (örn. "Vücudun tam görünmüyor") zaten InstructionsPanel'in
  // `helper` slot'unda altta gösteriliyor; butonda kısa eylem yeterli.
  readyLabel = 'Başla',
  notReadyLabel = 'Hazırlan',
  compact = false,
}: StartCTAProps) {
  const sizing = compact
    ? 'h-9 px-4 text-[11px] tracking-widest uppercase w-auto'
    : 'h-14 w-full text-base tracking-wide';

  return (
    <motion.button
      type="button"
      // `aria-disabled` yalnızca ekran okuyucuya bilgi verir — tıklamayı
      // ENGELLEMEZ. Önceki sürümde tek koruma `onMouseDownCapture` içindeki
      // `preventDefault`'tu, ama o da click olayını durdurmuyor (yalnız odak
      // ve metin seçimini engeller) ve klavyeyle Enter/Space'te hiç devreye
      // girmiyor. Sonuç: kadraj hazır değilken test başlayabiliyordu ve
      // sistem kadrajda olmayan kalça/ayak bileğinden "topuk kaldırdın" gibi
      // yanlış teşhisler üretiyordu.
      //
      // Gerçek `disabled` yerine guard tercih edildi: buton odaklanabilir
      // kalsın ki ekran okuyucu kullanıcısı neden başlayamadığını duyabilsin
      // (bkz. dosya başlığı).
      onClick={() => {
        if (canStart) onStart();
      }}
      aria-disabled={!canStart}
      whileHover={canStart ? { scale: 1.015 } : undefined}
      whileTap={canStart ? { scale: 0.985 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 24 }}
      className={`group relative inline-flex ${sizing} items-center justify-center gap-2 rounded-full font-black transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none`}
      style={
        canStart
          ? {
              background: 'var(--track-mustard)',
              color: 'var(--form-navy)',
              boxShadow: compact
                ? '0 3px 0 rgba(44, 62, 107, 0.18)'
                : '0 6px 0 rgba(44, 62, 107, 0.18), 0 18px 36px -12px rgba(242, 201, 76, 0.45)',
              fontFamily: 'var(--font-display)',
            }
          : {
              background: 'rgba(44, 62, 107, 0.08)',
              color: 'rgba(44, 62, 107, 0.55)',
              cursor: 'not-allowed',
              boxShadow: 'inset 0 0 0 1px rgba(44, 62, 107, 0.18)',
              fontFamily: 'var(--font-display)',
            }
      }
    >
      {canStart && !compact && (
        <span
          aria-hidden="true"
          className="absolute inset-0 -z-10 rounded-full"
          style={{
            background: 'rgba(242, 201, 76, 0.45)',
            filter: 'blur(28px)',
          }}
        />
      )}
      <span>{canStart ? readyLabel : notReadyLabel}</span>
      {canStart && (
        <ArrowRight
          aria-hidden="true"
          className={`${compact ? 'h-3.5 w-3.5' : 'h-5 w-5'} transition-transform group-hover:translate-x-1`}
        />
      )}
    </motion.button>
  );
}
