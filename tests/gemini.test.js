import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createAIService } from '../server/services/ai.js';
import { createApp } from '../server/app.js';
import { readConfig } from '../server/config.js';
import { responseSchema } from '../shared/schemas.js';

const config = readConfig({ DEMO_MODE: 'false', GEMINI_API_KEY: 'test-gemini-secret' });
const input = { mode: 'summarize', text: 'Maya will review the copy.', preferences: {} };
const fixtures = {
  summarize: { summary: 'A copy review is planned.', keyPoints: ['Maya will review the copy.'], takeaway: 'Maya owns the review.' },
  rewrite: { rewrittenText: 'Maya will review the copy.', changes: ['Retained the clear phrasing.'] },
  actions: { actionItems: [{ task: 'Review the copy', assignee: 'Maya', dueDate: null, priority: 'unspecified', evidence: input.text }], overview: 'One action item.' },
};
const envelope = (result) => ({ candidates: [{ finishReason: 'STOP', content: { role: 'model', parts: [{ text: JSON.stringify(result) }] } }] });
const http = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

for (const mode of Object.keys(fixtures)) {
  test(`Gemini ${mode}: sends JSON Schema, keeps the key server-side, and validates output`, async () => {
    let captured;
    const fetchMock = async (url, options) => {
      captured = { url, options, body: JSON.parse(options.body) };
      return http(envelope(fixtures[mode]));
    };
    const result = await createAIService(config, fetchMock)({ ...input, mode });
    assert.deepEqual(result, fixtures[mode]);
    assert.equal(captured.url, `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent`);
    assert.ok(!captured.url.includes(config.apiKey));
    assert.equal(captured.options.headers['x-goog-api-key'], config.apiKey);
    assert.ok(captured.options.signal instanceof AbortSignal);
    assert.equal(captured.body.contents[0].parts[0].text, input.text);
    assert.match(captured.body.systemInstruction.parts[0].text, /untrusted source material/u);
    assert.equal(captured.body.generationConfig.responseMimeType, 'application/json');
    const schema = captured.body.generationConfig.responseJsonSchema;
    assert.equal(schema.type, 'object');
    assert.equal(schema.additionalProperties, false);
    assert.deepEqual(new Set(schema.required), new Set(Object.keys(fixtures[mode])));
    assert.equal(schema.$schema, undefined);
    if (mode === 'actions') {
      assert.ok(schema.properties.actionItems.items.required.includes('dueDate'));
      assert.match(JSON.stringify(schema.properties.actionItems.items.properties.dueDate), /null/u);
    }
  });
}

test('Gemini request instructions honor length and tone preferences', async () => {
  const instructions = [];
  const service = createAIService(config, async (_url, options) => {
    const body = JSON.parse(options.body);
    instructions.push(body.systemInstruction.parts[0].text);
    const rewrite = body.generationConfig.responseJsonSchema.properties.rewrittenText;
    return http(envelope(rewrite ? fixtures.rewrite : fixtures.summarize));
  });
  await service({ ...input, preferences: { length: 'detailed' } });
  await service({ ...input, mode: 'rewrite', preferences: { tone: 'casual' } });
  assert.match(instructions[0], /detailed paragraph/u);
  assert.match(instructions[1], /casual tone/u);
});

test('Gemini joins output text parts and excludes thought parts', async () => {
  const json = JSON.stringify(fixtures.summarize);
  const result = await createAIService(config, async () => http({ candidates: [{ finishReason: 'STOP', content: { parts: [
    { thought: true, text: 'Private reasoning is not the result.' },
    { text: json.slice(0, 30) }, { text: json.slice(30) },
  ] } }] }))(input);
  assert.deepEqual(result, fixtures.summarize);
});

for (const [status, expectedStatus, code] of [
  [400, 503, 'AI_CONFIGURATION'], [401, 503, 'AI_CONFIGURATION'],
  [403, 503, 'AI_CONFIGURATION'], [404, 503, 'AI_CONFIGURATION'],
  [429, 429, 'AI_RATE_LIMIT'], [408, 504, 'AI_TIMEOUT'],
  [504, 504, 'AI_TIMEOUT'], [500, 502, 'AI_UNAVAILABLE'], [503, 502, 'AI_UNAVAILABLE'],
]) {
  test(`Gemini HTTP ${status} returns safe ${code}`, async () => {
    const service = createAIService(config, async () => http({ error: { message: config.apiKey } }, status));
    await assert.rejects(service(input), (e) => e.status === expectedStatus && e.code === code && !e.message.includes(config.apiKey));
  });
}

for (const [body, expectedStatus, code] of [
  [{ promptFeedback: { blockReason: 'SAFETY' } }, 422, 'AI_REFUSAL'],
  [{ candidates: [{ finishReason: 'SAFETY' }] }, 422, 'AI_REFUSAL'],
  [{ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{"summary":' }] } }] }, 502, 'AI_INCOMPLETE'],
  [{ candidates: [] }, 502, 'AI_INVALID_OUTPUT'],
  [null, 502, 'AI_INVALID_OUTPUT'],
  [envelope({ summary: 'Missing fields' }), 502, 'AI_INVALID_OUTPUT'],
  [{ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'not valid JSON' }] } }] }, 502, 'AI_INVALID_OUTPUT'],
]) {
  test(`Gemini response failure ${code}: ${JSON.stringify(body).slice(0, 55)}`, async () => {
    await assert.rejects(createAIService(config, async () => http(body))(input), (e) => e.status === expectedStatus && e.code === code);
  });
}

test('Gemini timeout signal actually aborts a pending request', async () => {
  const service = createAIService({ ...config, timeoutMs: 100 }, async (_url, options) => {
    return new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
      // Keep the test event loop active: AbortSignal.timeout itself uses an unref timer.
      const timer = setTimeout(() => reject(new Error('The request was not aborted.')), 1500);
      options.signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
    });
  });
  await assert.rejects(service(input), (e) => e.status === 504 && e.code === 'AI_TIMEOUT');
});

test('Gemini network errors are sanitized and never fall back to demo', async () => {
  const service = createAIService(config, async () => { throw new TypeError(`failed: ${config.apiKey}`); });
  await assert.rejects(service(input), (e) => e.code === 'AI_UNAVAILABLE' && !e.message.includes(config.apiKey));
});

test('Gemini invalid upstream JSON is handled', async () => {
  const service = createAIService(config, async () => new Response('{bad json', { status: 200 }));
  await assert.rejects(service(input), (e) => e.code === 'AI_INVALID_OUTPUT');
});

test('Gemini endpoint result has the real provider metadata accepted by the browser contract', async () => {
  const processor = createAIService(config, async () => http(envelope(fixtures.actions)));
  const app = createApp(config, { processor });
  const res = await request(app).post('/api/process').send({ ...input, mode: 'actions' });
  assert.equal(res.status, 200);
  assert.equal(res.body.meta.provider, 'gemini');
  assert.equal(responseSchema.safeParse(res.body).success, true);
  assert.equal(res.body.result.actionItems[0].dueDate, null);
  assert.ok(!JSON.stringify(res.body).includes(config.apiKey));
});
