/**
 * Geçerlilik denetimi istek/yanıt şeması.
 *
 * ## Veri minimizasyonu şemada zorlanıyor
 *
 * İstemci 15 saniyelik bir yakalamada yüzlerce kare topluyor. Bunların
 * tamamını sunucuya göndermek gereksiz: hakem hareketin karakteristik
 * anlarına bakıyor. Şema **en fazla 8 kare** kabul ediyor — sınır bir
 * optimizasyon değil, gizlilik kısıtı: gönderilmeyen veri sızamaz.
 *
 * Landmark başına yalnız x, y, visibility taşınıyor. `z` (derinlik) hakem
 * kararında kullanılmıyor, dolayısıyla gönderilmiyor.
 */

import { z } from 'zod';

/** Tek landmark — normalize koordinat. */
export const judgeLandmarkSchema = z.object({
  x: z.number().finite().min(-2).max(3),
  y: z.number().finite().min(-2).max(3),
  visibility: z.number().finite().min(0).max(1).optional(),
});

/** Tek kare — MediaPipe 33 landmark. */
export const judgeFrameSchema = z.object({
  timestamp: z.number().finite(),
  landmarks: z.array(judgeLandmarkSchema).min(33).max(33),
});

export const judgeTestKeySchema = z.enum([
  'jump',
  'balance',
  'reaction',
  'broadJump',
  'lateralHops',
  'coordination',
  'endurance',
]);

export const judgeRequestSchema = z.object({
  test: judgeTestKeySchema,
  /** Anahtar kareler. Üst sınır bilinçli olarak dar — bkz. dosya başlığı. */
  frames: z.array(judgeFrameSchema).min(1).max(8),
  /** Ölçüm katmanının iddiası — hakem doğrular, kullanmaz. */
  measurementClaim: z
    .object({
      valid: z.boolean(),
      primaryValue: z.number().finite().nullable(),
      unit: z.enum(['cm', 'ms', 'count', 'score']),
    })
    .optional(),
});

export type JudgeRequestPayload = z.infer<typeof judgeRequestSchema>;

export const judgeResponseSchema = z.object({
  performed: z.boolean(),
  protocolViolations: z.array(z.string()),
  techniqueScore: z.number().min(0).max(100),
  stanceConfirmed: z.boolean().nullable(),
  compensations: z.array(z.string()),
  judgeConfidence: z.number().min(0).max(1),
  source: z.enum(['rules', 'vision', 'composite']),
  notes: z.string().optional(),
});

export type JudgeResponsePayload = z.infer<typeof judgeResponseSchema>;
