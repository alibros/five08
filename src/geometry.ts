import {PANEL_H,panelWidth,type ComponentDefinition,type Item,type PanelProfile} from './model';

/**
 * One description of every hole Five08 will ever cut.
 *
 * The SVG cutout sheet, the DXF export and the preflight checks all read these
 * shapes, so a change to a cutout rule reaches every output at once.
 */
export type Shape=
 |{kind:'circle';cx:number;cy:number;r:number}
 |{kind:'rect';cx:number;cy:number;w:number;h:number;rotation:number}
 |{kind:'obround';cx:number;cy:number;w:number;h:number;rotation:number};

/** Mounting-slot centres sit 3 mm in from the top and bottom edges. */
export const MOUNT_INSET_Y=3;
/** Four-slot panels place their slots 7.5 mm in from each side edge. */
export const MOUNT_INSET_X=7.5;
const SLOT_W=6.5, SLOT_H=3.2;

export type Obround=Extract<Shape,{kind:'obround'}>;

export function mountingShapes(panel:PanelProfile):Obround[]{
  const w=panelWidth(panel),top=MOUNT_INSET_Y,bottom=PANEL_H-MOUNT_INSET_Y;
  const left=Math.min(MOUNT_INSET_X,w/2),right=Math.max(w-MOUNT_INSET_X,w/2);
  const centres:Array<[number,number]>=
    panel.mounting==='four'?[[left,top],[right,top],[left,bottom],[right,bottom]]:
    panel.mounting==='diagonal'?[[left,top],[right,bottom]]:
    panel.mounting==='two'?[[w/2,top],[w/2,bottom]]:[];
  return centres.map(([cx,cy])=>({kind:'obround',cx,cy,w:SLOT_W,h:SLOT_H,rotation:0}));
}

/** The hole a component needs, or null when it only sits on the surface. */
export function cutoutShape(i:Item,d:ComponentDefinition):Shape|null{
  if(!d.cutout)return null;
  if(d.renderer==='hole'&&d.orientation==='horizontal')return{kind:'obround',cx:i.x,cy:i.y,w:i.width,h:i.height,rotation:i.rotation};
  if(d.cutoutShape==='rect'||d.cutoutShape==='obround'){
    const inset=d.cutoutInset??.8;
    const w=d.cutoutWidth??i.width*inset,h=d.cutoutHeight??i.height*inset;
    return{kind:d.cutoutShape==='obround'?'obround':'rect',cx:i.x,cy:i.y,w,h,rotation:i.rotation};
  }
  return{kind:'circle',cx:i.x,cy:i.y,r:d.cutout/2};
}

export const cutoutShapes=(items:Item[],definitions:Map<string,ComponentDefinition>)=>
  items.filter(i=>!i.hidden).flatMap(i=>{const d=definitions.get(i.componentId);if(!d)return[];const s=cutoutShape(i,d);return s?[s]:[];});

/** Axis-aligned extent of a shape, used for overlap and edge checks. */
export function shapeBounds(s:Shape){
  if(s.kind==='circle')return{l:s.cx-s.r,r:s.cx+s.r,t:s.cy-s.r,b:s.cy+s.r};
  const rad=s.rotation*Math.PI/180,cos=Math.abs(Math.cos(rad)),sin=Math.abs(Math.sin(rad));
  const w=(s.w*cos+s.h*sin)/2,h=(s.w*sin+s.h*cos)/2;
  return{l:s.cx-w,r:s.cx+w,t:s.cy-h,b:s.cy+h};
}

export const rotatePoint=(x:number,y:number,cx:number,cy:number,deg:number)=>{
  if(!deg)return{x,y};
  const rad=deg*Math.PI/180,cos=Math.cos(rad),sin=Math.sin(rad),dx=x-cx,dy=y-cy;
  return{x:cx+dx*cos-dy*sin,y:cy+dx*sin+dy*cos};
};
