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
  body+=detail('top insert',circle(capR*.8,tint(i.color,.08))+circle(capR*.79,'none',0,0,`stroke="${tint(i.color,.25)}" stroke-width=".12"`));
  if(concentric){
    body+=pointer(r,.28,accent)+detail('upper concentric cap',rim(r*.58,tint(i.color,.18)))+pointer(r*.55,i.value,accent);
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
  return detail('washer',rim(r,banana?i.color:steel))
    +detail('hex retaining nut',hex(r*.88,banana?i.color:steel))
    +detail('socket collar',rim(banana?r*.62:2.7,banana?steel:i.color))
    +detail('socket lip',circle(bore+.28,steel))
    +detail('socket well',circle(bore,well)+circle(bore-.22,'none',0,0,'stroke="#3c4448" stroke-width=".2"'));
}

function slider(d:ComponentDefinition,i:Item){
  const vertical=d.orientation!=='horizontal',travel=faderTravel(d),p=faderPosition(d,i.value);
  const track=rect(3.2,travel+6,well,0,0,1.4)+rect(.55,travel+3,'#646d70',0,0,.1);
  const cap=rect(10,5.5,tint(i.color,-.5),0,0,.6)+rect(9.5,5,tint(i.color,.05),0,0,.45)
    +rect(8.8,.45,dark,0,0,.08)+[-1.6,1.6].map(y=>rect(8.3,.23,tint(i.color,-.25),0,y,.04)).join('');
  return detail('recessed track',`<g transform="rotate(${vertical?0:90})">${track}</g>`)
    +detail('fader cap',`<g transform="translate(${num(p.x)} ${num(p.y)}) rotate(${vertical?0:90})">${cap}</g>`);
}

function button(d:ComponentDefinition,i:Item){
  const w=d.width,h=d.height,r=w/2,rectangular=d.cutoutShape==='rect'||d.id==='button-tact';
  const lit=d.id.includes('lit'),metal=d.id==='button-metal',face=lit?tint(i.color,-.65+i.value*.65):i.color;
  if(rectangular)return detail('button bezel',rect(w,h,dark,0,0,.5))
    +detail('button cap',rect(w-1.6,h-1.6,tint(face,-.3),0,0,.65)+rect(w-2,h-2,face,0,-.08,.5)
      +line(-(w-3)/2,-(h-2.1)/2,(w-3)/2,-(h-2.1)/2,tint(face,.28),.18))
    +(lit?detail('diffuser',rect(w-3,h-3,tint(face,.13),0,0,.35)): '');
  return detail('round bezel',rim(r,metal?steel:dark))
    +detail('button cap',rim(r*.78,face)+circle(r*.67,tint(face,.12)))
    +(metal?detail('etched ring',circle(r*.7,'none',0,0,`stroke="${tint(face,-.3)}" stroke-width="${num(r*.06)}"`)): '')
    +(d.id==='button-arcade'?detail('convex cap',circle(r*.42,tint(face,.17),-r*.12,-r*.13)): '');
}

function toggle(d:ComponentDefinition,i:Item){
  const position=togglePosition(d.id,i.value);
  if(d.id==='slide-switch')return detail('slide bezel',rect(d.width,d.height,steel,0,0,.6))
    +detail('slide channel',rect(9,4,well,0,0,.5))
    +detail('slide actuator',rect(3.8,3.1,i.color,position*2.25,0,.2)+[-1,0,1].map(n=>rect(.25,2.6,tint(i.color,-.5),position*2.25+n*.85,0,.03)).join(''));
  const y=-position*Math.sin(.38)*9.5;
  return detail('toggle washer',rim(d.width/2))+detail('toggle nut',hex(d.width*.43))
    +detail('toggle bushing',rim(3.05))+circle(1.75,dark)
    +detail('polished lever',line(0,0,0,y,tint(i.color,-.4),2.1)+line(-.24,0,-.24,y,tint(i.color,.7),1.1)+rim(1.05,i.color,0,y));
}

function led(d:ComponentDefinition,i:Item){
  if(d.id==='led-ring')return ringSegments(12,d.width*.39,i.value).map(s=>detail('LED lens',circle(1.1,dark,s.x,s.y)+circle(.9,s.active?i.color:'#3b4341',s.x,s.y,`data-active="${s.active}"`)+circle(.24,s.active?'#effff1':'#808783',s.x-.22,s.y-.25))).join('');
  const r=d.width/2,color=tint(i.color,-.75+i.value*.75);
  return detail('LED flange',circle(r,tint(i.color,-.5)))+detail('LED lens',circle(r*.87,color,0,0,'class="led-body"')+circle(r*.56,tint(color,.13))+circle(r*.2,'#ffffff',-r*.28,-r*.28,'opacity=".62"'));
}

function display(d:ComponentDefinition,i:Item){
  const w=d.width,h=d.height;
  let body=detail('display bezel',rect(w,h,dark,0,0,.6))+detail('display glass',rect(w-1.2,h-1.2,'#070e13',0,0,.35));
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
  return body;
}

function connector(d:ComponentDefinition,i:Item){
  if(d.id==='midi-din')return detail('DIN flange',rim(d.width/2))
    +detail('DIN socket shell',rim(7.7))+detail('DIN insulator',circle(6.7,i.color))
    +dinContacts().map(p=>detail('DIN contact',circle(.84,'#5d6668',p.x,p.y)+circle(.6,well,p.x,p.y))).join('')
    +detail('DIN key',rect(1.4,1.8,well,0,-5.8,.1));
  const usb=d.id==='usb-c',w=d.width,h=d.height;
  const shell=usb?i.color:steel;
  let body=detail('connector shell',rect(w,h,tint(shell,-.4),0,0,usb?h/2:.3)+rect(w-.28,h-.28,shell,0,0,usb?(h-.28)/2:.2))
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
