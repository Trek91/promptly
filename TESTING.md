# Verification — 14 November 2026

Tested on Windows with Node 24.12.0, npm 11.18.0, Python 3.14, and Playwright 1.65.2. Dependencies are locked in `package-lock.json`.

| Check | Result |
| --- | --- |
| `npm test` | **59/59 passed**: demo modes/settings, arbitrary input, task evidence and null fields, validation, origin/preflight, body/media errors, rate limits, safe errors, provider-specific config, Gemini HTTP/schema/error/timeout handling, and OpenAI SDK/error cases. |
| `npm run build` | **Passed** with Vite 8.3.8. React, Tailwind, icons, and self-hosted fonts compile successfully. |
| Browser suite against `npm run dev` | **13/13 scenarios passed** using Chromium, including Gemini provider metadata and rendering with a mocked response. |
| Original-release browser suite against the production build | **12/12 scenarios passed** with `NODE_ENV=production`, strict CSP, static assets, and the real Express demo endpoint on a separate local test port. The Gemini update also passes a fresh production build. |
| Production headers | Static page 200, strict same-origin script policy, `nosniff`, and no `X-Powered-By`. No unexpected asset/font/API console errors before deliberately simulated failures. |
| Dependency audit | **0 reported vulnerabilities** at installation/lockfile verification. This is an installation-time observation. |

Browser scenarios cover empty/disabled states; guide dialog/Escape; short and oversized text; live word count; sample text; Ctrl+Enter; loading; both summary lengths; four rewrite tones; clipboard content and confirmation; task checkbox state and evidence; no-task results; provider/network errors and retry; cancellation; stale results after editing or switching tools; escaped HTML-like source text; clear/reset; layouts at **320, 390, 768, 1024, and 1440px**; mobile processing; reduced-motion preference; and zero uncaught browser errors.

Inspection found and repaired incorrect shared-module paths, fragile accessible tool names in browser selectors, demo date/priority attribution edge cases, and font data URLs blocked by the production CSP. Vite now emits font files, keeping the font policy limited to the same origin.

**Gemini update:** Gemini is the default real-mode provider. `tests/gemini.test.js` verifies all three tool schemas, per-mode preferences, server-only key headers, JSON parsing, null task fields, split output parts, filtering of thought parts, safety blocks, incomplete output, invalid JSON, 400/401/403/404/429/500/503/504 mappings, an actual abort-signal timeout, safe network errors, and API/browser-contract provider metadata. No new runtime dependency is needed: the server uses Node's native fetch. OpenAI remains available by explicit provider selection.

**Real AI limitation:** no live Gemini or OpenAI generation was made. Gemini's HTTP transport and the installed OpenAI SDK's Responses transport were mocked. Model access, quota, billing, and generation quality depend on the selected API account when real mode is enabled. The additional Gemini browser scenario also uses a mocked API response; the original twelve end-to-end demo scenarios use the running Express backend.

Run `npm run check` to repeat the automated server/build verification. Start the app and run `npm run test:ui` to repeat browser verification; setup is in the README. Browser screenshots and the detailed scenario list are written to ignored `test-results/`.
