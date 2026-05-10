/**
 * Structured logger — server + client tek API.
 *
 * Console üzerinden JSON-friendly satır basar (Vercel logs otomatik parse
 * eder). Production'da pino/Sentry adapter'a geçilir.
 *
 * Felsefe:
 *   - Mesaj sade, context structured.
 *   - Level: debug | info | warn | error
 *   - PII auto-redaction çocuk ismi/email/phone — security ilk.
 */

const PII_PATTERNS = [
  /[\w.+-]+@[\w-]+\.[\w.-]+/g, // email
  /\+?\d{2,3}\s?\d{3}\s?\d{2,3}\s?\d{2,4}/g, // phone TR/intl
];

function redact(value: unknown): unknown {
  if (typeof value === 'string') {
    let out = value;
    for (const re of PII_PATTERNS) out = out.replace(re, '[redacted]');
    return out;
  }
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === 'name' || k === 'childName') {
        // Çocuk ismini logger seviyesinde maskeliyoruz; debug'da yine
        // tarayıcıda görünebilir ama log altyapısına gitmez.
        o[k] = '[child]';
      } else {
        o[k] = redact(v);
      }
    }
    return o;
  }
  return value;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  scope: string;
  message: string;
  ctx?: Record<string, unknown>;
  ts: string;
}

function emit(entry: LogEntry): void {
  const payload = {
    ...entry,
    ctx: entry.ctx ? (redact(entry.ctx) as Record<string, unknown>) : undefined,
  };
  // dev'de okunabilir, prod'da JSON.
  if (
    typeof process !== 'undefined' &&
    process.env.NODE_ENV !== 'production'
  ) {
    const tag = `[${entry.scope}]`;
    if (entry.level === 'error') console.error(tag, entry.message, payload.ctx);
    else if (entry.level === 'warn') console.warn(tag, entry.message, payload.ctx);
    else console.log(tag, entry.message, payload.ctx);
    return;
  }
  // production: tek satır JSON
  const line = JSON.stringify(payload);
  if (entry.level === 'error') console.error(line);
  else if (entry.level === 'warn') console.warn(line);
  else console.log(line);
}

export interface Logger {
  debug(msg: string, ctx?: Record<string, unknown>): void;
  info(msg: string, ctx?: Record<string, unknown>): void;
  warn(msg: string, ctx?: Record<string, unknown>): void;
  error(msg: string, ctx?: Record<string, unknown>): void;
  child(extraScope: string): Logger;
}

function makeLogger(scope: string): Logger {
  const log =
    (level: LogLevel) =>
    (message: string, ctx?: Record<string, unknown>) =>
      emit({ level, scope, message, ctx, ts: new Date().toISOString() });
  return {
    debug: log('debug'),
    info: log('info'),
    warn: log('warn'),
    error: log('error'),
    child: (extra: string) => makeLogger(`${scope}:${extra}`),
  };
}

/** Uygulamanın kök logger'ı — child'larıyla scope'lan. */
export const logger = makeLogger('yetenek');
