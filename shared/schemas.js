import { z } from 'zod';

export const MAX_CHARACTERS = 20000;
export const MAX_WORDS = 4000;
export const countWords = (text) => text.trim() ? text.trim().split(/\s+/u).length : 0;
export const tones = ['professional', 'casual', 'concise', 'polished'];

// Shared contracts: the browser, API, demo engine, and real AI agree on these fields.
export const requestSchema = z.object({
  mode: z.enum(['summarize', 'rewrite', 'actions']),
  text: z.string().trim().min(10, 'Add at least 10 characters of text.')
    .max(MAX_CHARACTERS, `Keep your text under ${MAX_CHARACTERS.toLocaleString('en-US')} characters.`)
    .refine((text) => countWords(text) <= MAX_WORDS, `Keep your text under ${MAX_WORDS.toLocaleString('en-US')} words.`),
  preferences: z.object({
    length: z.enum(['concise', 'detailed']).optional(),
    tone: z.enum(tones).optional(),
  }).strict().default({}),
}).strict();

// Nullable fields are required, so the model explicitly marks missing information.
export const summarySchema = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()),
  takeaway: z.string(),
}).strict();
export const rewriteSchema = z.object({
  rewrittenText: z.string(),
  changes: z.array(z.string()),
}).strict();
export const actionsSchema = z.object({
  actionItems: z.array(z.object({
    task: z.string(),
    assignee: z.string().nullable(),
    dueDate: z.string().nullable(),
    priority: z.enum(['high', 'medium', 'low', 'unspecified']),
    evidence: z.string(),
  }).strict()),
  overview: z.string(),
}).strict();
export const outputSchemas = { summarize: summarySchema, rewrite: rewriteSchema, actions: actionsSchema };
export const responseSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('summarize'), result: summarySchema, meta: metaSchema() }),
  z.object({ mode: z.literal('rewrite'), result: rewriteSchema, meta: metaSchema() }),
  z.object({ mode: z.literal('actions'), result: actionsSchema, meta: metaSchema() }),
]);
function metaSchema() {
  return z.object({ provider: z.enum(['demo', 'openai']), inputWords: z.number(), durationMs: z.number(), requestId: z.string() });
}
