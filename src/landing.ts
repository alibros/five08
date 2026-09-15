import './landing.css';
import {catalog,catalogMap} from './catalog';
import {panelFinishes} from './finishes';
import {demoPanel} from './demo';
import {HP_MM,PANEL_H,panelWidth} from './model';
import {preflight} from './preflight';
import {componentSvg,mountingSvg,panelFinishDefs,panelFinishSurface,shapePath} from './svg';
import {mountingShapes} from './geometry';
import {newProjectId,saveProject,setActiveId} from './store';
import {registerOffline} from './offline';
import {applyTheme,nextTheme,readTheme,watchSystemTheme,type Theme} from './theme-site';

const project=demoPanel();
let view:'design'|'cutout'|'rear'='design';

const DEMO_FINISHES=['brushed-silver','black-anodized','powder-white','fr4-green'];

const mounting=()=>view==='rear'?''
  :view==='cutout'?`<g class="cut">${mountingShapes(project.panel).map(shapePath).join('')}</g>`
  :mountingSvg(project);

function panelSvg(){
  const w=panelWidth(project.panel);
  const parts=project.items.map(i=>componentSvg(i,catalogMap.get(i.componentId)!,project,false,view)).join('');
  return`<svg class="panel-render" viewBox="0 0 ${w} ${PANEL_H}" role="img" aria-label="A 12 HP Eurorack panel drawn in Five08, shown in ${view==='design'?'hardware':view==='cutout'?'cutout':'rear clearance'} view">
    <defs>${panelFinishDefs(project)}<filter id="glow"><feGaussianBlur stdDeviation="1" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
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
  'Undo, autosave, named projects, portable project files.',
];

const DOES_NOT=[
  'It does not know your parts. Library dimensions are generic starting points unless a part is marked as verified — check every one against the datasheet.',
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

const issues=preflight(project,catalogMap);

/* ---------- page ---------- */

const mark=`<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M18 11h28M18 53h28"/><rect x="21" y="8" width="22" height="48" rx="4"/><circle class="signal" cx="32" cy="32" r="7"/><circle cx="32" cy="32" r="2.5"/></svg>`;

const row=([term,value,note]:[string,string,string])=>`<tr><th scope="row">${term}</th><td class="figure">${value}</td><td>${note}</td></tr>`;

document.querySelector<HTMLDivElement>('#app')!.innerHTML=`
<a class="skip" href="#main">Skip to content</a>
<header class="masthead">
  <a class="wordmark" href="/">${mark}<span>five08</span></a>
  <nav aria-label="Sections">
    <a href="#about">What it is</a>
    <a href="#reference">Panel reference</a>
    <a href="#exports">Exports</a>
    <a href="https://github.com/alibros/five08" rel="noreferrer">Source</a>
  </nav>
  <button id="theme" class="ghost" aria-label="Switch theme">Theme</button>
  <a class="button" href="/app/">Open the designer</a>
</header>

<main id="main">
  <section class="lead">
    <div class="lead-copy">
      <h1>A layout tool for Eurorack front panels.</h1>
      <p class="standfirst">Set the width in HP, place parts in millimetres, and check the spacing before anything is cut. Five08 exports the artwork, the cutout geometry, a DXF for the shop, a parts list, and a sheet you can print at 1:1 and drill through.</p>
      <p class="terms">Free and MIT licensed. Runs in the browser. No account. Nothing you draw is uploaded.</p>
      <div class="lead-actions">
        <a class="button" href="/app/">Open the designer</a>
        <a class="quiet-link" href="#about">What it does and does not do</a>
      </div>
      <dl class="glance">
        <div><dt>Panel height</dt><dd>128.5 mm</dd></div>
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
        A 12 HP panel, ${panelWidth(project.panel).toFixed(2)} × ${PANEL_H} mm, drawn in Five08 and rendered here by the same code the editor uses.
        Preflight: ${issues.length?`${issues.length} open issue${issues.length===1?'':'s'}`:'clear'}.
        <button class="quiet-link" id="open-demo">Open this panel in the designer</button>
      </figcaption>
    </figure>
  </section>

  <section class="band" id="about">
    <div class="split">
      <div>
        <h2>What it does</h2>
        <ul class="ticks">${DOES.map(t=>`<li>${t}</li>`).join('')}</ul>
      </div>
      <div>
        <h2>What it does not do</h2>
        <ul class="crosses">${DOES_NOT.map(t=>`<li>${t}</li>`).join('')}</ul>
      </div>
    </div>
  </section>

  <section class="band" id="reference">
    <div class="band-head">
      <h2>Panel reference</h2>
      <p>The numbers Five08 works from. The first four are the Eurorack standard; the rest are this tool's defaults, and you can argue with any of them.</p>
    </div>
    <table class="spec">
      <caption class="sr-only">Eurorack panel dimensions and Five08 defaults</caption>
      <thead><tr><th scope="col">Measure</th><th scope="col">Value</th><th scope="col">Where it comes from</th></tr></thead>
      <tbody>${REFERENCE.map(row).join('')}</tbody>
    </table>
    <p class="hp-note"><span>1 HP = ${HP_MM} mm.</span> Everything on the panel — width, positions, rulers, exports — is a multiple or a measurement of that.</p>
  </section>

  <section class="band" id="exports">
    <div class="band-head">
      <h2>Exports</h2>
      <p>Everything comes out at physical size. The DXF and the cutout SVG are generated from the same geometry, so they cannot disagree.</p>
    </div>
    <table class="spec">
      <caption class="sr-only">Export formats</caption>
      <thead><tr><th scope="col">Format</th><th scope="col">File</th><th scope="col">What is in it</th></tr></thead>
      <tbody>${EXPORTS.map(row).join('')}</tbody>
    </table>
  </section>

  <section class="band" id="checks">
    <div class="band-head">
      <h2>What preflight looks for</h2>
      <p>Run before an export, or any time from the panel inspector. Clicking an issue selects the part that caused it.</p>
    </div>
    <ol class="checks">${CHECKS.map(([name,detail],n)=>`<li><span class="check-no">${String(n+1).padStart(2,'0')}</span><strong>${name}</strong><span>${detail}</span></li>`).join('')}</ol>
    <p class="caveat"><strong>None of this replaces a datasheet.</strong> Generic dimensions are useful for planning and wrong often enough to cost you a panel. Verify every cutout, tolerance, mounting point and material thickness against the real part before you pay anyone to cut metal.</p>
  </section>

  <section class="band closing">
    <h2>Open it and draw something.</h2>
    <p>Nothing to install, nothing to sign up for. If it is missing a part you need, the library is a single file — send a pull request.</p>
    <div class="lead-actions">
      <a class="button" href="/app/">Open the designer</a>
      <a class="quiet-link" href="https://github.com/alibros/five08" rel="noreferrer">Read the source</a>
    </div>
  </section>
</main>

<footer class="colophon">
  <div>
    <a class="wordmark" href="/">${mark}<span>five08</span></a>
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
