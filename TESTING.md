# Verification — 15 November 2026

Tested on Windows with Node 24.12.0, npm 11.18.0, Python 3.14, and Playwright 1.65.2. Dependencies remain locked in `package-lock.json`.

| Check | Result |
| --- | --- |
| `npm test` | **68/68 passed**: 59 API/provider checks plus 9 workspace/comparison/history checks. |
| `npm run build` | **Passed** with Vite 8.3.8. React, Tailwind, icons, and self-hosted fonts compile. |
| Production/demo browser suite | **25/25 scenarios passed** against Express on an isolated test port with `NODE_ENV=production` and the normal production CSP. |
| Static design lint | **0 failures, 0 warnings**. |
| Rendered inspection | **0 failures**, no missing fonts, no horizontal overflow or measured contrast failures at 1440, 768, and 390px. Two intentional warnings remain: the established serif greeting and stable empty output canvas. |
| Preview capture | Desktop, tablet, phone, Focus view, rewrite comparison, task list, result editing, and history drawer reviewed. Exact source whitespace also survives reload and reopening. No browser exceptions during capture. |

## Automated coverage

API/service checks cover demo modes and preferences, arbitrary input, task evidence/null fields, request validation, origin/preflight, body/media errors, rate limits, safe error messages, provider configuration, Gemini schemas/HTTP errors/timeout handling, and the actual OpenAI SDK with mocked HTTP transport.

Workspace tests verify exact reconstruction of both texts after comparison, Unicode/whitespace/markup, bounded handling of long unrelated passages, stale-response rejection, immutable generated output and edit reset, history round trips, the 20-result cap, duplicates, corrupt/schema-mismatched records, source-evidence integrity, storage size/quota failures, and history deletion.

The 25 browser scenarios cover empty and loading states; Focus view; paste and permission fallbacks; guide dialog/Escape; validation/limits/counts; samples and keyboard submission; actual copied/downloaded content; both summary lengths; four rewrite tones; tasks/source evidence; errors/retry; cancellation and stale responses; escaped output; responsive layouts at 320/390/768/1024/1440px; reduced motion; mocked Gemini metadata; exact source highlighting, scroll, and focus restoration; drawer empty state/confirmation/focus; editing every output mode; reset; rewrite comparison and edited comparison; task filtering and all-complete state; reload persistence; restored source/preferences/edits/completion without AI calls; reopening during a pending request; deleting/clearing without resurrecting the current record; responsive editing/history; and blocked/full storage fallback.

The final visual pass improved replacement phrase spacing, increased phone control/description type, and removed provider metadata from the editing view to give fields more room. Editing controls remain reachable while scrolling. Browser checks passed again after these adjustments.

## Provider verification and limits

No paid provider calls were made for the review/history update. The active key and `gemini-3.5-flash-lite` model were not changed. Repeatable provider tests mock transport; browser tests use the real local demo endpoint and explicit provider-response fixtures.

Historical live verification on 14 November 2026 passed summarize, rewrite, and action extraction through `/api/process` using Gemini 3.5 Flash-Lite. It confirms that connection at that time, not future quota or every possible output. One earlier upstream 502 was recoverable on a later request. No live OpenAI generation was performed. Keys and source text are not printed by application request logs.

History is local to the browser/site address, capped at 20 successful results and a serialized storage budget. It has no server persistence, device sync, encryption, or multi-tab conflict resolution. Browser storage failures are surfaced while keeping session work usable. The summary/rewrite/task demo algorithms remain deliberately limited and labeled; schema validation proves format, not factual accuracy.

## Repeat

Run `npm run check`. Start the app in demo mode and run `npm run test:ui` (or `python -u tests/ui_test.py http://127.0.0.1:PORT`). Tests write screenshots and `test-results/ui-report.json` to an ignored folder. See README.md for installation and local run instructions.
