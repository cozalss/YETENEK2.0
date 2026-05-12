/**
 * AI Coach chat — sonuç ekranındaki bottom sheet UI.
 *
 * Custom SSE reader (Vercel AI SDK gerekmez, +30KB tasarruf).
 * Last-N mesajla streaming text endpoint'e POST eder.
 */

'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { Send, Sparkles } from 'lucide-react';
import type { SessionSummary } from '@/lib/session/store';
import { logger } from '@/shared/logger/logger';

const log = logger.child('coach-chat');

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  session: SessionSummary;
}

const SUGGESTIONS = [
  'Çocuğum bu sporda nasıl gelişebilir?',
  'Hangi yaşta hangi temele odaklanmalı?',
  'Asimetri uyarısı için somut egzersiz ver',
  'Bu spor için aylık antrenman programı önerisi?',
];

export function CoachChat({ session }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll on new content
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;
      setError(null);
      // Functional setter ile son state'i alıp history snapshot'ını
      // closure dışında tut. `messages` dep'i kaldırıldı — aksi halde
      // streaming chunks her tick'te send'i yeniden create eder, input
      // yazarken lag yaratırdı.
      let historySnapshot: ChatMessage[] = [];
      setMessages((prev) => {
        const next: ChatMessage[] = [
          ...prev,
          { role: 'user', content: trimmed },
          { role: 'assistant', content: '' },
        ];
        historySnapshot = next.slice(0, -1).slice(-9);
        return next;
      });
      setInput('');
      setLoading(true);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session,
            history: historySnapshot,
            message: trimmed,
          }),
        });

        if (!res.ok) {
          let msg = 'Koç yanıt veremedi.';
          try {
            const data = await res.json();
            if (typeof data?.error === 'string') msg = data.error;
          } catch {
            // ignore parse error
          }
          setError(msg);
          // assistant placeholder'ı sil
          setMessages((prev) => prev.slice(0, -1));
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          setError('Yanıt alınamadı.');
          return;
        }
        const decoder = new TextDecoder();
        let acc = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: 'assistant', content: acc };
            return copy;
          });
        }
      } catch (err) {
        // AbortError — kullanıcı sayfayı bıraktı / yeni istek gönderdi.
        // Hata değil; UI sessizce kapanır, placeholder temizlenir.
        const isAbort =
          err instanceof Error &&
          (err.name === 'AbortError' || err.name === 'CanceledError');
        if (!isAbort) {
          log.warn('chat stream error', {
            cause: err instanceof Error ? err.message : String(err),
            name: err instanceof Error ? err.name : 'unknown',
          });
          setError('Bağlantı hatası, tekrar dene.');
        }
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setLoading(false);
      }
    },
    // messages dep kasten dışarıda — streaming chunks send fonksiyonunu
    // yeniden create etmesin, kullanıcı input yazarken lag olmasın.
    // setMessages functional updater ile her zaman güncel state'i alır.
    [loading, session]
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim()) send(input);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-center justify-between gap-4 rounded-3xl border border-[var(--color-signal)]/30 bg-gradient-to-br from-[var(--color-signal)]/10 via-transparent to-transparent p-6 text-left transition-all hover:border-[var(--color-signal)]/60 hover:shadow-[0_15px_40px_-10px_rgba(246,196,83,0.25)] focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-canvas)] focus-visible:outline-none"
      >
        <div>
          <p className="text-xs font-semibold tracking-[0.25em] text-[var(--color-signal)] uppercase">
            AI Koç
          </p>
          <h3 className="mt-2 text-2xl leading-tight font-bold md:text-3xl">
            Soru sor, somut tavsiye al.
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--color-ink-2)]">
            Bu sporu nasıl başlatırım? Asimetri için ne yapsak? Çocuğun
            profilini bilen bir AI koçla sohbet et.
          </p>
        </div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--color-signal)] text-[var(--color-canvas)] shadow-[0_15px_45px_-10px_rgba(246,196,83,0.6)] transition-transform group-hover:scale-105">
          <Sparkles className="h-5 w-5" />
        </span>
      </button>
    );
  }

  return (
    <section
      aria-label="AI Koç chat"
      className="rounded-3xl border border-[var(--color-signal)]/30 bg-[var(--color-surface)] p-6"
    >
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.25em] text-[var(--color-signal)] uppercase">
            AI Koç · Gemini
          </p>
          <h3 className="mt-1 text-xl font-bold">Sohbet</h3>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-[var(--color-line)] px-3 py-1 text-xs text-[var(--color-ink-2)] transition-colors hover:border-[var(--color-signal)]/40 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)] focus-visible:outline-none"
        >
          Kapat
        </button>
      </header>

      <div
        ref={listRef}
        className="mt-5 max-h-[420px] min-h-[180px] space-y-3 overflow-y-auto rounded-2xl bg-[var(--color-canvas)] p-4 text-sm"
      >
        {messages.length === 0 && (
          <>
            <p className="text-sm text-[var(--color-ink-2)]">
              Çocuğunun yetenek profilini biliyorum (skorlar + spor önerileri).
              İsteğin neyse sor — egzersiz, başlama yaşı, asimetri bakımı, vb.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  disabled={loading}
                  onClick={() => send(sug)}
                  className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-left text-xs text-[var(--color-ink-2)] transition-colors hover:border-[var(--color-signal)]/40 hover:text-[var(--color-ink-1)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sug}
                </button>
              ))}
            </div>
          </>
        )}

        {messages.map((msg, idx) => (
          <Bubble key={idx} role={msg.role} content={msg.content} />
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg border-2 px-3 py-2 text-xs font-medium"
          style={{
            borderColor: 'var(--mindar-pink)',
            background: 'rgba(244, 182, 194, 0.2)',
            color: 'var(--deep-navy)',
          }}
        >
          {error}
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-4 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          placeholder="Koça sor: Bu sporu nasıl başlatırım?"
          maxLength={800}
          className="h-11 flex-1 rounded-full border border-[var(--color-line)] bg-[var(--color-canvas)] px-4 text-sm text-[var(--color-ink-1)] placeholder:text-[var(--color-ink-3)] focus-visible:border-[var(--color-signal)]/60 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)] focus-visible:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || input.trim().length === 0}
          className="grid h-11 w-11 place-items-center rounded-full transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          style={{
            background: 'var(--color-signal)',
            color: 'var(--form-navy)',
            boxShadow: '0 8px 22px -8px rgba(242, 201, 76, 0.6)',
          }}
          aria-label="Gönder"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </section>
  );
}

function Bubble({
  role,
  content,
}: {
  role: 'user' | 'assistant';
  content: string;
}) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[88%] rounded-2xl px-4 py-2.5 leading-relaxed"
        style={
          isUser
            ? {
                background: 'var(--form-navy)',
                color: 'var(--whistle-cream)',
              }
            : {
                background: 'var(--color-surface-elevated)',
                color: 'var(--color-ink-1)',
                boxShadow: 'inset 0 0 0 1px var(--color-line)',
              }
        }
      >
        {content || (
          <span className="inline-flex items-center gap-1 text-[var(--color-ink-3)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-signal)]" />
            Yazıyor…
          </span>
        )}
      </div>
    </div>
  );
}
