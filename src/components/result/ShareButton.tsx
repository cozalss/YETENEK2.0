/**
 * Sonuç paylaşım butonu — Web Share API + clipboard fallback +
 * WhatsApp/Twitter intent linkleri.
 *
 * KVKK: Default olarak çocuk ismi paylaşılmaz; veli "ismimle paylaş"
 * checkbox'ını manuel açarsa eklenir.
 */

'use client';

import { useState, useEffect } from 'react';
import { Check, Copy, Link2, MessageCircle, Send } from 'lucide-react';
import type { SessionSummary } from '@/lib/session/store';

interface Props {
  session: SessionSummary;
  /** Paylaşılacak public URL (örn. /share/[token]). Yoksa demo URL kullanılır. */
  shareUrl?: string;
  /** OG image URL'si. Yoksa otomatik oluşturulur. */
  ogImageUrl?: string;
}

export function ShareButton({ session, shareUrl, ogImageUrl }: Props) {
  const [copied, setCopied] = useState(false);
  const [includeName, setIncludeName] = useState(false);

  const top = session.recommendations?.[0];
  const url =
    shareUrl ??
    (typeof window !== 'undefined'
      ? `${window.location.origin}/result/demo`
      : '');

  // OG image otomatik oluştur
  const autoOgUrl = (() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams();
    params.set('name', session.child.name);
    params.set('age', String(session.child.ageYears));
    if (top) {
      params.set('sport', top.sport);
      params.set('score', String(top.confidencePercent));
    }
    return `${window.location.origin}/api/og?${params.toString()}`;
  })();
  const imageUrl = ogImageUrl ?? autoOgUrl;

  const subject = includeName
    ? `${session.child.name}'nın Yetenek Profili`
    : `Yetenek Profili (${session.child.ageYears} yaş)`;

  const body = top
    ? `${subject}: %${top.confidencePercent} ${top.sport} uyumu — Yetenek 2.0 testi.`
    : `${subject} — Yetenek 2.0 testi.`;

  const shareText = `${body} ${url}`;

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        const files: File[] = [];
        // OG image varsa ve fetch edilebiliyorsa, native share'e image olarak ekle
        if (imageUrl) {
          try {
            const imgRes = await fetch(imageUrl);
            if (imgRes.ok) {
              const blob = await imgRes.blob();
              const ext = imageUrl.includes('.svg') ? 'svg' : 'png';
              files.push(
                new File([blob], `yetenek-profil.${ext}`, {
                  type: blob.type,
                })
              );
            }
          } catch {
            // ignore image fetch failure
          }
        }
        await navigator.share({
          title: subject,
          text: body,
          url,
          files: files.length > 0 ? files : undefined,
        });
        return;
      } catch {
        // User dismissed or share failed — silently fall through to copy.
      }
    }
    await copyToClipboard();
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore — older browsers without secure context
    }
  };

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const twitterHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(body)}&url=${encodeURIComponent(url)}`;

  // Meta tag'leri runtime'da güncelle (client-side only)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const setMeta = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', property);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };
    setMeta('og:title', subject);
    setMeta('og:description', body);
    setMeta('og:url', url);
    if (imageUrl) setMeta('og:image', imageUrl);
    setMeta('og:type', 'article');
    setMeta('twitter:card', 'summary_large_image');
  }, [subject, body, url, imageUrl]);

  return (
    <div className="rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
      <p className="text-xs font-semibold tracking-[0.25em] text-[var(--color-signal)] uppercase">
        Paylaş
      </p>
      <h3 className="mt-2 text-xl font-bold text-[var(--color-ink-1)] md:text-2xl">
        Sonucumu paylaş
      </h3>
      <p className="mt-2 text-sm text-[var(--color-ink-2)]">
        Aile, antrenör veya arkadaşına gönder. Bağlantı{' '}
        {includeName ? 'isimle' : 'isimsiz'} paylaşılacak.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--color-signal)] px-5 text-sm font-bold text-[var(--color-canvas)] transition-colors hover:bg-amber-300 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)] focus-visible:outline-none sm:col-span-3"
        >
          <Send className="h-4 w-4" />
          Paylaş
        </button>

        <button
          type="button"
          onClick={copyToClipboard}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-canvas)] px-4 text-xs font-semibold text-[var(--color-ink-1)] transition-colors hover:border-[var(--color-signal)]/40 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)] focus-visible:outline-none"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Kopyalandı' : 'Bağlantı'}
        </button>

        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border-2 px-4 text-xs font-bold uppercase tracking-wider transition-colors hover:bg-[rgba(168,213,186,0.35)]"
          style={{
            borderColor: 'var(--field-mint)',
            background: 'rgba(168, 213, 186, 0.18)',
            color: 'var(--form-navy)',
            fontFamily: 'var(--font-display)',
          }}
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </a>

        <a
          href={twitterHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border-2 px-4 text-xs font-bold uppercase tracking-wider transition-colors hover:bg-[var(--color-canvas)]"
          style={{
            borderColor: 'var(--color-line-strong)',
            background: 'var(--color-surface-elevated)',
            color: 'var(--form-navy)',
            fontFamily: 'var(--font-display)',
          }}
        >
          <Link2 className="h-4 w-4" />
          X / Twitter
        </a>
      </div>

      <label className="mt-5 flex items-center gap-3 text-xs text-[var(--color-ink-2)]">
        <input
          type="checkbox"
          checked={includeName}
          onChange={(e) => setIncludeName(e.target.checked)}
          className="h-4 w-4 rounded border-[var(--color-line)] bg-[var(--color-canvas)] text-[var(--color-signal)] focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)] focus-visible:outline-none"
        />
        <span>
          <strong className="text-[var(--color-ink-1)]">Çocuğun ismi</strong>{' '}
          paylaşımda görünsün ({session.child.name})
        </span>
      </label>
    </div>
  );
}
