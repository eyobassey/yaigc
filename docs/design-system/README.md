# Design System — reference

Three artefacts. Read in this order.

## 1. `Design_System_v0.docx`

The strategic frame. Principles, governance, naming conventions, status
taxonomy, sprint roadmap. The v0 snapshot dated May 2026.

Read sections 1–7 once. Then re-read whichever section is relevant when you
add a token, add a component, or change a stable component's API.

This is the long-form document. It does not change. When a position taken in
here gets revised, the revision goes in `AMENDMENTS.md` (next to this file).

## 2. `AMENDMENTS.md`

Every change made since v0. Newest at top. Each entry names the section of
the .docx it amends, what changed, and why.

## 3. `patterns.html`

The live, browsable pattern catalogue. Every token, every component, every
state, with code samples. **This is the visual source of truth.**

Open it in a browser. It's a static HTML file with inline styles — no build
step needed. When we lift the marketing components into proper primitives,
the `/styleguide` route in the app will become an in-app version of this
same catalogue.

## Preview screenshots

- `preview-desktop-top.png` — the top of the rendered patterns.html
- `preview-tokens.png` — colour, type, spacing token swatches
- `preview-components.png` — components section
- `preview-patterns.png` — pattern compositions
