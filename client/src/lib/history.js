import { z } from 'zod';
import { requestSchema, responseSchema, outputSchemas } from '../../../shared/schemas.js';

export const HISTORY_KEY = 'promptly.history.v1';
export const HISTORY_LIMIT = 20;
const MAX_BYTES = 2_000_000;
const entrySchema = z.object({
  id: z.string().min(1).max(100), createdAt: z.string().datetime(), input: requestSchema, sourceText: z.string().max(20000),
  data: responseSchema, editedResult: z.unknown().nullable(),
  completed: z.record(z.string().regex(/^\d{1,5}$/u), z.boolean()),
}).strict().superRefine((entry, ctx) => {
  const invalid = () => ctx.addIssue({ code: 'custom', message: 'Invalid saved task.' });
  if (entry.input.mode !== entry.data.mode || entry.sourceText.trim() !== entry.input.text) invalid();
  if (entry.editedResult !== null) {
    const parsed = outputSchemas[entry.data.mode].safeParse(entry.editedResult);
    if (!parsed.success) invalid();
    else if (entry.data.mode === 'actions' && (parsed.data.actionItems.length !== entry.data.result.actionItems.length || parsed.data.actionItems.some((item, i) => item.evidence !== entry.data.result.actionItems[i]?.evidence))) invalid();
  }
});

export function readHistory(storage) {
  try {
    const raw = storage.getItem(HISTORY_KEY);
    if (!raw) return { entries: [], notice: '' };
    if (raw.length > MAX_BYTES) throw new Error('size');
    const saved = JSON.parse(raw);
    if (saved.version !== 1 || !Array.isArray(saved.entries)) throw new Error('shape');
    const entries = [], seen = new Set();
    for (const item of saved.entries.slice(0, HISTORY_LIMIT)) {
      const parsed = entrySchema.safeParse(item);
      if (parsed.success && !seen.has(parsed.data.id)) { entries.push(parsed.data); seen.add(parsed.data.id); }
    }
    return { entries, notice: entries.length !== saved.entries.length ? 'Some saved tasks could not be opened.' : '' };
  } catch { return { entries: [], notice: 'Past tasks are unavailable. You can still use the workspace.' }; }
}

export function upsertHistory(entries, entry) {
  const next = [entry, ...entries.filter((item) => item.id !== entry.id)].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, HISTORY_LIMIT);
  while (next.length && JSON.stringify({ version: 1, entries: next }).length > MAX_BYTES) next.pop();
  return next;
}

export function writeHistory(storage, entries) {
  try {
    if (!entries.length) storage.removeItem(HISTORY_KEY);
    else storage.setItem(HISTORY_KEY, JSON.stringify({ version: 1, entries }));
    return '';
  } catch { return 'Browser storage is unavailable or full. New changes are kept for this session only.'; }
}

export function historyTitle(entry) {
  const title = entry.input.text.trim().split('\n').find((line) => line.trim()) || 'Untitled task';
  return title.length > 85 ? `${title.slice(0, 84).trimEnd()}…` : title;
}
