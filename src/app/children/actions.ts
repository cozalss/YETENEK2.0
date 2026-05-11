/**
 * Children server actions — auth'lı kullanıcının çocuk listesi CRUD'u.
 *
 * Tüm action'lar Supabase adapter üzerinden çalışır; auth zorunlu.
 * Hata Result<T, ChildError> ile döner; form sayfası error query param'ı
 * ile gösterir.
 */

'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { supabaseChildRepository } from '@/infrastructure/storage/supabase-child-repository';
import { childInputSchema } from '@/core/schemas/child.schema';
import { makeChildId } from '@/core/types/branded';

function toNumberOrUndefined(v: FormDataEntryValue | null): number | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export async function addChildAction(formData: FormData) {
  const parsed = childInputSchema.safeParse({
    displayName: formData.get('displayName'),
    ageYears: toNumberOrUndefined(formData.get('ageYears')),
    sex: formData.get('sex'),
    heightCm: toNumberOrUndefined(formData.get('heightCm')),
    weightKg: toNumberOrUndefined(formData.get('weightKg')),
    avatarEmoji: formData.get('avatarEmoji') || undefined,
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    redirect(
      `/profile?error=${encodeURIComponent(
        issue ? issue.message : 'Form geçersiz.',
      )}`,
    );
  }

  const result = await supabaseChildRepository.create(parsed.data);
  if (!result.ok) {
    const msg =
      result.error.kind === 'unauthorized'
        ? 'Önce giriş yapmalısın.'
        : result.error.kind === 'validation'
          ? result.error.message
          : result.error.kind === 'storage'
            ? 'Kayıt eklenemedi, tekrar dene.'
            : 'Beklenmedik hata.';
    redirect(`/profile?error=${encodeURIComponent(msg)}`);
  }

  revalidatePath('/profile');
  redirect('/profile?info=' + encodeURIComponent('Çocuk eklendi.'));
}

export async function removeChildAction(formData: FormData) {
  const id = formData.get('id');
  if (typeof id !== 'string') {
    redirect('/profile?error=' + encodeURIComponent('Eksik kayıt.'));
  }
  const result = await supabaseChildRepository.remove(makeChildId(id as string));
  if (!result.ok) {
    redirect(
      '/profile?error=' + encodeURIComponent('Kayıt silinemedi.'),
    );
  }
  revalidatePath('/profile');
  redirect('/profile?info=' + encodeURIComponent('Çocuk silindi.'));
}
