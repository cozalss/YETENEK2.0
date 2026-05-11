/**
 * Next.js middleware — Supabase session refresh + auth guard.
 *
 * Matcher SADECE protected + auth rotalarını yakalar:
 *   - /profile, /children, /history, /api/children → user gerekli
 *   - /auth/sign-in, /auth/sign-up → authed user'ı /profile'a yönlendir
 *
 * Public sayfalar (landing, /sports, /about, /result/demo, /test/*, vb.)
 * middleware'i hiç tetiklemez → her navigasyonda Supabase RTT (80-300ms)
 * ortadan kalkar. Bu, kullanıcının "tuşlara basınca yavaş" şikayetinin
 * en büyük çözümü.
 */

import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    '/profile/:path*',
    '/profile',
    '/children/:path*',
    '/history/:path*',
    '/history',
    '/auth/sign-in',
    '/auth/sign-up',
  ],
};
