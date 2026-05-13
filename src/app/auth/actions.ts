/**
 * Auth server actions — sign-up, sign-in, sign-out, OAuth başlat.
 *
 * Form'lar bu action'lara doğrudan submit eder. Hata durumunda hata
 * mesajıyla aynı sayfaya redirect; başarılı sign-in/sign-up'ta `next`
 * query param'ı varsa oraya, yoksa `/profile`'a yönlendirir.
 *
 * Server action'lar otomatik olarak CSRF korumalıdır (Next.js framework).
 */

'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { getServerClient } from '@/lib/supabase/server';
import { env } from '@/shared/config/env-public';
import {
  signInSchema,
  signUpSchema,
} from '@/core/schemas/auth.schema';
import { logger } from '@/shared/logger/logger';

const log = logger.child('auth-actions');

/**
 * OAuth redirect URL'lerini gerçek request origin'inden türetir
 * (Vercel preview / production / localhost hepsinde otomatik doğru çalışır).
 *
 * Öncelik:
 *   1. x-forwarded-host header (Vercel proxy)
 *   2. host header
 *   3. env.siteUrl fallback (NEXT_PUBLIC_SITE_URL)
 */
async function currentOrigin(): Promise<string> {
  try {
    const hdrs = await headers();
    const proto = hdrs.get('x-forwarded-proto') ?? 'https';
    const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host');
    if (host) return `${proto}://${host}`;
  } catch {
    // header context dışında çağrıldıysa fallback'a düş
  }
  return env.siteUrl;
}

async function buildRedirectUrl(
  path: string,
  params?: Record<string, string>,
): Promise<string> {
  const origin = await currentOrigin();
  const url = new URL(path, origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return url.toString();
}

export async function signInWithEmailAction(formData: FormData) {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    redirect(
      `/auth/sign-in?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? 'Geçersiz form.',
      )}`,
    );
  }

  const supabase = await getServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    log.warn('sign-in başarısız', { email: parsed.data.email, code: error.code });
    const msg =
      error.message === 'Invalid login credentials'
        ? 'E-posta veya şifre hatalı.'
        : 'Giriş yapılamadı, tekrar dene.';
    redirect(`/auth/sign-in?error=${encodeURIComponent(msg)}`);
  }

  const next = (formData.get('next') as string | null) || '/profile';
  revalidatePath('/', 'layout');
  redirect(next);
}

export async function signUpWithEmailAction(formData: FormData) {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    redirect(
      `/auth/sign-up?error=${encodeURIComponent(
        issue ? `${issue.path.join('.')}: ${issue.message}` : 'Geçersiz form.',
      )}`,
    );
  }

  const supabase = await getServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: await buildRedirectUrl('/auth/callback'),
    },
  });

  if (error) {
    log.warn('sign-up başarısız', { email: parsed.data.email, code: error.code });
    redirect(
      `/auth/sign-up?error=${encodeURIComponent(
        error.message === 'User already registered'
          ? 'Bu e-posta zaten kayıtlı. Giriş yap.'
          : 'Kayıt yapılamadı, tekrar dene.',
      )}`,
    );
  }

  // Confirm email kapalıysa Supabase otomatik session başlatır
  // (`data.session` dolu gelir) — direkt next URL'sine yönlendir.
  // Açıksa session null kalır; kullanıcıya doğrulama linkini bekle de.
  const next = (formData.get('next') as string | null) || '/profile';
  if (data.session) {
    revalidatePath('/', 'layout');
    redirect(next);
  }
  redirect(
    `/auth/sign-up?info=${encodeURIComponent(
      'E-postanı kontrol et — doğrulama linki gönderildi.',
    )}`,
  );
}

export async function signInWithGoogleAction(formData: FormData) {
  const next = (formData.get('next') as string | null) || '/profile';
  const supabase = await getServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: await buildRedirectUrl('/auth/callback', { next }),
    },
  });

  if (error || !data?.url) {
    log.error('Google OAuth başlatılamadı', { cause: error?.message });
    redirect(
      `/auth/sign-in?error=${encodeURIComponent('Google ile giriş başlatılamadı.')}`,
    );
  }
  redirect(data.url);
}

export async function signOutAction() {
  const supabase = await getServerClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}
