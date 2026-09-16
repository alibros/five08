import './landing-hero.css';
import {catalogMap} from './catalog';
import {PANEL_H,panelWidth,type Project} from './model';
import {componentSvg,esc} from './svg';
import type {createInspection,InspectionView} from './inspect3d';

export function heroMarkup(){
  return`<section class="showcase" id="showcase" aria-labelledby="showcase-title">
    <div class="showcase-scene" id="showcase-scene"></div>
    <img class="showcase-poster" src="/halo-showcase.webp?v=${__FIVE08_REV__}" width="1000" height="1200" alt="Example Eurorack panel designed in Five08" fetchpriority="high">
    <div class="showcase-copy">
      <span class="showcase-category">EURORACK PANEL DESIGNER</span>
      <h1 id="showcase-title">FIVE08</h1>
      <p class="showcase-pitch">1 HP = <strong>5.08 mm</strong></p>
      <p class="showcase-description">Real dimensions. Detailed 3D. Artwork and machining files, from one panel design.</p>
      <div class="showcase-actions"><a class="button" href="/app/">Open the designer</a><button class="quiet-link" id="hero-open-demo">Edit this panel</button></div>
      <p class="showcase-license" id="showcase-status" role="status">Open source · No account · Local-first</p>
    </div>
    <div class="showcase-foot">
      <div class="showcase-identity"><strong>Live 3D preview</strong><span id="showcase-size">20 HP · 101.20 × 128.5 mm</span></div>
      <div class="switcher showcase-views" role="group" aria-label="Showcase 3D viewpoint">
        <button data-hero-view="iso" aria-pressed="true" class="on" disabled>3D</button><button data-hero-view="front" aria-pressed="false" disabled>Front</button><button data-hero-view="side" aria-pressed="false" disabled>Side</button><button data-hero-view="rear" aria-pressed="false" disabled>Rear</button>
      </div>
    </div>
    <span class="showcase-error" id="showcase-error" hidden>3D unavailable in this browser</span>
  </section>`;
}

/** Printed artwork only: the inspection renderer supplies the physical panel and hardware. */
export function showcaseArtwork(p:Project){
  const width=panelWidth(p.panel);
  const source=`<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(width/PANEL_H*1536)}" height="1536" viewBox="0 0 ${width} ${PANEL_H}">${p.items.filter(i=>!i.hidden).map(i=>componentSvg(i,catalogMap.get(i.componentId)!,p,false,'design')).join('')}</svg>`;
  const doc=new DOMParser().parseFromString(source,'image/svg+xml');
  doc.querySelectorAll('.component-hardware,.design-guide').forEach(el=>el.remove());
  return new XMLSerializer().serializeToString(doc);
}

export function mountShowcase(project:Project,open:()=>void){
  const host=document.querySelector<HTMLElement>('#showcase-scene')!;
  const copy=document.querySelector<HTMLElement>('.showcase-copy')!;
  const foot=document.querySelector<HTMLElement>('.showcase-foot')!;
  const buttons=[...document.querySelectorAll<HTMLButtonElement>('[data-hero-view]')];
  let inspection:ReturnType<typeof createInspection>|undefined;
  let revision=0,timer=0,visible=true,dirty=true,closed=false,view:InspectionView='iso';
  const refresh=async()=>{
    if(closed||!visible||!dirty)return;
    const current=++revision;dirty=false;
    try{
      const {createInspection}=await import('./inspect3d');
      if(closed||current!==revision||!visible){dirty=true;return;}
      inspection?.dispose();
      inspection=createInspection(host,project,catalogMap,showcaseArtwork(project),{
        background:null,pageInteraction:true,
        insets:(w,h)=>{
          const desktop=window.matchMedia('(min-width:760px)').matches;
          const top=desktop?22:copy.offsetTop+copy.offsetHeight+12;
          const bottom=Math.max(70,h-foot.offsetTop+12);
          host.parentElement!.style.setProperty('--showcase-top',`${top}px`);
          host.parentElement!.style.setProperty('--showcase-bottom',`${bottom}px`);
          return{left:desktop?w*.43:10,right:desktop?18:10,top,bottom};
        },
      });
      inspection.setView(view);buttons.forEach(button=>button.disabled=false);
      document.querySelector('#showcase-size')!.textContent=`${project.panel.hp} HP · ${panelWidth(project.panel).toFixed(2)} × ${PANEL_H} mm`;
      document.querySelector<HTMLElement>('#showcase-error')!.hidden=true;
    }catch{
      host.replaceChildren();buttons.forEach(button=>button.disabled=true);
      document.querySelector<HTMLElement>('#showcase-error')!.hidden=false;
    }
  };
  const schedule=()=>{dirty=true;window.clearTimeout(timer);timer=window.setTimeout(()=>void refresh(),200);};
  buttons.forEach(button=>button.onclick=()=>{
    view=button.dataset.heroView as InspectionView;inspection?.setView(view);
    buttons.forEach(b=>{b.classList.toggle('on',b===button);b.setAttribute('aria-pressed',String(b===button));});
  });
  document.querySelector<HTMLButtonElement>('#hero-open-demo')!.onclick=open;
  const observer=new IntersectionObserver(([entry])=>{
    visible=entry.isIntersecting;if(visible&&dirty)void refresh();
  },{rootMargin:'100px'});
  observer.observe(host);
  const dispose=()=>{closed=true;revision++;window.clearTimeout(timer);observer.disconnect();inspection?.dispose();};
  window.addEventListener('pagehide',dispose,{once:true});
  // History restoration can reuse the DOM after pagehide has released the renderer.
  window.addEventListener('pageshow',event=>{if(event.persisted){closed=false;dirty=true;observer.observe(host);window.addEventListener('pagehide',dispose,{once:true});}});
  return{refresh:schedule};
}

export function studioMarkup(){
  const tools=[
    ['01','3D inspection','53 detailed parts','Front, side and rear views. Distinct materials, real panel thickness and optional clearance envelopes.'],
    ['02','Reusable assemblies','Build once. Place again.','Save a channel strip or a control cluster, then move it between projects as a portable assembly.'],
    ['03','Panel-wide styling','One visual language','Shared typography, inverted output labels, adjustable knob scales, and your own SVG or PNG artwork.'],
    ['04','Configurable preflight','Four kinds of checks','Machining, assembly, ergonomics and artwork checks, with the limits saved in your project.'],
    ['05','Fabrication exports','Nine output formats','Artwork and cutout SVG, DXF, 1:1 print, KiCad mechanical outlines, VCV Rack, PNG, CSV and project JSON.'],
    ['06','Local projects','Yours to keep','Autosaved projects, undo history and editable JSON backups. No account or server-side project storage.'],
  ];
  return`<section class="studio-overview" id="studio" aria-labelledby="studio-heading">
    <header><span class="section-no">THE STUDIO</span><h2 id="studio-heading">A panel, from every angle.</h2><a class="quiet-link" href="/app/">Open the designer</a></header>
    <div class="studio-capabilities">${tools.map(([n,title,value,description])=>`<article><span class="capability-no">${n}</span><h3>${esc(title)}</h3><strong>${esc(value)}</strong><p>${esc(description)}</p></article>`).join('')}</div>
    <p class="studio-accuracy">Hardware footprints stay catalogue-sized. Front details are illustrative; manufacturer drawings remain the authority for fabrication.</p>
  </section>`;
}
