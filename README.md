# Promptly v1.0

A focused text workspace: **summarize**, **rewrite**, and **extract tasks**. React + Vite, Tailwind CSS, custom shadcn-inspired controls, Express, Zod, and the OpenAI Responses API. One screen, one processing endpoint. No database, accounts, payments, or browser storage.

## Run locally

Install **Node.js 22.12+** (Node 24 LTS recommended). Open a terminal in this folder:

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. Express runs on port 3001; Vite proxies `/api` to it. Both start together. Stop them with Ctrl+C. No `.env` or API key is needed for the default demo.

Choose a tool → **Try a sample** → run the tool. Ctrl+Enter (or Cmd+Enter) also submits from the editor. Results can be copied; tasks can be checked off for the current session.

## Enable real AI

Copy `.env.example` to `.env` in the project root. On PowerShell:

```powershell
Copy-Item .env.example .env
```

Edit these settings, then restart the server:

```dotenv
DEMO_MODE=false
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4.1-mini
```

The model is configurable; choose one your API account can access that supports Responses structured outputs. The key is read **only by Express**. Never add a `VITE_` API key or commit `.env`. Vite exposes no server environment variables to the client in this project. Real mode fails at startup if the key is absent; it never silently substitutes demo output.

The server uses `responses.parse`, `zodTextFormat`, `store: false`, a 30-second timeout, and no automatic retries. It handles refusals, incomplete output, bad response shapes, connection failures, and usage limits. API usage requires API billing; a ChatGPT subscription is separate. See [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs) and the [configured model documentation](https://developers.openai.com/api/docs/models/gpt-4.1-mini).

## Demo behavior

- Summarize and rewrite samples use carefully written fixtures. All four tones and both summary lengths have distinct results.
- Other summaries select source sentences. Other rewrites apply simple spacing, capitalization, and tone substitutions. These are limited local rules, not AI.
- Task extraction conservatively recognizes explicit `Name will/must/needs to …`, `Please …`, `We/I need to …`, and `TODO:/Action:` statements. It retains source quotes, recognizes simple stated deadlines, skips common negated/completed/speculative statements, and leaves missing fields null or unspecified.
- Nuanced prose, other languages, complex dates, and indirect commitments need real AI. Every demo result is labeled. Schema validation guarantees shape, not factual accuracy; review results before using them.

## Production build

```sh
npm run build
npm start
```

Open **http://127.0.0.1:3001**. Express serves the built frontend and the API together. For hardened production headers, set `NODE_ENV=production` in your hosting environment (PowerShell: `$env:NODE_ENV='production'` before `npm start`). Fonts are bundled locally.

`PORT`, `HOST`, `CLIENT_ORIGIN`, `AI_TIMEOUT_MS`, and `TRUST_PROXY_HOPS` are documented in `.env.example`. If changing `PORT` locally, restart both processes; Vite reads it for the API proxy. The default host binds locally. For hosting, configure `HOST=0.0.0.0`, `CLIENT_ORIGIN` to the exact public origin, TLS at your proxy, and the exact trusted proxy hop count. The in-memory 30 requests/minute/IP limit is for one server process; a shared limiter and stronger access controls are needed before exposing a paid API broadly.

## API contract

The only application API is **POST `/api/process`**, with `Content-Type: application/json`:

```json
{
  "mode": "summarize",
  "text": "Paste a meaningful passage here, at least ten characters long.",
  "preferences": { "length": "concise" }
}
```

Modes: `summarize`, `rewrite`, `actions`. Preferences are optional: `length` is `concise|detailed`, `tone` is `professional|casual|concise|polished`. Each tool uses its relevant preference. Limits: 10–20,000 trimmed characters, at most 4,000 whitespace-separated words, and a 100 KB JSON request body. Unknown keys and invalid preference values are rejected.

Successful responses use `{ mode, result, meta }`:

| Mode | Result fields |
| --- | --- |
| `summarize` | `summary`, `keyPoints[]`, `takeaway` |
| `rewrite` | `rewrittenText`, `changes[]` |
| `actions` | `overview`, `actionItems[{task, assignee, dueDate, priority, evidence}]` |

Metadata contains `provider` (`demo` or `openai`), `inputWords`, `durationMs`, and `requestId`. Errors use `{ "error": { "code", "message", "requestId" } }`. Status codes: 200 success; 400 validation/JSON; 403 origin; 404 route; 413 size; 415 media type; 422 refusal; 429 request/provider limit; 500 internal; 502 upstream or malformed output; 503 provider configuration; 504 timeout. API responses are not cached. Logs omit source text, credentials, and raw provider errors.

## Verify

```sh
npm run check
```

This runs API/service tests and builds the frontend. The real SDK is tested with a mocked Responses HTTP transport; it does not make paid API calls.

For browser checks, install Python 3.10+ and Playwright, start the app in another terminal, then run:

```sh
python -m pip install playwright
python -m playwright install chromium
npm run test:ui
```

The suite covers the three tools, settings, loading, validation, copy, tasks, errors/retry, cancellation, escaping, and five viewport widths. Screenshots and a report go to ignored `test-results/`. Optional environment variables: `BASE_URL` (default `http://127.0.0.1:5173`) and `BROWSER_CHANNEL` (e.g. `msedge`). See [TESTING.md](TESTING.md) for the completed checks and [CONCEPTS.md](CONCEPTS.md) for evaluation markers.

## Where things live

```text
client/src/       React screen, components, styles, API client
shared/          Zod request/output contracts and sample text
server/app.js    Express middleware, endpoint, static serving
server/services/ Separate OpenAI and local demo engines
server/prompts/  Per-tool instructions
tests/           API, SDK transport, and browser integration checks
```

No text is persisted by Promptly. In real mode, source text is sent to OpenAI; `store: false` does not make claims about all provider retention policies. Canceling discards the browser request and prevents stale output; it does not guarantee that an upstream generation or its billing stops.

If a port is occupied, stop the earlier app process. If the browser cannot reach the API, confirm both dev processes are running and use the exact URL above. A provider limit error can indicate API billing or quota, not only request frequency.
