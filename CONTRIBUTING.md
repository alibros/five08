# Contributing to Five08

Thanks for helping improve Five08.

## Before opening an issue

- Check existing issues first.
- Include the browser and operating system.
- For layout bugs, include the panel HP, zoom level, grid setting, and a screenshot or small `.panel.json` reproduction when possible.
- Do not attach private artwork or project files unless you intend to share them publicly.

## Pull requests

1. Fork and clone the repository.
2. Create a focused branch.
3. Install dependencies with `npm install`.
4. Make the smallest coherent change.
5. Add or update tests when behaviour changes.
6. Run the complete verification set:

```bash
npm run verify
```

That runs the typecheck, the unit tests, the build and the browser tests. The browser tests need a one-off `npx playwright install chromium`.

The unit tests cover the pure modules. The editor itself is one module with top-level side effects and cannot be imported, so it is covered by `e2e/` running the built app in a real browser — that is where a control wired to the wrong id, a broken keyboard path or an export that produces no file gets caught. Every end-to-end test fails on a console error, so a swallowed exception cannot pass.

## Adding or correcting a part

The whole procedure — finding the datasheet, reading the drawing, filling in the
fields, citing the dimension — is written down in
[`.claude/skills/add-part/SKILL.md`](.claude/skills/add-part/SKILL.md). If you
use Claude Code it will pick that up automatically; if not, it reads perfectly
well as a checklist.

[`docs/parts-wanted.md`](docs/parts-wanted.md) is a ranked queue of parts whose
dimensions are still estimates, ordered by how often they turn up on a panel.

One thing that procedure insists on, and this repository will keep insisting on:
**if you cannot reach the datasheet, leave the part generic.** A figure sourced
from a search snippet or from memory, with a citation attached, is worse than an
honest estimate — it looks checked.


Dimensions are the reason people trust this tool, so the library records where each one came from.

- Add a `source: {note, url}` to any part whose **cutout** you can trace to a datasheet. The note should name the manufacturer, the part and the relevant dimension — `'Taiwan Alpha RD901F 9 mm potentiometer — M7×0.75 bushing'` — not just "datasheet".
- Only set `status: 'verified'` when the **whole part** is traced, and then `manufacturer`, `partNumber` and `source` are all required. `catalog.test.ts` enforces this, along with the rules that a part which passes through the panel has an opening, that a rectangular part does not cut a round hole, and that no cutout is zero.
- A cutout of `0` is not "no cutout" — it silently exports a panel with no hole in it. Use `undefined`.
- If a part genuinely cannot be expressed (an LED ring is twelve separate holes), say so in its description rather than approximating it.

## Where things belong

- Cutout and mounting geometry goes in `src/geometry.ts`. Every exporter reads it, which is what keeps the DXF and the cutout SVG in agreement — do not reimplement a hole shape in an exporter.
- Layout checks go in `src/preflight.ts` as an `Issue` with a `code`, a plain-language `message`, a `detail` that says what to do, and the `itemIds` involved so the editor can select them.
- Pure geometry and layout logic belongs in its own module with tests. UI wiring lives in `src/main.ts`.
- Colours in `src/style.css` come from the tokens at the top of the product-theme block. A literal hex in a rule will look wrong in one of the two themes.
- The panel on the public page is a real project in `src/demo.ts`, and `demo.test.ts` runs preflight over it. If you change it, it still has to pass.

## Design principles

- Keep physical units explicit.
- Do not present generic dimensions as fabrication-certified.
- Preserve compatibility with existing `.panel.json` projects.
- Prefer direct manipulation, clear defaults, and reversible actions.
- Keep projects local unless a future feature explicitly and transparently says otherwise.
- Say what a number is. A dimension is either from a datasheet or it is a Five08 default, and the interface should not blur the two.
