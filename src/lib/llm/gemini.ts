/**
 * Gemini REST client — server-only fetch wrapper.
 *
 * @google/generative-ai SDK yerine direkt REST kullanıyoruz çünkü:
 *   - Bundle daha küçük
 *   - Streaming SSE'yi kendimiz kontrol ediyoruz
 *   - Anthropic'ten geçişte SDK API farkları yokken sadece HTTP detayları
 *
 * SafetySettings: çocuk içerik kapsamı için medium harm filtresi açık tutuldu.
 */

import 'server-only';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-2.5-flash';

export interface GeminiPart {
  text: string;
}

export interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

export interface GeminiSafetySetting {
  category: string;
  threshold: 'BLOCK_NONE' | 'BLOCK_LOW_AND_ABOVE' | 'BLOCK_MEDIUM_AND_ABOVE' | 'BLOCK_ONLY_HIGH';
}

export interface GeminiGenerationConfig {
  temperature?: number;
  topK?: number;
  topP?: number;
  maxOutputTokens?: number;
  stopSequences?: string[];
}

export interface GeminiRequestBody {
  contents: GeminiContent[];
  systemInstruction?: { parts: GeminiPart[] };
  generationConfig?: GeminiGenerationConfig;
  safetySettings?: GeminiSafetySetting[];
}

export interface GeminiResponse {
  candidates?: Array<{
    content: GeminiContent;
    finishReason?: string;
    safetyRatings?: Array<{ category: string; probability: string }>;
  }>;
  promptFeedback?: {
    blockReason?: string;
    safetyRatings?: Array<{ category: string; probability: string }>;
  };
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

const DEFAULT_SAFETY: GeminiSafetySetting[] = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
];

export class GeminiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'GeminiError';
    this.status = status;
  }
}

// Retry / timeout politikası — hackathon Wi-Fi koşullarında demo dayanıklılığı.
const REQUEST_TIMEOUT_MS = 25_000; // Vercel Edge default 30s; biraz altında kal
const MAX_RETRIES = 2; // toplam 3 deneme
const RETRY_BACKOFF_MS = [400, 1200]; // expo-ish

function shouldRetry(status: number): boolean {
  // Geçici problemler: 429 (rate), 500-504 (sunucu)
  return status === 429 || (status >= 500 && status <= 504);
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  externalSignal?: AbortSignal
): Promise<Response> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const ac = new AbortController();
    const timeoutId = setTimeout(() => ac.abort(), REQUEST_TIMEOUT_MS);
    const onExternalAbort = () => ac.abort();
    externalSignal?.addEventListener('abort', onExternalAbort);

    try {
      const res = await fetch(url, { ...init, signal: ac.signal });
      if (res.ok) return res;
      if (!shouldRetry(res.status) || attempt === MAX_RETRIES) return res;
    } catch (err) {
      lastErr = err;
      // AbortError — sadece dış sinyal ise propagate et, timeout ise retry
      if (err instanceof Error && err.name === 'AbortError') {
        if (externalSignal?.aborted) throw err;
        if (attempt === MAX_RETRIES) throw err;
      } else if (attempt === MAX_RETRIES) {
        throw err;
      }
    } finally {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', onExternalAbort);
    }

    // Backoff
    await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS[attempt] ?? 2000));
  }
  // Tek satır guard — TS narrowing için (yukarıdaki throw'lar ulaşımı keser).
  throw lastErr instanceof Error ? lastErr : new Error('Gemini fetch failed');
}

function getKey(): string | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.trim().length === 0) return null;
  return key.trim();
}

function getModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

export function isGeminiConfigured(): boolean {
  return getKey() !== null;
}

/**
 * Tek seferlik metin üretimi. Streaming yoksa bunu kullan.
 */
export async function generateText(opts: {
  systemPrompt?: string;
  userMessage: string;
  /** İleti geçmişi (multi-turn için). Sırasıyla. */
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  generationConfig?: GeminiGenerationConfig;
  signal?: AbortSignal;
}): Promise<string> {
  const key = getKey();
  if (!key) throw new GeminiError(0, 'GEMINI_API_KEY tanımlı değil.');

  const body: GeminiRequestBody = {
    contents: buildContents(opts.history, opts.userMessage),
    safetySettings: DEFAULT_SAFETY,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1500,
      ...opts.generationConfig,
    },
  };
  if (opts.systemPrompt) {
    body.systemInstruction = { parts: [{ text: opts.systemPrompt }] };
  }

  const url = `${API_BASE}/${getModel()}:generateContent?key=${encodeURIComponent(key)}`;
  const res = await fetchWithRetry(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    opts.signal
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new GeminiError(res.status, `Gemini API hata ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as GeminiResponse;

  if (data.promptFeedback?.blockReason) {
    throw new GeminiError(
      400,
      `Prompt güvenlik filtresine takıldı: ${data.promptFeedback.blockReason}`
    );
  }

  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('').trim();
  if (!text) {
    throw new GeminiError(500, 'Gemini boş içerik döndü.');
  }
  return text;
}

/**
 * Streaming metin üretimi — SSE stream parse edilip text chunkları yield edilir.
 */
export async function* streamText(opts: {
  systemPrompt?: string;
  userMessage: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  generationConfig?: GeminiGenerationConfig;
  signal?: AbortSignal;
}): AsyncGenerator<string, void, void> {
  const key = getKey();
  if (!key) throw new GeminiError(0, 'GEMINI_API_KEY tanımlı değil.');

  const body: GeminiRequestBody = {
    contents: buildContents(opts.history, opts.userMessage),
    safetySettings: DEFAULT_SAFETY,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1500,
      ...opts.generationConfig,
    },
  };
  if (opts.systemPrompt) {
    body.systemInstruction = { parts: [{ text: opts.systemPrompt }] };
  }

  const url = `${API_BASE}/${getModel()}:streamGenerateContent?alt=sse&key=${encodeURIComponent(key)}`;
  // Stream için retry kullanma — bağlantı kurulduğunda partial chunk geri gelmiş olabilir,
  // tekrar denemek duplicate token üretir. Sadece timeout signal'i.
  const ac = new AbortController();
  const timeoutId = setTimeout(() => ac.abort(), REQUEST_TIMEOUT_MS);
  // Named handler — anonymous arrow ile addEventListener edersek
  // removeEventListener'da bulunamaz ve listener leak olur (her demo
  // session bir tane bırakır → MaxListenersExceededWarning).
  const onExternalAbort = () => ac.abort();
  opts.signal?.addEventListener('abort', onExternalAbort);

  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ac.signal,
    });

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '');
      throw new GeminiError(
        res.status,
        `Gemini stream hata ${res.status}: ${text.slice(0, 200)}`
      );
    }

    reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      // SSE format: "data: {...json...}\n\n" satırları
      let nl;
      while ((nl = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;
        try {
          const data = JSON.parse(payload) as GeminiResponse;
          if (data.promptFeedback?.blockReason) {
            throw new GeminiError(
              400,
              `Prompt güvenlik filtresine takıldı: ${data.promptFeedback.blockReason}`
            );
          }
          const chunkText =
            data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
          if (chunkText) yield chunkText;
        } catch (err) {
          if (err instanceof GeminiError) throw err;
          // Parse hatasını yut, sonraki chunk'ı dene.
        }
      }
    }
  } finally {
    clearTimeout(timeoutId);
    opts.signal?.removeEventListener('abort', onExternalAbort);
    // Reader varsa kapat — generator caller iptal ettiyse upstream HTTP'yi bırak.
    try {
      reader?.releaseLock();
    } catch {
      // already released
    }
  }
}

function buildContents(
  history: Array<{ role: 'user' | 'assistant'; content: string }> | undefined,
  userMessage: string
): GeminiContent[] {
  const contents: GeminiContent[] = [];
  for (const m of history ?? []) {
    contents.push({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    });
  }
  contents.push({ role: 'user', parts: [{ text: userMessage }] });
  return contents;
}
