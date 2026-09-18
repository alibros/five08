import type {ComponentDefinition,Item} from './model';
import {dinContacts,faderPosition,faderTravel,fluteInset,hardwareColors,knobAngle,oledTrace,polar,previewValue,ringSegments,sevenSegments,tint,togglePosition,vuDial,VU_LETTERS} from './hardware-visual';

const {dark,steel,gold,well}=hardwareColors;
const num=(n:number)=>Number(n.toFixed(4));
const circle=(r:number,fill:string,x=0,y=0,extra='')=>`<circle cx="${num(x)}" cy="${num(y)}" r="${num(r)}" fill="${fill}" ${extra}/>`;
const rect=(w:number,h:number,fill:string,x=0,y=0,rx=.3,extra='')=>`<rect x="${num(x-w/2)}" y="${num(y-h/2)}" width="${num(w)}" height="${num(h)}" rx="${num(rx)}" fill="${fill}" ${extra}/>`;
const line=(x1:number,y1:number,x2:number,y2:number,color:string,width=.18,extra='')=>`<line x1="${num(x1)}" y1="${num(y1)}" x2="${num(x2)}" y2="${num(y2)}" stroke="${color}" stroke-width="${num(width)}" stroke-linecap="round" ${extra}/>`;
const detail=(name:string,body:string)=>`<g data-detail="${name}">${body}</g>`;
const rim=(r:number,color=steel,x=0,y=0)=>circle(r,tint(color,-.5),x,y)+circle(r-.18,color,x,y)+circle(r*.9,'none',x,y,'stroke="#ffffff" stroke-opacity=".48" stroke-width=".14"');
const hex=(r:number,color=steel)=>`<polygon points="${Array.from({length:6},(_,n)=>{const p=polar(r,n*60);return`${num(p.x)},${num(p.y)}`;}).join(' ')}" fill="${color}" stroke="${tint(color,-.4)}" stroke-width=".16" stroke-linejoin="round"/>`;
const pointer=(r:number,value:number,color:string)=>{const a=knobAngle(value),start=polar(r*.22,a),end=polar(r*.84,a);return detail('pointer',line(start.x,start.y,end.x,end.y,color,Math.max(.45,r*.08)));};

const arc=(r:number,start:number,end:number,color:string,width:number)=>{
  const a=polar(r,start),b=polar(r,end);
  return`<path d="M${num(a.x)} ${num(a.y)}A${num(r)} ${num(r)} 0 ${end-start>180?1:0} 1 ${num(b.x)} ${num(b.y)}" fill="none" stroke="${color}" stroke-width="${num(width)}" stroke-linecap="round"/>`;
};

// Small shaded surfaces stay self-contained when copied into thumbnails or exported SVGs.
function bevel(r:number,inner:number,color:string,contrast=.35){
  return Array.from({length:48},(_,n)=>{
    const a=n*7.5,b=a+7.55,points=[polar(r,a),polar(r,b),polar(inner,b),polar(inner,a)];
    const light=Math.cos((a+138)*Math.PI/180);
    const shade=tint(color,light*contrast);
    return`<path d="M${points.map(p=>`${num(p.x)} ${num(p.y)}`).join('L')}Z" fill="${shade}" stroke="${shade}" stroke-width="${num(Math.min(.06,(r-inner)/3))}" stroke-linejoin="round"/>`;
  }).join('');
}

function capFace(r:number,color:string,metal=false){
  let face=circle(r,tint(color,-.13));
  for(let n=0;n<12;n++){
    const t=(n+1)/12;
    face+=circle(r*(1-t*.32),tint(color,-.13+t*(metal?.29:.21)),-r*t*.16,-r*t*.19);
  }
  if(metal)for(const size of [.48,.66,.82])face+=circle(r*size,'none',0,0,'stroke="#ffffff" stroke-opacity=".14" stroke-width=".055"');
  return face;
}

function raisedRect(w:number,h:number,color:string,r=.5){
  const lip=Math.min(.35,w*.08,h*.08);
  return rect(w,h,tint(color,-.65),0,0,r)
    +rect(w-.24,h-.24,tint(color,.15),0,-.02,Math.max(.05,r-.06))
    +rect(w-lip*2,h-lip*2,color,0,lip*.3,Math.max(.05,r-lip))
    +line(-w/2+r,-h/2+lip,w/2-r,-h/2+lip,tint(color,.48),.12)
    +line(-w/2+r,h/2-lip,w/2-r,h/2-lip,tint(color,-.42),.16);
}

function flutedRim(r:number,count:number,color:string){
  const outline=(radius:number)=>Array.from({length:128},(_,n)=>{
    const angle=n*Math.PI/64,inset=radius*fluteInset(angle,count);
    return`${n?'L':'M'}${num(Math.cos(angle)*inset)} ${num(Math.sin(angle)*inset)}`;
  }).join('')+'Z';
  return`<path d="${outline(r)}" fill="${tint(color,-.5)}"/><path d="${outline(r-.18)}" fill="${color}"/>`;
}

function knob(d:ComponentDefinition,i:Item,accent:string){
  const r=d.width/2,encoder=d.id.startsWith('encoder'),metal=d.id==='encoder-metal';
  const skirt=d.id==='knob-skirted',concentric=d.id==='knob-concentric',halo=d.id==='encoder-ring';
  const capR=halo?r*.73:skirt?r*.72:r;
  let body='';
  if(halo){
    body+=detail('halo carrier',circle(r,dark));
    body+=ringSegments(24,r*.87,i.value,270).map(s=>detail('halo segment',rect(.8,1.1,s.active?accent:'#30383b',s.x,s.y,.1,`transform="rotate(${s.angle-90} ${num(s.x)} ${num(s.y)})" data-active="${s.active}"`))).join('');
  }
  if(skirt||concentric)body+=detail('skirt',rim(r,i.color));
  if(skirt)for(let n=0;n<11;n++){
    const a=polar(r*.75,135+n*27),b=polar(r*.89,135+n*27);
    body+=detail('skirt graduation',line(a.x,a.y,b.x,b.y,tint(i.color,-.68),.18));
  }
  const grooves=d.id==='knob-fluted'?16:metal?64:encoder?36:concentric?24:0;
  body+=detail(concentric?'lower concentric cap':'cap',grooves?flutedRim(capR,grooves,i.color):rim(capR,i.color));
  for(let n=0;n<grooves;n++){
    const a=polar(capR*.88,n*360/grooves),b=polar(capR*.975,n*360/grooves);
    body+=line(a.x,a.y,b.x,b.y,tint(i.color,-.52),grooves>36?.09:.2);
  }
  body+=detail('cap bevel',bevel(capR*.87,capR*.76,i.color,metal?.55:.29));
  body+=detail('top insert',capFace(capR*.765,i.color,metal)
    +arc(capR*.8,180,285,tint(i.color,.4),.12)+arc(capR*.8,8,105,tint(i.color,-.65),.15));
  if(concentric){
    body+=pointer(r,.28,accent)+detail('upper concentric cap',rim(r*.58,tint(i.color,.18))
      +bevel(r*.56,r*.48,tint(i.color,.18))+capFace(r*.48,tint(i.color,.12)))+pointer(r*.55,i.value,accent);
  }else if(encoder){
    const point=polar(capR*.57,knobAngle(i.value));
    body+=detail('push inset',circle(capR*.455,'none',0,0,`stroke="${tint(i.color,.27)}" stroke-width="${num(capR*.03)}"`));
    body+=detail('position dot',circle(.45,accent,point.x,point.y));
  }else{
    if(d.id==='rotary-switch')body+=detail('selector grip',rect(r*.42,r*1.48,tint(i.color,.12),0,0,.45,`transform="rotate(${knobAngle(i.value)+90})" stroke="${tint(i.color,-.3)}" stroke-width=".18"`));
    body+=pointer(d.id==='rotary-switch'?capR*.82:capR,i.value,accent);
  }
  return body;
}

function jack(d:ComponentDefinition,i:Item){
  const r=d.width/2,banana=d.id==='banana',bore=banana?2:1.75;
  const metal=banana?i.color:steel,nutR=r*.87;
  const arc=(radius:number,start:number,end:number,color:string,width:number)=>{
    const a=polar(radius,start),b=polar(radius,end);
    return`<path d="M${num(a.x)} ${num(a.y)}A${num(radius)} ${num(radius)} 0 0 1 ${num(b.x)} ${num(b.y)}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
  };
  // The bevel is shaded face by face, without shared SVG ids or inflated bounds.
  const facets=Array.from({length:6},(_,n)=>{
    const points=[polar(nutR,n*60),polar(nutR,(n+1)*60),polar(nutR-.42,(n+1)*60),polar(nutR-.42,n*60)];
    const normal=polar(1,n*60+30),light=-(normal.x*.45+normal.y*.8);
    return`<polygon points="${points.map(p=>`${num(p.x)},${num(p.y)}`).join(' ')}" fill="${tint(metal,light*.56)}"/>`;
  }).join('');
  return detail('washer',circle(r,tint(metal,-.72))+circle(r-.14,tint(metal,-.24))+circle(r-.35,metal)
      +arc(r-.22,195,285,tint(metal,.72),.18)+arc(r-.22,15,105,tint(metal,-.55),.18))
    +detail('hex retaining nut',hex(nutR,metal)+facets)
    +detail('socket collar',rim(banana?r*.62:2.7,banana?steel:i.color))
    +detail('socket lip',circle(bore+.42,tint(steel,-.58))+circle(bore+.27,steel)
      +arc(bore+.16,185,285,'#f4f8f9',.17)+arc(bore+.18,15,110,'#687278',.2))
    +detail('socket well',circle(bore,'#080c0e')+circle(bore-.2,'#11191d')+circle(bore-.52,'#040708')
      +arc(bore-.22,20,120,'#626e74',.2)+arc(bore-.52,55,112,'#a3a8a5',.13));
}

function slider(d:ComponentDefinition,i:Item){
  const vertical=d.orientation!=='horizontal',travel=faderTravel(d),p=faderPosition(d,i.value);
  const track=rect(3.2,travel+6,'#626b6c',0,0,1.4)+rect(2.8,travel+5.6,well,0,0,1.2)
    +rect(.55,travel+3,'#525d61',0,0,.1)+rect(.12,travel+2.8,'#a0a8a8',-.16,0,.04);
  const cap=raisedRect(10,5.5,i.color,.6)+rect(8.8,.45,dark,0,0,.08)
    +[-1.65,-1.1,1.1,1.65].map(y=>line(-3.9,y,3.9,y,tint(i.color,-.3),.17)+line(-3.9,y-.14,3.9,y-.14,tint(i.color,.22),.1)).join('');
  return detail('recessed track',`<g transform="rotate(${vertical?0:90})">${track}</g>`)
    +detail('fader cap',`<g transform="translate(${num(p.x)} ${num(p.y)}) rotate(${vertical?0:90})">${cap}</g>`);
}

function button(d:ComponentDefinition,i:Item){
  const w=d.width,h=d.height,r=w/2,rectangular=d.cutoutShape==='rect'||d.id==='button-tact';
  const lit=d.id.includes('lit'),metal=d.id==='button-metal',face=lit?tint(i.color,-.65+i.value*.65):i.color;
  if(rectangular)return detail('button bezel',raisedRect(w,h,dark,.5))
    +detail('button cap',raisedRect(w-1.6,h-1.6,face,.65))
    +(lit?detail('diffuser',rect(w-3,h-3,tint(face,.13),0,0,.35)+rect(w-3.6,.35,tint(face,.4),0,-(h-4)/2,.12)): '');
  return detail('round bezel',rim(r,metal?steel:dark))
    +detail('button cap',bevel(r*.78,r*.66,face,metal?.52:.32)+capFace(r*.66,face,metal))
    +(metal?detail('etched ring',circle(r*.7,'none',0,0,`stroke="${tint(face,-.3)}" stroke-width="${num(r*.06)}"`)): '')
    +(d.id==='button-arcade'?detail('convex cap',arc(r*.55,195,280,tint(face,.6),r*.035)): '');
}

function toggle(d:ComponentDefinition,i:Item){
  const position=togglePosition(d.id,i.value);
  if(d.id==='slide-switch')return detail('slide bezel',raisedRect(d.width,d.height,steel,.6))
    +detail('slide channel',rect(9,4,well,0,0,.5))
    +detail('slide actuator',`<g transform="translate(${position*2.25} 0)">${raisedRect(3.8,3.1,i.color,.2)}</g>`+[-1,0,1].map(n=>rect(.25,2.6,tint(i.color,-.5),position*2.25+n*.85,0,.03)).join(''));
  const y=-position*Math.sin(.38)*9.5;
  return detail('toggle washer',rim(d.width/2))+detail('toggle nut',hex(d.width*.43))
    +detail('toggle bushing',rim(3.05))+circle(1.75,dark)
    +detail('polished lever',line(0,0,0,y,tint(i.color,-.4),2.1)+line(-.24,0,-.24,y,tint(i.color,.7),1.1)+rim(1.05,i.color,0,y));
}

function led(d:ComponentDefinition,i:Item){
  if(d.id==='led-ring')return ringSegments(12,d.width*.39,i.value).map(s=>detail('LED lens',circle(1.1,dark,s.x,s.y)+circle(.9,s.active?i.color:'#3b4341',s.x,s.y,`data-active="${s.active}"`)+circle(.24,s.active?'#effff1':'#808783',s.x-.22,s.y-.25))).join('');
  const r=d.width/2,color=tint(i.color,-.75+i.value*.75);
  return detail('LED flange',circle(r,tint(i.color,-.7))+bevel(r*.96,r*.85,tint(i.color,-.35)))
    +detail('LED lens',circle(r*.87,color,0,0,'class="led-body"')+capFace(r*.83,color)
      +arc(r*.67,175,270,tint(color,.68),r*.08)+circle(r*.14,'#ffffff',-r*.28,-r*.32,'opacity=".82"'));
}

function display(d:ComponentDefinition,i:Item){
  const w=d.width,h=d.height;
  let body=detail('display bezel',raisedRect(w,h,dark,.6))+detail('display glass',rect(w-1.2,h-1.2,'#070e13',0,0,.35));
  if(d.id==='bargraph')for(let n=0;n<10;n++){
    const active=n<Math.round(i.value*10),color=n>=8?'#ff6649':n>=6?'#eec74b':i.color;
    body+=detail('meter segment',rect(w*.65,h*.067,active?color:'#25322e',0,(4.5-n)*h*.088,.15,`data-active="${active}"`));
  }else if(d.id==='seven-seg')body+=sevenSegments(w-2,h-1,i.value).map(s=>detail(s.id,rect(s.width,s.height,s.active?i.color:tint(i.color,-.9),s.x,s.y,.06,`data-active="${s.active}"`))).join('');
  else if(d.id==='vu-meter'){
    const dial=vuDial(h,i.value);
    body+=detail('meter dial',rect(w-3,h-3,i.color,0,0,.4));
    body+=dial.ticks.map(t=>detail('meter graduation',line(t.a.x,t.a.y+dial.cy,t.b.x,t.b.y+dial.cy,t.red?'#b33b2e':'#27322f',.14))).join('');
    body+=detail('meter needle',line(0,dial.cy,dial.needle.x,dial.needle.y+dial.cy,'#b73c2d',.26))+detail('meter pivot',circle(1.3,dark,0,dial.cy));
    body+=detail('VU lettering',VU_LETTERS.map(points=>`<polyline points="${points.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#27322f" stroke-width=".18" stroke-linejoin="round"/>`).join(''));
  }else{
    body+=Array.from({length:5},(_,n)=>rect(w*.1,.38,tint(i.color,-.65),-w*.31+n*w*.105,-h*.3,.02)).join('');
    body+=rect(w*.78,.12,tint(i.color,-.65),0,-h*.18,.02);
    body+=detail('OLED trace',`<polyline points="${oledTrace(w,h,i.value).map(p=>`${num(p.x)},${num(p.y)}`).join(' ')}" fill="none" stroke="${i.color}" stroke-width=".2" stroke-linejoin="round"/>`);
  }
  return body+detail('glass edge',line(-w/2+1,-h/2+.82,w/2-1,-h/2+.82,'#63787f',.13)
    +line(-w/2+.82,-h/2+1,-w/2+.82,h/2-1,'#34454b',.12));
}

function connector(d:ComponentDefinition,i:Item){
  if(d.id==='midi-din')return detail('DIN flange',rim(d.width/2))
    +detail('DIN socket shell',rim(7.7)+bevel(7.5,6.7,steel,.65))
    +detail('DIN insulator',circle(6.7,tint(i.color,-.7))+circle(6.45,i.color)
      +arc(6.5,8,135,tint(i.color,.3),.16)+arc(6.5,190,310,tint(i.color,-.7),.22))
    +dinContacts().map(p=>detail('DIN contact',`<g transform="translate(${num(p.x)} ${num(p.y)})">${bevel(.88,.61,tint(i.color,.22))}</g>`
      +circle(.61,'#55564a',p.x,p.y)+circle(.51,well,p.x,p.y))).join('')
    +detail('DIN key',rect(1.4,1.8,well,0,-5.8,.1));
  const usb=d.id==='usb-c',w=d.width,h=d.height;
  const shell=usb?i.color:steel;
  let body=detail('connector shell',raisedRect(w,h,shell,usb?h/2:.3))
    +detail('connector opening',rect(w-1.2,h-1,usb?well:i.color,0,0,usb?(h-1)/2:.2));
  if(usb){
    body+=detail('USB-C tongue',rect(6.6,.65,'#454c51',0,0,.15));
    for(const y of [-.22,.22])for(let n=0;n<12;n++)body+=detail('USB-C contact',rect(.18,.14,gold,(n-5.5)*.45,y,.02));
  }else{
    body+=detail('card guide',rect(w-3,.5,steel,0,.65,.05));
    for(let n=0;n<8;n++)body+=detail('SD contact',rect(.35,.65,gold,(n-3.5)*1.1,-.4,.02));
  }
  return body;
}

function touch(d:ComponentDefinition,i:Item){
  if(d.id==='joystick'){
    const r=d.width/2,offset=Math.sin((i.value-.5)*.5)*11;
    let body=detail('joystick flange',rim(r,dark));
    for(let n=0;n<4;n++)body+=detail('rubber gaiter',rim(r*(.65-n*.1),tint(dark,.08+n*.035)));
    return body+detail('joystick crown',circle(4.6,tint(i.color,-.4),offset,0)+circle(4.2,tint(i.color,.13),offset,-.12)+circle(2.3,tint(i.color,.2),offset-.7,-.8));
  }
  let body=detail('touch surround',rect(d.width,d.height,dark,0,0,.45))+detail('touch surface',rect(d.width-1.5,d.height-1.5,'#2d363a',0,0,.04));
  for(let n=0;n<15;n++)body+=rect(d.width*.48,.16,tint(i.color,-.65),0,(n-7)*d.height*.057,.01);
  return body+detail('touch position',rect(d.width*.66,.9,i.color,0,(.5-i.value)*(d.height-5),.1));
}

/** Self-contained front artwork: no external filters, fonts, textures or per-instance SVG ids. */
export function hardwareSvg(d:ComponentDefinition,item:Item,accent:string):string|null{
  const i={...item,value:previewValue(item.value)};
  switch(d.renderer){
    case 'knob':return knob(d,i,accent);
    case 'jack':return jack(d,i);
    case 'slider':return slider(d,i);
    case 'button':return button(d,i);
    case 'toggle':return toggle(d,i);
    case 'led':return led(d,i);
    case 'display':return display(d,i);
    case 'connector':return connector(d,i);
    case 'touch':return touch(d,i);
    default:return null;
  }
}
