/**
 * Request-scope memoized auth — aynı render içinde Supabase'e tek RTT.
 *
 * Problem: bir protected page render'ında 3-4 yerde `supabase.auth.getUser()`
 * çağrılıyordu (proxy + page + SiteHeaderServer). Her çağrı 50-200ms RTT.
 * React `cache()` request boyunca dedupe eder; ikinci+ çağrıda anında dönüyor.
 */

import 'server-only';
import { cache } from 'react';
import type { User } from '@supabase/supabase-js';
import { env } from '@/shared/config/env-public';
import { getServerClient } from '@/lib/supabase/server';

export const getCachedUser = cache(async (): Promise<User | null> => {
  if (!env.isSupabaseConfigured) return null;
  try {
    const supabase = await getServerClient();
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  } catch {
    return null;
  }
});

export const getCachedIsAuthenticated = cache(async (): Promise<boolean> => {
  const user = await getCachedUser();
  return user !== null;
});
