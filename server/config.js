import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DEMO_MODE: z.enum(['true', 'false']).default('true'),
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
  if (e.DEMO_MODE === 'false' && !e.OPENAI_API_KEY.trim()) {
    throw new Error('OPENAI_API_KEY is required when DEMO_MODE=false. Use DEMO_MODE=true to run without credentials.');
  }
  return {
    demo: e.DEMO_MODE === 'true', apiKey: e.OPENAI_API_KEY.trim(),
    model: e.OPENAI_MODEL, port: e.PORT, host: e.HOST,
    clientOrigin: new URL(e.CLIENT_ORIGIN).origin, timeoutMs: e.AI_TIMEOUT_MS,
    trustProxyHops: e.TRUST_PROXY_HOPS,
  };
}
