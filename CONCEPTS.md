# Promptly: course concepts → working code

This repository implements the focused Promptly scope agreed in the referenced discussion. It does **not** claim all 25 portfolio markers. The original screenshot files were not provided here; the mapping below uses the marker names recorded in that discussion.

| Marker | Implementation | How to demonstrate |
| --- | --- | --- |
| LLM API integration | `server/services/ai.js` → `createAIService`; `gemini.js` → native `generateContent` HTTP request; `openai.js` → `client.responses.parse` | Set Gemini's server-side key and real mode; run any tool. Without a key, inspect `tests/gemini.test.js` and the OpenAI SDK tests in `tests/ai.test.js`. |
| Prompt engineering | `server/prompts/templates.js` → `buildInstructions` | Compare per-tool instructions, tone/length parameters, source-as-data guidance, and rules against invented task metadata. |
| Structured outputs | `shared/schemas.js`; `gemini.js` → `z.toJSONSchema`, `responseJsonSchema`; `openai.js` → `zodTextFormat` | Inspect strict output schemas, required nullable fields, provider JSON parsing, and server/browser response validation. |
| REST endpoint design | `server/app.js` → `POST /api/process` | Send a mode, source text, and preferences; receive a typed result envelope. One stateless processing resource. |
| HTTP status codes | `server/app.js`, `server/middleware/errors.js`, `server/services/gemini.js`, `server/services/openai.js` | Test 400, 403, 404, 413, 415, 422, 429, 500, 502, 503, and 504. |
| Middleware | `server/app.js` → request IDs, Helmet, origin checks, CORS, rate limiter, JSON parser; `errorHandler` | Trace a request through validation, the handler, and centralized error output. |
| Server-side error handling | `server/middleware/errors.js` → `AppError`, `errorHandler`; both provider adapters | Inspect refusal, timeout, invalid-output and provider-error tests. Raw provider errors are not sent to the browser. |
| Environment variables / secrets | `.env.example`, `.gitignore`, `server/config.js` → `readConfig` | Start without credentials in demo; see startup reject missing real-mode credentials. No key enters client code. |
| Async data fetching | `client/src/lib/api.js` → `processText`; `client/src/App.jsx` → `run` | Observe loading and results from Express. Simulate network errors, then retry. |
| JavaScript async/await | `App.jsx`, `server/app.js`, `server/services/gemini.js`, `server/services/openai.js` | Trace promise completion and exception handling from browser fetch through the selected provider. |
| React component composition | `client/src/components/` + `App.jsx` | Header, tool selector, editor, result panel, reusable Button and Choice compose one screen. |
| `useState` | `App.jsx`, `ResultPanel.jsx`, `HistoryDrawer.jsx` | Editor text, selected tool, preferences, Focus/mobile views, clipboard feedback, edit/compare controls, and the history filter update the rendered screen. |
| `useEffect` | `App.jsx`, `TextEditor.jsx`, and `ResultPanel.jsx` | Cleanup aborts on unmount; result changes reset copy feedback; source review scrolls/focuses the exact quote and restores editing focus; timers are cleaned up. A successful workspace snapshot is saved locally when results, edits, or completion change. |
| State machines / `useReducer` | `client/src/lib/workspace.js` | Trace idle → loading → success/error, cancellation, and restore. Late responses cannot replace a different request or reopened result. |
| Immutability / single source of truth | `workspace.js`; `ResultPanel.jsx`; `ResultEditor.jsx` | Edit a result, copy/download the edited version, then reset to the untouched generated result. Counts and task totals are calculated from actual content. |
| Algorithms / pure functions | `client/src/lib/diff.js` | Compare original and rewritten tokens using longest common subsequence; reconstruct both exact texts. Large comparisons use a bounded passage fallback. |
| Array transformations / derived state | `ResultPanel.jsx` | Check tasks, see completion update, and hide completed rows while exporting the full checklist. `map` / `filter` compute views without duplicating task data. |
| Browser persistence / local CRUD | `client/src/lib/history.js`; `HistoryDrawer.jsx` | Create a result, reload, filter/reopen it, edit it, and delete it. Zod validates saved records, and storage failures leave the workspace usable. This is browser storage, not database CRUD. |
| Progressive disclosure / accessibility | `ResultPanel.jsx`; `HistoryDrawer.jsx` | Result editing/comparison appears after generation. Native modal behavior traps focus, supports Escape, and returns focus to the opener. |
| Git workflow | `.gitignore`, repository history, commands below | Inspect the initial snapshot, branch for a change, review the diff, and commit. No remote publishing is required. |
| System integration / problem modeling | `README.md`, shared contracts, frontend → Express → selected engine | Explain source → validated request → prompt/schema → engine → validated response → purpose-built output. |

## Explain the architecture

```text
React editor
  → shared request validation → fetch with AbortController
  → Express: origin / size / rate checks → request validation
  → local demo OR server-side Gemini / OpenAI + Zod-derived JSON Schema
  → output validation → result + provider metadata
  → browser validation → summary / rewritten text / task checklist
```

The browser owns editing state and a bounded local history of successful results. Express owns credentials and mode selection. The engine returns the same contract in demo and real mode. The current result is cleared when source text, mode, or preferences change; a saved result remains available in Past tasks; a request version prevents late responses from restoring stale content.

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
- **Auth, payments, user profiles, file uploads, cloud history, and dark mode:** excluded or optional later work, not partially implemented features.

## Verification anchors

`tests/workspace.test.js` verifies comparison reconstruction and bounds, immutable edits, workflow races, history validation/limits, and storage errors. `tests/api.test.js` verifies the endpoint, configuration, and demo behavior. `tests/gemini.test.js` checks the Gemini transport, all mode schemas, timeout, safety/quota errors, and provider metadata. `tests/ai.test.js` uses the installed OpenAI SDK with a mocked HTTP response. `tests/ui_test.py` exercises the actual running frontend and backend. See `TESTING.md` for completed checks and live-call limitations.
