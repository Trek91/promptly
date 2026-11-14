# Promptly — the writing room

Promptly's identity is a personal writing room: a working draft on a quiet tonal surface, paired with a readable and verifiable result. The design keeps the actual three-tool workflow central.

## Art direction

The current direction is **Editorial greeting**, seed **835145162**, selected from the app-screen design workflow. Instrument Sans handles controls and documents; Instrument Serif gives the workspace its single distinctive greeting. The custom Promptly wordmark and monogram use the same deep teal as meaningful source emphasis. There are no decorative gradients, glass, resting shadows, invented profiles, or fake usage statistics.

The serif title is 48px on desktop, 44px on tablet, and 36px on a phone. This deliberately follows the dealt editorial direction rather than the usual compact app title. Focus view removes it for sustained work. All titles remain one line in the measured screenshots.

## Composition

At a 1440px viewport, the centered working area is 1100px wide: two 542px document panels with a 16px gutter. The source sits on a low-chroma sage/stone surface and the output stays white. Their 22px corners share one geometry. Controls are rounded, while notices and actual source evidence use tighter corners appropriate to their roles. Source and output retain independent scrolling and stable actions.

Document prose stays at 16px with generous leading. Supporting controls use 12–14px, with an 11px metadata floor. Counts use tabular figures. The accent is limited to the identity, useful source emphasis, and action feedback. Status and priorities keep their semantic colors.

## Interaction craft

- The tool indicator moves when a person changes modes; page content does not play an entrance animation.
- Focus view expands the writing area without clearing text or losing results.
- Paste reads the clipboard only after a user clicks. Empty or denied clipboard access gives a useful fallback and preserves the draft.
- Copy and Download output work with the current structured result and task completion state. Downloads are local plain-text files.
- Find in original highlights only an exact nonempty source quote. Edit text restores keyboard focus without dropping the generated result.
- On phones, Original / Result controls show one pane at a time. Submitting opens Result; locating evidence opens Original.
- Output arrival and control feedback are short and respect reduced motion.

## Review and limits

Static style lint reports **0 failures, 0 warnings**. Rendered inspection at 1440, 768, and 390px reports **0 failures**, no missing fonts, no horizontal overflow, and no text-contrast failures. Both normal and Focus layouts, populated results, empty states, and phone navigation were visually reviewed.

Two inspector warnings are intentional. The 48px serif greeting is the chosen direction's identity, and Focus view removes it. The empty output reserves document space so generation does not resize the editor or move its controls. These exceptions are documented, not hidden from the audit.

The final internal critique rates design 8, usability 8.5, creativity 7.5, and content 8, for a weighted **8.1/10**. This is a design review, not an external award or a price valuation. The result remains a familiar document editor; its distinctive craft comes from the typography, document spread, and source-review workflow.

Previews use explicitly labeled local demo inputs/results. No stock photography is needed for this app screen. The API, source validation, and active Gemini 3.5 Flash-Lite configuration are unchanged. See TESTING.md for completed checks.
