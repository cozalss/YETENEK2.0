/**
 * Typed environment variables — Zod ile runtime validation.
 *
 * Boot'ta bir kez parse edilir; eksik/geçersiz değer varsa erken fail.
 * Hata durumunda LLM özellikleri devre dışı (fallback'e düşer), uygulama
 * yine de açık kalır.
 *
 * KULLANIM:
 *   import { env } from '@/shared/config/env';
 *   if (env.ANTHROPIC_API_KEY) { ... }
 */

import 'server-only';
import { z } from 'zod';

const envSchema = z.object({
  ANTHROPIC_API_KEY: z
    .string()
    .min(10)
    .optional()
    .describe('Anthropic Claude API key (boşsa fallback rapor)'),
  ANTHROPIC_MODEL: z
    .string()
    .default('claude-sonnet-4-6')
    .describe('Default Claude model adı'),
  OPENAI_API_KEY: z
    .string()
    .min(10)
    .optional()
    .describe(
      'OpenAI API key — görsel geçerlilik hakemi. Boşsa kural tabanlı ' +
        'hakem tek başına çalışır, sistem bozulmaz.'
    ),
  OPENAI_VISION_MODEL: z
    .string()
    .default('gpt-5.6')
    .describe(
      'Vision + strict structured outputs destekleyen model. Kodda ' +
        'sabitlenmedi; kurulumda smoke-test ile doğrulanmalı.'
    ),
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .url()
    .default('http://localhost:3000')
    .describe('Public site URL — sitemap, OG, canonical için'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // Validation hatasını log'la ama uygulama'yı kırma — fallback'ler var.
    console.warn(
      '[env] Validation issues:',
      parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')
    );
    // Geçersiz olan alanları düşür, geri kalanı varsayılanlarla ayakta tut.
    // Anahtarlar bilinçli olarak dışarıda: biçimi doğrulanamayan bir anahtarla
    // istek atmak sessiz 401'lere yol açar; devre dışı bırakmak daha dürüst.
    cached = envSchema.parse({
      ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
      OPENAI_VISION_MODEL: process.env.OPENAI_VISION_MODEL ?? 'gpt-5.6',
      NODE_ENV: (process.env.NODE_ENV as Env['NODE_ENV']) ?? 'development',
    });
    return cached;
  }
  cached = parsed.data;
  return cached;
}

export const env = getEnv();
