/**
 * Result<T, E> — exception yerine discriminated union ile hata yönetimi.
 *
 * Felsefe:
 *   - Domain katmanı asla `throw` etmez; her başarısızlık tipli ve isimlidir.
 *   - Boundary'lerde (API route, UI handler) Result açılır + uygun cevaba çevrilir.
 *   - TypeScript discriminated union sayesinde unutulan branch derleme hatası verir.
 *
 * Kullanım:
 *   const r = await loadSession(id);
 *   if (r.ok) console.log(r.value);
 *   else console.error(r.error.code);
 */

export type Result<T, E = AppError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/**
 * Domain'in tüm hata tipleri tek bir tagged union olarak modellenir.
 * Yeni bir hata eklemek = bu union'a yeni bir branch eklemek (compiler
 * tüm callsite'larda eksik branch'leri yakalar).
 */
export type AppError =
  | { readonly code: 'config.missing'; readonly key: string }
  | { readonly code: 'storage.unavailable'; readonly cause?: unknown }
  | { readonly code: 'storage.parse'; readonly raw?: string }
  | { readonly code: 'storage.quota'; readonly cause?: unknown }
  | { readonly code: 'session.invalid'; readonly reason: string }
  | { readonly code: 'session.not-found'; readonly id: string }
  | { readonly code: 'validation.failed'; readonly issues: ValidationIssue[] }
  | { readonly code: 'llm.unavailable'; readonly reason: string }
  | { readonly code: 'llm.rate-limit'; readonly retryAfterMs?: number }
  | { readonly code: 'llm.blocked'; readonly reason: string }
  | { readonly code: 'llm.empty-response' }
  | { readonly code: 'llm.timeout' }
  | { readonly code: 'network.offline' }
  | { readonly code: 'unexpected'; readonly cause: unknown };

export interface ValidationIssue {
  readonly path: ReadonlyArray<string | number>;
  readonly message: string;
}

/* ───────── Constructors ───────── */

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const err = <E extends AppError>(error: E): Result<never, E> => ({
  ok: false,
  error,
});

/* ───────── Helpers ───────── */

/** Sync veya async throwing fonksiyonu Result'a sarar. */
export async function fromThrowable<T>(
  fn: () => T | Promise<T>,
  mapError: (cause: unknown) => AppError = (cause) => ({
    code: 'unexpected',
    cause,
  })
): Promise<Result<T, AppError>> {
  try {
    return ok(await fn());
  } catch (cause) {
    return err(mapError(cause));
  }
}

/** Result chain — başarılıysa map'leyip yeni Result döndürür. */
export function map<T, U, E extends AppError>(
  r: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  return r.ok ? ok(fn(r.value)) : r;
}

/** Async chain. */
export async function mapAsync<T, U, E extends AppError>(
  r: Result<T, E>,
  fn: (value: T) => Promise<U>
): Promise<Result<U, E>> {
  return r.ok ? ok(await fn(r.value)) : r;
}

/** İki Result'ı zincirle (flatMap). */
export async function chain<T, U, E extends AppError>(
  r: Result<T, E>,
  fn: (value: T) => Promise<Result<U, E>>
): Promise<Result<U, E>> {
  return r.ok ? await fn(r.value) : r;
}

/**
 * Result'tan değer çıkar; hata varsa default kullan. UI tarafında pratik.
 */
export function unwrapOr<T>(r: Result<T, AppError>, fallback: T): T {
  return r.ok ? r.value : fallback;
}

/** Hata mesajının insan-okuyabilir Türkçe formu. */
export function describeError(error: AppError): string {
  switch (error.code) {
    case 'config.missing':
      return `Yapılandırma eksik: ${error.key}`;
    case 'storage.unavailable':
      return 'Tarayıcı yerel depolaması erişilebilir değil.';
    case 'storage.parse':
      return 'Yerel depodaki veri okunamadı.';
    case 'storage.quota':
      return 'Yerel depo dolu.';
    case 'session.invalid':
      return `Oturum geçersiz: ${error.reason}`;
    case 'session.not-found':
      return 'Oturum bulunamadı.';
    case 'validation.failed':
      return `Doğrulama başarısız (${error.issues.length} sorun).`;
    case 'llm.unavailable':
      return `AI servisi şu anda kullanılamaz: ${error.reason}`;
    case 'llm.rate-limit':
      return 'AI servisi çok fazla istek aldı, biraz bekle.';
    case 'llm.blocked':
      return `İstek güvenlik filtresine takıldı: ${error.reason}`;
    case 'llm.empty-response':
      return 'AI boş yanıt döndü.';
    case 'llm.timeout':
      return 'AI yanıtı zaman aşımına uğradı.';
    case 'network.offline':
      return 'Ağ bağlantısı yok.';
    case 'unexpected':
      return 'Beklenmedik bir hata oluştu.';
  }
}
