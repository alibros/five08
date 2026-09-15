# Parts wanted

A ranked queue of components whose dimensions are still estimates. Work from the
top: these are ordered by how often they appear on a Eurorack panel, so the
early entries buy the most confidence per datasheet read.

Follow `.claude/skills/add-part/SKILL.md`. It needs a session that can reach
manufacturer and distributor sites — the hosted sandbox cannot, so run it
locally.

Tick an entry when its cutout is traced and cited. Move an entry to the bottom
with a note if you looked and could not find a usable drawing; that saves the
next person the search.

## Already traced

- [x] **Thonkiconn PJ398SM / PJ301M-12** — 3.5 mm jack. 6 mm panel hole.
- [x] **Taiwan Alpha RD901F** — 9 mm pot. M7×0.75 bushing, behind every knob cutout.
- [x] **Alps Alpine EC11** — encoder. M7×0.75 bushing.
- [x] **ISO 273 fine** — M3 clearance, behind the mounting hardware.
- [x] **Song Huei 16K4** — 16 mm pot. The bushing is M7×0.75, not larger; the drawing gives a Ø7.5 panel hole and a Ø3 anti-rotation hole, which is not modelled. `knob-16mm`.
- [x] **E-Switch 100 series** — miniature toggle, 1/4-40 bushing. The drawing gives a Ø6.35 panel hole; its keyway and locating-hole options are not modelled. `toggle-2`, `toggle-3`.
- [x] **Bourns PTV09A** — 9 mm pot. It does **not** match M7×0.75: the only threaded bushing, PTV09A-6, is M9×0.75, so a 9.1 mm hole. The -1 and -5 bushings are plain sleeves and -4 has none; the datasheet gives no panel hole for those. `knob-ptv09`.

## Wanted

### Controls
- [ ] **Alpha / Bourns 45 mm slide potentiometer** — slot width and length, and the travel versus the slot. Five08 currently derives the slot from the footprint.
- [ ] **Alps RK09 / RK097** — 9 mm pot, another widespread alternative.

### Jacks and connectors
- [ ] **Kobiconn / Switchcraft 35RAPC4BHN2** — the other 3.5 mm jack people specify.
- [ ] **4 mm banana socket** — panel hole and the nut across-flats, which drives minimum spacing.
- [ ] **USB-C panel receptacle** — the current 9.5 × 3.5 mm opening is an estimate. Needs a specific part number; panel-mount USB-C varies a lot.
- [ ] **MIDI TRS (Type A)** — confirm whether it is dimensionally the same as a standard 3.5 mm jack.
- [ ] **5-pin DIN MIDI socket** — panel cutout and the fixing-screw pitch.

### Switches and buttons
- [ ] **Mini toggle, 1/4-40 bushing** (E-Switch 100 series or similar) — the classic SPDT. Panel hole and anti-rotation tab, which Five08 does not model and should say so.
- [ ] **6 × 6 mm tactile switch with a panel cap** — cap diameter versus the hole.
- [ ] **16 mm illuminated momentary** — panel hole and the flat, if any.
- [ ] **Slide switch** — the current 8 × 3 mm slot is an estimate.

### Indicators and displays
- [ ] **3 mm and 5 mm LED bezels** — the bezel, not the bare LED. Bare LEDs are already right; bezels are what most builders actually use and have a larger hole.
- [ ] **SSD1306 0.91 / 0.96 in OLED modules** — the viewport window versus the module outline. Currently derived as 86% of the footprint.
- [ ] **Analogue VU meter** — needs a specific model; cutouts vary between rectangular and round.

### Hardware
- [ ] **Doepfer mounting slot** — confirm the 6.5 × 3.2 mm obround against the official spec, and the 3 mm inset from the edge.
- [ ] **M2.5 and M4 clearance** — for the less common fixings, same ISO 273 basis as M3.

## Not traceable as drawn

Nothing yet. If a part turns out to be un-modellable rather than merely
untraced — the LED ring, which is twelve discrete holes rather than one cutout —
say so in its `description` and record it here instead of approximating.
