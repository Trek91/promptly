import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../server/app.js';
import { readConfig } from '../server/config.js';
import { responseSchema } from '../shared/schemas.js';
import { samples } from '../shared/samples.js';

const config = readConfig({});
const app = createApp(config, { limit: 500 });
const post = (body) => request(app).post('/api/process').send(body);

for (const mode of ['summarize', 'rewrite', 'actions']) {
  test(`POST /api/process: ${mode} returns schema-valid demo content`, async () => {
    const res = await post({ mode, text: samples[mode] });
    assert.equal(res.status, 200);
    assert.equal(responseSchema.safeParse(res.body).success, true);
    assert.equal(res.body.meta.provider, 'demo');
    assert.equal(res.headers['cache-control'], 'no-store');
    assert.equal(res.headers['x-powered-by'], undefined);
    assert.equal(res.body.meta.requestId, res.headers['x-request-id']);
    if (mode === 'actions') {
      assert.equal(res.body.result.actionItems.length, 4);
      const unassigned = res.body.result.actionItems.find((i) => i.task.startsWith('Send'));
      assert.equal(unassigned.assignee, null);
      assert.equal(unassigned.priority, 'unspecified');
      assert.equal(unassigned.dueDate, 'by Wednesday');
      assert.ok(!res.body.result.actionItems.some((i) => /footer|dark mode|logo/iu.test(i.task)));
      for (const item of res.body.result.actionItems) assert.ok(samples.actions.includes(item.evidence));
    }
  });
}

test('summary length and rewrite tones change the sample results', async () => {
  const concise = await post({ mode: 'summarize', text: samples.summarize, preferences: { length: 'concise' } });
  const detailed = await post({ mode: 'summarize', text: samples.summarize, preferences: { length: 'detailed' } });
  assert.ok(detailed.body.result.summary.length > concise.body.result.summary.length);
  const rewrites = [];
  for (const tone of ['professional', 'casual', 'concise', 'polished']) {
    const res = await post({ mode: 'rewrite', text: samples.rewrite, preferences: { tone } });
    assert.equal(res.status, 200);
    assert.match(res.body.result.rewrittenText, /Thursday/u);
    rewrites.push(res.body.result.rewrittenText);
  }
  assert.equal(new Set(rewrites).size, 4);
});

test('arbitrary content is processed rather than replaced with sample text', async () => {
  const res = await post({ mode: 'summarize', text: 'The orchard has twelve apple trees. Rain is expected tomorrow.' });
  assert.match(res.body.result.summary, /orchard/u);
  assert.doesNotMatch(res.body.result.summary, /onboarding/u);
  const rewrite = await post({ mode: 'rewrite', text: 'hey alex. i wanna review the design.', preferences: { tone: 'professional' } });
  assert.match(rewrite.body.result.rewrittenText, /Hello alex/u);
});

test('task extraction leaves unsupported fields null and allows no tasks', async () => {
  const res = await post({ mode: 'actions', text: 'Please review the document.\nAsha will send the report.' });
  assert.equal(res.body.result.actionItems[0].assignee, null);
  assert.equal(res.body.result.actionItems[0].dueDate, null);
  assert.equal(res.body.result.actionItems[1].assignee, 'Asha');
  const none = await post({ mode: 'actions', text: 'It was a pleasant and sunny afternoon.' });
  assert.deepEqual(none.body.result.actionItems, []);
});

test('demo task extraction does not mistake channels for deadlines or transfer priorities', async () => {
  const res = await post({ mode: 'actions', text: 'Maya will send the report on Slack. Leo will review the copy. Priority: high.' });
  assert.equal(res.body.result.actionItems[0].dueDate, null);
  assert.equal(res.body.result.actionItems[0].priority, 'unspecified');
  assert.equal(res.body.result.actionItems[1].priority, 'high');
});

for (const body of [
  {}, { mode: 'bad', text: 'Enough text here.' }, { mode: 'summarize', text: '    ' },
  { mode: 'summarize', text: 123 }, { mode: 'summarize', text: 'short' },
  { mode: 'summarize', text: 'x'.repeat(20001) },
  { mode: 'summarize', text: 'a '.repeat(4001) },
  { mode: 'rewrite', text: 'Enough text here.', preferences: { tone: 'angry' } },
  { mode: 'summarize', text: 'Enough text here.', preferences: { length: 'huge' } },
  { mode: 'summarize', text: 'Enough text here.', apiKey: 'do-not-accept-browser-keys' },
]) {
  test(`invalid input rejected: ${JSON.stringify(body).slice(0, 65)}`, async () => {
    const res = await post(body);
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.requestId);
  });
}

test('malformed JSON, oversized bodies, media types, and unknown routes return safe errors', async () => {
  const malformed = await request(app).post('/api/process').set('Content-Type', 'application/json').send('{oops');
  assert.equal(malformed.status, 400);
  assert.equal(malformed.body.error.code, 'INVALID_JSON');
  const huge = await post({ mode: 'summarize', text: 'a'.repeat(110000) });
  assert.equal(huge.status, 413);
  const plain = await request(app).post('/api/process').set('Content-Type', 'text/plain').send('some text');
  assert.equal(plain.status, 415);
  assert.equal((await request(app).get('/api/process')).status, 404);
  assert.equal((await request(app).post('/api/unknown').send({})).status, 404);
});

test('only configured browser origins are allowed, including preflight', async () => {
  const bad = await request(app).post('/api/process').set('Origin', 'https://untrusted.example').send({});
  assert.equal(bad.status, 403);
  const preflight = await request(app).options('/api/process').set('Origin', config.clientOrigin).set('Access-Control-Request-Method', 'POST');
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers['access-control-allow-origin'], config.clientOrigin);
  const sameOrigin = await request(app).options('/api/process').set('Origin', `http://${config.host}:${config.port}`);
  assert.equal(sameOrigin.headers['access-control-allow-origin'], `http://${config.host}:${config.port}`);
});

test('rate limit returns 429 with a usable error and retry header', async () => {
  const limited = createApp(config, { limit: 1 });
  await request(limited).post('/api/process').send({});
  const res = await request(limited).post('/api/process').send({});
  assert.equal(res.status, 429);
  assert.equal(res.body.error.code, 'RATE_LIMITED');
  assert.ok(res.headers['retry-after']);
});

test('unexpected processor failures never expose secret error text', async () => {
  const broken = createApp(config, { processor: async () => { throw new Error('sk-secret-provider-details'); } });
  const res = await request(broken).post('/api/process').send({ mode: 'summarize', text: 'An adequate passage.' });
  assert.equal(res.status, 500);
  assert.doesNotMatch(JSON.stringify(res.body), /sk-secret/u);
});

test('invalid processor output is rejected at the response boundary', async () => {
  const broken = createApp(config, { processor: async () => ({ summary: 'missing fields' }) });
  const res = await request(broken).post('/api/process').send({ mode: 'summarize', text: 'An adequate passage.' });
  assert.equal(res.status, 502);
  assert.equal(res.body.error.code, 'AI_INVALID_OUTPUT');
});

test('configuration defaults to demo and fails clearly for invalid real mode', () => {
  assert.equal(readConfig({}).demo, true);
  assert.equal(readConfig({ OPENAI_API_KEY: 'unused' }).demo, true);
  assert.equal(readConfig({}).provider, 'gemini');
  assert.throws(() => readConfig({ DEMO_MODE: 'false' }), /GEMINI_API_KEY is required/u);
  assert.throws(() => readConfig({ DEMO_MODE: 'false', AI_PROVIDER: 'openai' }), /OPENAI_API_KEY is required/u);
  assert.throws(() => readConfig({ AI_PROVIDER: 'unknown' }), /AI_PROVIDER/u);
  assert.throws(() => readConfig({ DEMO_MODE: 'yes' }), /DEMO_MODE/u);
  assert.throws(() => readConfig({ PORT: '0' }), /PORT/u);
  assert.equal(readConfig({ DEMO_MODE: 'false', GEMINI_API_KEY: 'test' }).demo, false);
  assert.equal(readConfig({ DEMO_MODE: 'false', AI_PROVIDER: 'openai', OPENAI_API_KEY: 'test' }).demo, false);
  assert.equal(readConfig({ GEMINI_API_KEY: ' gemini ', OPENAI_API_KEY: 'openai' }).apiKey, 'gemini');
  assert.equal(readConfig({ AI_PROVIDER: 'openai', GEMINI_API_KEY: 'gemini', OPENAI_API_KEY: ' openai ' }).apiKey, 'openai');
});
