'use client';

/**
 * Görsel denetim rıza kartı.
 *
 * Veliye gerçek bir seçim sunar: metin açık, varsayılan kapalı, geri alınabilir
 * ve reddetmenin bir bedeli olmadığı açıkça yazılı. "Kabul et" düğmesi
 * vurgulu, "istemiyorum" ikincil değil — ikisi de eşit ağırlıkta, çünkü
 * reddetmek gerçekten geçerli bir seçim.
 */

import { useEffect, useState } from 'react';
import {
  CONSENT_TEXT,
  getVisionConsent,
  setVisionConsent,
} from '@/lib/consent/visionConsent';

interface Props {
  /** Görsel denetim sunucuda yapılandırılmış mı (`/api/health`). */
  readonly available: boolean;
}

export function VisionConsentCard({ available }: Props) {
  // `null` = henüz okunmadı (SSR/hidrasyon), `undefined` = karar verilmemiş.
  const [granted, setGranted] = useState<boolean | null | undefined>(null);

  useEffect(() => {
    const consent = getVisionConsent();
    setGranted(consent == null ? undefined : consent.granted);
  }, []);

  // Sunucuda yapılandırılmamışsa veliye seçim sunmanın anlamı yok.
  if (!available) return null;
  // İlk render'da depolama okunmadan bir durum göstermeyelim.
  if (granted === null) return null;

  const decide = (value: boolean) => {
    setVisionConsent(value);
    setGranted(value);
  };

  return (
    <section
      className="rounded-2xl border p-5"
      style={{
        borderColor: 'var(--color-line)',
        background: 'var(--color-surface-elevated)',
      }}
      aria-labelledby="vision-consent-heading"
    >
      <h3
        id="vision-consent-heading"
        className="text-base font-semibold"
        style={{ color: 'var(--form-navy)' }}
      >
        Hareket kalitesi denetimi
      </h3>

      <p
        className="mt-2 text-sm leading-relaxed"
        style={{ color: 'var(--color-ink-2)' }}
      >
        {CONSENT_TEXT}
      </p>

      {granted === undefined ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => decide(true)}
            className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              background: 'var(--form-navy)',
              color: 'var(--whistle-cream)',
            }}
          >
            Onaylıyorum
          </button>
          <button
            type="button"
            onClick={() => decide(false)}
            className="flex-1 rounded-xl border px-4 py-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              borderColor: 'var(--color-line-strong)',
              color: 'var(--form-navy)',
            }}
          >
            İstemiyorum
          </button>
        </div>
      ) : (
        <div className="mt-4 flex items-center justify-between gap-3">
          <span
            className="text-sm font-medium"
            style={{ color: granted ? 'var(--form-navy)' : 'var(--color-ink-3)' }}
          >
            {granted
              ? 'Açık — hareket kalitesi de denetleniyor'
              : 'Kapalı — denetim yalnız cihazınızda yapılıyor'}
          </span>
          <button
            type="button"
            onClick={() => decide(!granted)}
            className="shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              borderColor: 'var(--color-line-strong)',
              color: 'var(--form-navy)',
            }}
          >
            {granted ? 'Kapat' : 'Aç'}
          </button>
        </div>
      )}
    </section>
  );
}
