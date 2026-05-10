/**
 * Session domain'inin tek doğruluk-kaynağı Zod şeması.
 *
 * - Type'lar Zod inference ile çıkarılır → schema değiştiğinde tüm callsite'lar
 *   compile error verir.
 * - Schema hem API route'unda (server-side) hem `localStorage` parse'ında
 *   (client-side) kullanılır.
 * - Numeric alanlar `.finite()` ile NaN/Infinity'i baştan reddeder.
 */

import { z } from 'zod';

/* ───────── Atomic ───────── */

export const sexSchema = z.enum(['male', 'female']);

export const scoreSchema = z.number().finite().min(0).max(100);

const finiteNumber = z.number().finite();

/* ───────── Identity ───────── */

export const childSchema = z.object({
  name: z.string().min(1).max(60),
  ageYears: z.number().int().min(4).max(18),
  sex: sexSchema,
  heightCm: z.number().min(80).max(220).optional(),
  weightKg: z.number().min(15).max(200).optional(),
});
export type ChildSchema = z.infer<typeof childSchema>;

/* ───────── Per-test summaries ───────── */

export const jumpSummarySchema = z.object({
  jumpHeightCm: finiteNumber.nullable(),
  jumpUnits: finiteNumber,
  flightTimeMs: finiteNumber,
  score: scoreSchema,
});

export const balanceSummarySchema = z.object({
  rightScore: scoreSchema,
  leftScore: scoreSchema,
  asymmetryPercent: finiteNumber.min(0).max(200),
  asymmetryWarning: z.boolean(),
  weakerSide: z.enum(['right', 'left']).nullable(),
  averageScore: scoreSchema,
});

export const reactionSummarySchema = z.object({
  averageMs: finiteNumber.min(0),
  bestMs: finiteNumber.min(0),
  consistencyScore: scoreSchema,
  ageNormScore: scoreSchema,
});

export const broadJumpSummarySchema = z.object({
  jumpDistanceCm: finiteNumber.nullable(),
  jumpUnits: finiteNumber,
  score: scoreSchema,
});

export const lateralHopsSummarySchema = z.object({
  hopCount: z.number().int().min(0),
  frequencyHz: finiteNumber.min(0),
  score: scoreSchema,
  dataQuality: z.enum(['good', 'low']),
});

export const coordinationSummarySchema = z.object({
  trackingEvents: z.number().int().min(0),
  avgErrorPx: finiteNumber.min(0),
  bestErrorPx: finiteNumber.min(0),
  avgGapMs: finiteNumber.min(0),
  score: scoreSchema,
});

export const enduranceSummarySchema = z.object({
  totalReps: z.number().int().min(0),
  decayPercent: finiteNumber.min(0).max(100),
  durationMs: finiteNumber.min(0),
  score: scoreSchema,
});

/* ───────── Recommendations ───────── */

export const sportMatchSchema = z.object({
  sport: z.string().min(1).max(50),
  description: z.string().max(300),
  similarity: finiteNumber.min(0).max(1),
  // recommendSports() her zaman set eder; sıfır default ile eski payload'ları
  // kabul ediyoruz (geriye dönük uyumluluk).
  anthroBonus: finiteNumber.min(0).max(1).default(0),
  finalScore: finiteNumber.min(0).max(1).default(0),
  confidencePercent: z.number().int().min(0).max(100),
  reason: z.string().max(300),
});

/* ───────── Full session ───────── */

export const testKeySchema = z.enum([
  'jump',
  'balance',
  'reaction',
  'broadJump',
  'lateralHops',
  'coordination',
  'endurance',
]);
export type TestKeySchema = z.infer<typeof testKeySchema>;

export const sessionSummarySchema = z.object({
  child: childSchema,
  jump: jumpSummarySchema.optional(),
  balance: balanceSummarySchema.optional(),
  reaction: reactionSummarySchema.optional(),
  broadJump: broadJumpSummarySchema.optional(),
  lateralHops: lateralHopsSummarySchema.optional(),
  coordination: coordinationSummarySchema.optional(),
  endurance: enduranceSummarySchema.optional(),
  recommendations: z.array(sportMatchSchema).max(20).optional(),
  injuryWarnings: z.array(z.string().max(300)).max(10),
  // .default([]) sayesinde tip required Array<TestKey> olur — UI'da
  // optional-chaining tekrar tekrar yazmaya gerek kalmaz.
  completedTests: z.array(testKeySchema).max(20).default([]),
  startedAt: z.string().max(40),
  completedAt: z.string().max(40).optional(),
});
export type SessionSummarySchema = z.infer<typeof sessionSummarySchema>;
