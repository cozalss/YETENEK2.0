/**
 * Public read-only Supabase client — cookie/session erişimi YOK.
 *
 * Server Component'lerin `unstable_cache()` ile sardığı public içerik
 * sorguları (sports, badges_metadata, science_references vb.)
 * `getServerClient()` ile çağrılamaz çünkü o `cookies()` API'sini
 * kullanıyor — Next.js cache scope'unda dynamic data sources yasak.
 *
 * Bu client anon key ile tek-seferlik instance üretir; yalnız RLS
 * `public_read` politikası olan tablolardan okuma için kullanılır.
 */

import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/shared/config/env-public';

let publicClient: SupabaseClient | null = null;

export function getPublicClient(): SupabaseClient {
  if (!publicClient) {
    publicClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return publicClient;
}
