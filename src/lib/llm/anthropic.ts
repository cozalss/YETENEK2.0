/**
 * Anthropic Claude client — server-only wrapper.
 *
 * Resmi @anthropic-ai/sdk üzerinde ince bir katman. İki public API:
 *   - generateText(): tek seferlik üretim (rapor)
 *   - streamText():   async generator olarak chunk yield eden streaming (koç sohbet)
 *
 * Sistem promptu üzerine prompt caching açık — REPORT_SYSTEM_PROMPT ve
 * COACH_SYSTEM_PROMPT uzun + sabit; cache hit ile input cost ~%90 düşer.
 *
 * Retry / timeout politikası eski Gemini client'ından korundu (hackathon
 * Wi-Fi koşullarında demo dayanıklılığı): 25s timeout, 429 / 5xx için
 * 2 retry. Streaming'de retry yok — partial token duplicate olmasın.
 */

import 'server-only';
import Anthropic from '@anthropic-ai/sdk';

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const REQUEST_TIMEOUT_MS = 25_000; // Vercel default 30s'in altında kal
const DEFAULT_MAX_TOKENS = 1500;

export class AnthropicError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'AnthropicError';
    this.status = status;
  }
}

function getKey(): string | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key.trim().length === 0) return null;
  return key.trim();
}

function getModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
}

export function isAnthropicConfigured(): boolean {
  return getKey() !== null;
}

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (cachedClient) return cachedClient;
  const apiKey = getKey();
  if (!apiKey) throw new AnthropicError(0, 'ANTHROPIC_API_KEY tanımlı değil.');
  cachedClient = new Anthropic({
    apiKey,
    timeout: REQUEST_TIMEOUT_MS,
    maxRetries: 2, // SDK kendi içinde 429/5xx için retry yapar
  });
  return cachedClient;
}

export interface GenerationConfig {
  temperature?: number;
  maxTokens?: number;
}

export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Sistem promptu Claude için cache-friendly bloğa dönüştür.
 *
 * `cache_control: { type: 'ephemeral' }` ile bu blok 5 dakika boyunca
 * cache'lenir; aynı sistem promptuyla gelen sonraki istekler input
 * maliyetinin ~%90'ını cache hit olarak öder.
 */
function buildSystemBlocks(
  systemPrompt: string | undefined
): Anthropic.TextBlockParam[] | undefined {
  if (!systemPrompt) return undefined;
  return [
    {
      type: 'text',
      text: systemPrompt,
      cache_control: { type: 'ephemeral' },
    },
  ];
}

function buildMessages(
  history: ChatHistoryItem[] | undefined,
  userMessage: string
): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = [];
  for (const m of history ?? []) {
    messages.push({ role: m.role, content: m.content });
  }
  messages.push({ role: 'user', content: userMessage });
  return messages;
}

function mapSdkError(err: unknown): never {
  if (err instanceof Anthropic.AuthenticationError) {
    throw new AnthropicError(401, 'Geçersiz Anthropic API anahtarı.');
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    throw new AnthropicError(403, 'Anthropic API erişimi reddedildi.');
  }
  if (err instanceof Anthropic.RateLimitError) {
    throw new AnthropicError(429, 'Anthropic rate limit aşıldı.');
  }
  if (err instanceof Anthropic.BadRequestError) {
    throw new AnthropicError(400, `Geçersiz istek: ${err.message}`);
  }
  if (err instanceof Anthropic.APIError) {
    throw new AnthropicError(
      err.status ?? 500,
      `Anthropic API hata (${err.status ?? '?'}): ${err.message}`
    );
  }
  if (err instanceof Error) {
    throw new AnthropicError(0, err.message);
  }
  throw new AnthropicError(0, 'Bilinmeyen Anthropic hatası.');
}

/**
 * Tek seferlik metin üretimi. Streaming yoksa bunu kullan.
 */
export async function generateText(opts: {
  systemPrompt?: string;
  userMessage: string;
  history?: ChatHistoryItem[];
  generationConfig?: GenerationConfig;
  signal?: AbortSignal;
}): Promise<string> {
  const client = getClient();
  try {
    const response = await client.messages.create(
      {
        model: getModel(),
        max_tokens: opts.generationConfig?.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: opts.generationConfig?.temperature ?? 0.7,
        system: buildSystemBlocks(opts.systemPrompt),
        messages: buildMessages(opts.history, opts.userMessage),
      },
      { signal: opts.signal }
    );

    if (response.stop_reason === 'refusal') {
      throw new AnthropicError(400, 'Claude güvenlik nedeniyle yanıt vermedi.');
    }

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim();

    if (!text) {
      throw new AnthropicError(500, 'Claude boş içerik döndü.');
    }
    return text;
  } catch (err) {
    if (err instanceof AnthropicError) throw err;
    mapSdkError(err);
  }
}

/**
 * Streaming metin üretimi — text delta'ları yield eden async generator.
 *
 * Stream başlatıldığında retry yok (duplicate token riski). SDK'nın
 * `.stream()` helper'ı stream ömrü boyunca tek bir HTTP bağlantısı
 * tutar; iptal için `signal` parametresi geçilebilir.
 */
export async function* streamText(opts: {
  systemPrompt?: string;
  userMessage: string;
  history?: ChatHistoryItem[];
  generationConfig?: GenerationConfig;
  signal?: AbortSignal;
}): AsyncGenerator<string, void, void> {
  const client = getClient();
  let stream: ReturnType<typeof client.messages.stream> | null = null;
  try {
    stream = client.messages.stream(
      {
        model: getModel(),
        max_tokens: opts.generationConfig?.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: opts.generationConfig?.temperature ?? 0.7,
        system: buildSystemBlocks(opts.systemPrompt),
        messages: buildMessages(opts.history, opts.userMessage),
      },
      { signal: opts.signal }
    );

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        if (event.delta.text) yield event.delta.text;
      }
    }

    // Final mesajda refusal kontrolü
    const finalMessage = await stream.finalMessage();
    if (finalMessage.stop_reason === 'refusal') {
      throw new AnthropicError(400, 'Claude güvenlik nedeniyle yanıtı kesti.');
    }
  } catch (err) {
    if (err instanceof AnthropicError) throw err;
    mapSdkError(err);
  } finally {
    // SDK stream'i abort etmiş olsa bile defensive kapatma
    stream?.controller.abort();
  }
}
