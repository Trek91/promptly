# Workspace design

Promptly is a document tool. Its main job is to let someone work with source text and inspect the result without losing context.

## Hierarchy

The editor occupies the largest part of the screen. A compact title names the workspace; underlined tool controls select the operation. Length and tone settings sit in the same toolbar. The input and output headers align, and the primary action stays at the bottom of the input pane. At 1440 × 900, the complete workspace frame fits on screen.

## Typography and spacing

IBM Plex Sans is bundled locally. Source text and rewritten/summary prose use 16px type with a 1.8 line height. Tool names and section labels use 14px; supporting metadata uses 12px, with an 11px floor for narrow layouts. Weights are limited to 400, 500, and 600. The desktop panes use 32px padding; tablet and phone use 24px and 20px. Counts use tabular figures.

## Surfaces and color

A neutral outer frame contains a white document surface and a slightly quieter result surface. One-pixel rules separate functional regions. The frame uses a 16px radius, controls use 6px, and content rows remain unboxed. The primary action is graphite. Teal identifies the product and the summary takeaway; green and red are reserved for actual status or priority. Resting surfaces have no shadows, gradients, or blur.

## Results and states

Summaries have an overview, key-point list, and takeaway. Rewrites present the draft as readable prose, followed by the edits made. Action items use compact checklist rows with owners, deadlines, and expandable source evidence. **Find in original** locates and highlights the exact quote in a source-reading view; **Edit text** restores the editor and keyboard focus. The action is disabled when the quote is absent from the current source. Empty states explain the output fields. Loading uses document-shaped placeholders, and errors keep the source in place with a retry action. The workspace does not play entrance animations.

## Responsive and accessible behavior

Source and output scroll independently on desktop. At narrower widths, **Original / Result** controls show one pane at a time. Submitting opens Result; locating evidence opens Original. This keeps both jobs within reach without a long page scroll. The editor keeps 16px text on phones; main controls have 44px touch height. Keyboard focus is visible, a skip link leads to the editor, the guide uses a native modal, and motion respects the user's reduced-motion setting.

## Review evidence

The rebuilt screen was inspected at 1440, 768, and 390px. No missing fonts, horizontal overflow, or text-contrast failures were reported. The static style audit found no banned patterns. One empty-panel spacing warning is intentional: the blank output is a stable document canvas, so it does not resize the source pane or move the action when results arrive. Functional browser checks additionally cover 320 and 1024px.

The UI was checked with real Gemini output as well as repeatable demo requests. See `TESTING.md` for the verification details.

## Explicit design-taste-frontend pass

The app-screen workflow selected **Framed sheet**, seed **112832709**, with the existing type and palette retained and no direction redraw. Its product-specific idea is to make generated task evidence directly traceable to the original document. There are no photography or motion requirements for this editor screen, and no stock images or invented customer data were added. Built-in examples remain labeled sample/demo content.

Before/after measurements from the browser inspector:

| Viewport | Previous page height | Current page height | Contrast failures | Horizontal overflow |
| --- | --- | --- | --- | --- |
| 1440 × 900 | 900px | 900px | 0 → 0 | 0 → 0 |
| 768 × 1024 | 1281px | 1024px | 0 → 0 | 0 → 0 |
| 390 × 844 | 1296px | 844px | 0 → 0 | 0 → 0 |

The final screenshot critique rates design **7.5**, usability **8.5**, creativity **7**, and content **8**, for a weighted **7.8/10**. These are an internal critique, not an external award or user-research score. The design still follows the familiar document-editor pattern; its distinction is the evidence-review workflow. The empty desktop output reserves canvas space deliberately, which remains the inspector's one documented spacing warning. Static lint reports zero failures/warnings; rendered inspection reports zero failures at all three widths.
