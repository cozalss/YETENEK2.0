/**
 * Server-side Supabase client (Server Components, Route Handlers, Server
 * Actions için).
 *
 * Cookie tabanlı session yönetimi: `getAll`/`setAll` Next.js'in async
 * cookies API'sini kullanır. Server Component'lerde `setAll` çağrıları
 * Next.js tarafından sessizce yutulur — bu beklenen davranıştır
 * (cookie set yalnızca Route Handler / Server Action'da çalışır).
 *
 * Auth karar verirken HER ZAMAN `supabase.auth.getUser()` kullan;
 * `getSession()` cookie'yi doğrulamaz, spoofable.
 */

import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/shared/config/env-public';

export async function getServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        // Server Component context'inde cookie set sessizce no-op;
        // Route Handler / Server Action'da Next.js Set-Cookie header'ı
        // yazar. Try/catch ile her iki context'i destekliyoruz.
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component → set izin yok. Middleware refresh halletecek.
        }
      },
    },
  });
}
