import type {ComponentDefinition,Item,Project} from './model';
import type {PanelFinish} from './finishes';
import {dimensionLocked,FONT_STACK,PANEL_H,panelWidth} from './model';
import {cutoutShapes,mountingShapes,type Shape} from './geometry';

export const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]!));

/* ---- panel finishes ----
   A surface is drawn in three layers: a gradient for the base colour and
   the way light falls across it; a grain for the material — long streaks
   for brushing, fine noise for anodising, orange-peel for powder coat,
   a coarse stipple for bead blasting; and an edge — a chamfer catching the
   light on metal, a lit edge on acrylic. The grain is fractal noise blended
   onto the colour, so it is a texture, not a picture of one, and stays
   seamless at any size. `prefix` keeps the ids apart when several finishes
   share a document, as the swatches do. */

type Grain={kind:'streaks'|'fine'|'peel'|'blast';opacity:number;blend:'overlay'|'soft-light'};
const GRAIN:Record<string,Grain>={
  'brushed-silver':{kind:'streaks',opacity:.6,blend:'overlay'},
  'brushed-copper':{kind:'streaks',opacity:.55,blend:'overlay'},
  'black-anodized':{kind:'fine',opacity:.5,blend:'soft-light'},
  'powder-white':{kind:'peel',opacity:.28,blend:'overlay'},
  'walnut':{kind:'blast',opacity:.45,blend:'overlay'},
  'fr4-green':{kind:'fine',opacity:.3,blend:'soft-light'},
};
const NOISE:Record<Grain['kind'],string>={
  streaks:'baseFrequency=".018 2.6" numOctaves="3" seed="3"',
  fine:'baseFrequency="1.9" numOctaves="2" seed="11"',
  peel:'baseFrequency=".5" numOctaves="3" seed="5"',
  blast:'baseFrequency="2.8" numOctaves="1" seed="9"',
};
const METAL=['brushed-silver','black-anodized','powder-white','brushed-copper','walnut'];

const SURFACE:Record<string,(c:string)=>string>={
  'brushed-silver':()=>`<linearGradient id="ID" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#b0b3b0"/><stop offset=".12" stop-color="#e4e5e1"/><stop offset=".48" stop-color="#c6c9c5"/><stop offset=".78" stop-color="#f1f1ec"/><stop offset="1" stop-color="#abaeab"/></linearGradient>`,
  'black-anodized':()=>`<linearGradient id="ID" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#272b28"/><stop offset=".5" stop-color="#121512"/><stop offset="1" stop-color="#212522"/></linearGradient>`,
  'powder-white':()=>`<radialGradient id="ID" cx="35%" cy="20%" r="95%"><stop stop-color="#fbfaf4"/><stop offset=".7" stop-color="#e8e6de"/><stop offset="1" stop-color="#d7d5ce"/></radialGradient>`,
  'smoke-acrylic':()=>`<linearGradient id="ID" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#53605d" stop-opacity=".92"/><stop offset=".35" stop-color="#202826" stop-opacity=".96"/><stop offset=".72" stop-color="#303b38" stop-opacity=".94"/><stop offset="1" stop-color="#141a18" stop-opacity=".98"/></linearGradient>`,
  'clear-acrylic':()=>`<linearGradient id="ID" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f3ffff" stop-opacity=".93"/><stop offset=".35" stop-color="#c7dcda" stop-opacity=".78"/><stop offset=".55" stop-color="#ffffff" stop-opacity=".9"/><stop offset="1" stop-color="#a9c4c1" stop-opacity=".84"/></linearGradient>`,
  'fr4-green':()=>`<linearGradient id="ID" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#1d5542"/><stop offset=".5" stop-color="#103b2d"/><stop offset="1" stop-color="#082d22"/></linearGradient>`,
  'brushed-copper':()=>`<linearGradient id="ID" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#70402f"/><stop offset=".15" stop-color="#c77b56"/><stop offset=".5" stop-color="#9b563b"/><stop offset=".78" stop-color="#d38a62"/><stop offset="1" stop-color="#6d3b2b"/></linearGradient>`,
  'walnut':()=>`<radialGradient id="ID" cx="35%" cy="22%" r="100%"><stop stop-color="#dedfd9"/><stop offset=".48" stop-color="#bfc0ba"/><stop offset="1" stop-color="#a7a9a3"/></radialGradient>`,
};

export function panelFinishDefs(p:Project,prefix=''){
  const f=p.panel.finish,id=(n:string)=>`${prefix}${n}`;
  const surface=(SURFACE[f]??((c:string)=>`<linearGradient id="ID" x1="0" y1="0" x2="1" y2="0"><stop stop-color="${c}"/><stop offset="1" stop-color="${c}"/></linearGradient>`))(p.panelColor).replace('id="ID"',`id="${id('panel-surface')}"`);
  const grain=GRAIN[f];
  const texture=grain
    ?`<filter id="${id('panel-grain-f')}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" ${NOISE[grain.kind]} stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="0" intercept="1"/></feComponentTransfer></filter><pattern id="${id('panel-grain')}" width="48" height="24" patternUnits="userSpaceOnUse"><rect width="48" height="24" filter="url(#${id('panel-grain-f')})"/></pattern>`
    :'';
  const detail=f==='fr4-green'
    ?`<pattern id="${id('panel-detail')}" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".12" fill="#e8c45d" opacity=".22"/><path d="M0 6Q3 3 7 5" fill="none" stroke="#65a57d" stroke-opacity=".08" stroke-width=".15"/></pattern>`
    :f.includes('acrylic')
    ?`<linearGradient id="${id('acrylic-shine')}" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#fff" stop-opacity=".28"/><stop offset=".18" stop-color="#fff" stop-opacity=".03"/><stop offset=".72" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".18"/></linearGradient>`
    :'';
  return surface+texture+detail+screwDefs(prefix);
}

export function panelFinishSurface(p:Project,w:number,prefix=''){
  const f=p.panel.finish,id=(n:string)=>`${prefix}${n}`,h=PANEL_H;
  const grain=GRAIN[f];
  const layers=[
    p.panelImage?`<image class="panel-custom-image" href="${p.panelImage}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/>`:'',
    grain?`<rect class="panel-texture" width="${w}" height="${h}" rx=".6" fill="url(#${id('panel-grain')})" opacity="${grain.opacity}" style="mix-blend-mode:${grain.blend}"/>`:'',
    f==='fr4-green'?`<rect class="panel-texture" width="${w}" height="${h}" rx=".6" fill="url(#${id('panel-detail')})"/>`:'',
    f.includes('acrylic')?`<rect class="panel-texture" x=".7" y=".7" width="${w-1.4}" height="${h-1.4}" rx=".5" fill="url(#${id('acrylic-shine')})"/>`:'',
  ].join('');
  // The edge: a chamfer on metal catches light along the top and left and
  // falls into shadow along the bottom and right; acrylic shows a lit edge.
  const edge=f.includes('acrylic')
    ?`<path d="M2 2H${w-2}M2 2V${h-2}" fill="none" stroke="#eaffff" stroke-opacity=".5" stroke-width=".45"/>`
    :METAL.includes(f)
    ?`<path d="M.4 ${h-.7}V.4H${w-.7}" fill="none" stroke="#fff" stroke-opacity="${f==='black-anodized'?.28:.6}" stroke-width=".35"/><path d="M${w-.4} .7V${h-.4}H.7" fill="none" stroke="#000" stroke-opacity="${f==='black-anodized'?.6:.28}" stroke-width=".35"/>`
    :'';
  return`<g class="panel-finish" style="isolation:isolate"><rect width="${w}" height="${h}" rx=".6" fill="url(#${id('panel-surface')})"/>${layers}${edge}<rect x=".2" y=".2" width="${w-.4}" height="${h-.4}" rx=".5" fill="none" stroke="${f.includes('acrylic')?'#eaffff':'#111'}" stroke-opacity="${f.includes('acrylic')?.38:.2}" stroke-width=".3"/></g>`;
}

/** A finish, drawn by the same code that draws the panel, small enough for a swatch. */
export function finishSwatchSvg(f:PanelFinish,px=24){
  const p:Project={version:2,name:'',panel:{hp:2,widthMode:'nominal',customWidth:10.16,thickness:2,material:f.material,finish:f.id,mounting:'none'},panelColor:f.panel,inkColor:f.ink,accentColor:f.accent,items:[],notes:''};
  const prefix=`sw-${f.id}-`;
  return`<svg class="finish-svg" viewBox="0 0 24 24" width="${px}" height="${px}" aria-hidden="true"><defs>${panelFinishDefs(p,prefix)}</defs><g transform="scale(.1868)">${panelFinishSurface(p,128.5,prefix)}</g></svg>`;
}

/* ---- screws ----
   Button-head M3s sitting in the mounting slots: the module bolted into its
   rails rather than floating. Slots stay visible around them, which is the
   point of a slot. */
function screwDefs(prefix=''){
  return`<radialGradient id="${prefix}screw-head" cx="35%" cy="28%" r="78%"><stop stop-color="#f6f6f2"/><stop offset=".5" stop-color="#bdbeb9"/><stop offset="1" stop-color="#63645f"/></radialGradient>`;
}
const SLOT_ANGLES=[22,-38,63,-12,48,-27];
export function screwsSvg(p:Project,prefix=''){
  return mountingShapes(p.panel).map((s,n)=>`<g class="screw" transform="translate(${s.cx} ${s.cy})" pointer-events="none"><circle r="2.9" fill="#000" fill-opacity=".28" transform="translate(.12 .22)"/><circle r="2.75" fill="url(#${prefix}screw-head)" stroke="#2a2b28" stroke-opacity=".5" stroke-width=".22"/><circle r="2.2" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width=".18"/><path d="M-1.75 0H1.75" stroke="#1a1b19" stroke-width=".5" stroke-linecap="round" transform="rotate(${SLOT_ANGLES[n%SLOT_ANGLES.length]})"/></g>`).join('');
}

/**
 * `wrapper` decides what the group is. On the panel it is an interactive item
 * carrying its id; in a library preview it is inert decoration — giving a
 * thumbnail the panel-item class and a data-id would make document-wide lookups
 * find a picture in the sidebar instead of the part on the panel.
 */
export function componentSvg(i:Item,d:ComponentDefinition,p:Project,selected:boolean,view:'design'|'cutout'|'rear',wrapper:'panel'|'preview'='panel'){
  const ink=p.inkColor, w=i.width, h=i.height, c=i.color;let body='';
  if(view==='cutout'&&d.cutout){body=d.orientation==='horizontal'&&d.renderer==='hole'?`<rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="${h/2}" class="cut"/>`:d.cutoutShape==='rect'?`<rect x="${-(d.cutoutWidth??w*.8)/2}" y="${-(d.cutoutHeight??h*.8)/2}" width="${d.cutoutWidth??w*.8}" height="${d.cutoutHeight??h*.8}" rx=".3" class="cut"/>`:`<circle r="${d.cutout/2}" class="cut"/>`;}
  else if(view==='cutout'){body='';}
  else if(view==='rear'&&d.keepout){body=`<rect x="${-d.keepout/2}" y="${-Math.max(d.keepout,h)/2}" width="${d.keepout}" height="${Math.max(d.keepout,h)}" rx="1" fill="${p.accentColor}" fill-opacity=".17" stroke="${p.accentColor}" stroke-dasharray="1 1"/><text y="1" text-anchor="middle" font-size="1.7" fill="${ink}">${d.depth??'—'} mm</text>`;}
  else if(d.renderer==='knob'){const r=Math.min(w,h)/2,a=(i.value*270+135)*Math.PI/180,encoder=d.id.includes('encoder');const flutes=d.id.includes('fluted')?Array.from({length:16},(_,n)=>`<line x1="0" y1="${-r*.82}" x2="0" y2="${-r}" stroke="${ink}" stroke-width=".35" transform="rotate(${n*22.5})"/>`).join(''):'';const halo=d.id==='encoder-ring'?`<circle r="${r*.9}" fill="none" stroke="${p.accentColor}" stroke-width="1.3" stroke-dasharray="2.4 1" filter="url(#glow)"/>`:'';const metal=d.id==='encoder-metal'?`<circle r="${r*.72}" fill="none" stroke="#eef1ec" stroke-opacity=".65" stroke-width=".35"/>`:'';const push=encoder?`<circle r="${r*.42}" fill="none" stroke="${ink}" stroke-opacity=".42" stroke-width=".45"/><circle cy="${-r*.56}" r=".65" fill="${p.accentColor}"/>`:`<line x2="${Math.cos(a)*r*.68}" y2="${Math.sin(a)*r*.68}" stroke="${p.accentColor}" stroke-width=".8" stroke-linecap="round"/>`;body=`${halo}<circle r="${r}" fill="${c}" stroke="${ink}" stroke-width=".65"/><circle r="${r*.78}" fill="none" stroke="${ink}" stroke-opacity=".25" stroke-width=".3"/>${flutes}${metal}${push}`;}
  else if(d.renderer==='jack'){const r=Math.min(w,h)/2;body=`<circle r="${r}" fill="${p.panelColor}" stroke="${ink}" stroke-width=".9"/><circle r="${r*.55}" fill="#11120f" stroke="${ink}" stroke-width=".35"/><circle r="${r*.2}" fill="#000"/>`;}
  else if(d.renderer==='slider'){const vertical=d.orientation!=='horizontal';body=vertical?`<rect x="-2" y="${-h/2}" width="4" height="${h}" rx="2" fill="#11120f"/><line y1="${-h/2+2}" y2="${h/2-2}" stroke="#777" stroke-width=".3"/><rect x="-5" y="${-h/2+h*(1-i.value)-2}" width="10" height="4" rx="1" fill="${c}" stroke="${ink}" stroke-width=".5"/>`:`<rect x="${-w/2}" y="-2" width="${w}" height="4" rx="2" fill="#11120f"/><line x1="${-w/2+2}" x2="${w/2-2}" stroke="#777" stroke-width=".3"/><rect x="${-w/2+w*i.value-2}" y="-5" width="4" height="10" rx="1" fill="${c}" stroke="${ink}" stroke-width=".5"/>`;}
  else if(d.renderer==='button'){const rectangular=d.id.includes('square')||d.id.includes('rect')||d.id.includes('wide'),lit=d.id.includes('lit'),metal=d.id.includes('metal'),arcade=d.id.includes('arcade');const shape=rectangular?`<rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="${d.id.includes('wide')?2:1.5}" fill="${c}" stroke="${ink}" stroke-width=".7"/>`:`<circle r="${Math.min(w,h)/2}" fill="${c}" stroke="${ink}" stroke-width=".7"/>`;const inset=rectangular?`<rect x="${-w*.39}" y="${-h*.34}" width="${w*.78}" height="${h*.68}" rx="1" fill="none" stroke="${lit?'#fff':ink}" stroke-opacity="${lit ? .62 : .22}" stroke-width=".45"/>`:`<circle r="${Math.min(w,h)*(arcade ? .38 : .34)}" fill="none" stroke="${metal?'#f4f6f2':ink}" stroke-opacity=".35" stroke-width=".45"/>`;const glow=lit?(rectangular?`<rect x="${-w*.34}" y="${-h*.29}" width="${w*.68}" height="${h*.58}" rx="1" fill="${c}" opacity=".58" filter="url(#glow)"/>`:`<circle r="${Math.min(w,h)*.24}" fill="${p.accentColor}" filter="url(#glow)"/>`):'';body=`${shape}${glow}${inset}`;}
  else if(d.renderer==='toggle'){body=d.orientation==='horizontal'?`<rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="1" fill="#222" stroke="${ink}" stroke-width=".5"/><rect x="${-w*.3}" y="${-h*.4}" width="${w*.38}" height="${h*.8}" rx=".8" fill="${c}"/>`:`<circle r="3" fill="none" stroke="${ink}" stroke-width=".6"/><line y2="${-h*.48}" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/><circle cy="${-h*.48}" r="1.4" fill="${c}"/>`;}
  else if(d.renderer==='led'){if(d.id==='led-ring')body=Array.from({length:12},(_,n)=>`<circle cx="${Math.cos(n*Math.PI/6)*w*.39}" cy="${Math.sin(n*Math.PI/6)*h*.39}" r="1.1" fill="${n<Math.round(i.value*12)?c:'#5b5d56'}"/>`).join('');else body=`<circle class="led-body" r="${Math.min(w,h)/2}" fill="${c}" stroke="${ink}" stroke-width=".3" filter="url(#glow)"/>`;}
  else if(d.renderer==='display'){if(d.id==='bargraph')body=Array.from({length:10},(_,n)=>`<rect x="${-w*.32}" y="${h/2-(n+1)*h/10+1}" width="${w*.64}" height="${h/12}" rx=".3" fill="${n<i.value*10?c:'#293029'}"/>`).join('');else body=`<rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="1" fill="#090d0b" stroke="${ink}" stroke-width=".5"/><text fill="${c}" font-family="ui-monospace,monospace" font-size="${Math.min(h*.42,4)}" text-anchor="middle" dominant-baseline="middle">${d.id==='seven-seg'?'12':d.id==='vu-meter'?'−12  0  +3':'WAVE 01'}</text>`;}
  else if(d.renderer==='connector')body=`<rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="${d.id==='midi-din'?h/2:1}" fill="#11120f" stroke="${ink}" stroke-width=".7"/>${d.id==='midi-din'?Array.from({length:5},(_,n)=>`<circle cx="${(n-2)*2.4}" cy="${n%2?1:-1}" r=".6" fill="#aaa"/>`).join(''):''}`;
  else if(d.renderer==='hole')body=d.orientation==='horizontal'?`<rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="${h/2}" fill="none" stroke="${ink}" stroke-width=".7"/>`:`<circle r="${w/2}" fill="none" stroke="${ink}" stroke-width=".7"/><line x1="${-w*.3}" x2="${w*.3}" stroke="${ink}" stroke-width=".3"/>`;
  else if(d.renderer==='text')body=textSvg(i,c);
  else if(d.renderer==='scale')body=scaleSvg(i,ink);
  else if(d.renderer==='arrow')body=arrowSvg(i,c);
  else if(d.renderer==='image')body=i.imageData?`<image href="${i.imageData}" x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" preserveAspectRatio="none"/>`:`<g opacity=".6"><rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="1" fill="none" stroke="${ink}" stroke-width=".4" stroke-dasharray="1 1"/><path d="M${-w*.35} ${h*.3}l${w*.25}-${h*.28} ${w*.18} ${h*.16} ${w*.2}-${h*.24} ${w*.22} ${h*.2}" fill="none" stroke="${ink}" stroke-width=".5"/><circle cx="${-w*.2}" cy="${-h*.22}" r="${Math.min(w,h)*.07}" fill="${c}"/></g>`;
  else if(d.renderer==='touch')body=d.id==='joystick'?`<circle r="${w/2}" fill="#20221e" stroke="${ink}" stroke-width=".7"/><circle cx="${(i.value-.5)*w*.35}" cy="${(i.value-.5)*-h*.35}" r="${w*.18}" fill="${c}" stroke="${ink}" stroke-width=".5"/>`:`<rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="${w/2}" fill="#20221e" stroke="${c}" stroke-width=".6"/>`;
  else body=d.id==='divider'?`<line x1="${-w/2}" x2="${w/2}" stroke="${c}" stroke-width="${h}"/>`:`<${d.id.includes('circle')?'ellipse':'rect'} ${d.id.includes('circle')?`rx="${w/2}" ry="${h/2}"`:`x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="1"`} fill="none" stroke="${c}" stroke-width=".6"/>`;
  const label=i.label&&d.renderer!=='text'&&view==='design'?`<text y="${h/2+3.6}" fill="${ink}" font-family="ui-monospace,monospace" font-size="2" font-weight="600" text-anchor="middle" letter-spacing=".06em">${esc(i.label.toUpperCase())}</text>`:'';
  const selection=selected?`<g class="selection-ui"><rect x="${-w/2-1.3}" y="${-h/2-1.3}" width="${w+2.6}" height="${h+2.6}" fill="none" stroke="${p.accentColor}" stroke-width=".45" stroke-dasharray="1.3 1" pointer-events="none"/>${dimensionLocked(d)?'':[['nw',-w/2-1.3,-h/2-1.3],['ne',w/2+1.3,-h/2-1.3],['sw',-w/2-1.3,h/2+1.3],['se',w/2+1.3,h/2+1.3]].map(([corner,x,y])=>`<rect class="resize-handle" data-resize="${corner}" x="${Number(x)-1.15}" y="${Number(y)-1.15}" width="2.3" height="2.3" rx=".35" fill="${p.accentColor}" stroke="#fff" stroke-width=".25" vector-effect="non-scaling-stroke" style="cursor:${corner==='nw'||corner==='se'?'nwse-resize':'nesw-resize'}"/>`).join('')}</g>`:'';
  const inner=`${body}${label}${selection}`;
  const place=`transform="translate(${i.x} ${i.y}) rotate(${i.rotation})"`;
  return wrapper==='preview'
    ? `<g class="part-preview" ${place} pointer-events="none">${inner}</g>`
    : `<g class="panel-item" data-id="${i.id}" ${place} opacity="${i.locked?.75:1}" style="cursor:${i.locked?'not-allowed':'move'}">${inner}</g>`;
}

/** Panel legends: multi-line, aligned, in a font that will survive the trip to a fabricator. */
export function textSvg(i:Item,colour:string){
  const lines=i.label.split('\n').slice(0,8);
  const anchor=i.align??'middle';
  const x=anchor==='start'?-i.width/2:anchor==='end'?i.width/2:0;
  const leading=i.height*1.25;
  const top=-(lines.length-1)*leading/2;
  const rows=lines.map((line,n)=>`<tspan x="${x}" y="${(top+n*leading).toFixed(3)}">${esc(line)}</tspan>`).join('');
  return`<text fill="${colour}" font-family="${FONT_STACK[i.font??'sans']}" font-size="${i.height}" font-weight="${i.weight??700}" text-anchor="${anchor}" dominant-baseline="middle" letter-spacing="${i.tracking??.04}em">${rows}</text>`;
}

/** The tick arc printed around a knob. 270° of sweep, matching the pot's travel. */
export function scaleSvg(i:Item,ink:string){
  const count=Math.max(2,i.count??11);
  const outer=Math.min(i.width,i.height)/2;
  const inner=outer-Math.max(.9,outer*.16);
  const sweep=270,start=135;
  const ticks=Array.from({length:count},(_,n)=>{
    const angle=(start+sweep*(n/(count-1)))*Math.PI/180;
    const major=n===0||n===count-1||(count>4&&n===(count-1)/2);
    const from=major?inner-Math.max(.6,outer*.1):inner;
    return`<line x1="${(Math.cos(angle)*from).toFixed(3)}" y1="${(Math.sin(angle)*from).toFixed(3)}" x2="${(Math.cos(angle)*outer).toFixed(3)}" y2="${(Math.sin(angle)*outer).toFixed(3)}" stroke="${ink}" stroke-width="${major?.45:.3}" stroke-linecap="round"/>`;
  }).join('');
  return ticks;
}

/** A signal-flow arrow. Drawn along its own width so rotation aims it. */
export function arrowSvg(i:Item,colour:string){
  const half=i.width/2,head=Math.min(i.height*1.1,i.width*.4);
  return`<path d="M${-half} 0H${half-head*.55}" stroke="${colour}" stroke-width="${Math.max(.3,i.height*.28)}" stroke-linecap="round"/>`
    +`<path d="M${half} 0L${half-head} ${-head*.5}L${half-head} ${head*.5}Z" fill="${colour}"/>`;
}

export function mountingSvg(p:Project){return mountingShapes(p.panel).map(s=>`<g class="mounting" transform="translate(${s.cx} ${s.cy})"><rect x="${-s.w/2}" y="${-s.h/2}" width="${s.w}" height="${s.h}" rx="${s.h/2}" fill="none" stroke="${p.inkColor}" stroke-width=".5"/><line x1="-1" x2="1" stroke="${p.inkColor}" stroke-width=".25"/></g>`).join('');}

export function shapePath(s:Shape){
  if(s.kind==='circle')return`<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}"/>`;
  const rx=s.kind==='obround'?Math.min(s.w,s.h)/2:.3;
  return`<g transform="translate(${s.cx} ${s.cy}) rotate(${s.rotation})"><rect x="${-s.w/2}" y="${-s.h/2}" width="${s.w}" height="${s.h}" rx="${rx}"/></g>`;
}

export function cutoutSvg(p:Project,definitions:Map<string,ComponentDefinition>){
  const w=panelWidth(p.panel);
  const mounting=mountingShapes(p.panel).map(shapePath).join('');
  const parts=cutoutShapes(p.items,definitions).map(shapePath).join('');
  return`<svg xmlns="http://www.w3.org/2000/svg" width="${w.toFixed(2)}mm" height="${PANEL_H}mm" viewBox="0 0 ${w} ${PANEL_H}"><g id="panel-outline" fill="none" stroke="#000" stroke-width=".2"><rect x=".1" y=".1" width="${w-.2}" height="${PANEL_H-.2}"/><g id="mounting-slots">${mounting}</g><g id="component-cutouts">${parts}</g></g></svg>`;
}

export const bounds=(i:Item,d:ComponentDefinition)=>({l:i.x-Math.max(i.width,d.keepout||0)/2,r:i.x+Math.max(i.width,d.keepout||0)/2,t:i.y-Math.max(i.height,d.keepout||0)/2,b:i.y+Math.max(i.height,d.keepout||0)/2});

/**
 * A drilling template printed at 1:1.
 *
 * Cutout geometry rather than artwork, a centre mark in every hole so it can be
 * punched, and a 100 mm scale bar — the only way to tell whether the printer
 * scaled the page before you drill into a blank.
 */
export function templateSvg(p:Project,definitions:Map<string,ComponentDefinition>){
  const w=panelWidth(p.panel);
  const shapes=[...mountingShapes(p.panel),...cutoutShapes(p.items,definitions)];
  const marks=shapes.map(s=>{
    const reach=s.kind==='circle'?Math.max(s.r+1.2,2.5):Math.max(Math.min(s.w,s.h)/2+1.2,2.5);
    return`<path d="M${s.cx-reach} ${s.cy}H${s.cx+reach}M${s.cx} ${s.cy-reach}V${s.cy+reach}" stroke="#d11" stroke-width=".2"/>`;
  }).join('');
  const rulerY=PANEL_H+16;
  const ticks=Array.from({length:11},(_,n)=>{
    const x=n*10,major=n%5===0;
    return`<path d="M${x} ${rulerY}V${rulerY-(major?4:2.4)}" stroke="#000" stroke-width=".25"/>`
      +(major?`<text x="${x}" y="${rulerY-5.2}" font-family="ui-monospace,monospace" font-size="2.6" text-anchor="${n===10?'end':n===0?'start':'middle'}" fill="#000">${x}</text>`:'');
  }).join('');
  const sheetW=Math.max(w,100)+4;
  return`<svg xmlns="http://www.w3.org/2000/svg" width="${sheetW.toFixed(2)}mm" height="${(rulerY+11).toFixed(2)}mm" viewBox="-2 -2 ${sheetW} ${rulerY+11}">
    <g fill="none" stroke="#000" stroke-width=".25">
      <rect width="${w}" height="${PANEL_H}"/>
      ${shapes.map(shapePath).join('')}
    </g>
    <g fill="none">${marks}</g>
    <g><path d="M0 ${rulerY}H100" stroke="#000" stroke-width=".25"/>${ticks}
      <text x="0" y="${rulerY+4.6}" font-family="ui-monospace,monospace" font-size="2.3" fill="#000">This bar must measure exactly 100 mm.</text>
      <text x="0" y="${rulerY+8.2}" font-family="ui-monospace,monospace" font-size="2.3" fill="#000">If it does not, the page was scaled \u2014 print again at 100%.</text>
    </g>
  </svg>`;
}

/**
 * The module in its case: rails above and below, neighbours either side.
 * Panels are designed one at a time but they never live that way — this shows
 * whether a control sits too close to whatever is bolted next to it.
 */
export function rackContextSvg(p:Project,neighbourHp=8){
  const w=panelWidth(p.panel);
  const reach=neighbourHp*5.08;
  const rail=(y:number)=>`<rect x="${-reach}" y="${y}" width="${w+reach*2}" height="9" fill="var(--rack-rail)" stroke="var(--rack-edge)" stroke-width=".25"/>`;
  const ghost=(x:number)=>`<g><rect x="${x}" y="0" width="${reach-1}" height="${PANEL_H}" fill="var(--rack-ghost)" stroke="var(--rack-edge)" stroke-width=".25"/>`
    +`<text x="${x+(reach-1)/2}" y="${PANEL_H/2}" text-anchor="middle" font-family="var(--mono)" font-size="3" fill="var(--rack-label)">${neighbourHp} HP</text></g>`;
  return`<g class="rack-context" pointer-events="none">${ghost(-reach)}${ghost(w+1)}${rail(-3)}${rail(PANEL_H-6)}</g>`;
}

/**
 * The library thumbnail, drawn by the same renderer that draws the panel.
 *
 * These used to be a second, hand-drawn set of approximations keyed off the
 * part id — a knob was a fixed-radius circle with a fixed pointer, whatever the
 * real part looked like — so the picture and the component were free to drift
 * apart, and did. Rendering the component itself means they cannot.
 */
export function thumbnailSvg(d:ComponentDefinition,p:Project,colour=d.color,px=40){
  const nominal=(span:number):Item=>({
    id:`thumb-${d.id}`,componentId:d.id,
    x:span/2,y:span/2,rotation:0,
    // Only text parts carry their own words; everything else would just repeat
    // the row's title underneath the picture.
    label:d.renderer==='text'?d.label||'Aa':'',
    color:colour,width:d.width,height:d.height,
    value:.62,locked:false,hidden:false,role:'none',identifier:'',
  });

  // Fit the part to the box with a proportional margin, so every thumbnail has
  // the same visual breathing room whatever the part's real size. Anything
  // wearing the glow filter needs more: the blur is a fixed millimetre radius,
  // so on a 3 mm LED it spreads further than the part itself and would be
  // clipped into a hard square at the edge of the box.
  const round=(v:number)=>Math.round(v*100)/100;
  const base=round(Math.max(d.width,d.height)*1.18);
  const glows=componentSvg(nominal(base),d,p,false,'design','preview').includes('url(#glow)');
  const span=round(glows?base+GLOW_BLEED*2:base);

  return`<svg class="part-svg" viewBox="0 0 ${span} ${span}" width="${px}" height="${px}" aria-hidden="true">${componentSvg(nominal(span),d,p,false,'design','preview')}</svg>`;
}

/** How far the glow filter's blur carries, in millimetres. */
const GLOW_BLEED=2.5;
