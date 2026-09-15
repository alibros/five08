import './landing.css';
import {catalog,catalogMap} from './catalog';
import {panelFinishes} from './finishes';
import {demoPanel} from './demo';
import {HP_MM,PANEL_H,panelWidth} from './model';
import {issueCounts,preflight} from './preflight';
import {componentSvg,mountingSvg,panelFinishDefs,panelFinishSurface,shapePath} from './svg';
import {mountingShapes} from './geometry';
import {newProjectId,saveProject,setActiveId} from './store';
import {registerOffline} from './offline';
import {applyTheme,nextTheme,readTheme,watchSystemTheme,type Theme} from './theme-site';
import {units} from './units';

const project=demoPanel();
let view:'design'|'cutout'|'rear'='design';

const DEMO_FINISHES=['brushed-silver','black-anodized','powder-white','fr4-green'];

const mounting=()=>view==='rear'?''
  :view==='cutout'?`<g class="cut">${mountingShapes(project.panel).map(shapePath).join('')}</g>`
  :mountingSvg(project);

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
  return`<svg class="panel-render" viewBox="0 0 ${w} ${PANEL_H}" role="img" aria-label="A 12 HP Eurorack panel drawn in Five08, shown in ${view==='design'?'hardware':view==='cutout'?'cutout':'rear clearance'} view">
    <defs>${panelFinishDefs(project)}<filter id="glow" x="-75%" y="-75%" width="250%" height="250%"><feGaussianBlur stdDeviation="1" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <style>.cut{fill:none;stroke:#ef523c;stroke-width:.45}</style></defs>
    ${panelFinishSurface(project,w)}${mounting()}${parts}
  </svg>`;
}

/* ---------- copy ---------- */

const DOES=[
  'Exact Eurorack geometry: 128.5 mm tall, HP widths nominal or with the Doepfer allowance, or a custom width in millimetres.',
  `${catalog.length} parts — knobs, encoders, jacks, sliders, switches, displays, LEDs, mounting hardware, text and imported PNG artwork.`,
  'Millimetre placement with grid snapping, centre and edge guides, live gap measurements and equal-gap detection.',
  'Hardware, cutout and rear-clearance views of the same layout.',
  'Layout checks before you commit: edge margins, cutout walls, mounting clashes, jack spacing, part depth.',
  'Provenance on every figure — the inspector and the bill of materials say whether a dimension came from a datasheet or a guess, and link to the source.',
  'Undo, autosave, named projects, portable project files.',
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

const row=([term,value,note]:[string,string,string])=>`<tr><th scope="row">${units(term)}</th><td class="figure">${units(value)}</td><td>${units(note)}</td></tr>`;
const head=(no:string,title:string,note?:string)=>
  `<div class="band-head"><span class="section-no">${no}</span><h2>${title}</h2>${note?`<p>${note}</p>`:''}</div>`;

document.querySelector<HTMLDivElement>('#app')!.innerHTML=`
<a class="skip" href="#main">Skip to content</a>
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
          ${DEMO_FINISHES.map(id=>{const f=panelFinishes.find(x=>x.id===id)!;return`<button data-finish="${f.id}" class="${f.id===project.panel.finish?'on':''}" title="${f.name}" aria-label="${f.name}"><span style="background:${f.panel}"></span></button>`;}).join('')}
        </div>
      </div>
      <figcaption>
        <span id="demo-caption">${units(`A 12 HP panel, ${panelWidth(project.panel).toFixed(2)} × ${PANEL_H} mm, drawn in Five08 and rendered here by the same code the editor uses.`)} Preflight: clear.</span>
        <button class="quiet-link" id="open-demo">Open this panel in the designer</button>
      </figcaption>
    </figure>
  </section>

  <section class="band" id="about">
    ${head('1.0','Scope','What the tool covers, and where it stops. The second list is the more useful one.')}
    <div class="band-body split">
      <div>
        <h3>What it does</h3>
        <ul class="ticks">${DOES.map(t=>`<li>${t}</li>`).join('')}</ul>
      </div>
      <div>
        <h3>What it does not do</h3>
        <ul class="crosses">${DOES_NOT.map(t=>`<li>${t}</li>`).join('')}</ul>
      </div>
    </div>
  </section>

  <section class="band" id="reference">
    ${head('2.0','Panel reference',"The numbers Five08 works from. The first four are the Eurorack standard; the rest are this tool's defaults, and you can argue with any of them.")}
    <div class="band-body">
    <table class="spec">
      <caption class="sr-only">Eurorack panel dimensions and Five08 defaults</caption>
      <thead><tr><th scope="col">Measure</th><th scope="col">Value</th><th scope="col">Where it comes from</th></tr></thead>
      <tbody>${REFERENCE.map(row).join('')}</tbody>
    </table>
    <p class="hp-note"><b>${units(`1 HP = ${HP_MM} mm`)}.</b> Everything on the panel — width, positions, rulers, exports — is a multiple or a measurement of that.</p>
    </div>
  </section>

  <section class="band" id="exports">
    ${head('3.0','Exports','Everything comes out at physical size. The DXF and the cutout SVG are generated from the same geometry, so they cannot disagree.')}
    <div class="band-body">
    <table class="spec">
      <caption class="sr-only">Export formats</caption>
      <thead><tr><th scope="col">Format</th><th scope="col">File</th><th scope="col">What is in it</th></tr></thead>
      <tbody>${EXPORTS.map(row).join('')}</tbody>
    </table>
    </div>
  </section>

  <section class="band" id="checks">
    ${head('4.0','What preflight looks for','Run before an export, or any time from the panel inspector. Clicking an issue selects the part that caused it.')}
    <div class="band-body">
    <ol class="checks">${CHECKS.map(([name,detail],n)=>`<li><span class="check-no">${String(n+1).padStart(2,'0')}</span><strong>${name}</strong><span>${detail}</span></li>`).join('')}</ol>
    <p class="caveat"><b>None of this replaces a datasheet.</b> Generic dimensions are useful for planning and wrong often enough to cost you a panel. Verify every cutout, tolerance, mounting point and material thickness against the real part before you pay anyone to cut metal.</p>
    </div>
  </section>

  <section class="band closing">
    ${head('5.0','Open it and draw something.')}
    <div class="band-body">
    <p>Nothing to install, nothing to sign up for. If it is missing a part you need, the library is a single file — send a pull request.</p>
    <div class="lead-actions">
      <a class="button" href="/app/">Open the designer</a>
      <a class="quiet-link" href="https://github.com/alibros/five08" rel="noreferrer">Read the source</a>
    </div>
    </div>
  </section>
</main>

<footer class="colophon">
  <div>
    <a class="wordmark" href="/">${mark}<b>five08</b></a>
    <p>Built by <a href="https://forestofrods.com" rel="noreferrer">Ali Bross</a>. MIT licensed.</p>
  </div>
  <nav aria-label="Elsewhere">
    <a href="https://github.com/alibros/five08" rel="noreferrer">GitHub</a>
    <a href="https://github.com/alibros/five08/issues" rel="noreferrer">Report a bug</a>
    <a href="mailto:ali@forestofrods.com">Contact</a>
  </nav>
</footer>`;

/* ---------- behaviour ---------- */

const panelHost=document.querySelector<HTMLDivElement>('#demo-panel')!;
const redraw=()=>{panelHost.innerHTML=panelSvg();};

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
let dragging:{id:string;startY:number;startValue:number}|null=null;

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
    dragging={id:item.id,startY:e.clientY,startValue:item.value};
    panelHost.classList.add('turning');
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

window.addEventListener('pointerup',()=>{
  if(!dragging)return;
  dragging=null;
  panelHost.classList.remove('turning');
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
