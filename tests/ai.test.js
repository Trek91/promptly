import { test } from 'node:test';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { createAIService } from '../server/services/ai.js';
import { readConfig } from '../server/config.js';
import { outputSchemas } from '../shared/schemas.js';
import { zodTextFormat } from 'openai/helpers/zod';

const config = readConfig({ DEMO_MODE: 'false', AI_PROVIDER: 'openai', OPENAI_API_KEY: 'test-key' });
const input = { mode: 'summarize', text: 'Please summarize this text.', preferences: {} };
const valid = { summary: 'A summary.', keyPoints: ['A point.'], takeaway: 'A takeaway.' };
const stub = (response) => ({ responses: { parse: async () => response } });

test('actual OpenAI SDK parses the mocked Responses HTTP payload and sends a strict schema', async () => {
  let captured;
  const client = new OpenAI({ apiKey: 'test-key', fetch: async (_url, options) => {
    captured = JSON.parse(options.body);
    return new Response(JSON.stringify({
      id: 'resp_test', object: 'response', created_at: 0, status: 'completed', model: config.model,
      output: [{ id: 'msg_test', type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: JSON.stringify(valid), annotations: [] }] }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } });
  const result = await createAIService(config, client)(input);
  assert.deepEqual(result, valid);
  assert.equal(captured.store, false);
  assert.equal(captured.text.format.type, 'json_schema');
  assert.equal(captured.text.format.strict, true);
  assert.equal(captured.text.format.schema.additionalProperties, false);
  assert.match(captured.instructions, /untrusted source material/u);
  assert.equal(captured.input[0].content, input.text);
});

test('all mode schemas can be converted by the installed OpenAI helper', () => {
  for (const [mode, schema] of Object.entries(outputSchemas)) {
    const format = zodTextFormat(schema, mode);
    assert.equal(format.strict, true);
    assert.equal(format.schema.type, 'object');
  }
});

for (const [response, status, code] of [
  [{ status: 'completed', output_parsed: valid, output: [{ content: [{ type: 'refusal' }] }] }, 422, 'AI_REFUSAL'],
  [{ status: 'incomplete', output_parsed: null }, 502, 'AI_INCOMPLETE'],
  [{ status: 'completed', output_parsed: { unexpected: true } }, 502, 'AI_INVALID_OUTPUT'],
]) {
  test(`real-mode response handling: ${code}`, async () => {
    await assert.rejects(createAIService(config, stub(response))(input), (e) => e.status === status && e.code === code);
  });
}

for (const [error, status, code] of [
  [{ status: 429 }, 429, 'AI_RATE_LIMIT'],
  [{ status: 401 }, 503, 'AI_CONFIGURATION'],
  [{ status: 403 }, 503, 'AI_CONFIGURATION'],
  [new OpenAI.APIConnectionTimeoutError(), 504, 'AI_TIMEOUT'],
  [new SyntaxError('private failure'), 502, 'AI_INVALID_OUTPUT'],
  [new Error('private failure'), 502, 'AI_UNAVAILABLE'],
]) {
  test(`real-mode provider error handling: ${code} ${error.status || ''}`, async () => {
    const client = { responses: { parse: async () => { throw error; } } };
    await assert.rejects(createAIService(config, client)(input), (e) => e.status === status && e.code === code && !e.message.includes('private failure'));
  });
}
