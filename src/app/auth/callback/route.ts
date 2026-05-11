/**
 * Auth callback — Supabase OAuth ve email confirm dönüşü buraya gelir.
 *
 * URL: /auth/callback?code=XXX&next=/profile
 *
 * `code` query param'ı PKCE auth code; `exchangeCodeForSession` ile
 * session cookie'leri set edilir, sonra `next` URL'sine redirect.
 *
 * Hata durumunda /auth/sign-in?error=... fallback.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { logger } from '@/shared/logger/logger';

const log = logger.child('auth-callback');

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/profile';
  const errParam = searchParams.get('error_description') ?? searchParams.get('error');

  if (errParam) {
    log.warn('OAuth provider hatası', { reason: errParam });
    return NextResponse.redirect(
      `${origin}/auth/sign-in?error=${encodeURIComponent(errParam)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/auth/sign-in?error=${encodeURIComponent('Doğrulama kodu eksik.')}`,
    );
  }

  const supabase = await getServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    log.error('exchangeCodeForSession başarısız', { cause: error.message });
    return NextResponse.redirect(
      `${origin}/auth/sign-in?error=${encodeURIComponent('Oturum açılamadı.')}`,
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
