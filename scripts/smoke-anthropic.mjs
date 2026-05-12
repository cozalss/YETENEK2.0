// Migration smoke test — Anthropic API anahtarı + model çalışıyor mu?
// Çalıştır: node scripts/smoke-anthropic.mjs
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Anthropic from '@anthropic-ai/sdk';

// .env.local'i manuel parse et (dotenv default .env'i okur)
const envLocal = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
for (const line of envLocal.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const client = new Anthropic();
const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

console.log(`[smoke] model: ${model}`);
console.log(`[smoke] key prefix: ${process.env.ANTHROPIC_API_KEY?.slice(0, 12)}…`);

const start = Date.now();
try {
  const response = await client.messages.create({
    model,
    max_tokens: 80,
    system: [
      {
        type: 'text',
        text: 'Sen kısa ve net cevap veren Türkçe bir asistansın.',
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      { role: 'user', content: 'Yetenek 2.0 hackathon projemize başarılar dile — tek cümle.' },
    ],
  });

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');

  console.log(`\n[smoke] response (${Date.now() - start}ms):`);
  console.log(text);
  console.log(`\n[smoke] tokens — input: ${response.usage.input_tokens}, output: ${response.usage.output_tokens}, cache_creation: ${response.usage.cache_creation_input_tokens ?? 0}, cache_read: ${response.usage.cache_read_input_tokens ?? 0}`);
  console.log(`[smoke] stop_reason: ${response.stop_reason}`);
  console.log('\n[smoke] OK ✓');
} catch (err) {
  console.error('[smoke] FAIL:', err.message);
  if (err.status) console.error('[smoke] HTTP status:', err.status);
  process.exit(1);
}
