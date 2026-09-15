---
name: add-part
description: Trace a Eurorack panel component's dimensions to its datasheet and add or correct it in the Five08 parts library. Use when adding a part, fixing a wrong cutout, or working through docs/parts-wanted.md. Works through a queue without interrupting — decides for itself where the drawing is unambiguous and collects the genuinely unclear cases into one list at the end. Needs a session that can reach manufacturer and distributor sites — run it locally, not in a sandboxed environment.
---

# Adding a traced part

Five08's dimensions are the reason anyone trusts it. A wrong cutout costs
somebody a panel, so this procedure is about being able to show where a number
came from — not about filling in as many parts as possible.

## Before you start

Check you can actually reach a datasheet:

```bash
curl -sI https://www.mouser.com/ | head -1
```

If that fails, you are in a sandboxed environment behind an egress proxy. **Stop
and say so.** Do not fall back to search snippets, distributor spec tables, or
memory — those are how wrong numbers get a citation attached and look
authoritative. Leave the part generic instead.

## 1. Pin down the exact part

A "3.5 mm jack" is not a part; `PJ398SM` is. Get the manufacturer and the full
order code, including the variant suffix where it changes the mechanics (bushing
length, shaft type, mounting orientation).

If the worklist entry is generic ("9 mm pot"), pick the variant people actually
buy and say which one you picked in the description.

## 2. Find the drawing

Prefer, in order:

1. The manufacturer's own PDF.
2. A distributor mirror of that PDF — Mouser, Farnell, TME, RS. These usually
   fetch cleanly when the manufacturer's site is behind bot protection, and it is
   the same document.
3. Nothing else. A retailer's HTML spec table is not a datasheet.

## 3. Read the drawing, not the text

Mechanical dimensions live in a drawing, so open the PDF and look at the page:

```
Read the PDF with the pages parameter, e.g. pages: "2-3"
```

Panel dimensions are usually on a "dimensions" or "outline drawing" page and are
often in a "recommended panel cutout" / "PCB and panel layout" inset. Watch for:

- **Bushing diameter is not panel cutout.** An M7×0.75 bushing wants a 7.0–7.2 mm
  hole; the drawing may only give the thread.
- **Units.** Some drawings are in inches with millimetres bracketed.
- **Tolerances.** Record the nominal; Five08 does not model tolerance.
- **Depth is behind the panel**, measured from the mounting face, excluding pins
  and solder tails unless those are what actually limits the fit.

## 4. Decide for yourself, or defer — but do not interrupt

Most dimensions are unambiguous once you are looking at the drawing. Take them
and move on. Do not ask for confirmation of a figure you can point at.

**Take the figure without asking when all of these hold:**

1. It comes from a dimensioned drawing or an explicit panel-cutout note in a
   manufacturer's datasheet (or a distributor's mirror of one) — not a spec
   table, not prose, not a shop listing.
2. You can state the number, its units, and where it is: page, and which view or
   inset.
3. Either the datasheet gives the panel cutout directly, or it gives a thread
   and you apply the standard clearance from the table below.
4. The part variant is pinned — the datasheet shows one bushing option, or the
   order code you are recording selects one.
5. It does not contradict the value already in the catalog by more than
   **0.5 mm or 15%, whichever is larger**.

### Thread to panel hole

Applying this is a lookup, not a judgement. A thread spec plus this table is a
confident cutout.

| Thread | Panel hole | Notes |
| --- | --- | --- |
| M7×0.75 | 7.1 mm | 9 mm pots, EC11 encoders |
| M8×0.75 | 8.1 mm | 16 mm pots, larger encoders |
| M9×0.75 | 9.1 mm | Some 16 mm pots |
| M6×0.75 | 6.1 mm | 3.5 mm jacks, mini toggles |
| 1/4-40 UNS | 6.4 mm | Imperial mini toggles |
| M2.5 / M3 / M4 | 2.7 / 3.2 / 4.3 mm | ISO 273 fine series |

Round **up** to the next 0.1 mm. If a part needs an anti-rotation tab or a flat,
Five08 cannot express it — record the round hole and say so in the description.

**Stop and defer when any of these hold:**

- Two readings are genuinely plausible — most often a bushing outer diameter
  given with no thread spec, where the number could be the thread major or the
  clearance hole.
- The datasheet covers several variants with different mechanics and the order
  code does not pick one.
- The drawing is a scan too coarse to read the dimension text with confidence.
- Units are inconsistent between the inch and millimetre figures.
- The figure contradicts the existing catalog value beyond the band in (5). One
  of the two is wrong and it is worth a person deciding which.
- Only a secondary source exists — a forum post, a retailer's table, a wiki.

### Deferring

Deferring is not stopping work. **Do not ask mid-queue.** Instead:

1. Leave the part as it is — generic, uncited. Never write a figure you are
   unsure of, and never attach a citation to one.
2. Append an entry to `docs/parts-open-questions.md` in the format that file
   documents: the part, the question, the candidate readings with page
   references, and which way you lean.
3. Carry on to the next part.

At the end of the run, report what you traced and put every deferred question in
**one message**. Ask specifically — "the RD901F drawing on p.2 gives Ø7.0 at the
bushing with no thread callout: is that the thread major (so a 7.1 mm hole) or
the clearance already (so 7.0)? I lean thread major" — not "please confirm the
knob dimensions".

A deferred part is a good outcome. It is marked generic, which is honest, and
the question is recorded where the next person can answer it.

## 5. Fill in the part

Parts live in `src/catalog.ts` as objects with named fields. Copy a nearby part
of the same renderer and edit it.

Record only what the drawing tells you:

| Field | What it is |
| --- | --- |
| `width`, `height` | The part's visible footprint on the panel face, in mm |
| `cutout` | Circular hole diameter; omit entirely if the part sits on the surface |
| `cutoutShape` | `'rect'` or `'obround'` when the opening is not round |
| `cutoutWidth`, `cutoutHeight` | Explicit opening size for rect and obround |
| `cutoutInset` | Fraction of the footprint a parametric opening fills — `1` means "cut it at the size you drew it" |
| `keepout` | Clear space the body needs, for the rear-clearance view |
| `depth` | Millimetres behind the panel face |
| `manufacturer`, `partNumber` | Exactly as ordered |
| `source` | `{note, url}` — see below |

**Never write `cutout: 0`.** It reads as falsy and silently exports a panel with
no hole. Omit the field.

## 6. Cite the specific dimension

The note names the part and the dimension it establishes, so a reviewer can find
it on the page:

```ts
source:{
  note:'Taiwan Alpha RD901F 9 mm potentiometer — M7×0.75 bushing',
  url:'https://www.mouser.com/datasheet/3/140/1/RD901F.pdf',
}
```

Not `note: 'datasheet'`. Put shared citations in the `SOURCE` map at the top of
the file and reference them, so a figure and its source cannot drift apart.

Do not commit the PDF. Dimensions derived from a datasheet are fine to publish;
redistributing the document is not.

## 7. Choose the status honestly

- **No source** — leave it generic. The interface says so.
- **Cutout traced, body estimated** — add `source`, leave `status` generic. This
  is the common and correct case for knobs, where the hole is the pot's bushing
  but the cap size is whatever you like.
- **Whole part traced** — `status:'verified'`, which additionally requires
  `manufacturer` and `partNumber`. `catalog.test.ts` enforces that.

If the drawing is ambiguous, leave it generic and note what was unclear. An
untraced part is honest; a wrongly traced one is worse than nothing.

## 8. Verify

```bash
npm test
```

The catalog tests check that verified parts are traceable, that anything passing
through the panel has an opening, that a rectangular part does not cut a round
hole, that a circular cutout stays within clearance of its part, and that no
cutout is zero. If one fails, the data is wrong — do not relax the test.

Then check it looks right:

```bash
npm run dev    # drop the part on a panel, switch to Cutouts and Rear clearance
```

## 9. Commit

One part or one family per commit. Say in the message where the figures came
from and what stayed generic:

```
Trace the Alps EC11 encoder cutout

M7×0.75 bushing, so a 7.2 mm panel hole. Body depth 21 mm behind the panel from
the outline drawing on page 2. Shaft length varies by variant and is not
modelled. Cap dimensions stay generic.
```

## Working through the worklist

`docs/parts-wanted.md` is a ranked queue. Take entries from the top, tick them
off as you go, and move an entry to the bottom with a note if the datasheet
could not be found — that is useful information for whoever tries next.

Work the whole batch before reporting. Commit each part as you finish it, so a
run that is interrupted still leaves the traced parts done. Deferred questions
go to `docs/parts-open-questions.md` as you hit them and into a single summary
at the end — one interruption per run, not one per part.
