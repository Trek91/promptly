# Verification — 14 November 2026

Tested on Windows with Node 24.12.0, npm 11.18.0, Python 3.14, and Playwright 1.65.2. Dependencies are locked in `package-lock.json`.

| Check | Result |
| --- | --- |
| `npm test` | **34/34 passed**: demo modes/settings, arbitrary input, task evidence and null fields, validation, origin/preflight, body/media errors, rate limits, safe errors, config, and OpenAI SDK/error cases. |
| `npm run build` | **Passed** with Vite 8.3.8. React, Tailwind, icons, and self-hosted fonts compile successfully. |
| Browser suite against `npm run dev` | **12/12 scenarios passed** using Chromium. |
| Same browser suite against the production build | **12/12 scenarios passed** with `NODE_ENV=production`, strict CSP, static assets, and the real Express demo endpoint on a separate local test port. |
| Production headers | Static page 200, strict same-origin script policy, `nosniff`, and no `X-Powered-By`. No unexpected asset/font/API console errors before deliberately simulated failures. |
| Dependency audit | **0 reported vulnerabilities** at installation/lockfile verification. This is an installation-time observation. |

Browser scenarios cover empty/disabled states; guide dialog/Escape; short and oversized text; live word count; sample text; Ctrl+Enter; loading; both summary lengths; four rewrite tones; clipboard content and confirmation; task checkbox state and evidence; no-task results; provider/network errors and retry; cancellation; stale results after editing or switching tools; escaped HTML-like source text; clear/reset; layouts at **320, 390, 768, 1024, and 1440px**; mobile processing; reduced-motion preference; and zero uncaught browser errors.

Inspection found and repaired incorrect shared-module paths, fragile accessible tool names in browser selectors, demo date/priority attribution edge cases, and font data URLs blocked by the production CSP. Vite now emits font files, keeping the font policy limited to the same origin.

**Real AI limitation:** no live paid OpenAI generation was made. The installed OpenAI SDK was exercised with a mocked HTTP Responses payload, including strict JSON Schema construction and parsing. Refusal, incomplete response, invalid output, 401/403/429, timeout, and general provider failure mappings were tested. Model access, billing, and generation quality still depend on the API account when real mode is enabled.

Run `npm run check` to repeat the automated server/build verification. Start the app and run `npm run test:ui` to repeat browser verification; setup is in the README. Browser screenshots and the detailed scenario list are written to ignored `test-results/`.
