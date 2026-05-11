/**
 * Çocuk başına ilerleme (rozet + geçmiş + streak) Zod şeması.
 *
 * Bu domain, Supabase `child_progress_summary` view'ı ile uyumludur.
 * Cüzdan ve geçmiş her zaman child_id'ye bağlıdır — parent-level state
 * tutmuyoruz artık.
 */

import { z } from 'zod';
import { sessionSummarySchema } from './session.schema';

/** Kazanılmış tek bir rozet kaydı. */
export const childBadgeRecordSchema = z.object({
  childId: z.string().min(1),
  badgeId: z.string().min(1).max(60),
  earnedInSessionId: z.string().nullable(),
  earnedAt: z.string(),
});
export type ChildBadgeRecord = z.infer<typeof childBadgeRecordSchema>;

/** Çocuğun bir test oturumu (DB'deki sessions satırı). */
export const childSessionRecordSchema = z.object({
  id: z.string().min(1),
  childId: z.string().min(1),
  summary: sessionSummarySchema,
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type ChildSessionRecord = z.infer<typeof childSessionRecordSchema>;

/** `/children/[id]` üst paneli için kompakt özet. */
export const childProgressSummarySchema = z.object({
  childId: z.string().min(1),
  badgeCount: z.number().int().min(0),
  sessionCount: z.number().int().min(0),
  lastTestedAt: z.string().nullable(),
  streakDays: z.number().int().min(0),
});
export type ChildProgressSummary = z.infer<typeof childProgressSummarySchema>;
