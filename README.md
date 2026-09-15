# Five08

[![CI](https://github.com/alibros/five08/actions/workflows/ci.yml/badge.svg)](https://github.com/alibros/five08/actions/workflows/ci.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-171816.svg)](LICENSE)

Five08 is a free, open-source layout tool for Eurorack front panels. Set the width in HP, place parts in millimetres, check the spacing, and export the files a fabricator — or your own drill press — needs.

It runs entirely in the browser. There is no account, no server, and no upload. Projects live in browser storage until you export them, and the app works offline once it has been opened.

![Five08 landing page](docs/images/five08-landing.jpg)

## What it does

- **Real Eurorack geometry.** 128.5 mm tall; nominal HP widths, the Doepfer allowance, or a custom width in millimetres.
- **A parts library.** Knobs, encoders, illuminated buttons, jacks, sliders, switches, displays, LEDs, mounting hardware, text, shapes and imported PNG artwork, with standard-size presets and locked dimensions for physical connectors.
- **Millimetre placement.** Grid snapping, centre and edge guides, live neighbour distances, equal-gap detection, alignment, distribution, spreading and grid arrangement.
- **Direct manipulation.** Drag, rubber-band select, resize, rotate, mirror, flip, lock, hide, reorder, duplicate, copy and paste — with undo throughout.
- **Three views of the same layout.** Hardware, machining cutouts, and rear clearance — plus a rack view showing the panel between its neighbours.
- **Groups and arrays.** Bind a channel strip together and repeat it across the panel.
- **Real panel typography.** Multi-line legends with a font, weight, alignment and tracking; knob scales; signal arrows.
- **Panel previews.** Aluminium, acrylic, FR4, copper, powder-coated and bead-blasted finishes.
- **Preflight.** Edge margins, cutout walls, mounting clashes, jack spanner clearance, part depth and off-HP widths. Click an issue and the offending part is selected and framed.
- **A project library.** Named projects, autosave, recovery snapshots and portable project files.
- **Traceable dimensions.** Every part says whether its figures came from a datasheet or a guess, and links to the source.
- **Keyboard operable.** The canvas is a listbox: skip links, Tab between parts, arrow keys to place them.

![Five08 designer](docs/images/five08-editor.jpg)

## Exports

| Format | Contents |
| --- | --- |
| Artwork SVG | Physical-size panel artwork, including embedded PNG graphics |
| Cutout SVG | Panel outline, mounting slots, holes and component apertures |
| Cutout DXF | R12, millimetres, layered `PANEL_OUTLINE` / `MOUNTING` / `CUTOUTS` / `ENGRAVING` |
| PNG | 150–1200 dpi raster render |
| Print at 1:1 | A paper drilling template at actual size |
| VCV Rack SVG | Artwork with component-role helper markers |
| BOM CSV | Quantities, part names, cutouts, rear depths and whether a dimension is generic |
| `.panel.json` | Editable Five08 project |

The cutout SVG and the DXF are generated from the same geometry (`src/geometry.ts`), so they cannot describe different holes.

## Use it locally

Requires Node.js 20 or newer.

```bash
git clone https://github.com/alibros/five08.git
cd five08
npm install
npm run dev
```

Vite prints the local URL. The public page is at `/`; the designer is at `/app/`.

## Keyboard and pointer controls

| Action | Control |
| --- | --- |
| All commands | `Cmd/Ctrl` + `K` |
| Find a part | `/` |
| Move | Drag a component |
| Free movement, ignoring the grid | `Alt` + drag |
| Rubber-band select | Drag empty canvas |
| Add to selection | `Shift` + click |
| Pan | `Space` + drag, or middle-button drag |
| Zoom at the pointer | `Cmd/Ctrl` + scroll |
| Fit panel / zoom to selection | `0` / `F` |
| Resize | Drag a selection-box corner |
| Preserve aspect ratio | `Shift` + resize |
| Nudge by the grid step | Arrow key |
| Nudge 1 mm | `Shift` + arrow key |
| Rotate 90° | `R` / `Shift` + `R` |
| Mirror across the centreline | `M` |
| Lock or unlock | `L` |
| Copy / cut / paste | `Cmd/Ctrl` + `C` / `X` / `V` |
| Duplicate | `Cmd/Ctrl` + `D` |
| Select all | `Cmd/Ctrl` + `A` |
| Undo / redo | `Cmd/Ctrl` + `Z` / `Cmd/Ctrl` + `Shift` + `Z` |
| Your panels / Save / Export / Print | `Cmd/Ctrl` + `O` / `S` / `E` / `P` |

## Project storage and privacy

Projects, recovery snapshots and preferences are stored in your browser. Five08 does not upload projects or artwork. Copy and paste puts component JSON on the system clipboard so you can move parts between tabs; it is validated on the way back in.

Use **Save** to download a portable project before clearing browser data or moving to another computer. Artwork is embedded in the project file, and individual images are limited to 1.5 MB to keep browser persistence practical. Imported SVG is stripped to a presentational subset — scripts, event handlers, `foreignObject`, animation and external references are removed — both on import and again whenever a project is opened, because an exported SVG is a live document if someone opens it directly in a browser.

## Fabrication warning

Five08 is a layout and planning tool, not a substitute for manufacturer drawings. Generic component dimensions are useful starting points, but they are not certified mechanical specifications. Verify every cutout, tolerance, mounting point, material thickness and fabrication process against the actual component datasheet before manufacturing a panel.

Preflight catches layout mistakes. It cannot catch a wrong dimension.

## Development

```bash
npm run verify        # typecheck, unit tests, build, browser tests
```

Or individually:

```bash
npm run typecheck
npm test              # unit tests for the pure modules
npm run build
npm run test:e2e      # the built app in a real browser (needs: npx playwright install chromium)
```

The production build is written to `dist/`. The repository uses a Vite multi-page build:

- `index.html` — public page
- `app/index.html` — designer

### Source layout

| File | Responsibility |
| --- | --- |
| `src/model.ts` | Project and component types, project parsing and sanitisation |
| `src/catalog.ts` | The parts library |
| `src/geometry.ts` | Cutout and mounting geometry, shared by every exporter |
| `src/svg.ts` | Component and panel rendering |
| `src/dxf.ts` | DXF R12 writer |
| `src/raster.ts` | PNG rendering and the 1:1 print sheet |
| `src/preflight.ts` | Layout checks |
| `src/arrange.ts` | Align, distribute, mirror, rotate and grid placement |
| `src/store.ts` | Browser-local project library, recovery snapshots, preferences |
| `src/palette.ts` | Command palette |
| `src/history.ts` | Undo history, budgeted by bytes rather than step count |
| `src/artwork.ts` | SVG import sanitiser |
| `src/main.ts` | The editor |
| `src/landing.ts`, `src/demo.ts` | The public page and the panel it shows |

## Deploying to Vercel

Import the repository into Vercel and use the detected Vite settings. No environment variables or server functions are required. [`vercel.json`](vercel.json) adds the production security headers.

## Contributing

Bug reports and focused pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

Created by [Ali Bross](https://forestofrods.com).

Released under the [MIT License](LICENSE).
