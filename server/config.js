import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DEMO_MODE: z.enum(['true', 'false']).default('true'),
  AI_PROVIDER: z.enum(['gemini', 'openai']).default('gemini'),
  GEMINI_API_KEY: z.string().default(''),
  GEMINI_MODEL: z.string().trim().min(1).default('gemini-3.8-flash'),
  OPENAI_API_KEY: z.string().default(''),
  OPENAI_MODEL: z.string().min(1).default('gpt-4.1-mini'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  HOST: z.string().min(1).default('127.0.0.1'),
  CLIENT_ORIGIN: z.string().url().default('http://127.0.0.1:5173'),
  AI_TIMEOUT_MS: z.coerce.number().int().min(100).max(120000).default(30000),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
});

export function readConfig(env = process.env) {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    // Only report variable names, never values (which can contain secrets).
    throw new Error(`Invalid environment settings: ${parsed.error.issues.map((i) => i.path.join('.')).join(', ')}`);
  }
  const e = parsed.data;
  const keyName = e.AI_PROVIDER === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY';
  if (e.DEMO_MODE === 'false' && !e[keyName].trim()) {
    throw new Error(`${keyName} is required when DEMO_MODE=false and AI_PROVIDER=${e.AI_PROVIDER}. Use DEMO_MODE=true to run without credentials.`);
  }
  return {
    demo: e.DEMO_MODE === 'true', provider: e.AI_PROVIDER, apiKey: e[keyName].trim(),
    model: e.AI_PROVIDER === 'gemini' ? e.GEMINI_MODEL : e.OPENAI_MODEL, port: e.PORT, host: e.HOST,
    clientOrigin: new URL(e.CLIENT_ORIGIN).origin, timeoutMs: e.AI_TIMEOUT_MS,
    trustProxyHops: e.TRUST_PROXY_HOPS,
  };
}
