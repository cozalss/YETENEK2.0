/**
 * SiteHeader'ın server-only wrapper'ı — Supabase'den veliyi alır,
 * displayName türetip presentational SiteHeader'a geçer.
 *
 * Yalnız sunucu sayfalarında kullanılmalı ('use client' sayfalardan
 * import edilirse 'server-only' zinciri build'i kırar).
 */

import 'server-only';
import { getCachedUser } from '@/lib/auth/get-cached-user';
import { SiteHeader } from './SiteHeader';

function deriveDisplayName(
  metadata: Record<string, unknown> | null | undefined,
  email: string | null | undefined
): string | null {
  if (metadata) {
    const fullName = metadata['full_name'];
    if (typeof fullName === 'string' && fullName.trim().length > 0) {
      return fullName.trim().split(/\s+/)[0];
    }
    const displayName = metadata['displayName'];
    if (typeof displayName === 'string' && displayName.trim().length > 0) {
      return displayName.trim().split(/\s+/)[0];
    }
  }
  if (email && email.includes('@')) {
    return email.split('@')[0];
  }
  return null;
}

export async function SiteHeaderServer() {
  const user = await getCachedUser();
  const displayName = user
    ? deriveDisplayName(user.user_metadata, user.email)
    : null;
  return <SiteHeader displayName={displayName} />;
}
