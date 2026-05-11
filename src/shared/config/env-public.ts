/**
 * Public (NEXT_PUBLIC_*) env wrapper'ı — hem client hem server tarafında
 * okunabilir.
 *
 * Next.js build sırasında `NEXT_PUBLIC_*` env'lerini bundle'a inline eder;
 * runtime'da `process.env.NEXT_PUBLIC_SUPABASE_URL` tarayıcıda string
 * olarak görünür. Bu wrapper sadece tip güvenliği ve eksik değer
 * uyarısı sağlar.
 *
 * `server-only` İMPORT ETMEZ — client component'ler bu modülü güvenle
 * içeri alır. Hassas key'ler için `@/shared/config/env` kullan (server
 * tarafı).
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

// Build sırasında değerler inline edildiği için bu warning sadece
// eksik konfigürasyon halinde tetiklenir. Production bundle'ında
// kullanıcı konsoluna sızmasın diye sadece dev modunda log atılır.
if (
  process.env.NODE_ENV !== 'production' &&
  typeof window !== 'undefined' &&
  (!supabaseUrl || !supabaseAnonKey)
) {
  console.warn(
    '[env-public] NEXT_PUBLIC_SUPABASE_URL veya NEXT_PUBLIC_SUPABASE_ANON_KEY eksik — auth devre dışı.',
  );
}

export const env = {
  supabaseUrl,
  supabaseAnonKey,
  siteUrl,
  /** Supabase konfigürasyonu eksikse `false` döner; UI'da "auth dışı demo" akışı için kullanılır. */
  isSupabaseConfigured: Boolean(supabaseUrl && supabaseAnonKey),
} as const;
