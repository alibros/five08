import {catalogMap} from './catalog';
import {HP_MM,PANEL_H,panelWidth,type Item,type Project} from './model';
import {componentSvg,esc,mountingSvg,panelFinishDefs,panelFinishSurface,screwsSvg} from './svg';
import {faderPosition,tint} from './hardware-visual';

const RAIL=8,LEFT_HP=26,RIGHT_HP=28;
const mm=(n:number)=>Number(n.toFixed(3));

/** The neighbours use real catalog footprints, just like the editable panel. */
function neighbour(hp:number,finish:string,panel:string,ink:string,accent:string,layout:'voice'|'mixer'):Project{
  const p:Project={version:2,name:'',panel:{hp,widthMode:'doepfer',customWidth:hp*HP_MM-.4,thickness:2,material:'Aluminium',finish,mounting:'four'},panelColor:panel,inkColor:ink,accentColor:accent,items:[],notes:'',
    design:{font:'mono',weight:500,labelSize:1.7,uppercase:true,outputLabels:'plain'}};
  const w=panelWidth(p.panel);
  let nextId=0;
  const put=(componentId:string,x:number,y:number,label='',value=.5,color?:string):Item=>{
    const d=catalogMap.get(componentId)!;
    return{id:`rack-${layout}-${nextId++}`,componentId,x,y,rotation:0,label,color:color??d.color,width:d.width,height:d.height,value,locked:false,hidden:false,role:'none',identifier:''};
  };
  const title={...put('text-label',w/2,13,layout==='voice'?'VCO':'MIX',.5,ink),width:24,height:4.4,font:'sans' as const,weight:500};
  const subtitle={...put('text-label',w/2,20,layout==='voice'?'VOLTAGE CONTROLLED OSCILLATOR':'FOUR CHANNEL MIXER',.5,ink),width:w-20,height:1.5,font:'mono' as const,weight:400};
  if(layout==='voice'){
    p.items=[title,subtitle,
      {...put('knob-scale',w*.3,42),width:33,height:33,count:13},
      put('knob-large',w*.3,42,'FREQ',.55,'#485358'),put('knob-skirted',w*.72,40,'FINE',.4,'#343d41'),
      put('knob-fluted',w*.25,76,'PW',.62,'#384349'),put('knob-fluted',w*.5,76,'FM',.3,'#384349'),put('knob-fluted',w*.75,76,'SYNC',.5,'#384349'),
      ...[.14,.32,.5,.68,.86].map((f,n)=>put('jack-mono',w*f,110,['V/OCT','FM','SYNC','SAW','SQR'][n])),
    ];
  }else{
    p.items=[title,subtitle,
      ...[.2,.4,.6,.8].map((f,n)=>put('slider-45',w*f,51,`CH ${n+1}`,[.7,.45,.85,.3][n],'#c2c9ca')),
      ...[.2,.4,.6,.8].map(f=>put('knob-small',w*f,88,'PAN',.5,'#303a40')),
      ...[.2,.4,.6,.8].map((f,n)=>put('jack-mono',w*f,110,`IN ${n+1}`)),
      put('led-3mm',w*.91,13,'',.85,'#d95036'),
    ];
  }
  p.items.push({...put('divider',w/2,99,'',.5,ink),width:w-18,height:.2});
  return p;
}

type Endpoint={x:number;y:number;label:string};
type Patch={defs:string;wire:string;plugs:string};

/** A projected rubber plug with a metal collar and a ribbed cable relief. */
function plug(end:Endpoint,angle:number,colour:string,id:string){
  return`<g class="patch-plug" data-jack-label="${esc(end.label)}" data-socket-x="${end.x}" data-socket-y="${end.y}" transform="translate(${end.x} ${end.y}) rotate(${angle})">
    <path d="M-2.5 0Q-3.2 3-2.1 7L-1.2 11H1.6L2.7 7Q3.5 2 2.6 0Z" fill="#000" opacity=".45" transform="translate(.75 1.1)" filter="url(#rack-contact-shadow)"/>
    <circle r="2.8" fill="url(#rack-plug-metal)" stroke="#30383b" stroke-width=".18"/>
    <path class="plug-relief" d="M-1.95 5.8H1.95L1.3 10.6H-1.3Z" fill="url(#${id}-rubber)" stroke="${tint(colour,-.6)}" stroke-width=".18"/>
    ${[6.7,7.8,8.9].map((y,n)=>`<path d="M${-1.77+n*.13} ${y}h${3.54-n*.26}" stroke="${tint(colour,-.5)}" stroke-width=".45"/><path d="M${-1.65+n*.13} ${y-.22}h${1.3-n*.1}" stroke="${tint(colour,.4)}" stroke-width=".16"/>`).join('')}
    <path class="plug-barrel" d="M-2.65-.1Q-2.65-1.5 0-1.5T2.65-.1L2.5 5.4Q2.4 6.6 0 6.8Q-2.4 6.6-2.5 5.4Z" fill="url(#rack-plug-grip)" stroke="#0b1012" stroke-width=".22"/>
    <ellipse cy="-.1" rx="2.5" ry="1.2" fill="#515b5e" stroke="#252d30" stroke-width=".22"/>
    <ellipse cy="-.3" rx="1.85" ry=".65" fill="#3a4346"/>
    <path d="M-2.54 1Q0 2.15 2.54 1V2.25Q0 3.25-2.54 2.25Z" fill="url(#${id}-rubber)"/>
    ${[3.5,4.4,5.3].map(y=>`<path d="M-2.35 ${y}Q0 ${y+.7} 2.35 ${y}" fill="none" stroke="#111719" stroke-width=".28"/><path d="M-1.85 ${y-.12}l.65 .12" stroke="#829094" stroke-opacity=".5" stroke-width=".15"/>`).join('')}
    <path d="M-1.7 .5V.9M-1.7 2.8V5.5" stroke="#d4e0e3" stroke-opacity=".22" stroke-width=".4" stroke-linecap="round"/>
  </g>`;
}

function cable(start:Endpoint,end:Endpoint,colour:string,droop:number,id:string):Patch{
  const direction=Math.sign(end.x-start.x)||1,angles=[-direction*12,direction*12];
  const ends=[start,end].map((point,n)=>{
    const angle=angles[n]*Math.PI/180,dx=-Math.sin(angle),dy=Math.cos(angle);
    return{x:point.x+dx*10.2,y:point.y+dy*10.2,cx:point.x+dx*(10.2+droop),cy:point.y+dy*(10.2+droop)};
  });
  const [a,b]=ends;
  const d=`M${mm(a.x)} ${mm(a.y)}C${mm(a.cx)} ${mm(a.cy)} ${mm(b.cx)} ${mm(b.cy)} ${mm(b.x)} ${mm(b.y)}`;
  return{
    defs:`<linearGradient id="${id}-rubber" x1="0" y1="0" x2="1" y2="0"><stop stop-color="${tint(colour,-.35)}"/><stop offset=".3" stop-color="${tint(colour,.3)}"/><stop offset=".58" stop-color="${colour}"/><stop offset="1" stop-color="${tint(colour,-.4)}"/></linearGradient>`,
    wire:`<g class="cable" data-colour="${colour}" fill="none" stroke-linecap="round">
      <path d="${d}" stroke="#000" stroke-opacity=".25" stroke-width="4.2" transform="translate(.7 1.8)" filter="url(#rack-contact-shadow)"/>
      <path d="${d}" stroke="${tint(colour,-.55)}" stroke-width="2.8"/>
      <path class="cable-jacket" d="${d}" stroke="${colour}" stroke-width="2.3"/>
      <path d="${d}" stroke="${tint(colour,.55)}" stroke-opacity=".65" stroke-width=".48" transform="translate(-.3 -.45)"/>
    </g>`,
    plugs:plug(start,angles[0],colour,id)+plug(end,angles[1],colour,id),
  };
}

function hardwareShadows(p:Project){
  return`<g class="rack-hardware-shadows" fill="#000" opacity=".35" filter="url(#rack-contact-shadow)">${p.items.filter(i=>!i.hidden).map(i=>{
    const d=catalogMap.get(i.componentId);
    if(!d||d.category==='Graphics'||['hole','shape','led'].includes(d.renderer))return'';
    if(d.renderer==='slider'){
      const cap=faderPosition(d,i.value),vertical=d.orientation!=='horizontal',width=vertical?9.5:5,height=vertical?5:9.5;
      return`<rect class="rack-fader-shadow" x="${i.x+cap.x-width/2+.45}" y="${i.y+cap.y-height/2+.9}" width="${width}" height="${height}" rx=".6" transform="rotate(${i.rotation} ${i.x} ${i.y})"/>`;
    }
    const h=d.renderer==='knob'?d.width*.72:d.height*.8;
    return`<ellipse cx="${i.x+.65}" cy="${i.y+1.1}" rx="${d.width*.49}" ry="${h/2}" transform="rotate(${i.rotation} ${i.x} ${i.y})"/>`;
  }).join('')}</g>`;
}

function moduleSvg(p:Project,prefix:string){
  const w=panelWidth(p.panel);
  const parts=p.items.filter(i=>!i.hidden).map(i=>{
    const d=catalogMap.get(i.componentId);
    return d?`<g data-rack-component="${d.id}">${componentSvg(i,d,p,false,'design','preview')}</g>`:'';
  }).join('');
  return`<rect x=".3" y=".5" width="${w+.6}" height="${PANEL_H+.4}" rx=".6" fill="#05090a"/>
    ${panelFinishSurface(p,w,prefix)}${mountingSvg(p)}${hardwareShadows(p)}${parts}
    <g class="rack-screws">${screwsSvg(p,prefix)}</g>`;
}

/** Decorative rack context; project geometry and fabrication exports stay untouched. */
export function rackSceneSvg(hero:Project){
  const w=panelWidth(hero.panel);
  const left=neighbour(LEFT_HP,'black-anodized','#181b19','#e3e9e6','#c4dca5','voice');
  const right=neighbour(RIGHT_HP,'powder-white','#eeece4','#272e31','#397891','mixer');
  const lw=panelWidth(left.panel),rw=panelWidth(right.panel),x0=-lw-1,x1=w+1,total=lw+1+w+1+rw;
  const jack=(p:Project,label:string,offset=0):Endpoint|undefined=>{
    const i=p.items.find(i=>!i.hidden&&i.label===label&&i.componentId!=='banana'&&catalogMap.get(i.componentId)?.renderer==='jack');
    return i?{x:i.x+offset,y:i.y,label:i.label}:undefined;
  };
  const patches:Patch[]=[];
  const connect=(start:Endpoint|undefined,end:Endpoint|undefined,colour:string,droop:number)=>{
    if(start&&end)patches.push(cable(start,end,colour,droop,`rack-cable-${patches.length}`));
  };
  connect(jack(left,'SAW',x0),jack(hero,'IN L')??jack(hero,'IN'),'#d9ae42',24);
  connect(jack(hero,'OUT L')??jack(hero,'OUT'),jack(right,'IN 2',x1),'#c84f3e',30);
  connect(jack(left,'SQR',x0),jack(hero,'CV'),'#48565e',17);

  const rail=(y:number)=>`<g class="rack-rail" transform="translate(${x0-8} ${y})">
    <rect width="${total+16}" height="${RAIL}" fill="url(#rack-rail-metal)"/>
    <path d="M0 .45H${total+16}M0 ${RAIL-1.1}H${total+16}" stroke="#e3e9e9" stroke-opacity=".65" stroke-width=".28"/>
    <rect y="2.2" width="${total+16}" height="2.7" fill="#232b2e"/>
    <path d="M0 2.35H${total+16}M0 4.8H${total+16}" stroke="#080d0f" stroke-width=".35"/>
    <path d="M0 5.2H${total+16}" stroke="#e4ebeb" stroke-opacity=".6" stroke-width=".3"/>
    ${Array.from({length:Math.ceil((total+16)/HP_MM)},(_,n)=>`<path d="M${mm(n*HP_MM)} 2.55v1.9" stroke="#9aa6aa" stroke-opacity=".42" stroke-width=".32"/>`).join('')}
    <path d="M0 ${RAIL-.25}H${total+16}" stroke="#060a0c" stroke-width=".5"/>
  </g>`;

  return`<svg class="rack-scene" xmlns="http://www.w3.org/2000/svg" viewBox="${x0-10} -15 ${total+20} ${PANEL_H+47}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <defs>
      ${panelFinishDefs(hero,'rk-')}${panelFinishDefs(left,'rl-')}${panelFinishDefs(right,'rr-')}
      <linearGradient id="rack-case" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#242b2e"/><stop offset=".4" stop-color="#0e1315"/><stop offset="1" stop-color="#202729"/></linearGradient>
      <linearGradient id="rack-rail-metal" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#dce1df"/><stop offset=".14" stop-color="#808e93"/><stop offset=".55" stop-color="#465459"/><stop offset=".72" stop-color="#b6c1c3"/><stop offset="1" stop-color="#3b464b"/></linearGradient>
      <linearGradient id="rack-plug-metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f1f4f2"/><stop offset=".32" stop-color="#a8b6bb"/><stop offset=".58" stop-color="#edf1ed"/><stop offset="1" stop-color="#596970"/></linearGradient>
      <linearGradient id="rack-plug-grip" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#141b1e"/><stop offset=".28" stop-color="#5a6569"/><stop offset=".5" stop-color="#303a3e"/><stop offset="1" stop-color="#11181b"/></linearGradient>
      <filter id="rack-contact-shadow" x="-40%" y="-40%" width="180%" height="180%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation=".55"/></filter>
      ${patches.map(p=>p.defs).join('')}
    </defs>
    <rect class="rack-case" x="${x0-10}" y="-15" width="${total+20}" height="${PANEL_H+47}" fill="url(#rack-case)"/>
    <rect x="${x0-2}" y="-1" width="${total+4}" height="${PANEL_H+2}" fill="#070c0e"/>
    <g class="rack-rails">${rail(-RAIL)}${rail(PANEL_H)}</g>
    <g class="rack-neighbour" transform="translate(${x0} 0)">${moduleSvg(left,'rl-')}</g>
    <g class="rack-neighbour" transform="translate(${x1} 0)">${moduleSvg(right,'rr-')}</g>
    <g class="hero-module">${moduleSvg(hero,'rk-')}</g>
    <g class="rack-patch-cables">${patches.map(p=>p.wire).join('')}</g>
    <g class="rack-patch-plugs">${patches.map(p=>p.plugs).join('')}</g>
  </svg>`;
}
