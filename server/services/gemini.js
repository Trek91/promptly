import { z } from 'zod';
import { outputSchemas } from '../../shared/schemas.js';
import { buildInstructions } from '../prompts/templates.js';
import { AppError } from '../middleware/errors.js';

const refusalReasons = new Set(['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII', 'IMAGE_SAFETY']);

export function createGeminiService(config, fetchImpl = globalThis.fetch) {
  return async function processGemini(input) {
    try {
      const schema = outputSchemas[input.mode];
      // Zod remains the single source of truth for generation and validation.
      const { $schema: _dialect, ...responseJsonSchema } = z.toJSONSchema(schema);
      const response = await fetchImpl(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`,
        {
          method: 'POST',
          // Keep the secret out of request URLs, browser code, and error messages.
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.apiKey },
          signal: AbortSignal.timeout(config.timeoutMs),
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: buildInstructions(input) }] },
            contents: [{ role: 'user', parts: [{ text: input.text }] }],
            generationConfig: {
              responseMimeType: 'application/json', responseJsonSchema, maxOutputTokens: 8192,
            },
          }),
        },
      );
      // Provider response bodies may echo credentials or private input. Do not expose them.
      if (!response.ok) {
        if (response.status === 429) throw new AppError(429, 'AI_RATE_LIMIT', 'Gemini is at its request or usage limit. Wait a moment, or check your Gemini API quota and billing.');
        if ([400, 401, 403, 404].includes(response.status)) {
          throw new AppError(503, 'AI_CONFIGURATION', 'Gemini rejected the connection. Check GEMINI_API_KEY, GEMINI_MODEL, and model access on the server.');
        }
        if ([408, 504].includes(response.status)) throw new AppError(504, 'AI_TIMEOUT', 'Gemini took too long to respond. Please try again.');
        throw new AppError(502, 'AI_UNAVAILABLE', 'Gemini is unavailable. Please try again shortly.');
      }
      const body = await response.json();
      const candidate = body?.candidates?.[0];
      const blockReason = body?.promptFeedback?.blockReason;
      if ((blockReason && blockReason !== 'BLOCK_REASON_UNSPECIFIED') || refusalReasons.has(candidate?.finishReason)) {
        throw new AppError(422, 'AI_REFUSAL', 'Gemini could not process this passage. Try different text.');
      }
      if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
        throw new AppError(502, 'AI_INCOMPLETE', 'The Gemini response was incomplete. Try a shorter passage or try again.');
      }
      const text = candidate?.content?.parts?.filter((part) => !part.thought && typeof part.text === 'string').map((part) => part.text).join('');
      if (!text || candidate.finishReason !== 'STOP') {
        throw new AppError(502, 'AI_INVALID_OUTPUT', 'Gemini returned an unexpected format. Please try again.');
      }
      const parsed = schema.safeParse(JSON.parse(text));
      if (!parsed.success) throw new AppError(502, 'AI_INVALID_OUTPUT', 'Gemini returned an unexpected format. Please try again.');
      return parsed.data;
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        throw new AppError(504, 'AI_TIMEOUT', 'Gemini took too long to respond. Please try again.');
      }
      if (error instanceof SyntaxError || error.name === 'ZodError') {
        throw new AppError(502, 'AI_INVALID_OUTPUT', 'Gemini returned an unexpected format. Please try again.');
      }
      throw new AppError(502, 'AI_UNAVAILABLE', 'Gemini is unavailable. Please try again shortly.');
    }
  };
}
