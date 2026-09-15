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
- [x] **TT Electronics P092C** — 9 mm dual concentric pot. The 2-gang outline drawing on p.12 gives an M7×0.75 bushing, so a 7.1 mm hole, and a 12.05 mm body behind the mounting surface. `knob-concentric`, which used to borrow the single-shaft RD901F's citation for an 8 mm hole.
- [x] **ISO 273 fine, M2.5 and M4** — 2.7 mm and 4.3 mm clearance holes, reached as size presets on the M3 hole. `mount-hole-m25`, `mount-hole-m4`.
- [x] **Alps RK097** — 9 mm pot. Every drawing in the [Alps catalogue](https://tech.alpsalpine.com/cms.media/product_catalog_rv_01_rk097_en_d953249ce7.pdf) (1–9) shows an M7×0.75 bushing, the same thread as the RD901F, so the existing 9 mm knob cutouts already cover it — no new part. The snap-in RK09K/RK09D has no bushing, and its drawings give no panel hole.

## Wanted

Entries marked *open question* have a drawing, but also an ambiguity a person
needs to settle. The question, with both readings and page references, is in
`docs/parts-open-questions.md`.

### Controls
- [ ] **Alpha / Bourns 45 mm slide potentiometer** — slot width and length, and the travel versus the slot. Five08 currently derives the slot from the footprint. *Open question:* the Bourns PTA4543 drawing gives travel and lever but no slot, and the current rule cuts the 45 mm slot to the travel alone.

### Jacks and connectors
- [ ] **Kobiconn / Switchcraft 35RAPC4BHN2** — the other 3.5 mm jack people specify. *Open question:* a plain Ø6.00 bushing with no panel hole on the drawing.
- [ ] **4 mm banana socket** — panel hole and the nut across-flats, which drives minimum spacing. *Open question:* the Cliff S16N is M12, far from the current 8 mm — which socket?
- [ ] **MIDI TRS (Type A)** — confirm whether it is dimensionally the same as a standard 3.5 mm jack. *Open question:* it is a wiring convention on an ordinary TRS jack, but no manufacturer drawing for the stereo Thonkiconn was found.
- [ ] **5-pin DIN MIDI socket** — panel cutout and the fixing-screw pitch. *Open question:* a chassis socket (Lumberg KFV: Ø18 keyed hole, thread-mounted, no screws) or a PCB-mounted one?

### Switches and buttons
- [ ] **6 × 6 mm tactile switch with a panel cap** — cap diameter versus the hole. *Open question:* the current 3.5 mm fits the bare TL1105 plunger, not the Ø5 cap.

### Indicators and displays
- [ ] **SSD1306 0.91 / 0.96 in OLED modules** — the viewport window versus the module outline. Currently derived as 86% of the footprint. *Open question:* the 0.96 in viewing area sits off-centre on the glass, which a centred inset cannot express.

## Looked for, no usable drawing yet

- [ ] **USB-C panel receptacle** — the current 9.5 × 3.5 mm opening is an estimate. Needs a specific part number before there is a drawing to read.
- [ ] **16 mm illuminated momentary** — panel hole and the flat, if any. Needs a specific part, and no catalog part matches: `button-lit` is 12 mm and `button-metal` is not illuminated. APEM's A6 and AV16 ranges are candidates.
- [ ] **Slide switch** — the current 8 × 3 mm slot is an estimate. Needs a specific part number.
- [ ] **3 mm and 5 mm LED bezels** — the bezel, not the bare LED. Needs a specific bezel: panel holes vary widely between snap-in holders and metal bezels, so a generic figure would be a guess.
- [ ] **Analogue VU meter** — needs a specific model; cutouts vary between rectangular and round.
- [ ] **Doepfer mounting slot** — confirm the 6.5 × 3.2 mm obround against the official spec, and the 3 mm inset from the edge. Doepfer's [A-100 mechanical page](https://doepfer.de/a100_man/a100m_e.htm) names M3×6 DIN 7985 screws and 2 mm panels, but the hole-position sketch it refers to is no longer served, and the text gives no slot size. *Open question* on whether `mount-slot` should stay verified.

## Not traceable as drawn

Nothing yet. If a part turns out to be un-modellable rather than merely
untraced — the LED ring, which is twelve discrete holes rather than one cutout —
say so in its `description` and record it here instead of approximating.
