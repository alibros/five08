import './landing.css';
import {catalog,catalogMap} from './catalog';
import {panelFinishes} from './finishes';
import {demoPanel} from './demo';
import {HP_MM,PANEL_H,panelWidth} from './model';
import {issueCounts,preflight} from './preflight';
import {componentSvg,finishSwatchSvg,mountingSvg,panelFinishDefs,panelFinishSurface,screwsSvg,shapePath} from './svg';
import {cutoutLabel,mountingShapes} from './geometry';
import type {ComponentDefinition,Item} from './model';
import {newProjectId,saveProject,setActiveId} from './store';
import {registerOffline} from './offline';
import {applyTheme,nextTheme,readTheme,watchSystemTheme,type Theme} from './theme-site';
import {units} from './units';
import {rackSceneSvg} from './rack-scene';
import {esc} from './svg';

const project=demoPanel();
let view:'design'|'cutout'|'rear'='design';

const DEMO_FINISHES=['brushed-silver','black-anodized','powder-white','fr4-green'];

const mounting=()=>view==='rear'?''
  :view==='cutout'?`<g class="cut">${mountingShapes(project.panel).map(shapePath).join('')}</g>`
  :mountingSvg(project)+screwsSvg(project);

/* The two LEDs read the FOLD knob, so turning it lights the panel up. A module
   behaves; a picture of a module does not. */
const FOLD='FOLD', LIT='#ff5d3b', DARK='#5c4038';
function syncIndicators(){
  const fold=project.items.find(i=>i.label===FOLD&&catalogMap.get(i.componentId)?.renderer==='knob');
  if(!fold)return;
  const leds=project.items.filter(i=>catalogMap.get(i.componentId)?.renderer==='led');
  leds.forEach((led,n)=>{led.color=fold.value>(n+1)/(leds.length+1)?LIT:DARK;});
}

function panelSvg(){
  const w=panelWidth(project.panel);
  syncIndicators();
  const parts=project.items.map(i=>componentSvg(i,catalogMap.get(i.componentId)!,project,false,view)).join('');
  // The panel sits in a body that carries its shadow and the sheen that
  // follows the pointer; the SVG itself stays exactly what the editor draws.
  return`<div class="panel-body"><svg class="panel-render" viewBox="0 0 ${w} ${PANEL_H}" role="img" aria-label="A 12 HP Eurorack panel drawn in Five08, shown in ${view==='design'?'hardware':view==='cutout'?'cutout':'rear clearance'} view">
    <defs>${panelFinishDefs(project)}<filter id="glow" x="-75%" y="-75%" width="250%" height="250%"><feGaussianBlur stdDeviation="1" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <style>.cut{fill:none;stroke:#ef523c;stroke-width:.45}</style></defs>
    ${panelFinishSurface(project,w)}${mounting()}${parts}<g id="hero-notes" pointer-events="none"></g>
  </svg><i class="sheen" aria-hidden="true"></i></div>`;
}

/* ---------- annotations ----------
   Hover a part and the sheet dimensions it: where it sits from the edges, and
   what hole it needs. Drawn in the same language as the editor's guides and
   the datasheet the numbers came from. */
function noteSvg(item:Item,d:ComponentDefinition,w:number){
  const l=item.x-item.width/2,b=item.y+item.height/2,r=item.x+item.width/2;
  const ink=project.inkColor,f=(v:number)=>v.toFixed(2);
  const text=(x:number,y:number,label:string,anchor='middle',cls='')=>`<text class="note-text ${cls}" x="${f(x)}" y="${f(y)}" text-anchor="${anchor}" fill="${ink}">${esc(label)}</text>`;
  const tick=(x:number,y:number)=>`<path class="note-line" pathLength="1" d="M${f(x-.6)} ${f(y+.6)}l1.2-1.2" stroke="${ink}"/>`;
  // Nothing is drawn on the panel but extension lines. The figures live in
  // the margins, the way a drawing keeps its dimensions off the part.
  const hy=PANEL_H+3.6;
  const horizontal=`<path class="note-line" pathLength="1" d="M${f(item.x)} ${f(b+.8)}V${f(hy+1.2)}M0 ${f(PANEL_H+.8)}V${f(hy+1.2)}M0 ${f(hy)}H${f(item.x)}" stroke="${ink}"/>${tick(0,hy)}${tick(item.x,hy)}${text(item.x/2,hy+2.9,item.x.toFixed(1))}`;
  // Y comes down the near side to the part's centreline, where the leader
  // meets it; the figures sit together at the junction.
  const right=item.x>=w/2;
  const vx=right?w+3.6:-3.6,ex=right?r+.8:l-.8;
  const vertical=`<path class="note-line" pathLength="1" d="M${f(right?w+.8:-.8)} 0H${f(right?vx+1.2:vx-1.2)}M${f(vx)} 0V${f(item.y)}M${f(ex)} ${f(item.y)}H${f(right?vx+1.2:vx-1.2)}" stroke="${ink}"/>${tick(vx,0)}${tick(vx,item.y)}<circle class="note-dot" cx="${f(ex)}" cy="${f(item.y)}" r=".4" fill="${ink}"/>`;
  const tx=right?vx+1.6:vx-1.6,anchor=right?'start':'end';
  const block=text(tx,item.y-2.2,item.y.toFixed(1),anchor)+text(tx,item.y+.6,cutoutLabel(d),anchor,'note-strong')+text(tx,item.y+3.4,units(`${item.width} × ${item.height} mm`),anchor);
  return horizontal+vertical+block;
}
function showNote(id:string|null){
  const layer=panelHost.querySelector('#hero-notes');
  if(!layer)return;
  const item=id?project.items.find(i=>i.id===id):undefined;
  const d=item&&catalogMap.get(item.componentId);
  layer.innerHTML=item&&d&&view==='design'&&d.renderer!=='text'?noteSvg(item,d,panelWidth(project.panel)):'';
}

/* ---------- copy ---------- */

const DOES:Array<[string,string,string]>=[
  ['Geometry','128.5 mm × 2–84 HP','Nominal, with the Doepfer allowance, or a custom width in millimetres'],
  ['Parts',`${catalog.length}`,'Knobs, encoders, jacks, sliders, switches, displays, LEDs, mounting hardware, text, tick scales, PNG and SVG artwork'],
  ['Placement','0.1 mm','Grid snapping, centre and edge guides, live gap measurements, equal-gap detection'],
  ['Views','3 + rack','Hardware, cutout and rear clearance, and the module between its neighbours'],
  ['Checks','8','Edge margins, cutout walls, mounting clashes, jack pitch, part depth, off-HP widths'],
  ['Provenance','Per figure','Datasheet or estimate, with the source linked from the inspector and the parts list'],
  ['Persistence','Local','Undo, autosave, named projects, a portable .panel.json'],
  ['Exports','8 formats','SVG, DXF, PNG, a 1:1 drilling template, VCV Rack, CSV, the project file'],
];

const DOES_NOT=[
  'It does not know your parts. Most dimensions are generic estimates; where a cutout is traced to a named datasheet the part says so and links to it. Everything else is a starting point.',
  'It is not CAD. No constraints, no 3D, no PCB, no tolerance stack-up.',
  'It does not do illustration. Text, simple shapes and imported PNGs only.',
  'It does not store anything on a server. Open it on another machine and your work is not there — export the project file.',
  'It does not quote, order or manufacture panels.',
];

const REFERENCE:Array<[string,string,string]>=[
  ['Panel height','128.5 mm','3U Eurorack, fits standard rails'],
  ['1 HP','5.08 mm','0.2 inch — the number this tool is named after'],
  ['12 HP, nominal','60.96 mm','HP × 5.08'],
  ['12 HP, Doepfer','60.56 mm','0.4 mm narrower so neighbours are not forced apart'],
  ['Mounting slot','6.5 × 3.2 mm obround','Clearance for an M3 screw with room to shift'],
  ['Slot centres','3 mm from the top and bottom edge','Where the rail threads land'],
  ['Four-slot inset','7.5 mm from each side edge','Five08 default'],
  ['Two-slot placement','On the panel centreline','What narrow modules normally do'],
  ['Edge margin warning','3 mm','Five08 default — rails and neighbours use this strip'],
  ['Minimum wall between cutouts','1.2 mm','Five08 default — below this, ask your shop first'],
  ['Minimum 3.5 mm jack pitch','9.5 mm','Five08 default — room to turn the nut with a spanner'],
  ['Skiff depth warning','25 mm','Five08 default — deeper parts will not fit a shallow case'],
];

const EXPORTS:Array<[string,string,string]>=[
  ['Artwork SVG','.svg','Physical-size panel graphics, PNG artwork embedded'],
  ['Cutout SVG','.svg','Outline, mounting slots and apertures, nothing decorative'],
  ['Cutout DXF','.dxf','R12, millimetres, layered — what a laser cutter or panel shop wants'],
  ['PNG render','.png','150 to 1200 dpi, for documentation and posts'],
  ['Print at 1:1','paper','Cutout template with centre marks and a 100 mm scale bar'],
  ['VCV Rack SVG','.svg','Artwork plus coloured component-role markers'],
  ['Bill of materials','.csv','Quantities, cutouts, rear depths, and whether a dimension is generic'],
  ['Project','.panel.json','The editable file — the only copy that leaves the browser'],
];

const CHECKS=[
  ['Off the panel','A part or its keepout crosses the outline.'],
  ['Edge margin','A part sits in the 3 mm strip the rails and neighbours use.'],
  ['Cutout overlap','Two holes would be machined as one ragged opening.'],
  ['Thin wall','Less than 1.2 mm of material left between two cutouts.'],
  ['Mounting clash','A cutout merges with a screw slot.'],
  ['Jack pitch','Two 3.5 mm jacks too close to get a spanner on the nut.'],
  ['Part depth','Deeper than a shallow skiff case allows.'],
  ['Off-HP width','A custom width that is not a whole number of HP.'],
];


/* ---------- page ---------- */

const mark=`<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M18 11h28M18 53h28"/><rect x="21" y="8" width="22" height="48" rx="4"/><circle class="signal" cx="32" cy="32" r="7"/><circle cx="32" cy="32" r="2.5"/></svg>`;

/* The zone marks a drawing sheet carries in its border: letters down the
   sides, numbers along the top and bottom, a centring tick on each edge. */
const ZONES_ACROSS=8,ZONES_DOWN=6;
const sheetFrame=`<div class="sheet-frame" aria-hidden="true">
  <span class="zones across top">${Array.from({length:ZONES_ACROSS},(_,n)=>`<i>${n+1}</i>`).join('')}</span>
  <span class="zones across bottom">${Array.from({length:ZONES_ACROSS},(_,n)=>`<i>${n+1}</i>`).join('')}</span>
  <span class="zones down left">${Array.from({length:ZONES_DOWN},(_,n)=>`<i>${String.fromCharCode(65+n)}</i>`).join('')}</span>
  <span class="zones down right">${Array.from({length:ZONES_DOWN},(_,n)=>`<i>${String.fromCharCode(65+n)}</i>`).join('')}</span>
</div>`;

const row=([term,value,note]:[string,string,string])=>`<tr><th scope="row">${units(term)}</th><td class="figure">${units(value)}</td><td>${units(note)}</td></tr>`;
const head=(no:string,title:string,note?:string)=>
  `<div class="band-head"><span class="section-no">${no}</span><h2>${title}</h2>${note?`<p>${note}</p>`:''}</div>`;
/* A numbered section. The rule at the top draws itself in as the section
   scrolls into view; the ghosted number behind it is the sheet's zone mark. */
const band=(no:string,id:string,title:string,note:string|undefined,body:string,extra='')=>
  `<section class="band ${extra}" id="${id}" data-no="${no}"><hr class="rule" aria-hidden="true"><span class="zone-mark" aria-hidden="true">${no}</span>${head(no,title,note)}${body}</section>`;

const NOTES=[
  'All dimensions in millimetres unless stated. 1 HP = 5.08 mm.',
  'Generic part dimensions are estimates for planning. Verify every cutout against the manufacturer drawing before fabrication.',
  'Nothing drawn here leaves the browser. Projects are stored locally; the .panel.json export is the only copy.',
  'Preflight defaults (edge margin, wall thickness, jack pitch, depth) are opinions, not standards. Argue with them in the source.',
];

const REVISIONS:Array<[string,string,string]>=[
  ['A','2026-07-13','First release: HP widths, parts library, SVG export.'],
  ['B','2026-09-15','Datasheet identity. Traced part dimensions, DXF and 1:1 print, preflight, offline.'],
  ['C',__FIVE08_DATE__,'Set on paper. Sheet frame, material hero, editor bench.'],
];

document.querySelector<HTMLDivElement>('#app')!.innerHTML=`
<a class="skip" href="#main">Skip to content</a>
${sheetFrame}
<header class="masthead">
  <a class="wordmark" href="/">${mark}<b>five08</b></a>
  <span class="rev">Eurorack panel layout · MIT</span>
  <nav aria-label="Sections">
    <a href="#about">1.0 What it is</a>
    <a href="#reference">2.0 Reference</a>
    <a href="#exports">3.0 Exports</a>
    <a href="#checks">4.0 Preflight</a>
    <a href="https://github.com/alibros/five08" rel="noreferrer">Source</a>
  </nav>
  <button id="theme" class="ghost" aria-label="Switch theme">Theme</button>
  <a class="button" href="/app/">Open the designer</a>
</header>

<main id="main">
  <section class="lead">
    <div class="lead-copy">
      <span class="section-no">0.0</span>
      <h1>A layout tool for Eurorack front panels.</h1>
      <p class="standfirst">Set the width in HP, place parts in millimetres, and check the spacing before anything is cut. Five08 exports the artwork, the cutout geometry, a DXF for the shop, a parts list, and a sheet you can print at 1:1 and drill through.</p>
      <p class="terms">Free and MIT licensed. Runs in the browser. No account. Nothing you draw is uploaded.</p>
      <div class="lead-actions">
        <a class="button" href="/app/">Open the designer</a>
        <a class="quiet-link" href="#about">What it does and does not do</a>
      </div>
      <div class="width-control">
        <span class="legend">Panel width</span>
        <div class="stepper">
          <button id="hp-down" aria-label="Narrower">−</button>
          <output id="hp-value" class="mono roll"><span class="roll-int" data-unit="HP" style="--n:12" aria-hidden="true"></span><span class="sr-only">12 HP</span></output>
          <button id="hp-up" aria-label="Wider">+</button>
        </div>
        <span class="width-mm mono roll" id="hp-mm"><span class="roll-dec" data-unit="mm" style="--w:60;--f:56" aria-hidden="true"></span><span class="sr-only">60.56 mm</span></span>
        <p class="width-note">Squeeze it and watch preflight start objecting.</p>
      </div>
      <dl class="glance">
        <div><dt>Panel height</dt><dd>${units('128.5 mm')}</dd></div>
        <div><dt>Widths</dt><dd>2–84 HP</dd></div>
        <div><dt>Parts</dt><dd>${catalog.length}</dd></div>
        <div><dt>Export formats</dt><dd>${EXPORTS.length}</dd></div>
      </dl>
    </div>

    <figure class="demo">
      <div class="demo-frame">
        <div class="demo-scale" aria-hidden="true">${Array.from({length:13},(_,n)=>`<span class="${n%5===0?'major':''}" style="top:${(n*10/PANEL_H*100).toFixed(2)}%"><i></i>${n%5===0?`${n*10}`:''}</span>`).join('')}<span class="major end" style="top:100%"><i></i>${PANEL_H}</span></div>
        <div class="demo-panel" id="demo-panel">${panelSvg()}</div>
      </div>
      <div class="demo-readout"><span id="demo-readout" class="mono"></span><span class="demo-hint">Turn a knob · flip the switch</span></div>
      <div class="demo-controls">
        <div class="switcher" id="views" role="group" aria-label="View">
          <button data-view="design" class="on">Hardware</button>
          <button data-view="cutout">Cutouts</button>
          <button data-view="rear">Rear</button>
        </div>
        <div class="swatches" id="finishes" role="group" aria-label="Panel finish">
          ${DEMO_FINISHES.map(id=>{const f=panelFinishes.find(x=>x.id===id)!;return`<button data-finish="${f.id}" class="${f.id===project.panel.finish?'on':''}" title="${f.name}" aria-label="${f.name}">${finishSwatchSvg(f,21)}</button>`;}).join('')}
        </div>
      </div>
      <figcaption>
        <span id="demo-caption">${units(`A 12 HP panel, ${panelWidth(project.panel).toFixed(2)} × ${PANEL_H} mm, drawn in Five08 and rendered here by the same code the editor uses.`)} Preflight: clear.</span>
        <button class="quiet-link" id="open-demo">Open this panel in the designer</button>
      </figcaption>
    </figure>
  </section>

  <figure class="rack">
    <div class="rack-scene-host" id="rack-scene">${rackSceneSvg(project)}</div>
    <figcaption><span class="section-no">Fig. 1</span><span>The same panel bolted between two other modules, patched. What gets drawn here is what ends up in the case — the render, the neighbours and the cables come from the same part library.</span></figcaption>
  </figure>

  ${band('1.0','about','Scope','What the tool covers, and where it stops. The second list is the more useful one.',`
    <div class="band-body split">
      <div>
        <h3>What it does</h3>
        <table class="spec compact">
          <caption class="sr-only">What Five08 does</caption>
          <tbody>${DOES.map(row).join('')}</tbody>
        </table>
      </div>
      <div>
        <h3>What it does not do</h3>
        <ul class="crosses">${DOES_NOT.map(t=>`<li>${t}</li>`).join('')}</ul>
      </div>
    </div>`)}

  ${band('2.0','reference','Panel reference',"The numbers Five08 works from. The first four are the Eurorack standard; the rest are this tool's defaults, and you can argue with any of them.",`
    <div class="band-body">
    <table class="spec">
      <caption class="sr-only">Eurorack panel dimensions and Five08 defaults</caption>
      <thead><tr><th scope="col">Measure</th><th scope="col">Value</th><th scope="col">Where it comes from</th></tr></thead>
      <tbody>${REFERENCE.map(row).join('')}</tbody>
    </table>
    <p class="hp-note"><b>${units(`1 HP = ${HP_MM} mm`)}.</b> Everything on the panel — width, positions, rulers, exports — is a multiple or a measurement of that.</p>
    </div>`)}

  ${band('3.0','exports','Exports','Everything comes out at physical size. The DXF and the cutout SVG are generated from the same geometry, so they cannot disagree.',`
    <div class="band-body">
    <table class="spec">
      <caption class="sr-only">Export formats</caption>
      <thead><tr><th scope="col">Format</th><th scope="col">File</th><th scope="col">What is in it</th></tr></thead>
      <tbody>${EXPORTS.map(row).join('')}</tbody>
    </table>
    </div>`)}

  ${band('4.0','checks','What preflight looks for','Run before an export, or any time from the panel inspector. Clicking an issue selects the part that caused it.',`
    <div class="band-body">
    <ol class="checks">${CHECKS.map(([name,detail],n)=>`<li><span class="check-no">${String(n+1).padStart(2,'0')}</span><strong>${name}</strong><span>${units(detail)}</span></li>`).join('')}</ol>
    <p class="caveat"><b>None of this replaces a datasheet.</b> Generic dimensions are useful for planning and wrong often enough to cost you a panel. Verify every cutout, tolerance, mounting point and material thickness against the real part before you pay anyone to cut metal.</p>
    </div>`)}

  ${band('5.0','open','Open it and draw something.',undefined,`
    <div class="band-body">
    <p>Nothing to install, nothing to sign up for. If it is missing a part you need, the library is a single file — send a pull request.</p>
    <div class="lead-actions">
      <a class="button" href="/app/">Open the designer</a>
      <a class="quiet-link" href="https://github.com/alibros/five08" rel="noreferrer">Read the source</a>
    </div>
    </div>`,'closing')}
</main>

<footer class="colophon">
  <div class="sheet-notes">
    <section class="notes" aria-labelledby="notes-title">
      <h2 id="notes-title" class="legend">Notes</h2>
      <ol>${NOTES.map(n=>`<li>${units(n)}</li>`).join('')}</ol>
    </section>
    <section class="revisions" aria-labelledby="revisions-title">
      <h2 id="revisions-title" class="legend">Revisions</h2>
      <table>
        <thead><tr><th scope="col">Rev</th><th scope="col">Date</th><th scope="col">Description</th></tr></thead>
        <tbody>${REVISIONS.map(([rev,date,text])=>`<tr><td class="mono">${rev}</td><td class="mono">${date}</td><td>${text}</td></tr>`).join('')}</tbody>
      </table>
    </section>
  </div>
  <div class="title-block" role="group" aria-label="Sheet information">
    <div class="tb-name"><a class="wordmark" href="/">${mark}<b>five08</b></a><span>Eurorack panel layout</span></div>
    <div class="tb-title"><span class="legend">Title</span><b>A layout tool for Eurorack front panels</b></div>
    <div><span class="legend">Drawn</span><b><a href="https://forestofrods.com" rel="noreferrer">Ali Bross</a></b></div>
    <div><span class="legend">Licence</span><b>MIT</b></div>
    <div><span class="legend">Rev</span><b class="mono">${__FIVE08_REV__}</b></div>
    <div><span class="legend">Date</span><b class="mono">${__FIVE08_DATE__}</b></div>
    <div><span class="legend">Scale</span><b class="mono">1:1</b></div>
    <div><span class="legend">Units</span><b class="mono">mm</b></div>
    <div><span class="legend">Sheet</span><b class="mono">1 of 1</b></div>
    <nav class="tb-links" aria-label="Elsewhere">
      <a href="https://github.com/alibros/five08" rel="noreferrer">GitHub</a>
      <a href="https://github.com/alibros/five08/issues" rel="noreferrer">Report a bug</a>
      <a href="mailto:ali@forestofrods.com">Contact</a>
    </nav>
  </div>
</footer>`;

/* ---------- behaviour ---------- */

const panelHost=document.querySelector<HTMLDivElement>('#demo-panel')!;
const rackHost=document.querySelector<HTMLDivElement>('#rack-scene')!;
let rackTimer=0;
const redraw=()=>{
  panelHost.innerHTML=panelSvg();
  // The rack follows the hero, but not at drag rate: it is a second full
  // scene, and nobody is watching it while they turn a knob.
  window.clearTimeout(rackTimer);
  rackTimer=window.setTimeout(()=>{rackHost.innerHTML=rackSceneSvg(project);},120);
};
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- panel width ----------
   "Set the width in HP" is the first thing the page claims the tool does, so
   let people do it. Parts move with the panel, and the caption reports what
   preflight makes of the result — squeeze it far enough and the jacks end up
   too close together to get a spanner on the nuts, live. */

const MIN_HP=6, MAX_HP=20;
const caption=document.querySelector<HTMLElement>('#demo-caption')!;
const hpValue=document.querySelector<HTMLOutputElement>('#hp-value')!;
const hpMm=document.querySelector<HTMLElement>('#hp-mm')!;
const home=demoPanel();
const homeWidth=panelWidth(home.panel);

function setHp(hp:number){
  const next=Math.max(MIN_HP,Math.min(MAX_HP,hp));
  project.panel.hp=next;
  project.panel.customWidth=next*HP_MM-.4;
  const width=panelWidth(project.panel);
  // Scale from the layout's own proportions every time, never from wherever it
  // happens to be now — otherwise the mapping compounds and returning to 12 HP
  // does not return to the layout you started with.
  project.items.forEach((item,n)=>{item.x=Math.round(home.items[n].x/homeWidth*width*10)/10;});
  redraw();
  describe();
}

let lastVerdict='';
/** Writes a figure into a rolling readout: the digits animate, the hidden text is what a reader or a test sees. */
function roll(host:HTMLElement,vars:Record<string,number>,text:string){
  const digits=host.firstElementChild as HTMLElement;
  Object.entries(vars).forEach(([k,v])=>digits.style.setProperty(`--${k}`,String(v)));
  host.lastElementChild!.textContent=text;
}
function describe(){
  const w=panelWidth(project.panel);
  const found=preflight(project,catalogMap);
  const counts=issueCounts(found);
  roll(hpValue,{n:project.panel.hp},units(`${project.panel.hp} HP`));
  roll(hpMm,{w:Math.floor(w),f:Math.round((w-Math.floor(w))*100)},units(`${w.toFixed(2)} mm`));
  const verdict=counts.errors?`${counts.errors} error${counts.errors===1?'':'s'}`
    :counts.warnings?`${counts.warnings} warning${counts.warnings===1?'':'s'} — ${found.find(i=>i.severity==='warning')!.message.toLowerCase()}`
    :'clear';
  caption.innerHTML=`${units(`A ${project.panel.hp} HP panel, ${w.toFixed(2)} × ${PANEL_H} mm, drawn in Five08 and rendered here by the same code the editor uses.`)} Preflight: <b class="${counts.errors?'bad':counts.warnings?'warn':'good'}">${units(verdict)}</b>.`;
  // A two-frame dip so the eye registers that the verdict changed, not just what it says now.
  if(lastVerdict&&verdict!==lastVerdict){caption.classList.remove('swap');void caption.offsetWidth;caption.classList.add('swap');}
  lastVerdict=verdict;
}

describe();
document.querySelector('#hp-down')!.addEventListener('click',()=>setHp(project.panel.hp-1));
document.querySelector('#hp-up')!.addEventListener('click',()=>setHp(project.panel.hp+1));

/* ---------- the panel is usable, not a picture of one ---------- */

const turnable=(i:{componentId:string})=>catalogMap.get(i.componentId)?.renderer==='knob';
const readout=document.querySelector<HTMLElement>('#demo-readout')!;
let dragging:{id:string;startY:number;startValue:number;lastY:number;lastT:number;velocity:number}|null=null;
let spinning=0;

/* The light and the tilt follow the pointer across the panel: a sheen
   slides over the metal and the whole thing leans a couple of degrees, the
   way a panel does when you look at it from off-axis. Hover only — a finger
   covering the screen has no viewpoint to track. */
const hoverable=window.matchMedia('(hover: hover)');
function lookAt(e:PointerEvent|null){
  if(!hoverable.matches||reducedMotion.matches){return;}
  if(!e){panelHost.style.removeProperty('--mx');panelHost.style.removeProperty('--my');panelHost.style.removeProperty('--tx');panelHost.style.removeProperty('--ty');return;}
  const box=panelHost.getBoundingClientRect();
  const px=(e.clientX-box.left)/box.width,py=(e.clientY-box.top)/box.height;
  panelHost.style.setProperty('--mx',`${(px*100).toFixed(1)}%`);
  panelHost.style.setProperty('--my',`${(py*100).toFixed(1)}%`);
  panelHost.style.setProperty('--tx',`${((px-.5)*4).toFixed(2)}deg`);
  panelHost.style.setProperty('--ty',`${((.5-py)*3).toFixed(2)}deg`);
}
panelHost.addEventListener('pointermove',e=>{if(!dragging)lookAt(e);});
panelHost.addEventListener('pointerleave',()=>{lookAt(null);if(!dragging)showNote(null);});
panelHost.addEventListener('pointerover',e=>{
  if(dragging)return;
  const group=(e.target as Element).closest<SVGGElement>('.panel-item');
  showNote(group?.dataset.id??null);
});

/* A knob let go mid-turn keeps turning for a moment. Mechanical, not
   springy: the velocity decays, and it stops dead at either end. */
function spin(id:string,velocity:number){
  window.cancelAnimationFrame(spinning);
  if(reducedMotion.matches||Math.abs(velocity)<.0004)return;
  let v=velocity,last=performance.now();
  const step=(now:number)=>{
    const item=project.items.find(i=>i.id===id);
    if(!item)return;
    const dt=Math.min(64,now-last);last=now;
    const next=item.value+v*dt;
    item.value=Math.max(0,Math.min(1,next));
    v*=Math.pow(.15,dt/1000*4);
    redraw();
    readout.textContent=`${item.label||'VALUE'} ${Math.round(item.value*100)}%`;
    if(next!==item.value||Math.abs(v)<.00005)return;
    spinning=window.requestAnimationFrame(step);
  };
  spinning=window.requestAnimationFrame(step);
}

const panelPoint=(e:PointerEvent)=>{
  const svg=panelHost.querySelector<SVGSVGElement>('svg');
  if(!svg)return null;
  const point=svg.createSVGPoint();
  point.x=e.clientX;point.y=e.clientY;
  const ctm=svg.getScreenCTM();
  return ctm?point.matrixTransform(ctm.inverse()):null;
};

panelHost.addEventListener('pointerdown',e=>{
  const group=(e.target as Element).closest<SVGGElement>('.panel-item');
  const item=project.items.find(i=>i.id===group?.dataset.id);
  if(!item||view!=='design')return;
  e.preventDefault();
  if(turnable(item)){
    window.cancelAnimationFrame(spinning);
    dragging={id:item.id,startY:e.clientY,startValue:item.value,lastY:e.clientY,lastT:e.timeStamp,velocity:0};
    panelHost.classList.add('turning');
    showNote(null);
    return;
  }
  // Anything else on the panel is a switch: give it somewhere to go.
  if(catalogMap.get(item.componentId)?.renderer==='toggle'){
    item.rotation=item.rotation?0:180;
    redraw();
  }
});

window.addEventListener('pointermove',e=>{
  if(dragging){
    const item=project.items.find(i=>i.id===dragging!.id);
    if(!item)return;
    // 120 px of travel covers the pot's full sweep, which feels about right
    // under a finger without being twitchy.
    item.value=Math.max(0,Math.min(1,dragging.startValue+(dragging.startY-e.clientY)/120));
    const dt=e.timeStamp-dragging.lastT;
    if(dt>0){dragging.velocity=(dragging.lastY-e.clientY)/120/dt;dragging.lastY=e.clientY;dragging.lastT=e.timeStamp;}
    redraw();
    readout.textContent=`${item.label||'VALUE'} ${Math.round(item.value*100)}%`;
    return;
  }
  const at=panelPoint(e);
  if(!at)return;
  const w=panelWidth(project.panel);
  const inside=at.x>=0&&at.x<=w&&at.y>=0&&at.y<=PANEL_H;
  readout.textContent=inside?units(`X ${at.x.toFixed(1)}  Y ${at.y.toFixed(1)} mm`):'';
  readout.classList.toggle('live',inside);
});

window.addEventListener('pointerup',e=>{
  if(!dragging)return;
  const {id,velocity,lastT}=dragging;
  dragging=null;
  panelHost.classList.remove('turning');
  // Only a knob still moving when released carries on; one held still stops.
  if(e.timeStamp-lastT<80)spin(id,velocity);
});

document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.onclick=()=>{
  view=b.dataset.view as typeof view;
  document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('on',x===b));
  redraw();
});

document.querySelectorAll<HTMLButtonElement>('[data-finish]').forEach(b=>b.onclick=()=>{
  const finish=panelFinishes.find(f=>f.id===b.dataset.finish)!;
  project.panel.finish=finish.id;
  project.panel.material=finish.material;
  project.panelColor=finish.panel;
  project.inkColor=finish.ink;
  project.accentColor=finish.accent;
  document.querySelectorAll('[data-finish]').forEach(x=>x.classList.toggle('on',x===b));
  redraw();
});

document.querySelector<HTMLButtonElement>('#open-demo')!.onclick=()=>{
  const id=newProjectId();
  if(saveProject(id,{...project,name:'Wavefolder (from the site)'}).ok)setActiveId(id);
  window.location.href='/app/';
};

registerOffline();

let theme:Theme=readTheme();
applyTheme(theme);
watchSystemTheme(()=>{if(theme==='system')applyTheme(theme);});
const themeButton=document.querySelector<HTMLButtonElement>('#theme')!;
const labelTheme=()=>{themeButton.textContent=theme==='system'?'Auto':theme==='light'?'Light':'Dark';};
labelTheme();
themeButton.onclick=()=>{theme=nextTheme(theme);applyTheme(theme);labelTheme();};
