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

## Design principles

- Keep physical units explicit.
- Do not present generic dimensions as fabrication-certified.
- Preserve compatibility with existing `.panel.json` projects.
- Prefer direct manipulation, clear defaults, and reversible actions.
- Keep projects local unless a future feature explicitly and transparently says otherwise.
