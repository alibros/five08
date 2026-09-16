# Component Visual Audit

September 16, 2026. Covers all 69 catalog entries, including size presets hidden from the main library: 53 front-facing hardware models, 8 mechanical references/openings, and 8 graphics tools.

## Scope and Guarantees

- Catalog footprints, part dimensions, machining cutouts, mounting coordinates and rear keepouts are unchanged. Hardware is never squeezed to fit a panel.
- 2D hardware, library thumbnails, PNG renders and the landing-page example use the same SVG renderer. Physical materials do not inherit the panel's lettering colour.
- 2D and 3D share control travel, pointer angles, DIN contact positions, LED ordering, switch states, display traces and meter positions. SVG has Y down; Three.js uses Y up.
- Component colour is respected by every hardware family in both views, including connector insulators/shells and switch actuators. Metal mounting hardware keeps its own finish.
- Rear 3D views continue to show openings, not speculative connector housings or solder terminals. The separate clearance-envelope option is unchanged.
- Appearance models remain illustrative, not manufacturer CAD or a new certification of generic parts. Check the selected part's datasheet before fabrication. Existing uncertainties are recorded in [Parts Open Questions](parts-open-questions.md).

## Changes by Family

| Family | Entries | Corrections |
| --- | ---: | --- |
| Knobs and encoders | 15 | Distinct skirted, fluted, soft-touch, concentric, metal and illuminated variants; matched pointer sweeps and halo states; shared flute profile; selector index above the raised grip; clean concentric top-face shading. |
| Connectors | 8 | MIDI DIN uses five female wells on a semicircle with a key opposite them; TRS remains a jack; USB-C has a capsule opening, recessed tongue and two rows of contacts; SD has a card guide and contact row; jack nuts, washers, collars and bores are distinct. |
| Faders, switches, buttons and touch | 19 | Bounded fader travel in both orientations; matching switch positions; square tactile cap; separate button families and illumination states; no invented illumination on the metal button; consistent joystick direction and touch-strip marker. |
| Indicators and displays | 11 | Off-state lenses, clockwise LED rings, actual seven-segment glyphs, OLED traces, bargraph segments and a moving VU needle; reduced colour washout in 3D illuminated materials. |
| Mechanical openings | 8 | Thin inset outlines and centre marks; square-cornered rectangular opening previews; no solid 3D dummy objects covering cutouts. |
| Graphics | 8 | Existing drawing/export behaviour retained; contrasting thumbnail surfaces keep light artwork and dark hole outlines visible in either editor theme. |

Metal rings and retaining nuts now have small bevels that remain inside the original envelope. The bevel's polygon offset is compensated so it does not enlarge a part. Rounded USB shells and fader tracks use XY outlines independent of their extrusion depth.

## Coverage

- **Rotary:** `knob-small`, `knob-medium`, `knob-large`, `knob-skirted`, `knob-fluted`, `knob-soft-touch`, `encoder`, `encoder-compact`, `encoder-large`, `encoder-ring`, `encoder-metal`, `knob-concentric`, `knob-16mm`, `knob-ptv09`, `rotary-switch`.
- **Connectors:** `jack-mono`, `jack-stereo`, `jack-thonk`, `banana`, `usb-c`, `midi-trs`, `midi-din`, `sd-slot`.
- **Performance controls:** `slider-20`, `slider-30`, `slider-45`, `crossfader`, `joystick`, `touch-strip`, `button-tact`, `button-round`, `button-square`, `button-lit`, `button-lit-square`, `button-lit-square-large`, `button-lit-rect`, `button-lit-wide`, `button-arcade`, `button-metal`, `toggle-2`, `toggle-3`, `slide-switch`.
- **Indicators:** `led-2mm`, `led-3mm`, `led-5mm`, `led-rgb`, `led-ring`, `bargraph`, `seven-seg`, `oled-091`, `oled-096`, `oled-13`, `vu-meter`.
- **Mechanical:** `mount-hole`, `mount-hole-m25`, `mount-hole-m4`, `mount-slot`, `vent-slot`, `cutout-circle`, `cutout-rect`, `standoff`.
- **Graphics:** `text-label`, `knob-scale`, `arrow`, `section-title`, `divider`, `shape-circle`, `shape-rect`, `png-image`.

## Verification

Completed on September 16, 2026: production build and typecheck passed; 282 unit tests and 47 browser tests passed. The complete contact-sheet audit passed its 549 bounds checks and 212 WebGL pixel checks. Desktop and 390 px mobile inspection captures were also reviewed. Disposable captures and the task-specific browser installation were removed after verification.

Unit coverage checks all 53 modeled parts at minimum, centre and maximum preview values. It checks finite dimensions, physical-size locking, shared control positions, materials, variant details, resource disposal and export separation. Invalid preview values are clamped without modifying the project.

Browser coverage checks 549 combinations of physical part, value and rotation; standalone rasterization of all catalog thumbnails on light and dark surfaces; live inspector changes; real 3D front, rear, side and angled views; camera interaction; and desktop/mobile layouts. Rear-view tests assert that showing front hardware cannot cover rear openings. Camera checks wait for the rendered frame rather than sampling the previous frame immediately after a click.

The visual audit script produces eight contact sheets comparing 2D, front 3D and angled 3D on light and dark backgrounds, with 212 per-model WebGL pixel checks. These captures are disposable review artifacts, not repository assets.

```sh
npm ci
npx playwright install chromium --only-shell
npm test
npm run build
npm run test:e2e -- --workers=1 --trace=off
```

For side-by-side visual inspection, start Vite with `npm run dev`, then:

```sh
node scripts/dev/component-audit.mjs /tmp/five08-component-audit
```

Set `BASE_URL` if Vite is not on `http://127.0.0.1:5173`. `PLAYWRIGHT_BROWSERS_PATH` can point to a temporary browser installation. Inspect the JPEGs and `report.json`, then remove the generated directory and any disposable browser installation. The script uses an isolated page and does not change saved user projects.

## Visual References

- [CLIFF unscreened DIN connectors](https://www.cliffuk.co.uk/products/dins/unscreened.htm): manufacturer confirmation of the five-contact, 180-degree arrangement. Used to correct the previous zigzag drawing, not to replace the generic catalog flange or cutout dimensions.
- [Amphenol MUSBR USB-C mechanical drawing](https://cdn.amphenol-cs.com/media/wysiwyg/files/drawing/p-musbr-m5c1-xx.pdf): front-opening, tongue and contact-family reference. The catalog entry remains a generic USB-C opening, not a model of this specific housing.

These references support recognizable appearance only. Exact shell construction, mounting hardware and rear dimensions vary by manufacturer and part number.
