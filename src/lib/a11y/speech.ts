/**
 * Web Speech API helper'ı — sesli yönlendirme.
 *
 * Çocuk literatür/görme zorluğu olan kullanıcılar için kritik:
 * countdown, "atla", "başla", "dur" gibi anlık olaylar duyusal kanal ile
 * de bildiriliyor. SSR güvenli, opsiyonel — speechSynthesis yoksa
 * sessizce no-op.
 */

export interface SpeakOptions {
  /** Önceki utterance'ı iptal et ve hemen başla */
  interrupt?: boolean;
  rate?: number;
  pitch?: number;
}

export function speak(text: string, opts: SpeakOptions = {}): void {
  if (typeof window === 'undefined') return;
  if (!('speechSynthesis' in window)) return;
  try {
    if (opts.interrupt) window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'tr-TR';
    utter.rate = opts.rate ?? 1.05;
    utter.pitch = opts.pitch ?? 1.0;
    window.speechSynthesis.speak(utter);
  } catch {
    // SR API failure (locked tab, autoplay block) → sessiz geç.
  }
}

export function cancelSpeech(): void {
  if (typeof window === 'undefined') return;
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // ignore
  }
}
