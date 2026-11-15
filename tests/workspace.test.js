import test from 'node:test';
import assert from 'node:assert/strict';
import { compareWords } from '../client/src/lib/diff.js';
import { initialWorkspace, workspaceReducer as reduce, visibleData } from '../client/src/lib/workspace.js';
import { HISTORY_KEY, readHistory, writeHistory, upsertHistory } from '../client/src/lib/history.js';

const input = { mode: 'rewrite', text: 'Please review this draft.', preferences: { tone: 'professional' } };
const data = { mode: 'rewrite', result: { rewrittenText: 'Please review the updated draft.', changes: ['Clarified the draft.'] }, meta: { provider: 'demo', inputWords: 4, durationMs: 100, requestId: 'unit-test' } };
const entry = (id = 'one', createdAt = '2026-11-15T08:00:00.000Z') => ({ id, createdAt, input, sourceText: input.text, data, editedResult: null, completed: {} });
function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
}

test('word comparison reconstructs both exact inputs across additions, removal, whitespace, and markup', () => {
  for (const [source, revised] of [['hello world', 'hello brave world'], ['a b c', 'b c'], ['', 'new'], ['old', ''], ['one\n\n two', 'one\nthree'], ['same', 'same'], ['<script>alert(1)</script> &', '<img src=x> &'], ['你好 世界', '你好 新世界'], [' a b ', ' a c ']]) {
    const { parts } = compareWords(source, revised);
    assert.equal(parts.filter((p) => p.type !== 'added').map((p) => p.text).join(''), source);
    assert.equal(parts.filter((p) => p.type !== 'removed').map((p) => p.text).join(''), revised);
  }
});
test('long unrelated passages use bounded comparison and preserve both texts', () => {
  const source = 'old '.repeat(4000), revised = 'new '.repeat(4000);
  const { parts, grouped } = compareWords(source, revised);
  assert.equal(grouped, true);
  assert.equal(parts.filter((p) => p.type !== 'added').map((p) => p.text).join(''), source);
  assert.equal(parts.filter((p) => p.type !== 'removed').map((p) => p.text).join(''), revised);
});
test('workflow rejects stale success and failure after cancellation or another request', () => {
  const loading = reduce(initialWorkspace, { type: 'request', request: 1 });
  const cancelled = reduce(loading, { type: 'reset', request: 2 });
  assert.equal(reduce(cancelled, { type: 'success', request: 1, data }), cancelled);
  assert.equal(reduce(cancelled, { type: 'failure', request: 1, error: new Error('late') }), cancelled);
  const next = reduce(cancelled, { type: 'request', request: 3 });
  assert.equal(reduce(next, { type: 'success', request: 1, data }), next);
});
test('editing and reset preserve immutable generated output and derive visible content', () => {
  const saved = entry();
  const state = reduce(initialWorkspace, { type: 'restore', request: 1, entry: saved });
  const result = { ...data.result, rewrittenText: 'My reviewed draft.' };
  const edited = reduce(state, { type: 'edit', result });
  assert.equal(visibleData(edited).result.rewrittenText, 'My reviewed draft.');
  assert.equal(state.data.result.rewrittenText, data.result.rewrittenText);
  assert.equal(edited.data, data);
  assert.equal(visibleData(reduce(edited, { type: 'resetEdits' })).result, data.result);
  assert.equal(reduce(edited, { type: 'edit', result: { ...data.result } }).editedResult, null);
});
test('restoring a task keeps completion and cannot accept a stale request result', () => {
  const saved = entry(); saved.completed = { 0: true };
  const restored = reduce(initialWorkspace, { type: 'restore', request: 5, entry: saved });
  assert.equal(restored.completed[0], true);
  assert.equal(reduce(restored, { type: 'success', request: 4, data }), restored);
  assert.equal(reduce(restored, { type: 'failure', request: 5, error: new Error('late') }), restored);
});
test('history round trips edits and keeps only the latest 20 unique results', () => {
  let entries = [];
  for (let i = 0; i < 25; i++) entries = upsertHistory(entries, entry(String(i), new Date(Date.UTC(2026, 10, 15, 8, i)).toISOString()));
  assert.equal(entries.length, 20); assert.equal(entries[0].id, '24'); assert.equal(entries.at(-1).id, '5');
  entries = upsertHistory(entries, { ...entries[0], editedResult: { ...data.result, rewrittenText: 'Reviewed text' } });
  assert.equal(entries.length, 20);
  const storage = memoryStorage(); assert.equal(writeHistory(storage, entries), '');
  assert.deepEqual(readHistory(storage).entries, entries);
});
test('history skips invalid entries, schema mismatches, duplicates and changed source evidence', () => {
  const storage = memoryStorage();
  const bad = { ...entry('bad'), data: { ...data, mode: 'actions' } };
  const task = { task: 'Review', assignee: null, dueDate: null, priority: 'unspecified', evidence: 'Please review this draft.' };
  const tampered = { ...entry('tampered'), input: { ...input, mode: 'actions' }, data: { ...data, mode: 'actions', result: { overview: 'Review requested.', actionItems: [task] } }, editedResult: { overview: 'Review requested.', actionItems: [{ ...task, evidence: 'invented' }] } };
  storage.setItem(HISTORY_KEY, JSON.stringify({ version: 1, entries: [bad, entry(), entry(), tampered] }));
  const saved = readHistory(storage);
  assert.equal(saved.entries.length, 1); assert.match(saved.notice, /could not be opened/u);
});
test('corrupt, oversized or unavailable storage fails gracefully without affecting processing', () => {
  const storage = memoryStorage(); storage.setItem(HISTORY_KEY, '{broken');
  assert.deepEqual(readHistory(storage).entries, []);
  storage.setItem(HISTORY_KEY, 'x'.repeat(2_000_001)); assert.deepEqual(readHistory(storage).entries, []);
  const denied = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); } };
  assert.match(readHistory(denied).notice, /unavailable/u);
  assert.match(writeHistory(denied, [entry()]), /session only/u);
});
test('clearing removes the stored key and detaching prevents the open task from being resaved', () => {
  const storage = memoryStorage(); writeHistory(storage, [entry()]); writeHistory(storage, []);
  assert.equal(storage.getItem(HISTORY_KEY), null);
  const state = reduce(initialWorkspace, { type: 'restore', request: 1, entry: entry() });
  assert.equal(reduce(state, { type: 'detachHistory' }).entryId, null);
});
