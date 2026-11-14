import { createGeminiService } from './gemini.js';
import { createOpenAIService } from './openai.js';

export function createAIService(config, transport) {
  return config.provider === 'gemini'
    ? createGeminiService(config, transport)
    : createOpenAIService(config, transport);
}
