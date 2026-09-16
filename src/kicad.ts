import {cutoutShapes,mountingShapes,rotatePoint,type Shape} from './geometry';
import {PANEL_H,panelWidth,type ComponentDefinition,type Project} from './model';

const n=(value:number)=>Number(value.toFixed(6)).toString();
const stroke='(stroke (width 0.05) (type default)) (layer "Edge.Cuts")';

/** KiCad 7+ mechanical board. Routed openings remain true arcs, not faceted polygons. */
export function shapeToKiCad(s:Shape):string{
  if(s.kind==='circle')return`(gr_circle (center ${n(s.cx)} ${n(s.cy)}) (end ${n(s.cx+s.r)} ${n(s.cy)}) ${stroke} (fill none))`;
  const vertical=s.kind==='obround'&&s.h>s.w;
  const angle=s.rotation+(vertical?90:0);
  const point=(x:number,y:number)=>{const p=rotatePoint(x,y,0,0,angle);return`${n(p.x+s.cx)} ${n(p.y+s.cy)}`;};
  const line=(x1:number,y1:number,x2:number,y2:number)=>`(gr_line (start ${point(x1,y1)}) (end ${point(x2,y2)}) ${stroke})`;
  if(s.kind==='rect'){
    const x=s.w/2,y=s.h/2;
    return[line(-x,-y,x,-y),line(x,-y,x,y),line(x,y,-x,y),line(-x,y,-x,-y)].join('\n');
  }
  const r=Math.min(s.w,s.h)/2,a=Math.max(s.w,s.h)/2-r;
  if(a<1e-9)return shapeToKiCad({kind:'circle',cx:s.cx,cy:s.cy,r});
  return[
    line(-a,-r,a,-r),
    `(gr_arc (start ${point(a,-r)}) (mid ${point(a+r,0)}) (end ${point(a,r)}) ${stroke})`,
    line(a,r,-a,r),
    `(gr_arc (start ${point(-a,r)}) (mid ${point(-a-r,0)}) (end ${point(-a,-r)}) ${stroke})`,
  ].join('\n');
}

export function panelKiCad(p:Project,definitions:Map<string,ComponentDefinition>):string{
  const w=panelWidth(p.panel);
  const outline:Shape={kind:'rect',cx:w/2,cy:PANEL_H/2,w,h:PANEL_H,rotation:0};
  return`(kicad_pcb (version 20221018) (generator five08)
  (general (thickness ${n(p.panel.thickness)}))
  (paper "A4")
  (layers
    (0 "F.Cu" signal) (31 "B.Cu" signal)
    (36 "B.SilkS" user "b.silkscreen") (37 "F.SilkS" user "f.silkscreen")
    (38 "B.Mask" user) (39 "F.Mask" user)
    (40 "Dwgs.User" user "user.drawings") (44 "Edge.Cuts" user)
  )
  (setup (pad_to_mask_clearance 0))
  (net 0 "")
  ${[outline,...mountingShapes(p.panel),...cutoutShapes(p.items,definitions)].map(shapeToKiCad).join('\n  ')}
)\n`;
}
