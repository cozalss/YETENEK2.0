/**
 * Next.js proxy — Supabase session refresh + auth guard.
 *
 * Next 16'da `middleware` convention deprecated → `proxy` olarak yeniden
 * adlandırıldı. Network sınırı + routing odağını netleştirmek için.
 *
 * Matcher SADECE protected + auth rotalarını yakalar:
 *   - /profile, /children, /history → user gerekli
 *   - /auth/sign-in, /auth/sign-up → authed user'ı /profile'a yönlendir
 *
 * Public sayfalar (landing, /sports, /about, /result/demo, /test/*, vb.)
 * proxy'i hiç tetiklemez → her navigasyonda Supabase RTT (80-300ms)
 * ortadan kalkar.
 *
 * Runtime: nodejs (proxy convention edge runtime desteklemez).
 */

import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
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
