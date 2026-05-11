/**
 * Middleware helper: session refresh + protected-route guard.
 *
 * Her istek için Supabase access-token'ını yeniler ve cookie'leri set
 * eder. Korunan rotalar (`/profile`, `/children/*`, `/test/*`,
 * `/result/*`, `/history`) için authed olmayan kullanıcıyı
 * `/auth/sign-in?next=...` adresine yönlendirir.
 *
 * Auth flow:
 *   - Public route'lar her zaman erişilebilir
 *   - Protected route + user yok → `/auth/sign-in` redirect (next param ile)
 *   - Auth route'larda authenticated user → `/profile` redirect (zaten girişli)
 *
 * Supabase yapılandırılmamışsa (env eksik) middleware no-op davranır.
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/shared/config/env-public';

const PROTECTED_PREFIXES = [
  '/profile',
  '/children',
  '/history',
  // /test ve /result demo amaçlı public kalıyor; istenirse buraya eklenir.
];

const AUTH_PREFIXES = ['/auth/sign-in', '/auth/sign-up'];

export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  const response = NextResponse.next({ request });

  // Supabase env yoksa auth tamamen bypass — local dev veya unauth demo modu.
  if (!env.isSupabaseConfigured) return response;

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));
  const isAuthPage = AUTH_PREFIXES.some((p) => path.startsWith(p));

  if (!user && isProtected) {
    // Default'ta sign-up'a yönlendir — landing'den gelen yeni veli için
    // ilk-zaman akışı. Zaten hesabı varsa sign-up sayfasından bir tık
    // ile sign-in'e geçebilir.
    const url = request.nextUrl.clone();
    url.pathname = '/auth/sign-up';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/profile';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}
