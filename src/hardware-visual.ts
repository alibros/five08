import {clamp,type ComponentDefinition} from './model';

/** Appearance only. These layouts never define machining dimensions. XY follows the front SVG. */
export const previewValue=(value:number)=>Number.isFinite(value)?clamp(value,0,1):.5;
export const knobAngle=(value:number)=>135+previewValue(value)*270;
export const polar=(radius:number,degrees:number)=>({x:Math.cos(degrees*Math.PI/180)*radius,y:Math.sin(degrees*Math.PI/180)*radius});
export const fluteInset=(radians:number,count:number)=>1-.035*(.5+.5*Math.cos(radians*count));
export const togglePosition=(id:string,value:number)=>id==='toggle-3'?Math.round(previewValue(value)*2)-1:previewValue(value)<.5?-1:1;
export const faderTravel=(d:ComponentDefinition)=>(d.orientation==='horizontal'?d.width:d.height)-8;
export const faderPosition=(d:ComponentDefinition,value:number)=>{
  const offset=(previewValue(value)-.5)*faderTravel(d);
  return d.orientation==='horizontal'?{x:offset,y:0}:{x:0,y:-offset};
};

// Five female contacts on a 180-degree arc, not five pins in a row (CLIFF D5 / SDS-50J).
export const dinContacts=()=>Array.from({length:5},(_,n)=>polar(4.5,180-n*45));

export function ringSegments(count:number,radius:number,value:number,sweep=360){
  return Array.from({length:count},(_,n)=>{
    const angle=sweep===360?-90+n*360/count:135+n*sweep/(count-1);
    return{...polar(radius,angle),angle,active:n<Math.round(previewValue(value)*count)};
  });
}

export function sevenSegments(w:number,h:number,value:number){
  const digits=['abcdef','bc','abdeg','abcdg','bcfg','acdfg','acdefg','abc','abcdefg','abcdfg'];
  const number=String(Math.round(previewValue(value)*99)).padStart(2,'0');
  const dy=h*.33,dx=w*.14;
  const parts:Array<[string,number,number,number,number]>=[['a',0,-dy,dx*1.6,.38],['g',0,0,dx*1.6,.38],['d',0,dy,dx*1.6,.38],['f',-dx,-dy/2,.38,dy*.74],['b',dx,-dy/2,.38,dy*.74],['e',-dx,dy/2,.38,dy*.74],['c',dx,dy/2,.38,dy*.74]];
  return[0,1].flatMap(digit=>parts.map(([id,x,y,width,height])=>({
    id:`digit ${digit} segment ${id}`,x:x+(digit-.5)*w*.43,y,width,height,active:digits[Number(number[digit])].includes(id),
  })));
}

export const oledTrace=(w:number,h:number,value:number)=>Array.from({length:81},(_,n)=>({
  x:(n/80-.5)*w*.78,y:-Math.sin(n/80*Math.PI*2*(1.5+previewValue(value)*2))*h*.16+h*.1,
}));

export function vuDial(h:number,value:number){
  const cy=h*.34,r=h*.65;
  return{cy,needle:{...polar(r-1,-(142-previewValue(value)*104))},ticks:Array.from({length:17},(_,n)=>{
    const angle=-(38+n*6.5),length=n%4===0?1.7:.85;
    return{a:polar(r-length,angle),b:polar(r,angle),red:n<4};
  })};
}

export const VU_LETTERS:Array<Array<[number,number]>>=[[[-2.2,.6],[-1.4,2.8],[-.6,.6]],[[.3,.6],[.3,2.4],[.7,2.8],[1.5,2.8],[1.9,2.4],[1.9,.6]]];

export const hardwareColors={dark:'#15191c',steel:'#b5bdc2',gold:'#b89a54',well:'#030507'};
export function tint(color:string,amount:number){
  const target=amount>=0?255:0,t=Math.abs(amount);
  const channels=[1,3,5].map(start=>Math.round(Number.parseInt(color.slice(start,start+2),16)*(1-t)+target*t));
  return`#${channels.map(v=>v.toString(16).padStart(2,'0')).join('')}`;
}
