# Five08

[![CI](https://github.com/alibros/five08/actions/workflows/ci.yml/badge.svg)](https://github.com/alibros/five08/actions/workflows/ci.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-171816.svg)](LICENSE)

Five08 is a free, open-source Eurorack panel layout tool. Set a panel width in HP, place controls in millimetres, check spacing and rear clearance, then export the result.

It runs entirely in the browser. There is no account and no server-side project storage.

![Five08 landing page](docs/images/five08-landing.jpg)

## What it does

- Real Eurorack geometry: 128.5 mm height, nominal or Doepfer-compatible HP widths, and custom widths.
- Component library with knobs, push encoders, illuminated buttons, jacks, sliders, switches, displays, LEDs, mounting hardware, labels, shapes, and PNG artwork.
- Standard-size presets for related parts such as knobs, vertical sliders, and panel LEDs.
- Locked dimensions for physical connectors, verified parts, toggles, and mounting hardware.
- Mouse placement, resizing, rotation, duplication, locking, hiding, and layer ordering.
- Grid snapping, centre and edge guides, neighbour distances, equal-gap indicators, alignment, and distribution.
- Hardware, machining-cutout, and rear-clearance views.
- Aluminium, acrylic, FR4, copper, powder-coated, and bead-blasted panel previews.
- Local autosave, recovery snapshots, portable project files, and undo/redo.

![Five08 designer](docs/images/five08-editor.jpg)

## Exports

| Format | Contents |
| --- | --- |
| Artwork SVG | Physical-size panel artwork, including embedded PNG graphics |
| Cutout SVG | Panel outline, mounting slots, holes, and component apertures |
| VCV Rack SVG | Artwork with component-role helper markers |
| BOM CSV | Quantities, part names, cutouts, and rear depths |
| `.panel.json` | Editable Five08 project |

## Use it locally

Requires Node.js 20 or newer.

```bash
git clone https://github.com/alibros/five08.git
cd five08
npm install
npm run dev
```

Vite prints the local URL. The landing page is at `/`; the editor is at `/app/`.

## Keyboard and pointer controls

| Action | Control |
| --- | --- |
| Move | Drag a component |
| Free movement | `Alt` + drag |
| Resize | Drag a selection-box corner |
| Preserve aspect ratio | `Shift` + resize |
| Fine nudge | Arrow key |
| 1 mm nudge | `Shift` + arrow key |
| Add to selection | `Shift` + click |
| Duplicate | `Cmd/Ctrl` + `D` |
| Select all | `Cmd/Ctrl` + `A` |
| Undo / redo | `Cmd/Ctrl` + `Z` / `Cmd/Ctrl` + `Shift` + `Z` |
| Search components | `/` |

## Project storage and privacy

Autosave and recovery snapshots are stored in the browser. Five08 does not upload projects or artwork. Use **Save** to download a portable project before clearing browser data or moving to another computer.

PNG artwork is embedded in the project file. Individual PNGs are limited to 1.5 MB to keep browser persistence practical.

## Fabrication warning

Five08 is a layout and planning tool, not a substitute for manufacturer drawings. Generic component dimensions are useful starting points, but they are not certified mechanical specifications. Verify every cutout, tolerance, mounting point, material thickness, and fabrication process against the actual component datasheet before manufacturing a panel.

## Development

```bash
npm run typecheck
npm test
npm run build
```

The production build is written to `dist/`. The repository uses a Vite multi-page build:

- `index.html` — public landing page
- `app/index.html` — designer

## Deploying to Vercel

Import the repository into Vercel and use the detected Vite settings. No environment variables or server functions are required. [`vercel.json`](vercel.json) adds the production security headers.

## Contributing

Bug reports and focused pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

Created by [Ali Bross](https://forestofrods.com).

Released under the [MIT License](LICENSE).
