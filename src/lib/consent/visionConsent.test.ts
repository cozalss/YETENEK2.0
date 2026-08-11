/**
 * Rıza kapısı testleri.
 *
 * Bu kapı, çocuğa ait verinin cihazdan çıkmasının tek koşulu. Varsayılanın
 * kapalı olması ve belirsizlikte kapalıya düşmesi test edilerek sabitleniyor
 * — sessizce açık kalan bir rıza kapısı, hiç olmayan bir kapıdan kötüdür.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CONSENT_TEXT,
  CONSENT_TEXT_VERSION,
  clearVisionConsent,
  getVisionConsent,
  isVisionConsentGranted,
  setVisionConsent,
} from './visionConsent';

const KEY = 'yetenek.consent.vision.v1';

/** Minimal localStorage taklidi — jsdom yerine (test ortamı node). */
function installStorage(): Map<string, string> {
  const store = new Map<string, string>();
  vi.stubGlobal('window', {});
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  return store;
}

describe('varsayılan davranış', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('sunucuda (window yok) KAPALI döner', () => {
    expect(isVisionConsentGranted()).toBe(false);
    expect(getVisionConsent()).toBeNull();
  });

  it('karar verilmemişse KAPALI', () => {
    installStorage();
    expect(getVisionConsent()).toBeNull();
    expect(isVisionConsentGranted()).toBe(false);
  });

  it('bozuk kayıtta KAPALI — belirsizlikte veri göndermez', () => {
    const store = installStorage();
    store.set(KEY, 'bu JSON değil');
    expect(isVisionConsentGranted()).toBe(false);
  });

  it('eksik alanlı kayıtta KAPALI', () => {
    const store = installStorage();
    store.set(KEY, JSON.stringify({ decidedAt: '2026-01-01' }));
    expect(isVisionConsentGranted()).toBe(false);
  });
});

describe('rıza kaydı', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    installStorage();
  });

  it('onay kaydedilir ve okunur', () => {
    setVisionConsent(true);
    expect(isVisionConsentGranted()).toBe(true);
    expect(getVisionConsent()?.decidedAt).toBeTruthy();
  });

  it('ret de kaydedilir — "tekrar sorma" anlamına gelir', () => {
    setVisionConsent(false);
    const c = getVisionConsent();
    expect(c).not.toBeNull();
    expect(c!.granted).toBe(false);
    expect(isVisionConsentGranted()).toBe(false);
  });

  it('geri alınabilir', () => {
    setVisionConsent(true);
    expect(isVisionConsentGranted()).toBe(true);
    setVisionConsent(false);
    expect(isVisionConsentGranted()).toBe(false);
  });

  it('tamamen silinebilir — "verilerimi unut"', () => {
    setVisionConsent(true);
    clearVisionConsent();
    expect(getVisionConsent()).toBeNull();
    expect(isVisionConsentGranted()).toBe(false);
  });
});

describe('metin sürümü', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('eski sürümle verilmiş rıza GEÇERSİZ sayılır', () => {
    const store = installStorage();
    store.set(
      KEY,
      JSON.stringify({
        granted: true,
        decidedAt: '2026-01-01T00:00:00.000Z',
        textVersion: CONSENT_TEXT_VERSION - 1,
      })
    );
    // Metin değiştiyse veli neyi onayladığını bilmiyor demektir.
    expect(isVisionConsentGranted()).toBe(false);
  });

  it('rıza metni ne gönderildiğini ve gönderilmediğini açıkça söyler', () => {
    expect(CONSENT_TEXT).toContain('OpenAI');
    expect(CONSENT_TEXT).toContain('Kamera görüntüsü');
    expect(CONSENT_TEXT).toContain('saklanmaz');
    // Reddetmenin bedelsiz olduğu açıkça yazılı olmalı.
    expect(CONSENT_TEXT).toContain('Onaylamazsanız');
  });
});
