# Studio workflow

## Real hardware first

Hardware dimensions are locked for every category, including generic catalog entries. Change a knob through its **Standard size** selector; this selects a different catalog definition. Panel width, group operations and array copies do not scale hardware. Graphics remain resizable.

Older projects and imported files with stretched hardware are normalized to their catalog sizes on opening. The original external JSON file is not changed. A generic part remains an estimate, even when its dimensions are locked: verify the named component against its datasheet before manufacture.

## Assemblies

1. Select the parts of a channel, control cluster or graphic motif.
2. Open **Assemblies** in the component library and name the selection.
3. Insert it into any panel. Position it as a group, then ungroup to edit its members independently.
4. Download its `.assembly.json` to share it or keep a backup. Importing validates dimensions and sanitizes embedded SVG.

The browser library holds up to 50 assemblies within a 2-million-character serialized budget; each assembly holds up to 100 items. An inserted assembly preserves physical dimensions, gets fresh item/group IDs, and clears export identifiers. Duplicates and repeated groups are independent of their source. Font defaults come from the destination panel; explicit item font overrides travel with the assembly.

Assembly deletion affects the library entry, not items already inserted into panels. Assembly storage is separate from project storage and project undo.

## Typography and scales

**Panel > Panel typography** sets the shared legend font, weight, size and uppercase treatment. Inverted labels apply to parts whose export role is **output**. Text graphics inherit the panel font/weight unless individually overridden; their height is their font size. Resetting individual font overrides is undoable.

Select a **Knob scale** graphic to set its tick count, start angle, sweep, major tick interval, tick length and stroke weight. Angles follow the panel coordinate system: zero points right, 90 points down. A full 360-degree scale does not duplicate its first tick.

## Preflight

Rules belong to the panel and travel in `.panel.json`. The defaults are planning assumptions, not fabrication standards:

| Rule | Default |
| --- | --- |
| Front-part edge clearance | 3 mm |
| Material between cutouts | 1.2 mm |
| Jack centre pitch | 9.5 mm |
| Available depth behind the panel | 25 mm |
| Gap between knob skirts | 2 mm |
| Minimum text size | 1.5 mm |

Issues are grouped into **Machining**, **Assembly**, **Ergonomics** and **Artwork**. Actual circular knob-skirt overlap is an error. Rear clearance-envelope overlap is a warning because the envelopes are conservative, not manufacturer CAD solids. Hidden items are excluded.

Rotated rectangular bounds are considered, but non-circular cutout separation still uses conservative bounding boxes. It can report a possible collision that detailed CAD clears. Artwork checks currently cover panel boundaries and minimum text size, not font-specific glyph collisions, contrast or a comprehensive silkscreen DRC.

## 3D inspection

Open **3D** next to the canvas view selector. Orbit, zoom, switch front/rear/perspective, and toggle hardware or rear envelopes. The panel is extruded to its actual configured thickness and cut using the shared hole definitions.

Front width/height follows the catalog. Front elevation is illustrative because the catalog does not yet carry cap heights. Rear boxes use catalog depth and clearance footprints; red indicates a part exceeding the configured rear space. PCBs, wiring, fasteners and their tolerances are not modeled. This is an inspection aid, not a STEP assembly or collision-certification tool.

The renderer is loaded only when requested, redraws on changes rather than in a permanent animation loop, and releases its WebGL resources when closed.

## Exports

- **Artwork SVG:** graphics and legends, without hardware illustrations. Text is editable, not converted to paths.
- **PNG:** the complete front-panel hardware preview.
- **DXF engraving:** native CAD text with legend size/case and rotated placement. It is not outlined typography and does not encode inverted label backgrounds or the chosen browser font; use artwork SVG for that treatment.
- **KiCad mechanical PCB:** a KiCad 7+ board with the panel thickness, outer perimeter and every visible cutout on `Edge.Cuts`. Circular holes and slot ends remain analytic curves. No electrical footprints, silk graphics, copper, Gerbers, or manufacturer process tolerances are supplied.
- **VCV SVG:** artwork and visible component-role markers. Outline the text externally before using it with VCV's SVG toolchain.

The generated KiCad file was opened and plotted using KiCad 10.0.4; a clean example passed its DRC with zero violations. This validates the file and example geometry, not every possible user layout or manufacturer process. Run preflight and check a 1:1 print before ordering anything.
