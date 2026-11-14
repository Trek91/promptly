import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { requestSchema, outputSchemas, countWords } from '../shared/schemas.js';
import { processDemo } from './services/demo.js';
import { createAIService } from './services/ai.js';
import { AppError, errorHandler } from './middleware/errors.js';

export function createApp(config, { processor, limit = 30 } = {}) {
  const app = express();
  const processText = processor || (config.demo ? processDemo : createAIService(config));
  const allowedOrigins = new Set([config.clientOrigin, `http://${config.host}:${config.port}`]);
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxyHops || false);
  app.use((req, res, next) => {
    req.requestId = randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    next();
  });
  // Vite needs WebSockets and module scripts in development; production gets a strict CSP.
  app.use(helmet({ contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"],
      fontSrc: ["'self'"], imgSrc: ["'self'", 'data:'], connectSrc: ["'self'"], upgradeInsecureRequests: null },
  } : false, strictTransportSecurity: false }));
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    const origin = req.get('Origin');
    if (origin && !allowedOrigins.has(origin)) return next(new AppError(403, 'ORIGIN_NOT_ALLOWED', 'This origin is not allowed to use the API.'));
    next();
  });
  app.use('/api', cors({ origin: [...allowedOrigins], methods: ['POST'], allowedHeaders: ['Content-Type'] }));
  app.use('/api', rateLimit({
    windowMs: 60000, limit, standardHeaders: 'draft-8', legacyHeaders: false,
    handler: (req, _res, next) => next(new AppError(429, 'RATE_LIMITED', 'Too many requests. Wait a minute and try again.')),
  }));
  app.use(express.json({ limit: '100kb' }));
  app.post('/api/process', async (req, res) => {
    if (!req.is('application/json')) throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Use application/json for this request.');
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Check your input.');
    const started = performance.now();
    const input = parsed.data;
    const result = outputSchemas[input.mode].safeParse(await processText(input));
    if (!result.success) throw new AppError(502, 'AI_INVALID_OUTPUT', 'The service returned an unexpected format. Please try again.');
    res.json({ mode: input.mode, result: result.data, meta: {
      provider: config.demo ? 'demo' : config.provider, inputWords: countWords(input.text),
      durationMs: Math.round(performance.now() - started), requestId: req.requestId,
    } });
  });
  app.use('/api', (_req, _res, next) => next(new AppError(404, 'NOT_FOUND', 'That API endpoint does not exist.')));
  const dist = fileURLToPath(new URL('../dist/', import.meta.url));
  if (existsSync(path.join(dist, 'index.html'))) {
    app.use(express.static(dist));
    app.get('/', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
  app.use((_req, _res, next) => next(new AppError(404, 'NOT_FOUND', 'That page does not exist.')));
  app.use(errorHandler);
  return app;
}
