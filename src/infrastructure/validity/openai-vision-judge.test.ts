/**
 * OpenAI Vision adapter — **istek şekli** testleri.
 *
 * Anahtar olmadan gerçek çağrı yapılamıyor, ama isteğin doğru biçimde
 * kurulduğu doğrulanabilir. Bu testin varlık sebebi somut: yanlış şekilli bir
 * istek, anahtar takıldığı anda para yakan bir 400 demek. Burada yakalanan
 * her hata, üretimde yakalanmayan bir hatadır.
 *
 * Ağ katmanı enjekte ediliyor (`FetchLike`), yani hiçbir gerçek çağrı yok.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  OpenAiVisionValidityJudge,
  VERDICT_SCHEMA,
  type FetchLike,
} from './openai-vision-judge';
import { resetEnvCacheForTests } from '@/shared/config/env';
import { POSE_LANDMARKS, type Keypoint, type PoseFrame } from '@/types';

function frame(t: number): PoseFrame {
  const landmarks: Keypoint[] = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 0.9,
  }));
  const set = (i: number, x: number, y: number) => {
    landmarks[i] = { x, y, z: 0, visibility: 0.9 };
  };
  set(POSE_LANDMARKS.LEFT_ANKLE, 0.45, 0.95);
  set(POSE_LANDMARKS.RIGHT_ANKLE, 0.55, 0.95);
  set(POSE_LANDMARKS.LEFT_HIP, 0.46, 0.55);
  set(POSE_LANDMARKS.RIGHT_HIP, 0.54, 0.55);
  return { timestamp: t, landmarks };
}

const frames = Array.from({ length: 40 }, (_, i) => frame(i * 33));

const GOOD_VERDICT = {
  performed: true,
  // Bilerek geçersiz bir enum değeri — eleme testi için.
  protocolViolations: ['arm_swing_unused'],
  techniqueScore: 72,
  stanceConfirmed: null,
  compensations: ['knee_valgus'],
  judgeConfidence: 0.8,
  notes: 'Kollar hafif savruldu.',
};

/** Son isteği yakalayan sahte fetch. */
function captureFetch(response: unknown, status = 200) {
  const calls: { url: string; init: RequestInit }[] = [];
  const impl: FetchLike = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => response,
    };
  };
  return { calls, impl };
}

function body(init: RequestInit): Record<string, unknown> {
  return JSON.parse(String(init.body));
}

const OK_RESPONSE = { output_text: JSON.stringify(GOOD_VERDICT) };

describe('istek şekli — Responses API sözleşmesi', () => {
  beforeEach(() => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test-0123456789abcdef');
    vi.stubEnv('OPENAI_VISION_MODEL', 'gpt-test');
    // env memoize edildiği için stub'lardan SONRA sıfırlanmalı.
    resetEnvCacheForTests();
  });

  it('doğru uç noktaya, doğru başlıklarla POST atar', async () => {
    const { calls, impl } = captureFetch(OK_RESPONSE);
    await new OpenAiVisionValidityJudge(impl).judge({ test: 'jump', frames });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://api.openai.com/v1/responses');
    expect(calls[0].init.method).toBe('POST');
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers.Authorization).toMatch(/^Bearer /);
  });

  it('anahtarı gövdeye SIZDIRMAZ — yalnız Authorization başlığında', async () => {
    const { calls, impl } = captureFetch(OK_RESPONSE);
    await new OpenAiVisionValidityJudge(impl).judge({ test: 'jump', frames });
    expect(String(calls[0].init.body)).not.toContain('sk-test');
  });

  it('modeli env degiskeninden alır — kodda sabit değil', async () => {
    const { calls, impl } = captureFetch(OK_RESPONSE);
    await new OpenAiVisionValidityJudge(impl).judge({ test: 'jump', frames });
    expect(body(calls[0].init).model).toBe('gpt-test');
  });

  it('KVKK: store=false gönderir', async () => {
    const { calls, impl } = captureFetch(OK_RESPONSE);
    await new OpenAiVisionValidityJudge(impl).judge({ test: 'jump', frames });
    expect(body(calls[0].init).store).toBe(false);
  });

  it('strict JSON şema formatını doğru yerde taşır', async () => {
    const { calls, impl } = captureFetch(OK_RESPONSE);
    await new OpenAiVisionValidityJudge(impl).judge({ test: 'jump', frames });

    const text = body(calls[0].init).text as {
      format: { type: string; name: string; strict: boolean; schema: unknown };
    };
    expect(text.format.type).toBe('json_schema');
    expect(text.format.strict).toBe(true);
    expect(text.format.name).toBe('test_verdict');
    expect(text.format.schema).toBeTruthy();
  });

  it('girdi: bir metin + en fazla 8 görüntü, hepsi data URI', async () => {
    const { calls, impl } = captureFetch(OK_RESPONSE);
    await new OpenAiVisionValidityJudge(impl).judge({ test: 'jump', frames });

    const input = body(calls[0].init).input as {
      role: string;
      content: { type: string; text?: string; image_url?: string }[];
    }[];
    expect(input).toHaveLength(1);
    expect(input[0].role).toBe('user');

    const texts = input[0].content.filter((c) => c.type === 'input_text');
    const images = input[0].content.filter((c) => c.type === 'input_image');
    expect(texts).toHaveLength(1);
    expect(images.length).toBeGreaterThan(0);
    expect(images.length).toBeLessThanOrEqual(8);
    for (const img of images) {
      // PNG zorunlu: OpenAI Vision SVG kabul etmiyor (yalnız jpeg/png/gif/
      // webp). Gerçek bir çağrıda 400 ile yakalandı; bu assertion regresyon
      // kilidi.
      expect(img.image_url?.startsWith('data:image/png;base64,')).toBe(true);
    }
  });

  it('prompt modele ÖLÇÜM YAPMAMASINI açıkça söylüyor', async () => {
    const { calls, impl } = captureFetch(OK_RESPONSE);
    await new OpenAiVisionValidityJudge(impl).judge({ test: 'jump', frames });
    const input = body(calls[0].init).input as { content: { text?: string }[] }[];
    const prompt = input[0].content.find((c) => c.text)?.text ?? '';
    expect(prompt).toContain('Hiçbir ölçüm yapma');
    expect(prompt).toContain('TAHMİN ETME');
  });

  it('CMJ promptu topuk/uçuş sormaz — o fizik katmanının işi', async () => {
    const { calls, impl } = captureFetch(OK_RESPONSE);
    await new OpenAiVisionValidityJudge(impl).judge({ test: 'jump', frames });
    const input = body(calls[0].init).input as { content: { text?: string }[] }[];
    const prompt = input[0].content.find((c) => c.text)?.text ?? '';
    expect(prompt).not.toMatch(/topuk/i);
    expect(prompt).toMatch(/KARAR VERME/);
  });
});

describe('strict şema — OpenAI kısıtlarına uyum', () => {
  it('her nesnede additionalProperties: false', () => {
    expect(VERDICT_SCHEMA.additionalProperties).toBe(false);
  });

  it('tüm alanlar required — strict mod bunu zorunlu kılıyor', () => {
    const props = Object.keys(VERDICT_SCHEMA.properties);
    expect([...VERDICT_SCHEMA.required].sort()).toEqual(props.sort());
  });

  it('şemada BİRİMLİ SAYI alanı yok — halüsinasyon yapısal olarak imkânsız', () => {
    const keys = Object.keys(VERDICT_SCHEMA.properties);
    for (const forbidden of ['heightCm', 'distanceCm', 'flightTimeMs', 'percentile']) {
      expect(keys).not.toContain(forbidden);
    }
    // techniqueScore birimsiz olduğu açıkça yazılı olmalı.
    expect(VERDICT_SCHEMA.properties.techniqueScore.description).toContain(
      'DEĞİLDİR'
    );
  });
});

describe('yanıt işleme ve hata yolları', () => {
  beforeEach(() => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test-0123456789abcdef');
    vi.stubEnv('OPENAI_VISION_MODEL', 'gpt-test');
    // env memoize edildiği için stub'lardan SONRA sıfırlanmalı.
    resetEnvCacheForTests();
  });

  it('geçerli yanıtı karara çevirir', async () => {
    const { impl } = captureFetch(OK_RESPONSE);
    const r = await new OpenAiVisionValidityJudge(impl).judge({
      test: 'jump',
      frames,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('unreachable');
    expect(r.value.techniqueScore).toBe(72);
    expect(r.value.source).toBe('vision');
    expect(r.value.compensations).toContain('knee_valgus');
  });

  it('bilinmeyen ihlal etiketlerini ELER — enum dışı değer sızmaz', async () => {
    const { impl } = captureFetch(OK_RESPONSE);
    const r = await new OpenAiVisionValidityJudge(impl).judge({
      test: 'jump',
      frames,
    });
    if (!r.ok) throw new Error('unreachable');
    expect(r.value.protocolViolations).toHaveLength(0);
  });

  it('jump temas etiketini şema hijyeninde siler ve techniqueScore tabanlar', async () => {
    const { impl } = captureFetch({
      output_text: JSON.stringify({
        performed: false,
        protocolViolations: ['heel_raise_only'],
        techniqueScore: 0,
        stanceConfirmed: null,
        compensations: [],
        judgeConfidence: 0.95,
        notes: 'Topuk.',
      }),
    });
    const r = await new OpenAiVisionValidityJudge(impl).judge({
      test: 'jump',
      frames,
    });
    if (!r.ok) throw new Error('unreachable');
    expect(r.value.protocolViolations).not.toContain('heel_raise_only');
    expect(r.value.techniqueScore).toBeGreaterThanOrEqual(50);
  });

  it('output[] biçimindeki yanıtı da okur', async () => {
    const { impl } = captureFetch({
      output: [
        { content: [{ type: 'output_text', text: JSON.stringify(GOOD_VERDICT) }] },
      ],
    });
    const r = await new OpenAiVisionValidityJudge(impl).judge({
      test: 'jump',
      frames,
    });
    expect(r.ok).toBe(true);
  });

  it('429 → rate-limit hatası', async () => {
    const { impl } = captureFetch({}, 429);
    const r = await new OpenAiVisionValidityJudge(impl).judge({
      test: 'jump',
      frames,
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unreachable');
    expect(r.error.code).toBe('llm.rate-limit');
  });

  it('400 (yanlış model kimliği) → llm.unavailable, sistem çökmez', async () => {
    const { impl } = captureFetch({}, 400);
    const r = await new OpenAiVisionValidityJudge(impl).judge({
      test: 'jump',
      frames,
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unreachable');
    expect(r.error.code).toBe('llm.unavailable');
  });

  it('boş yanıt → llm.empty-response', async () => {
    const { impl } = captureFetch({ output_text: '' });
    const r = await new OpenAiVisionValidityJudge(impl).judge({
      test: 'jump',
      frames,
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unreachable');
    expect(r.error.code).toBe('llm.empty-response');
  });

  it('bozuk JSON → hata, exception dışarı sızmaz', async () => {
    const { impl } = captureFetch({ output_text: '{bu json degil' });
    const r = await new OpenAiVisionValidityJudge(impl).judge({
      test: 'jump',
      frames,
    });
    expect(r.ok).toBe(false);
  });

  it('anahtar yoksa çağrı HİÇ yapılmaz', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    resetEnvCacheForTests();
    const { calls, impl } = captureFetch(OK_RESPONSE);
    const r = await new OpenAiVisionValidityJudge(impl).judge({
      test: 'jump',
      frames,
    });
    expect(calls).toHaveLength(0);
    expect(r.ok).toBe(false);
  });
});
