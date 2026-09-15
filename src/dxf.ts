import {cutoutShapes,mountingShapes,type Shape} from './geometry';
import {PANEL_H,panelWidth,type ComponentDefinition,type Project} from './model';

/**
 * DXF R12 (AC1009) writer.
 *
 * R12 is the dialect every laser cutter, CNC shop and panel service still
 * reads. Geometry comes from `geometry.ts`, so a DXF and a cutout SVG of the
 * same project describe the same holes.
 *
 * DXF is Y-up with its origin at the bottom-left of the panel; Five08 works
 * Y-down from the top-left, so every point is flipped on the way out and every
 * rotation changes sign with it.
 */

const LAYERS:Array<[string,number]>=[['PANEL_OUTLINE',7],['CUTOUTS',1],['MOUNTING',5],['ENGRAVING',3]];
const n=(v:number)=>(Math.round(v*10000)/10000).toString();
const pair=(code:number,value:string|number)=>`${code}\n${value}\n`;

type Pt={x:number;y:number};
const flip=(x:number,y:number):Pt=>({x,y:PANEL_H-y});
const along=(c:Pt,angle:number,distance:number):Pt=>({x:c.x+Math.cos(angle)*distance,y:c.y+Math.sin(angle)*distance});
const deg=(rad:number)=>((rad*180/Math.PI)%360+360)%360;

const line=(layer:string,a:Pt,b:Pt)=>pair(0,'LINE')+pair(8,layer)+pair(10,n(a.x))+pair(20,n(a.y))+pair(30,'0')+pair(11,n(b.x))+pair(21,n(b.y))+pair(31,'0');
const circle=(layer:string,c:Pt,r:number)=>pair(0,'CIRCLE')+pair(8,layer)+pair(10,n(c.x))+pair(20,n(c.y))+pair(30,'0')+pair(40,n(r));
const arc=(layer:string,c:Pt,r:number,startRad:number,endRad:number)=>
  pair(0,'ARC')+pair(8,layer)+pair(10,n(c.x))+pair(20,n(c.y))+pair(30,'0')+pair(40,n(r))+pair(50,n(deg(startRad)))+pair(51,n(deg(endRad)));
const text=(layer:string,c:Pt,height:number,value:string,rotation:number)=>
  pair(0,'TEXT')+pair(8,layer)+pair(10,n(c.x))+pair(20,n(c.y))+pair(30,'0')+pair(40,n(height))+pair(1,value.replace(/[\r\n]+/g,' '))+
  pair(50,n(deg(rotation)))+pair(72,'1')+pair(73,'2')+pair(11,n(c.x))+pair(21,n(c.y))+pair(31,'0');

function rectEntity(layer:string,c:Pt,w:number,h:number,rotation:number){
  const corners:Pt[]=[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]].map(([dx,dy])=>{
    const cos=Math.cos(rotation),sin=Math.sin(rotation);
    return{x:c.x+dx*cos-dy*sin,y:c.y+dx*sin+dy*cos};
  });
  return corners.map((p,i)=>line(layer,p,corners[(i+1)%4])).join('');
}

function obroundEntity(layer:string,c:Pt,w:number,h:number,rotation:number){
  if(Math.abs(w-h)<1e-6)return circle(layer,c,w/2);
  // Work along the long axis so a tall slot is just a rotated wide slot.
  const vertical=h>w,long=vertical?h:w,short=vertical?w:h;
  const axis=rotation+(vertical?Math.PI/2:0),r=short/2,reach=(long-short)/2;
  const a=along(c,axis,-reach),b=along(c,axis,reach),perp=axis+Math.PI/2;
  return line(layer,along(a,perp,r),along(b,perp,r))
    +line(layer,along(b,perp,-r),along(a,perp,-r))
    +arc(layer,b,r,perp+Math.PI,perp)
    +arc(layer,a,r,perp,perp+Math.PI);
}

function shapeEntity(layer:string,s:Shape){
  if(s.kind==='circle')return circle(layer,flip(s.cx,s.cy),s.r);
  const c=flip(s.cx,s.cy),rotation=-s.rotation*Math.PI/180;
  return s.kind==='rect'?rectEntity(layer,c,s.w,s.h,rotation):obroundEntity(layer,c,s.w,s.h,rotation);
}

export type DxfOptions={engraveLabels?:boolean};

export function panelDxf(p:Project,definitions:Map<string,ComponentDefinition>,options:DxfOptions={}):string{
  const w=panelWidth(p.panel);
  const header=pair(0,'SECTION')+pair(2,'HEADER')+pair(9,'$ACADVER')+pair(1,'AC1009')+pair(9,'$INSUNITS')+pair(70,4)
    +pair(9,'$EXTMIN')+pair(10,'0')+pair(20,'0')+pair(30,'0')+pair(9,'$EXTMAX')+pair(10,n(w))+pair(20,n(PANEL_H))+pair(30,'0')+pair(0,'ENDSEC');
  const tables=pair(0,'SECTION')+pair(2,'TABLES')+pair(0,'TABLE')+pair(2,'LAYER')+pair(70,LAYERS.length)
    +LAYERS.map(([name,colour])=>pair(0,'LAYER')+pair(2,name)+pair(70,0)+pair(62,colour)+pair(6,'CONTINUOUS')).join('')
    +pair(0,'ENDTAB')+pair(0,'ENDSEC');

  const outline=rectEntity('PANEL_OUTLINE',{x:w/2,y:PANEL_H/2},w,PANEL_H,0);
  const mounting=mountingShapes(p.panel).map(s=>shapeEntity('MOUNTING',s)).join('');
  const cutouts=cutoutShapes(p.items,definitions).map(s=>shapeEntity('CUTOUTS',s)).join('');
  const engraving=options.engraveLabels
    ?p.items.filter(i=>!i.hidden&&i.label.trim()).map(i=>{
        const d=definitions.get(i.componentId);if(!d)return'';
        const baseline=d.renderer==='text'?i.y:i.y+i.height/2+3.6;
        return text('ENGRAVING',flip(i.x,baseline),d.renderer==='text'?i.height:2,i.label.toUpperCase(),-i.rotation*Math.PI/180);
      }).join('')
    :'';

  return header+tables+pair(0,'SECTION')+pair(2,'ENTITIES')+outline+mounting+cutouts+engraving+pair(0,'ENDSEC')+pair(0,'EOF');
}
