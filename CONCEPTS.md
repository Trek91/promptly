# Promptly: course concepts → working code

This repository implements the focused Promptly scope agreed in the referenced discussion. It does **not** claim all 25 portfolio markers. The original screenshot files were not provided here; the mapping below uses the marker names recorded in that discussion.

| Marker | Implementation | How to demonstrate |
| --- | --- | --- |
| LLM API integration | `server/services/ai.js` → `createAIService`, `client.responses.parse` | Set real-mode server environment; run any tool. Without a key, inspect the SDK transport test in `tests/ai.test.js`. |
| Prompt engineering | `server/prompts/templates.js` → `buildInstructions` | Compare per-tool instructions, tone/length parameters, source-as-data guidance, and rules against invented task metadata. |
| Structured outputs | `shared/schemas.js`, `server/services/ai.js` → `zodTextFormat` | Inspect strict output schemas, required nullable fields, SDK parsing, and server/browser response validation. |
| REST endpoint design | `server/app.js` → `POST /api/process` | Send a mode, source text, and preferences; receive a typed result envelope. One stateless processing resource. |
| HTTP status codes | `server/app.js`, `server/middleware/errors.js`, `server/services/ai.js` | Test 400, 403, 404, 413, 415, 422, 429, 500, 502, 503, and 504. |
| Middleware | `server/app.js` → request IDs, Helmet, origin checks, CORS, rate limiter, JSON parser; `errorHandler` | Trace a request through validation, the handler, and centralized error output. |
| Server-side error handling | `server/middleware/errors.js` → `AppError`, `errorHandler`; `server/services/ai.js` | Inspect refusal, timeout, invalid-output and provider-error tests. Raw provider errors are not sent to the browser. |
| Environment variables / secrets | `.env.example`, `.gitignore`, `server/config.js` → `readConfig` | Start without credentials in demo; see startup reject missing real-mode credentials. No key enters client code. |
| Async data fetching | `client/src/lib/api.js` → `processText`; `client/src/App.jsx` → `run` | Observe loading and results from Express. Simulate network errors, then retry. |
| JavaScript async/await | `App.jsx`, `server/app.js`, `server/services/ai.js` | Trace promise completion and exception handling from fetch through the SDK. |
| React component composition | `client/src/components/` + `App.jsx` | Header, tool selector, editor, result panel, reusable Button and Choice compose one screen. |
| `useState` | `App.jsx`, `ResultPanel.jsx` | Editor text, selected mode, preferences, loading/error/result, clipboard feedback, and checked tasks update the rendered screen. |
| `useEffect` | `App.jsx` and `ResultPanel.jsx` | Cleanup aborts on unmount; result changes reset copy/task state and focus the result heading; timers are cleaned up. No autosave is needed. |
| Git workflow | `.gitignore`, repository history, commands below | Inspect the initial snapshot, branch for a change, review the diff, and commit. No remote publishing is required. |
| System integration / problem modeling | `README.md`, shared contracts, frontend → Express → selected engine | Explain source → validated request → prompt/schema → engine → validated response → purpose-built output. |

## Explain the architecture

```text
React editor
  → shared request validation → fetch with AbortController
  → Express: origin / size / rate checks → request validation
  → local demo OR server-side OpenAI Responses + strict Zod format
  → output validation → result + provider metadata
  → browser validation → summary / rewritten text / task checklist
```

The browser owns temporary editing state. Express owns credentials and mode selection. The engine returns the same contract in demo and real mode. Results are discarded when text, mode, or preferences change; a request version prevents late responses from restoring stale content.

The action schema records exact evidence, nullable owners/deadlines, and an explicit `unspecified` priority. Prompt rules tell real AI to avoid unsupported assignments. Schemas constrain format; they do not prove factual accuracy. The demo is deliberately limited and labeled.

## A small Git exercise

```sh
git switch -c improve-copy
# Make one focused change, then:
git diff
npm run check
git add client/src
git commit -m "Clarify editor guidance"
```

The delivered folder is initialized as a local Git repository. The downloadable ZIP contains the source snapshot without Git metadata; run `git init -b main`, `git add .`, and `git commit -m "Build Promptly v1.0"` in an extracted copy to start its history.

## Markers deliberately left to other projects

- **React routing:** one main screen; no artificial routes.
- **MongoDB CRUD/schema and PostgreSQL primary/foreign keys/joins:** no database in this scope.
- **Standalone closures, hoisting, event-loop, and promises-versus-callbacks teaching examples:** ordinary handlers, closures, promises and timers occur naturally, but this is not presented as a dedicated JavaScript teaching app. Those demonstrations belong in the proposed JS Playground project.
- **Auth, payments, user profiles, file uploads, saved history, and dark mode:** excluded or optional later work, not partially implemented features.

## Verification anchors

`tests/api.test.js` verifies the endpoint and demo behavior. `tests/ai.test.js` uses the installed SDK with a mocked HTTP response, plus provider failure cases. `tests/ui_test.py` exercises the actual running frontend and backend. See `TESTING.md` for the completed run and the paid-call limitation.
