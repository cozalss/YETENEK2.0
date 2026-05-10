/**
 * AI Coach chat istek/cevap şeması.
 */

import { z } from 'zod';
import { sessionSummarySchema } from './session.schema';

export const chatRoleSchema = z.enum(['user', 'assistant']);

export const chatMessageSchema = z.object({
  role: chatRoleSchema,
  content: z.string().min(1).max(2000),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const chatRequestSchema = z.object({
  session: sessionSummarySchema.passthrough(),
  history: z.array(chatMessageSchema).max(10).optional(),
  message: z.string().min(1).max(800),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;
