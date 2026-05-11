/**
 * Auth domain'inin Zod şeması.
 *
 * Form validation (sign-up, sign-in) + sunucu actionlarında tek-doğruluk
 * kaynağı. UI hata mesajları schema'dan inferred — i18n-safe Türkçe.
 */

import { z } from 'zod';

/** Tüm uygulama için ortak parola politikası — min 8 char, harf+rakam. */
export const passwordSchema = z
  .string()
  .min(8, 'Şifre en az 8 karakter olmalı.')
  .max(72, 'Şifre çok uzun (Supabase limiti 72 karakter).')
  .regex(/[A-Za-z]/, 'En az bir harf içermeli.')
  .regex(/\d/, 'En az bir rakam içermeli.');

export const emailSchema = z
  .string()
  .min(1, 'E-posta gerekli.')
  .email('Geçerli bir e-posta adresi gir.')
  .max(254);

export const signUpSchema = z
  .object({
    fullName: z
      .string()
      .min(2, 'İsmin en az 2 karakter olmalı.')
      .max(80, 'İsim çok uzun.'),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Şifreler eşleşmiyor.',
    path: ['confirmPassword'],
  });

export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Şifre gerekli.').max(72),
});

export type SignInInput = z.infer<typeof signInSchema>;
