import {catalogMap} from './catalog';
import {HP_MM,PANEL_H,panelWidth,uid,type Item,type Project} from './model';
import {componentSvg,mountingSvg,panelFinishDefs,panelFinishSurface,screwsSvg} from './svg';

/**
 * The panel in a case: rails above and below, two other modules either side
 * slightly out of focus, and a few patch cables. It is what the tool's output
 * actually becomes, drawn by the same code that draws the panel, so it is
 * honest — nothing here is a stock render.
 */

const RAIL=9;
const LEFT_HP=26,RIGHT_HP=28;

/* Neighbours are generic modules built from library parts: enough to read as
   hardware, not enough to compete with the panel in the middle. */
function neighbour(hp:number,finish:string,panel:string,ink:string,accent:string,layout:'voice'|'mixer'):Project{
  const p:Project={version:2,name:'',panel:{hp,widthMode:'doepfer',customWidth:hp*HP_MM-.4,thickness:2,material:'Aluminium',finish,mounting:'four'},panelColor:panel,inkColor:ink,accentColor:accent,items:[],notes:''};
  const w=panelWidth(p.panel);
  const put=(componentId:string,x:number,y:number,label='',value=.5,color?:string):Item=>{const d=catalogMap.get(componentId)!;return{id:uid(),componentId,x,y,rotation:0,label,color:color??d.color,width:d.width,height:d.height,value,locked:false,hidden:false,role:'none',identifier:''};};
  if(layout==='voice'){
    p.items=[
      put('text-label',w/2,12,'VCO',.5,ink),
      put('knob-large',w*.3,34,'FREQ',.55),put('knob-medium',w*.72,30,'FINE',.4),
      put('knob-medium',w*.25,66,'PW',.62),put('knob-medium',w*.5,66,'FM',.3),put('knob-medium',w*.75,66,'SYNC',.5),
      put('toggle-2',w*.5,88,'OCT'),
      ...[.14,.32,.5,.68,.86].map((f,n)=>put('jack-mono',w*f,108,['V/OCT','FM','SYNC','SAW','SQR'][n])),
    ];
  }else{
    p.items=[
      put('text-label',w/2,12,'MIX',.5,ink),
      ...[.2,.4,.6,.8].map((f,n)=>put('slider-45',w*f,48,`CH ${n+1}`,[.7,.45,.85,.3][n])),
      ...[.2,.4,.6,.8].map((f)=>put('knob-small',w*f,82,'PAN',.5)),
      ...[.2,.4,.6,.8].map((f,n)=>put('jack-mono',w*f,108,`IN ${n+1}`)),
      put('led-3mm',w*.9,30,'',.5,'#ff5d3b'),
    ];
  }
  // Text on a neighbour would be typeset at the same size as the hero's;
  // give the labels a size once so the module reads as a module.
  p.items.forEach(i=>{if(i.componentId==='text-label'){i.width=22;i.height=3;}});
  return p;
}

/** A 3.5 mm patch cable: a catenary from one jack to another, with plugs. */
function cable(x1:number,y1:number,x2:number,y2:number,colour:string,droop:number){
  const c1=`${x1} ${y1+droop}`,c2=`${x2} ${y2+droop}`;
  const d=`M${x1} ${y1}C${c1} ${c2} ${x2} ${y2}`;
  const plug=(x:number,y:number)=>`<g transform="translate(${x} ${y})"><rect x="-2.6" y="-2.6" width="5.2" height="5.2" rx="1" fill="#1d1e1c"/><circle r="1.9" fill="#3a3b38"/><circle r=".9" fill="#111"/></g>`;
  return`<g class="cable"><path d="${d}" fill="none" stroke="#000" stroke-opacity=".28" stroke-width="3.2" transform="translate(.6 1.4)"/><path d="${d}" fill="none" stroke="${colour}" stroke-width="2.4" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width=".6" transform="translate(-.5 -.6)"/>${plug(x1,y1)}${plug(x2,y2)}</g>`;
}

const shadow=(w:number)=>`<rect x="-.6" y="-.6" width="${w+1.2}" height="${PANEL_H+1.2}" rx=".8" fill="#000" fill-opacity=".45" transform="translate(.4 1.6)"/>`;

const moduleSvg=(p:Project,prefix:string,defocus:boolean)=>{
  const w=panelWidth(p.panel);
  const parts=p.items.map(i=>componentSvg(i,catalogMap.get(i.componentId)!,p,false,'design','preview')).join('');
  return`<g ${defocus?'filter="url(#defocus)" opacity=".94"':''}>${shadow(w)}${panelFinishSurface(p,w,prefix)}${mountingSvg(p)}${parts}</g>`;
};

export function rackSceneSvg(hero:Project){
  const w=panelWidth(hero.panel);
  const left=neighbour(LEFT_HP,'black-anodized','#181b19','#eef0e8','#b8ff58','voice');
  const right=neighbour(RIGHT_HP,'powder-white','#eeece4','#222420','#2c75ff','mixer');
  const lw=panelWidth(left.panel),rw=panelWidth(right.panel);
  const x0=-lw-1,x1=w+1;
  const total=lw+1+w+1+rw;
  const jack=(p:Project,label:string)=>p.items.find(i=>i.label===label&&catalogMap.get(i.componentId)?.renderer==='jack');
  const heroJack=(label:string)=>jack(hero,label);
  const cables:string[]=[];
  const sawOut=jack(left,'SAW'),inJack=heroJack('IN L')??heroJack('IN'),outJack=heroJack('OUT L')??heroJack('OUT'),in2=jack(right,'IN 2'),cv=heroJack('CV'),sqr=jack(left,'SQR');
  if(sawOut&&inJack)cables.push(cable(x0+sawOut.x,sawOut.y,inJack.x,inJack.y,'#d9b23a',26));
  if(outJack&&in2)cables.push(cable(outJack.x,outJack.y,x1+in2.x,in2.y,'#c8321e',34));
  if(sqr&&cv)cables.push(cable(x0+sqr.x,sqr.y,cv.x,cv.y,'#2b2b2b',20));
  const rail=(y:number)=>`<g><rect x="${x0-40}" y="${y}" width="${total+80}" height="${RAIL}" fill="url(#rail)"/><path d="M${x0-40} ${y+RAIL-1.2}H${x0+total+40}" stroke="#000" stroke-opacity=".35" stroke-width=".5"/><path d="M${x0-40} ${y+1}H${x0+total+40}" stroke="#fff" stroke-opacity=".5" stroke-width=".4"/>${Array.from({length:Math.ceil((total+80)/HP_MM)},(_,n)=>`<circle cx="${(x0-40+n*HP_MM+HP_MM/2).toFixed(2)}" cy="${y+RAIL/2}" r=".75" fill="#2b2c29" fill-opacity=".55"/>`).join('')}</g>`;
  return`<svg class="rack-scene" viewBox="${x0-30} ${-RAIL-14} ${total+60} ${PANEL_H+RAIL*2+28}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
  <defs>
    ${panelFinishDefs(hero,'rk-')}${panelFinishDefs(left,'rl-')}${panelFinishDefs(right,'rr-')}
    <linearGradient id="rail" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#b9bbb6"/><stop offset=".45" stop-color="#8f918c"/><stop offset="1" stop-color="#5f615c"/></linearGradient>
    <filter id="defocus" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation=".7"/></filter>
    <filter id="glow" x="-75%" y="-75%" width="250%" height="250%"><feGaussianBlur stdDeviation="1" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <linearGradient id="case" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#4a4b46"/><stop offset=".5" stop-color="#3a3b36"/><stop offset="1" stop-color="#2b2c28"/></linearGradient>
  </defs>
  <rect x="${x0-60}" y="${-RAIL-30}" width="${total+120}" height="${PANEL_H+RAIL*2+60}" fill="url(#case)"/>
  <g transform="translate(${x0} 0)">${moduleSvg(left,'rl-',true)}</g>
  <g transform="translate(${x1} 0)">${moduleSvg(right,'rr-',true)}</g>
  <g class="hero-module">${shadow(w)}${panelFinishSurface(hero,w,'rk-')}${mountingSvg(hero)}${hero.items.map(i=>componentSvg(i,catalogMap.get(i.componentId)!,hero,false,'design','preview')).join('')}</g>
  ${rail(-RAIL+3)}${rail(PANEL_H-3)}
  <g transform="translate(${x0} 0)" filter="url(#defocus)" opacity=".94">${screwsSvg(left,'rl-')}</g>
  <g transform="translate(${x1} 0)" filter="url(#defocus)" opacity=".94">${screwsSvg(right,'rr-')}</g>
  <g class="hero-screws">${screwsSvg(hero,'rk-')}</g>
  ${cables.join('')}
</svg>`;
}
