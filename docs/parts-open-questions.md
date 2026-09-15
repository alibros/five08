# Open questions on part dimensions

Dimensions that could not be read off a drawing without a genuine ambiguity.

Each entry is a question somebody can answer — usually by owning the part and
putting a caliper on it, or by knowing which variant is the one people buy. The
part stays **generic** in the library until it is answered, which is the honest
state: an untraced figure is a stated estimate, a wrongly traced one looks
checked.

Anything unambiguous should never appear here. A thread callout plus the
clearance table in `.claude/skills/add-part/SKILL.md` is an answer, not a
question.

## How to add an entry

```markdown
### Part name — `part-id`

**Question.** One sentence, answerable.

- **Reading A:** what it would mean, with the page and view it comes from.
- **Reading B:** the same.
- **Leaning:** which one and why.
- **Source:** the datasheet URL.
- **Cost of guessing:** what a builder gets if we pick wrong.
```

## How to answer one

Edit the part in `src/catalog.ts`, add the `source`, run `npm test`, and delete
the entry in the same commit. The commit message should say what settled it.

## Open

### 45 mm slide potentiometer — `slider-45` (also `slider-20`, `slider-30`)

**Question.** How much longer than the travel should a slider slot be, given
that the Bourns PTA4543 drawing gives the travel and the lever but no panel
slot?

- **Reading A:** slot length is travel plus the lever's width at panel height:
  45 mm travel (p.2, Single Gang Dimensions) plus 3.0–5.0 mm depending on lever
  style and height (p.1, Lever Style & Product Dimensions). Width is the ~1 mm
  lever thickness (p.1; 0.9 in the p.2 end view) plus clearance.
- **Reading B:** keep the current model, which cuts 85% of the footprint. For
  `slider-45` that is 53 × 0.85 = 45.05 mm — the travel alone, so the lever hits
  the slot ends before the wiper does. `slider-20` and `slider-30` happen to get
  3.8 and 2.3 mm of margin from the same rule, so the three are inconsistent.
- **Leaning:** A. The open choice is the clearance, which the drawing does not
  give.
- **Source:** https://www.bourns.com/docs/Product-Datasheets/pta.pdf
- **Cost of guessing:** a slot cut to the travel loses the last few millimetres
  of the pot; a generous one shows a gap either side of the lever.

### Switchcraft 35RAPC4BHN2 — `jack-stereo`

**Question.** What panel hole goes with a plain, unthreaded Ø6.00 bushing when
the drawing gives no hole?

- **Reading A:** 6.0 — the bushing as drawn (customer drawing 35RAPC__HN2 rev L,
  side view, Ø0.236 [6.00] REF).
- **Reading B:** the bushing plus clearance, such as the current 6.2. The thread
  table adds 0.1 mm to a thread major, but it does not cover plain bushings.
- **Leaning:** B. A REF dimension with no tolerance should not be cut at size.
  The same rule would settle other plain bushings (Bourns PTV09A-1/-5 sleeves).
- **Source:** https://www.lcsc.com/datasheet/lcsc_datasheet_2401261114_Switchcraft-35RAPC4BHN2_C4991745.pdf
- **Cost of guessing:** at 6.0 the bushing may not pass an anodised or powder-coated
  hole; much over 6.2 and the jack rattles, since nothing clamps it.

Note that this is a horizontal PCB-mount jack: its 12 × 15 mm body sits behind
the panel, so the 9 × 9 mm footprint of `jack-stereo` does not describe it either.

### 4 mm banana socket — `banana`

**Question.** Which socket should `banana` be pinned to?

- **Reading A:** Cliff S16N / S16NS (FCR7357x, FCR7358Gx) — M12×0.75 thread and a
  Ø14.5 / Ø14.3 flange (datasheet p.1 and p.2 drawings). That implies a hole
  near 12.1 mm (M12 is not in the thread table) and a part at least 14.5 mm
  across, against the current 8 mm hole in a 12 mm part.
- **Reading B:** a smaller socket whose thread suits the current 8 mm hole. No
  drawing for one was read.
- **Leaning:** A if Cliff is what builders buy — but the figure contradicts the
  catalog by 4 mm, so a person should choose the part. Neither drawing gives the
  nut across-flats the worklist asked for.
- **Source:** https://mm.digikey.com/Volume0/opasdata/d220001/medias/docus/6170/Panel_Socket_S16N.pdf
- **Cost of guessing:** an 8 mm hole will not take an M12 socket at all; a 12 mm hole
  for a smaller socket leaves it loose.

### 5-pin DIN MIDI socket — `midi-din`

**Question.** Should `midi-din` be a front-mounted chassis socket or a PCB-mounted
one behind a hole?

- **Reading A:** Lumberg KFV — Ø18 +0.1 panel hole with a 2.8 mm key notch, Ø20
  front flange, 19.5 mm deep (KFV … C datasheet p.2, cut-out view c). It fixes
  with an M18×0.75 thread, so there is no fixing-screw pitch to record.
- **Reading B:** a right-angle PCB socket such as the Same Sky (CUI) SDS-50J,
  which is closer to the current 15 mm hole. Its datasheet gives the shell, not a
  panel hole, so this also needs a clearance decision. Not read this run.
- **Leaning:** B for Eurorack, where the socket normally rides on the PCB.
- **Source:** https://downloads.lumberg.com/datenblaetter/en/kfv_c.pdf
- **Cost of guessing:** pinning the KFV cuts an 18 mm keyed hole for a socket most
  modules do not use.

### Stereo Thonkiconn for MIDI TRS — `midi-trs`

**Question.** Is there a manufacturer drawing for the stereo Thonkiconn
(PJ366ST, now WQP419GR)?

- **Reading A:** MIDI TRS Type A is a wiring convention on an ordinary 3.5 mm TRS
  jack, so `midi-trs` should match `jack-thonk`. Thonk's shop page says the
  stereo part shares the PJ398SM footprint and 6 mm hole.
- **Reading B:** keep the generic 6.5 mm until a drawing is found. A shop page is
  a secondary source.
- **Leaning:** B for now. A is almost certainly the answer, but it needs a drawing
  before it gets a citation.
- **Source:** https://www.thonk.co.uk/shop/stereo-thonkiconn-threadless/
- **Cost of guessing:** 0.5 mm of slop around a jack.

### Thonkiconn PJ398SM — `jack-thonk` (currently verified)

**Question.** Is the verified 6.0 mm figure the panel hole, or the bushing thread?

- **Reading A:** the hole, as the current citation — Thonk's shop page — states.
- **Reading B:** the thread. The PJ301M-12 drawing (single page, side view) marks
  the threaded bushing Ø6, 4.5 mm long, with no pitch and no panel hole. By the
  M6 row of the thread table that is a 6.1 mm hole.
- **Leaning:** B. The drawing puts Ø6 on the thread, and a verified part should
  not rest on a shop page. It is 0.1 mm on the most-drilled hole in the library,
  so a person should decide.
- **Source:** https://www.thonk.co.uk/wp-content/uploads/2014/02/Thonkiconn_Jack_Datasheet.pdf
- **Cost of guessing:** a tight fit that needs reaming on finished panels.

### Tactile switch with cap — `button-tact`

**Question.** Should `button-tact` cut for the bare TL1105 plunger or for a cap?

- **Reading A:** the bare plunger. The current 3.5 mm matches the TL1105's 3.50 mm
  actuator (E-Switch TL1105 datasheet p.2–3).
- **Reading B:** a cap. The E-Switch 1R round cap that fits the TL1105SP is Ø5 ×
  9 mm (E-Switch cap catalogue p.214), so the hole needs to be 5 mm plus
  clearance.
- **Leaning:** B — the worklist describes a switch with a panel cap. The clearance
  is the open choice, and the cap figure came from an old catalogue page copied
  by Octopart, so it needs the current E-Switch cap sheet before it is cited.
- **Source:** https://sten-eswitch-13110800-production.s3.amazonaws.com/system/asset/product_line/data_sheet/144/TL1105.pdf
- **Cost of guessing:** a 3.5 mm hole will not pass a 5 mm cap.

### SSD1306 0.96 in OLED — `oled-096` (and `oled-091`)

**Question.** Does the footprint stand for the glass or the carrier board, and
should the window be the viewing area or the active area?

- **Reading A:** footprint is the glass, 26.70 × 19.26 mm (Univision UG-2864HSWEG01
  spec p.1, §1.2 Panel Size); window is the 23.744 × 12.864 mm viewing area (p.2,
  mechanical drawing, V/A).
- **Reading B:** window is the 21.744 × 10.864 mm active area (p.1 §1.2; p.2 A/A),
  which hides the unlit border.
- **Leaning:** A. Either way the window sits off-centre across the short side of
  the glass, because of the driver ledge (p.2). A centred `cutoutInset` cannot
  express that, so the part stays generic. Carrier boards vary by seller, and no
  drawing exists for their outline. The 0.91 in panel was not looked at.
- **Source:** https://cdn-shop.adafruit.com/datasheets/UG-2864HSWEG01.pdf (Univision's
  spec, hosted by a retailer)
- **Cost of guessing:** a centred window clips a millimetre or two of the display on
  one side and shows the glass ledge on the other.

### Doepfer mounting slot — `mount-slot` (currently verified)

**Question.** Should `mount-slot` stay verified when its citation only covers the
3.2 mm width?

- **Reading A:** keep it. 3.2 mm is the ISO 273 M3 clearance, and the 6.5 mm length
  is float rather than a fit.
- **Reading B:** make it generic until a Doepfer figure for the slot is found.
  Doepfer's A-100 mechanical page names M3×6 DIN 7985 screws and 2 mm panels,
  and refers to a hole-position sketch it no longer serves. It gives no slot size
  or edge inset.
- **Leaning:** B. Verified promises that every figure on the part is traced.
- **Source:** https://doepfer.de/a100_man/a100m_e.htm
- **Cost of guessing:** a builder trusts 6.5 mm and the 3 mm inset as Doepfer's
  figures.

### Alps EC11E encoder — `encoder`, `encoder-compact`, `encoder-large`, `encoder-metal` (currently cited)

**Question.** Is the vertical EC11E's bushing M7×0.75 when no Alps drawing of it
gives a thread, and what should the citation point at?

- **Reading A:** M7×0.75, so a 7.1 mm hole. The same catalog draws the 11 mm
  EC11B horizontal as M7×0.75 (2013 catalog, Farnell mirror, p.3 drawings 1–3),
  and the 2021 catalog draws the EC11 bushing as Ø7 (p.5, Shaft Dimensions).
- **Reading B:** a plain Ø7 bushing, which the thread table does not cover, so
  the current 7.2 is as defensible as 7.1. The vertical EC11E drawings give a
  7 mm bushing length and a Ø6 shaft but no bushing diameter or thread — 2013
  catalog p.3 drawings 4–5, and the current catalog (update 2510) p.2 drawings
  1–3.
- **Leaning:** A for the hole. The citation is the bigger problem: its note says
  M7×0.75 and its URL, `/assets/products/catalog/ec11.en.pdf`, returns
  AccessDenied. The catalog the EC11E series page now links does not show a
  thread either, so repointing the URL there would cite a figure the page does
  not carry. Either cite the Farnell mirror with a note saying only what it
  shows, confirm the thread on a real part, or drop the citation — which means
  changing the "cites a source for the cutouts people drill most" test.
- **Source:** https://tech.alpsalpine.com/cms.media/product_catalog_ec_01_ec11e_en_611f078659.pdf
  (current); https://www.farnell.com/datasheets/1837001.pdf (2013);
  https://web.archive.org/web/20221110080409/https://tech.alpsalpine.com/assets/products/catalog/ec11.en.pdf
  (2021, the URL the citation used to resolve to)
- **Cost of guessing:** 0.1 mm on the hole either way. A citation that opens on a
  page with no thread on it costs more, because it makes the figure look checked.

## Settled

*Answered questions move here with a one-line note, so the same ambiguity is not
investigated twice.*
