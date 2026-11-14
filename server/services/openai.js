import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { outputSchemas } from '../../shared/schemas.js';
import { buildInstructions } from '../prompts/templates.js';
import { AppError } from '../middleware/errors.js';

export function createOpenAIService(config, suppliedClient) {
  const client = suppliedClient || new OpenAI({ apiKey: config.apiKey, timeout: config.timeoutMs, maxRetries: 0 });
  return async function processAI(input) {
    try {
      const schema = outputSchemas[input.mode];
      const response = await client.responses.parse({
        model: config.model,
        store: false,
        instructions: buildInstructions(input),
        input: [{ role: 'user', content: input.text }],
        text: { format: zodTextFormat(schema, `promptly_${input.mode}`) },
        max_output_tokens: 6000,
      });
      const refused = response.output?.some((item) => item.content?.some((part) => part.type === 'refusal'));
      if (refused) throw new AppError(422, 'AI_REFUSAL', 'The AI could not process this passage. Try different text.');
      if (response.status !== 'completed') {
        throw new AppError(502, 'AI_INCOMPLETE', 'The AI response was incomplete. Try a shorter passage or try again.');
      }
      const parsed = schema.safeParse(response.output_parsed);
      if (!parsed.success) throw new AppError(502, 'AI_INVALID_OUTPUT', 'The AI returned an unexpected format. Please try again.');
      return parsed.data;
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof OpenAI.APIConnectionTimeoutError || error.name === 'AbortError') {
        throw new AppError(504, 'AI_TIMEOUT', 'The AI took too long to respond. Please try again.');
      }
      if (error.status === 429) throw new AppError(429, 'AI_RATE_LIMIT', 'The AI service is at its request or usage limit. Wait a moment, or check your API billing.');
      if (error.status === 401 || error.status === 403) {
        throw new AppError(503, 'AI_CONFIGURATION', 'The AI connection is unavailable. Check the server API key and model access.');
      }
      if (error.name === 'ZodError' || error instanceof SyntaxError) {
        throw new AppError(502, 'AI_INVALID_OUTPUT', 'The AI returned an unexpected format. Please try again.');
      }
      throw new AppError(502, 'AI_UNAVAILABLE', 'The AI service is unavailable. Please try again shortly.');
    }
  };
}
