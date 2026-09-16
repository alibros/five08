# Research and implementation roadmap

Research context: September 2026. These are design lessons, not a claim of feature parity with other tools.

| Reference | Useful lesson | Five08 implementation |
| --- | --- | --- |
| [Schaeffer Front Panel Designer](https://www.schaeffer-ag.de/en/front-panel-designer/?lang=en) and [manual](https://docs.schaeffer-ag.de/en/frontpanel_designer.html) | Reusable mechanical groups and a clear distinction between artwork and machining | Saved assemblies; physical-size locks; separate hardware/artwork; shared cutout geometry |
| [ratpi-studio Eurorack Panel Designer](https://github.com/ratpi-studio/Eurorack-Panel-Designer) | A browser workflow can bridge panel layout, inspection and PCB-based panels | On-demand 3D inspection and a bounded, explicitly mechanical KiCad export |
| [Synth Panels Designer](https://www.synthpanels.design/) | Parametric scales are a useful musical-instrument design primitive | Adjustable scale sweep, start angle, major ticks and line weight |
| [EuroPanelMaker](https://github.com/benjiaomodular/EuroPanelMaker) | Keep real millimetres in the design and fabrication path | SVG outline centreline correction; all hardware dimensions restored on import |
| [ModularGrid](https://modulargrid.net/) | Context and comparison matter alongside the individual module | Retain rack context; make isolated 3D inspection complementary to it |
| [VCV panel guide](https://vcvrack.com/manual/Panel) | Consistent panel legends and clear input/output treatment | Shared typography, inverted output labels and cleaned role-marker export |
| [Doepfer mechanical reference](https://doepfer.de/a100_man/a100m_e.htm) | Physical conventions outrank visual convenience | No shrinking standard components to make a narrow panel look tidy |

## Implemented in this pass

- All physical components stay at catalog size, including on legacy/project import.
- Saved, portable assemblies; independent duplicate/repeat groups.
- Panel-wide legend styles and configurable scale markings.
- Categorized preflight and portable rule settings.
- KiCad mechanical export built from the same geometry as SVG/DXF.
- 3D panel inspection, with explicit limits on estimated hardware geometry.
- Artwork exports separated from hardware previews; hidden components excluded from BOM and VCV markers.
- Regression coverage for geometry, parsing, grouping, saved workflows, export content, desktop/mobile 3D pixels and interactions.

## Next priorities

1. **Versioned, source-backed part definitions.** Snapshot the chosen catalog revision in projects, allow explicit upgrade/migration and add verified custom-part definitions rather than encouraging arbitrary hardware scaling.
2. **More exact collision geometry.** Replace conservative rectangular bounds with oriented shape/body checks; add PCB/wiring envelopes and manufacturer tolerance profiles.
3. **Production artwork.** Font outlining, print/engrave process profiles, line-width checks and actual glyph-to-cutout clearance, with visual manufacturing-layer previews.
4. **Parametric assemblies.** Named anchors, linked spacing and repeat counts, without changing physical component dimensions.
5. **Fabrication handoff.** Richer PCB silk export and manufacturer profiles, then STEP/STL only when the modeled geometry and tolerance contract justify them.

## Format references

- [KiCad board format](https://dev-docs.kicad.org/en/file-formats/sexpr-pcb/): a distinct `five08` generator, millimetre geometry, panel thickness and `Edge.Cuts` primitives.
- [KiCad common syntax](https://dev-docs.kicad.org/en/file-formats/sexpr-intro/): lines, circles and start/mid/end arcs.
- [Three.js documentation](https://threejs.org/docs/): extrusion with holes, orbit controls and GPU resource lifecycle.

The mechanical export is intentionally narrower than a fabrication-ready PCB. The 3D view is intentionally not advertised as a manufacturer-accurate component assembly.
