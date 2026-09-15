import {PANEL_H,type Item} from './model';

/** Where a batch operation wants an item to end up. Applying it is the caller's job. */
export type Placement={id:string;x:number;y:number;rotation?:number;width?:number;height?:number};

const size=(i:Item,axis:'x'|'y')=>axis==='x'?i.width:i.height;
const readingOrder=(items:Item[],rowTolerance=4)=>[...items].sort((a,b)=>Math.abs(a.y-b.y)>rowTolerance?a.y-b.y:a.x-b.x);

export const extent=(items:Item[])=>({
  l:Math.min(...items.map(i=>i.x-i.width/2)), r:Math.max(...items.map(i=>i.x+i.width/2)),
  t:Math.min(...items.map(i=>i.y-i.height/2)), b:Math.max(...items.map(i=>i.y+i.height/2)),
});

/**
 * Lays a selection out as a grid, reading order preserved. Columns take the
 * width of their widest member and rows the height of their tallest, so a row
 * of jacks under a row of knobs still lines up.
 */
export function gridPlacements(items:Item[],columns:number,gapX:number,gapY:number):Placement[]{
  if(items.length<2||columns<1)return[];
  const ordered=readingOrder(items),box=extent(items),rows=Math.ceil(ordered.length/columns);
  const colWidth=Array.from({length:columns},(_,c)=>Math.max(...ordered.filter((_,n)=>n%columns===c).map(i=>i.width),0));
  const rowHeight=Array.from({length:rows},(_,r)=>Math.max(...ordered.slice(r*columns,(r+1)*columns).map(i=>i.height),0));
  const colStart=colWidth.map((_,c)=>colWidth.slice(0,c).reduce((s,v)=>s+v+gapX,0));
  const rowStart=rowHeight.map((_,r)=>rowHeight.slice(0,r).reduce((s,v)=>s+v+gapY,0));
  return ordered.map((i,n)=>{
    const c=n%columns,r=Math.floor(n/columns);
    return{id:i.id,x:box.l+colStart[c]+colWidth[c]/2,y:box.t+rowStart[r]+rowHeight[r]/2};
  });
}

/** Mirrors positions across a vertical line, for symmetric left/right layouts. */
export const mirrorPlacements=(items:Item[],axisX:number):Placement[]=>
  items.map(i=>({id:i.id,x:axisX*2-i.x,y:i.y,rotation:-i.rotation}));

export const flipVertical=(items:Item[],axisY=PANEL_H/2):Placement[]=>
  items.map(i=>({id:i.id,x:i.x,y:axisY*2-i.y,rotation:-i.rotation}));

/** Rotates each item about its own centre — the usual intent for a single part. */
export const rotatePlacements=(items:Item[],delta:number):Placement[]=>
  items.map(i=>({id:i.id,x:i.x,y:i.y,rotation:((i.rotation+delta)%360+360)%360}));

/** Rotates a selection about its shared centre, keeping the arrangement intact. */
export function rotateGroup(items:Item[],delta:number):Placement[]{
  const box=extent(items),cx=(box.l+box.r)/2,cy=(box.t+box.b)/2,rad=delta*Math.PI/180;
  const cos=Math.cos(rad),sin=Math.sin(rad);
  return items.map(i=>{
    const dx=i.x-cx,dy=i.y-cy;
    return{id:i.id,x:cx+dx*cos-dy*sin,y:cy+dx*sin+dy*cos,rotation:((i.rotation+delta)%360+360)%360};
  });
}

/** Spreads items between two coordinates with equal edge-to-edge gaps. */
export function spreadBetween(items:Item[],axis:'x'|'y',from:number,to:number):Placement[]{
  if(items.length<2)return[];
  const ordered=[...items].sort((a,b)=>a[axis]-b[axis]);
  const total=ordered.reduce((s,i)=>s+size(i,axis),0);
  const gap=(to-from-total)/(ordered.length-1);
  let edge=from;
  return ordered.map(i=>{
    const centre=edge+size(i,axis)/2;
    edge=centre+size(i,axis)/2+gap;
    return{id:i.id,x:axis==='x'?centre:i.x,y:axis==='y'?centre:i.y};
  });
}

/** Matches every item's size to the largest in the selection. */
export function matchSize(items:Item[]):Placement[]{
  const width=Math.max(...items.map(i=>i.width)),height=Math.max(...items.map(i=>i.height));
  return items.map(i=>({id:i.id,x:i.x,y:i.y,width,height}));
}

export function applyPlacements(items:Item[],placements:Placement[]){
  const byId=new Map(placements.map(p=>[p.id,p]));
  items.forEach(i=>{
    const p=byId.get(i.id);if(!p)return;
    i.x=Math.round(p.x*100)/100;i.y=Math.round(p.y*100)/100;
    if(p.rotation!==undefined)i.rotation=Math.round(p.rotation*10)/10;
    if(p.width!==undefined)i.width=p.width;
    if(p.height!==undefined)i.height=p.height;
  });
}

/**
 * Arrays a selection: the original stays put and `count - 1` copies follow at a
 * fixed offset. A four-channel mixer is one channel strip repeated three times.
 */
export function repeatItems(items:Item[],count:number,dx:number,dy:number,nextId:()=>string):Item[]{
  if(items.length===0||count<2)return[];
  const copies:Item[]=[];
  for(let n=1;n<count;n++)
    for(const item of items)
      copies.push({...structuredClone(item),id:nextId(),x:round(item.x+dx*n),y:round(item.y+dy*n)});
  return copies;
}
const round=(v:number)=>Math.round(v*100)/100;

/** Every id that has to move when one member of a group is dragged. */
export function expandGroups(ids:Iterable<string>,items:Item[]):Set<string>{
  const wanted=new Set(ids);
  const groups=new Set(items.filter(i=>wanted.has(i.id)&&i.groupId).map(i=>i.groupId!));
  if(groups.size)for(const i of items)if(i.groupId&&groups.has(i.groupId))wanted.add(i.id);
  return wanted;
}
