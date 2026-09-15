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
npm run typecheck
npm test
npm run build
```

Keep component dimensions traceable. If a part is described as verified, include the manufacturer, part number, and source drawing in the pull-request description.

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
