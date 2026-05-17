/**
 * SiteHeader'ın server-only wrapper'ı — Supabase'den veliyi alır,
 * displayName türetip presentational SiteHeader'a geçer.
 *
 * Yalnız sunucu sayfalarında kullanılmalı ('use client' sayfalardan
 * import edilirse 'server-only' zinciri build'i kırar).
 */

import 'server-only';
import { env } from '@/shared/config/env-public';
import { getServerClient } from '@/lib/supabase/server';
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
  let displayName: string | null = null;
  if (env.isSupabaseConfigured) {
    try {
      const supabase = await getServerClient();
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        displayName = deriveDisplayName(data.user.user_metadata, data.user.email);
      }
    } catch {
      // sessizce yut — header asla render hatasıyla sayfayı düşürmesin
    }
  }
  return <SiteHeader displayName={displayName} />;
}
