/**
 * Tarayıcı tarafı Supabase client'ı.
 *
 * `createBrowserClient` cookie-based session yönetimi yapar — auto-refresh
 * dahil. Session değişikliklerini dinlemek için
 * `supabase.auth.onAuthStateChange(...)` kullanılabilir.
 *
 * Bu wrapper her çağrıldığında yeni bir client döner; SSR-safe çünkü
 * `createBrowserClient` window/document'a tek seferlik referans tutar.
 * SSR'de import edilse de evaluate edilmediği için patlamaz; ancak
 * `getBrowserClient()` çağrısı SSR'de yapılmamalıdır.
 */

'use client';

import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/shared/config/env-public';
import type { SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

export function getBrowserClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
  }
  return browserClient;
}
