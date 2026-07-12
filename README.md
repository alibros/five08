# Five08

Five08 is a local-first Eurorack panel designer. Lay out controls at real-world scale, use smart alignment and equal-spacing guides, preview panel finishes, and export artwork, machining geometry, VCV Rack helpers, or a bill of materials.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

The landing page is at `/`; the designer is at `/app/`.

## Quality checks

```bash
npm run typecheck
npm test
npm run build
```

## Privacy and projects

Five08 has no account or server-side project storage. Autosave and recovery snapshots stay in the browser. Use **Save** to download a portable `.panel.json` project before clearing browser data or moving devices.

## Fabrication note

Exports use millimetre geometry, but generic component dimensions are planning aids—not manufacturer-certified mechanical drawings. Verify every cutout, tolerance, mounting point, and material process against the actual hardware datasheet before fabrication.

## Deploy

The repository is configured as a Vite multi-page static site and can be imported directly into Vercel with the default build settings. `vercel.json` supplies production security headers.

Created by [Ali Bross](https://forestofrods.com). Released under the MIT License.
