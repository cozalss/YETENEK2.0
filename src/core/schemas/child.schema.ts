/**
 * Çocuk profili Zod şeması — veli kayıt sonrası çocuklarını ekler.
 *
 * `sessionStore.start()` artık bir `childId` ile çağrılır. Test sonuçları
 * `child_id` ile DB'de ilişkilendirilir → her çocuğun ayrı history'si olur.
 *
 * KVKK: Çocuk adı opsiyonel (rumuz girilebilir). Ad/cinsiyet/yaş veli
 * onayıyla saklanır. Test videoları cihazda kalır — DB'ye sadece skor
 * özetleri gider.
 */

import { z } from 'zod';

export const sexSchema = z.enum(['male', 'female']);

/** Çocuk eklerken doldurulan form verisi. */
export const childInputSchema = z.object({
  /** Görünen ad. İsim mahremiyet için rumuz olabilir. */
  displayName: z
    .string()
    .min(2, 'En az 2 karakter.')
    .max(40, 'En fazla 40 karakter.'),
  ageYears: z
    .number({ message: 'Yaş gerekli.' })
    .int('Tam sayı olmalı.')
    .min(4, 'En küçük 4 yaş.')
    .max(18, 'En büyük 18 yaş.'),
  sex: sexSchema,
  heightCm: z
    .number()
    .min(80, 'Boy en az 80 cm.')
    .max(220, 'Boy en fazla 220 cm.')
    .optional(),
  weightKg: z
    .number()
    .min(15, 'Kilo en az 15 kg.')
    .max(200, 'Kilo en fazla 200 kg.')
    .optional(),
  /** Avatar emoji — UI'da hızlı görsel ayrım için. */
  avatarEmoji: z.string().max(8).optional(),
});

export type ChildInput = z.infer<typeof childInputSchema>;

/** Persist edilmiş çocuk kaydı (DB'den okunan veya localStorage'daki). */
export const childRecordSchema = childInputSchema.extend({
  id: z.string().min(1),
  parentUserId: z.string().min(1).optional(), // localStorage-only fallback'te yok
  createdAt: z.string(),
  /** Bu çocukla yapılmış toplam session sayısı (gösterimde optimize). */
  sessionCount: z.number().int().min(0).default(0),
  /** En son test tarihi (ISO). UI'da "3 gün önce test yaptın" rozeti için. */
  lastTestedAt: z.string().optional(),
});

export type ChildRecord = z.infer<typeof childRecordSchema>;
