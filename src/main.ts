import './style.css';
import {catalog,catalogMap,categories} from './catalog';
import {applyFinish,panelFinishes} from './finishes';
import {clone,dimensionLocked,emptyProject,PANEL_H,panelWidth,parseProject,uid,type ComponentDefinition,type Item,type Project} from './model';
import {componentSvg,cutoutSvg,esc,finishSwatchSvg,mountingSvg,panelFinishDefs,panelFinishSurface,plotSheetSvg,rackContextSvg,screwsSvg,templateSvg,thumbnailSvg} from './svg';
import {applyPlacements,expandGroups,extent,flipVertical,gridPlacements,matchSize,mirrorPlacements,repeatItems,rotateGroup,rotatePlacements,spreadBetween} from './arrange';
import {sanitizeProjectArtwork,sanitizeSvg,svgDataUrl} from './artwork';
import {panelDxf} from './dxf';
import {History} from './history';
import {cutoutLabel} from './geometry';
import {openPalette,type Command} from './palette';
import {issueCounts,preflight,type Issue} from './preflight';
import {printSheet,svgToPng} from './raster';
import {activeId,deleteProject,duplicateProject,listProjects,listRecovery,migrateLegacy,newProjectId,pushRecovery,readPrefs,readProject,renameProject,saveProject,setActiveId,storageUsed,writePrefs,type Prefs} from './store';
import {pulse,roll} from './roll';
import {units} from './units';
import {applyTheme,nextTheme,watchSystemTheme,type Theme} from './theme';
import {registerOffline} from './offline';

const PX=4, grids=[.5,1,2.54,5.08];
const MIN_ZOOM=.3, MAX_ZOOM=6;
const prefs:Prefs=readPrefs();
let projectId=bootId();
let project=load(projectId), selection=new Set<string>();
const history=new History(project);
let gridIndex=grids.indexOf(prefs.grid)<0?1:grids.indexOf(prefs.grid);
let snap=prefs.snap,smartGuides=prefs.smartGuides,showSafe=prefs.showSafe,showGrid=prefs.showGrid,theme:Theme=prefs.theme;
/* The focus ring is a keyboard affordance. It follows :focus-visible rather
   than focus — a part clicked or dragged with a pointer does not wear one —
   unless someone turns it on for good. */
let focusRing=prefs.focusRing,usingKeyboard=false;
let showRack=false;
let zoom=fitZoom(),view:'design'|'cutout'|'rear'='design',libraryQuery='',activeCategory='All',inspectorTab:'context'|'panel'|'layers'='context',leftOpen=true,rightOpen=true;
let issues:Issue[]=[];
type MoveDrag={mode:'move';startClientX:number;startClientY:number;orig:Map<string,{x:number;y:number}>;moved:boolean};
type ResizeDrag={mode:'resize';itemId:string;corner:'nw'|'ne'|'sw'|'se';startX:number;startY:number;startWidth:number;startHeight:number;moved:boolean};
type MarqueeDrag={mode:'marquee';startX:number;startY:number;x:number;y:number;base:Set<string>;moved:boolean};
type PanDrag={mode:'pan';startClientX:number;startClientY:number;scrollLeft:number;scrollTop:number;moved:boolean};
let drag:null|MoveDrag|ResizeDrag|MarqueeDrag|PanDrag=null;
let lastGuideKey='',lastSelectionKey='',lastFocusId='';
let spaceHeld=false;
let focusedId='';
let toastTimer=0;
let clipboard:Item[]=[];

/* One stroke, one grid. Every icon is drawn at the same 1.5 px weight on a
   24-unit square, so none of them shouts over the text beside it. */
type IconName='undo'|'redo'|'folder'|'save'|'plus'|'minus'|'export'|'trash'|'left'|'right'|'help'|'command'|'theme'|'rotate'|'mirror'|'grid'
  |'eye'|'eye-off'|'lock'|'unlock'|'art'|'cut'|'dxf'|'png'|'print'|'vcv'|'bom'|'json'|'check'|'warn'|'cross'|'image';
const icon=(name:IconName)=>{const paths:Record<IconName,string>={
  minus:'M5 12h14',
  eye:'M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  'eye-off':'M3 3l18 18M10.5 5.7A10 10 0 0 1 12 5.5c6.5 0 10 6.5 10 6.5a17 17 0 0 1-3.2 3.9M6.6 6.6C3.8 8.5 2 12 2 12s3.5 6.5 10 6.5c1.6 0 3-.4 4.3-1M9.9 9.9a3 3 0 0 0 4.2 4.2',
  lock:'M6 11V8a6 6 0 0 1 12 0v3M5 11h14v10H5z',
  unlock:'M6 11V8a6 6 0 0 1 11.6-2.2M5 11h14v10H5z',
  art:'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4M15.5 9.5h.01',
  cut:'M4 4h16v16H4zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 6v2M12 16v2M6 12h2M16 12h2',
  dxf:'M12 3 3 8l9 5 9-5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5',
  png:'M4 4h16v16H4zM4 9.3h16M4 14.6h16M9.3 4v16M14.6 4v16',
  print:'M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z',
  vcv:'M13 2 4 14h7l-1 8 9-12h-7l1-8z',
  bom:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  json:'M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1M16 3h1a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2 2 2 0 0 0-2 2v5a2 2 0 0 1-2 2h-1',
  check:'m5 12 5 5L20 7',
  warn:'M12 3 2 20h20L12 3zM12 10v4M12 17h.01',
  cross:'M6 6l12 12M18 6 6 18',
  image:'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4M15.5 9.5h.01',
  command:'M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z',
  theme:'M12 3a9 9 0 0 0 0 18 9 9 0 0 1 0-18M12 3v18',
  rotate:'M20 12a8 8 0 1 1-2.5-5.8M20 3v5h-5',
  mirror:'M12 3v18M7 8 3 12l4 4M17 8l4 4-4 4',
  grid:'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',undo:'M9 7H4V2M4 7l4-4M4 7a7 7 0 1 0 2-5',redo:'M15 7h5V2m0 5-4-4m4 4a7 7 0 1 1-2-5',folder:'M3 6h7l2 2h9v11H3z',save:'M5 3h12l2 2v16H5zM8 3v6h8V3M8 15h8v6H8z',plus:'M12 5v14M5 12h14',export:'M12 16V3m-5 5 5-5 5 5M5 14v7h14v-7',trash:'M4 7h16M9 7V4h6v3m-8 0 1 14h8l1-14',left:'m14 6-6 6 6 6',right:'m10 6 6 6-6 6',help:'M9.5 9a2.5 2.5 0 1 1 3 2.45c-.5.2-.5.8-.5 1.55M12 18h.01'};return`<svg class="ui-icon icon-${name}" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]}"/></svg>`;};

const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`<div class="skip-links">
  <button class="skip" id="skip-canvas">Skip to the panel</button>
  <button class="skip" id="skip-inspector">Skip to the inspector</button>
</div><main class="app">
 <header class="topbar"><a class="brand" href="/" aria-label="Five08 home"><div class="brand-mark"></div><div><strong>five08</strong><small>Eurorack panel designer</small></div></a><span class="top-divider"></span><div class="project-identity"><span class="eyebrow">Panel</span><input class="project-name" id="project-name" aria-label="Panel name" spellcheck="false"></div><div class="history-group"><button class="icon-button" id="undo" aria-label="Undo" data-tooltip="Undo · ⌘Z">${icon('undo')}</button><button class="icon-button" id="redo" aria-label="Redo" data-tooltip="Redo · ⇧⌘Z">${icon('redo')}</button></div><span class="spacer"></span><button class="command-hint" id="open-palette" data-tooltip="All commands · ⌘K">${icon('command')}<span>Commands</span><kbd id="palette-key">⌘K</kbd></button><div class="file-group"><button class="tool-button subtle" id="new-project" data-tooltip="New panel">${icon('plus')}<span>New</span></button><button class="tool-button subtle" id="open-library" data-tooltip="Your panels · ⌘O">${icon('folder')}<span>Panels</span></button><button class="tool-button subtle" id="save-json" data-tooltip="Download .panel.json · ⌘S">${icon('save')}<span>Save</span></button></div><button class="tool-button primary export-button" id="export" data-tooltip="Export · ⌘E">${icon('export')} Export</button><button class="icon-button" id="theme-toggle" aria-label="Change theme">${icon('theme')}</button><button class="icon-button" id="help" aria-label="Keyboard shortcuts" data-tooltip="Help & shortcuts">${icon('help')}</button><input id="file-input" type="file" accept=".json,application/json" hidden></header>
 <div class="layout"><aside class="sidebar library"><div class="side-head"><div><span class="eyebrow">Create</span><h2>Components</h2></div><div class="head-actions"><span id="library-count"></span><button class="collapse-button" id="collapse-left" aria-label="Collapse component library">${icon('left')}</button></div></div><div class="library-tools"><div class="search-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg><input id="library-search" type="search" placeholder="Search parts, families, makers…" aria-label="Search components"></div><div class="category-tabs" id="category-tabs"></div></div><div class="side-scroll" id="library"></div></aside>
 <section class="canvas-wrap"><div class="precision-bar"><button class="collapse-rail left-rail" id="open-left" aria-label="Show component library">${icon('right')}</button><div class="segmented" id="views" role="group" aria-label="Panel view"><button data-view="design">Hardware</button><button data-view="cutout">Cutouts</button><button data-view="rear">Rear clearance</button></div><div class="mode-context" id="mode-context"><span></span><small></small></div><span class="spacer"></span><div class="layout-tools" role="toolbar" aria-label="Alignment"><button class="quiet" id="align-x" data-tooltip="Align horizontal centres">Align X</button><button class="quiet" id="align-y" data-tooltip="Align vertical centres">Align Y</button><button class="quiet" id="distribute-h" data-tooltip="Equal horizontal spacing">Space H</button><button class="quiet" id="distribute-v" data-tooltip="Equal vertical spacing">Space V</button><button class="quiet" id="center-panel" data-tooltip="Centre the selection across the panel">Centre</button><span class="precision-divider"></span><button class="quiet icon-tool" id="tool-grid" data-tooltip="Arrange in a grid">${icon('grid')}</button><button class="quiet icon-tool" id="tool-mirror" data-tooltip="Mirror across the centreline · M">${icon('mirror')}</button><button class="quiet icon-tool" id="tool-rotate" data-tooltip="Rotate 90° · R">${icon('rotate')}</button></div><span class="precision-divider"></span><button class="quiet on" id="smart-guides">Smart guides</button><button class="quiet" id="toggle-safe">Safe zones</button><button class="quiet" id="toggle-rack" data-tooltip="Show the neighbouring modules">Rack</button><button class="collapse-rail right-rail" id="open-right" aria-label="Show inspector">${icon('left')}</button></div><div class="ruler-corner">0,0</div><div class="ruler ruler-x" id="ruler-x"></div><div class="ruler ruler-y" id="ruler-y"></div><div class="canvas" id="canvas" tabindex="0" aria-label="Panel canvas. Press Enter to step through the parts on it."><div class="panel-stage" id="panel-stage"></div></div><div class="cursor-tag mono" id="cursor-tag" aria-hidden="true"></div><div class="selection-bar" id="selection-bar"></div><div class="canvas-toolbar"><div class="toolbar-group"><button id="zoom-out" aria-label="Zoom out">${icon('minus')}</button><button id="zoom-fit" data-tooltip="Fit panel · 0">Fit</button><button id="zoom-selection" data-tooltip="Zoom to selection · F">Selection</button><button id="zoom-100">100%</button><button id="zoom-in" aria-label="Zoom in">${icon('plus')}</button></div><span></span><div class="toolbar-group"><button id="snap-toggle">Grid snap</button><button id="grid-cycle">1 mm</button><button id="grid-toggle">Grid</button></div><span></span><label class="toolbar-switch" data-tooltip="Fade the hardware, keep the artwork"><input type="checkbox" id="light-table"><span>Light table</span></label></div></section>
 <aside class="sidebar right"><div class="side-head"><div><span class="eyebrow">Inspect</span><h2 id="inspector-title">Panel</h2></div><div class="head-actions"><button class="icon-button danger" id="delete" aria-label="Delete selection" data-tooltip="Delete selection">${icon('trash')}</button><button class="collapse-button" id="collapse-right" aria-label="Collapse inspector">${icon('right')}</button></div></div><nav class="inspector-tabs" aria-label="Inspector sections"><button data-inspector-tab="context">Context</button><button data-inspector-tab="panel">Panel</button><button data-inspector-tab="layers">Layers <span id="layers-count"></span></button></nav><div class="side-scroll" id="inspector"></div></aside></div>
 <footer class="statusbar"><button class="status-control ready" id="save-status"><i class="dot"></i>Saved locally</button><span id="dimensions"></span><span id="selection-status"></span><span id="coordinates">X — · Y —</span><span class="spacer"></span><span id="zoom-status" class="mono roll"><span class="roll-int tight" data-unit="%" style="--n:100" aria-hidden="true"></span><span class="sr-only">100%</span></span><span id="snap-status">Snap · 1 mm</span><button class="status-control" id="warning-count"></button></footer>
</main>
<svg class="defs-host" aria-hidden="true" width="0" height="0"><defs><filter id="glow" x="-75%" y="-75%" width="250%" height="250%"><feGaussianBlur stdDeviation="1" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs></svg>
<div class="toast" id="toast" role="status" aria-live="polite"></div>`;

document.querySelector<HTMLAnchorElement>('.brand')!.innerHTML=
  '<img src="/five08-logo.svg" width="112" height="40" alt="Five08"><small>Eurorack panel designer</small>';

function bootId(){
  const migrated=migrateLegacy();
  if(migrated){setActiveId(migrated.id);return migrated.id;}
  const current=activeId();
  if(current&&readProject(current))return current;
  return listProjects()[0]?.id??newProjectId();
}
function load(id:string):Project{
  try{
    const raw=readProject(id);
    if(!raw)return emptyProject();
    return sanitizeProjectArtwork(parseProject(raw,catalogMap)).project;
  }catch{return emptyProject();}
}

let persistTimer=0,pendingSave=false,lastSaved=0;
function persist(){pendingSave=true;setSaveStatus('saving');window.clearTimeout(persistTimer);persistTimer=window.setTimeout(flush,400);}
function flush(){
  if(!pendingSave)return;
  window.clearTimeout(persistTimer);
  const result=saveProject(projectId,project);
  pendingSave=false;
  if(result.ok){lastSaved=Date.now();setActiveId(projectId);setSaveStatus('saved');}
  else{setSaveStatus(result.reason);notify(result.reason==='quota'?'Browser storage is full. Save a .panel.json copy, then delete old projects.':'This browser is blocking local storage. Save a .panel.json copy.');}
}
function setSaveStatus(state:'saving'|'saved'|'quota'|'unavailable'){
  const el=document.querySelector('#save-status');if(!el)return;
  const minutes=Math.floor((Date.now()-lastSaved)/60000);
  const text=state==='saving'?'Saving…':state==='quota'?'Storage full':state==='unavailable'?'Not saving':lastSaved&&minutes>=1?`Saved ${minutes} min ago`:'Saved locally';
  const wasSaving=el.textContent?.includes('Saving');
  el.innerHTML=`<i class="dot"></i>${text}`;
  el.classList.toggle('ready',state==='saved'||state==='saving');
  el.classList.toggle('danger',state==='quota'||state==='unavailable');
  // A green hairline that blinks once: the save landed, no toast required.
  if(state==='saved'&&wasSaving)pulse(el,'flash-ok');
}
function savePrefs(){writePrefs({theme,grid:grids[gridIndex],snap,smartGuides,showGrid,showSafe,focusRing});}
function saveRecovery(){pushRecovery(project);}
function fitZoom(){
  const width=Math.max(320,window.innerWidth-(leftOpenAtBoot()?700:220));
  const height=Math.max(320,window.innerHeight-210);
  const w=panelWidth(project.panel);
  return Math.max(MIN_ZOOM,Math.min(2.4,Math.min(height/(PANEL_H*PX),width/(w*PX))));
}
function leftOpenAtBoot(){return window.innerWidth>1180;}
function mutate(fn:()=>void){fn();history.push(project);persist();render();}
function notify(s:string){const e=document.querySelector('#toast')!;window.clearTimeout(toastTimer);e.textContent=s;e.classList.add('show');toastTimer=window.setTimeout(()=>e.classList.remove('show'),2200);}
function sv(v:number){return snap?Math.round(v/grids[gridIndex])*grids[gridIndex]:Math.round(v*10)/10;}
function magneticGrid(v:number){const free=Math.round(v*100)/100;if(!snap)return free;const step=grids[gridIndex],nearest=Math.round(v/step)*step,tolerance=Math.max(.05,Math.min(.18,.9/(PX*zoom)));return Math.abs(nearest-v)<=tolerance?nearest:free;}
function selectedItems(){return project.items.filter(i=>selection.has(i.id));}
/** Clicking one member of a group selects the whole group. */
const selectIds=(ids:Iterable<string>)=>{selection=expandGroups(ids,project.items);};

function render(){
  issues=preflight(project,catalogMap);
  renderLibrary();renderCanvas();renderInspector();renderChrome();
}
function renderChrome(){(document.querySelector('#project-name') as HTMLInputElement).value=project.name;const w=panelWidth(project.panel),items=selectedItems();document.querySelector('#dimensions')!.textContent=units(`${project.panel.hp} HP · ${w.toFixed(2)} × ${PANEL_H} mm`);document.querySelector('#selection-status')!.textContent=items.length===1?`${catalogMap.get(items[0].componentId)!.name} · X ${items[0].x.toFixed(1)} Y ${items[0].y.toFixed(1)}`:items.length>1?`${items.length} selected`:`${project.items.length} components`;setZoomStatus();document.querySelector('#snap-status')!.textContent=`${smartGuides?'Guides':'No guides'} · ${snap?`${grids[gridIndex]} mm grid`:'free'}`;const counts=issueCounts(issues),wc=document.querySelector('#warning-count')!;const wasVerdict=wc.textContent;wc.innerHTML=counts.errors?`${icon('cross')}${counts.errors} error${counts.errors===1?'':'s'}${counts.warnings?` · ${counts.warnings} warning${counts.warnings===1?'':'s'}`:''}`:counts.warnings?`${icon('warn')}${counts.warnings} warning${counts.warnings===1?'':'s'}`:`${icon('check')}Layout checks pass`;wc.classList.toggle('warn',counts.warnings>0&&counts.errors===0);wc.classList.toggle('bad',counts.errors>0);if(wasVerdict&&wasVerdict!==wc.textContent)pulse(wc,'swap');(document.querySelector('#undo') as HTMLButtonElement).disabled=!history.canUndo;(document.querySelector('#redo') as HTMLButtonElement).disabled=!history.canRedo;(document.querySelector('#delete') as HTMLButtonElement).disabled=selection.size===0;(document.querySelector('#align-x') as HTMLButtonElement).disabled=selection.size<2;(document.querySelector('#align-y') as HTMLButtonElement).disabled=selection.size<2;(document.querySelector('#distribute-h') as HTMLButtonElement).disabled=selection.size<3;(document.querySelector('#distribute-v') as HTMLButtonElement).disabled=selection.size<3;(document.querySelector('#center-panel') as HTMLButtonElement).disabled=selection.size===0;document.querySelector('#grid-cycle')!.textContent=`${grids[gridIndex]} mm`;document.querySelector('#snap-toggle')!.classList.toggle('on',snap);(document.querySelector('#zoom-selection') as HTMLButtonElement).disabled=selection.size===0;document.querySelector('#theme-toggle')!.setAttribute('data-tooltip',`Theme: ${theme}`);document.querySelector('#smart-guides')!.classList.toggle('on',smartGuides);document.querySelector('#grid-toggle')!.classList.toggle('on',showGrid);document.querySelector('#toggle-safe')!.classList.toggle('on',showSafe);document.querySelector('#toggle-rack')!.classList.toggle('on',showRack);document.querySelectorAll('[data-view]').forEach(e=>{const on=(e as HTMLElement).dataset.view===view;e.classList.toggle('on',on);e.setAttribute('aria-pressed',String(on));});document.querySelectorAll('[data-inspector-tab]').forEach(e=>{const on=(e as HTMLElement).dataset.inspectorTab===inspectorTab;e.classList.toggle('on',on);e.setAttribute('aria-selected',String(on));});document.querySelector('.layout')!.classList.toggle('left-closed',!leftOpen);document.querySelector('.layout')!.classList.toggle('right-closed',!rightOpen);document.querySelector('#layers-count')!.textContent=String(project.items.length);const context={design:['Hardware view','Front-panel controls and artwork'],cutout:['Machining view','Cutouts and drilling geometry'],rear:['Rear clearance','Bodies, depth and keepout zones']}[view];document.querySelector('#mode-context')!.innerHTML=`<span>${context[0]}</span><small>${context[1]}</small>`;renderSelectionBar();}

function renderLibrary(){const tabs=document.querySelector('#category-tabs')!;tabs.innerHTML=['All',...categories].map(c=>`<button class="category-pill ${c===activeCategory?'on':''}" data-category="${c}">${c==='All'?'All parts':c}</button>`).join('');tabs.querySelectorAll<HTMLElement>('[data-category]').forEach(b=>b.onclick=()=>{activeCategory=b.dataset.category!;renderLibrary();});const q=libraryQuery.trim().toLowerCase();const defs=catalog.filter(d=>!d.libraryHidden&&(activeCategory==='All'||d.category===activeCategory)&&(!q||[d.name,d.description,...d.tags,d.manufacturer||''].some(x=>x.toLowerCase().includes(q))));document.querySelector('#library-count')!.textContent=`${defs.length} part${defs.length===1?'':'s'}`;const groups=activeCategory==='All'?[...categories]:[activeCategory];document.querySelector('#library')!.innerHTML=groups.map(cat=>{const ds=defs.filter(d=>d.category===cat);return ds.length?`<section class="drawer-section"><h3 class="drawer-tab"><span>${cat}</span><i>${ds.length}</i></h3><div class="drawer-grid">${ds.map(d=>`<button class="part-card" data-component="${d.id}" draggable="true" aria-label="Add ${d.name}" title="${esc(d.name)} · ${d.width} × ${d.height} mm${d.cutout?` · ${cutoutLabel(d)}`:''}${d.status==='verified'?' · verified against a datasheet':''}"><span class="part-thumbnail">${thumbnailSvg(d,project,d.color,44)}</span><strong>${esc(d.name)}</strong><small class="mono">${d.width} × ${d.height}${d.cutout?`<b> · ${cutoutLabel(d).replace(' cutout','')}</b>`:''}</small>${d.status==='verified'?'<i class="verified" aria-hidden="true"></i>':''}<span class="add-part" aria-hidden="true">Add</span></button>`).join('')}</div></section>`:''}).join('')||`<div class="empty-library"><strong>No matching parts</strong><span>Try another name, family or manufacturer.</span></div>`;document.querySelectorAll<HTMLElement>('[data-component]').forEach(b=>{b.onclick=()=>add(b.dataset.component!);b.ondragstart=e=>e.dataTransfer?.setData('component',b.dataset.component!);});}
function finishCards(){return panelFinishes.map(f=>`<button class="finish-card ${project.panel.finish===f.id?'selected':''}" data-finish="${f.id}" aria-label="Use ${f.name}"><span class="finish-swatch">${finishSwatchSvg(f,32)}</span><span><strong>${f.name}</strong><small>${f.material}</small></span>${project.panel.finish===f.id?`<b>${icon('check')}</b>`:''}</button>`).join('');}
function imageControl(i:Item){return`<div class="image-object-control ${i.imageData?'has-image':''}">${i.imageData?`<span class="surface-preview" style="background-image:url('${i.imageData}')"></span><span><strong>PNG loaded</strong><small>Transparency is preserved</small></span><button class="surface-remove" id="remove-item-image" type="button">Remove</button>`:`<span class="surface-upload-icon">${icon('image')}</span><span><strong>Add artwork</strong><small>PNG or SVG, logo or texture</small></span><label class="surface-upload">Choose<input id="item-image-file" type="file" accept="image/png,image/svg+xml,.svg" hidden></label>`}</div><p class="surface-note">PNG only · maximum 1.5 MB · resize with Width and Height</p>`;}
function presetOwner(d:ComponentDefinition){return d.sizePresets?d:catalog.find(x=>x.sizePresets?.some(p=>p.componentId===d.id));}
const FONTS:Array<[string,string]>=[['sans','Sans'],['condensed','Condensed'],['mono','Mono']];
const ALIGNS:Array<[string,string]>=[['start','Left'],['middle','Centre'],['end','Right']];

/** Typography is only meaningful on the text part; ticks only on the scale. */
function graphicsControl(i:Item,d:ComponentDefinition){
  if(d.renderer==='scale')
    return`<div class="section-card"><div class="section-label">Scale</div>${field('Tick marks','ticks',i.count??11,'number',1,'')}</div>`;
  if(d.renderer!=='text')return'';
  return`<div class="section-card"><div class="section-label">Type</div>
    <div class="form-row"><label>Text</label><textarea id="field-text-body" rows="2" spellcheck="false" aria-label="Label text">${esc(i.label)}</textarea></div>
    <div class="two-col">
      <div class="form-row"><label>Font</label><select id="text-font">${FONTS.map(([v,n])=>`<option value="${v}" ${(i.font??'sans')===v?'selected':''}>${n}</option>`).join('')}</select></div>
      <div class="form-row"><label>Align</label><select id="text-align">${ALIGNS.map(([v,n])=>`<option value="${v}" ${(i.align??'middle')===v?'selected':''}>${n}</option>`).join('')}</select></div>
    </div>
    <div class="two-col">${field('Weight','text-weight',i.weight??700,'number',100,'')}${field('Tracking','text-tracking',i.tracking??.04,'number',.01,'em')}</div>
    <p class="section-hint">Outline the text in a vector editor before fabrication — a fabricator without the font will silently substitute another.</p>
  </div>`;
}

function bindGraphicsControl(i:Item,d:ComponentDefinition){
  const num=(id:string,apply:(v:number)=>void)=>{
    const el=document.querySelector<HTMLInputElement>(`#field-${id}`);
    if(el)el.onchange=()=>mutate(()=>apply(Number(el.value)));
  };
  const pick=(id:string,apply:(v:string)=>void)=>{
    const el=document.querySelector<HTMLSelectElement>(`#${id}`);
    if(el)el.onchange=()=>mutate(()=>apply(el.value));
  };
  if(d.renderer==='scale')num('ticks',v=>i.count=Math.max(2,Math.min(64,Math.round(v))));
  if(d.renderer!=='text')return;
  const body=document.querySelector<HTMLTextAreaElement>('#field-text-body');
  if(body)body.onchange=()=>mutate(()=>i.label=body.value.slice(0,200));
  pick('text-font',v=>i.font=v as Item['font']);
  pick('text-align',v=>i.align=v as Item['align']);
  num('text-weight',v=>i.weight=Math.max(100,Math.min(900,Math.round(v/100)*100)));
  num('text-tracking',v=>i.tracking=Math.max(-.2,Math.min(1,v)));
}

function sizeControl(d:ComponentDefinition){const owner=presetOwner(d);if(owner)return`<div class="form-row size-preset"><label>Standard size</label><select id="size-preset">${owner.sizePresets!.map(p=>`<option value="${p.componentId}" ${p.componentId===d.id?'selected':''}>${p.label}</option>`).join('')}</select></div>`;return dimensionLocked(d)?`<div class="locked-size-note"><span>${icon('lock')}</span><div><strong>Mechanical size locked</strong><small>${d.width} × ${d.height} mm · based on the selected hardware</small></div></div>`:'';}
function renderCanvas(){const w=panelWidth(project.panel),stage=document.querySelector<HTMLDivElement>('#panel-stage')!;stage.style.width=`${w*PX*zoom}px`;stage.style.height=`${PANEL_H*PX*zoom}px`;const safe=showSafe?`<g class="design-guide"><rect x="3" y="3" width="${w-6}" height="${PANEL_H-6}" rx="1" fill="none" stroke="${project.accentColor}" stroke-opacity=".35" stroke-width=".3" stroke-dasharray="1 1"/><rect width="${w}" height="8" fill="${project.accentColor}" opacity=".045"/><rect y="${PANEL_H-8}" width="${w}" height="8" fill="${project.accentColor}" opacity=".045"/></g>`:'';const grid=showGrid?`<rect class="design-guide" width="${w}" height="${PANEL_H}" fill="url(#grid)"/>`:'';const visible=project.items.filter(i=>!i.hidden);stage.innerHTML=`<svg class="panel-svg" id="panel-svg" width="${w*PX}" height="${PANEL_H*PX}" viewBox="0 0 ${w} ${PANEL_H}" style="transform:scale(${zoom});transform-origin:top left"><defs>${panelFinishDefs(project)}<pattern id="grid" width="${grids[gridIndex]}" height="${grids[gridIndex]}" patternUnits="userSpaceOnUse"><path d="M ${grids[gridIndex]} 0H0V${grids[gridIndex]}" fill="none" stroke="${project.inkColor}" stroke-opacity=".08" stroke-width=".1"/></pattern><style>.cut{fill:none;stroke:#ef523c;stroke-width:.45}.panel-item:focus{outline:none}.smart-line{stroke:var(--trace,#2563a8);stroke-width:.42;vector-effect:non-scaling-stroke}.measure-line{stroke:var(--signal,#c8321e);stroke-width:.35;vector-effect:non-scaling-stroke}.measure-text{fill:#fff;font:1.75px ui-monospace,monospace;paint-order:stroke;stroke:var(--signal-ink,#8e2415);stroke-width:.7px}.equal-pill{fill:var(--signal,#c8321e)}.equal-text{fill:#fff;font:bold 1.45px ui-monospace,monospace}.marquee{fill:var(--trace,#2563a8);fill-opacity:.08;stroke:var(--ink,#191b1e);stroke-width:.3;stroke-dasharray:1.2 .9;vector-effect:non-scaling-stroke}.marquee-hit{fill:none;stroke:var(--trace,#2563a8);stroke-width:.35;stroke-dasharray:1 .8;vector-effect:non-scaling-stroke}.marquee-dim{fill:var(--ink,#191b1e);font:1.9px ui-monospace,monospace;paint-order:stroke;stroke:var(--paper,#f2efe6);stroke-width:.8px}.focus-ring{fill:none;stroke:var(--trace,#2563a8);stroke-width:1.6;stroke-dasharray:2 1.4;vector-effect:non-scaling-stroke;paint-order:stroke}</style></defs>${showRack?rackContextSvg(project):''}<rect class="light-sheet" width="${w}" height="${PANEL_H}" rx=".6" fill="#fff"/>${panelFinishSurface(project,w)}${grid}${safe}${view!=='rear'?mountingSvg(project)+(showRack&&view==='design'?screwsSvg(project):''):''}${visible.map(i=>componentSvg(i,catalogMap.get(i.componentId)!,project,selection.has(i.id),view)).join('')}<g id="smart-guide-layer" pointer-events="none"></g><g id="overlay-layer" pointer-events="none"></g><g id="focus-layer" pointer-events="none"></g>${project.items.length===0?emptyPanelSvg(w):''}</svg>`;const selectionKey=[...selection].sort().join();if(selectionKey!==lastSelectionKey){stage.querySelectorAll('.selection-ui').forEach(g=>g.classList.add('landing'));lastSelectionKey=selectionKey;}bindCanvas();renderRuler(w);}
/**
 * Rulers with real millimetre ticks, like a drawing board's: every mm when
 * there is room, every 5 otherwise, numbered every 10. The grid drawn behind
 * the canvas is keyed to the same origin, so the two never disagree.
 */
/** A blank panel is dimensioned, not captioned: the sheet shows what it is. */
function emptyPanelSvg(w:number){
  const ink=project.inkColor,f=(v:number)=>v.toFixed(2);
  const tick=(x:number,y:number)=>`<path d="M${f(x-.6)} ${f(y+.6)}l1.2-1.2"/>`;
  const my=PANEL_H*.62,mx=w*.5;
  return`<g class="empty-panel" fill="none" stroke="${ink}" stroke-width=".22" stroke-opacity=".55">
    <path d="M0 ${f(my)}H${f(w)}M${f(mx)} 0V${f(PANEL_H)}"/>${tick(0,my)}${tick(w,my)}${tick(mx,0)}${tick(mx,PANEL_H)}
    <g fill="${ink}" fill-opacity=".62" stroke="none" font-family="var(--mono)" font-size="2.1" text-anchor="middle">
      <text x="${f(w/2)}" y="${f(my-1.3)}">${w.toFixed(2)}</text>
      <text transform="translate(${f(mx-1.3)} ${f(PANEL_H*.32)}) rotate(-90)">${PANEL_H}</text>
    </g>
    <g fill="${ink}" stroke="none" text-anchor="middle" font-family="var(--sans)">
      <text x="${f(w/2)}" y="${f(PANEL_H*.42)}" font-size="3.2" font-weight="600" fill-opacity=".7">${project.panel.hp} HP · blank</text>
      <text x="${f(w/2)}" y="${f(PANEL_H*.42+4.6)}" font-size="2" fill-opacity=".5">Drag a part in from the left,</text>
      <text x="${f(w/2)}" y="${f(PANEL_H*.42+8)}" font-size="2" fill-opacity=".5">or press ${'\u2318'}K for a template.</text>
    </g>
  </g>`;
}
/** The readout that travels with the pointer over the canvas. */
function cursorTag(e:{clientX:number;clientY:number}|null,text=''){
  const tag=document.querySelector<HTMLElement>('#cursor-tag');
  if(!tag)return;
  if(!e){tag.classList.remove('on');return;}
  const box=document.querySelector<HTMLElement>('.canvas-wrap')!.getBoundingClientRect();
  tag.style.setProperty('--cx',`${(e.clientX-box.left).toFixed(0)}px`);
  tag.style.setProperty('--cy',`${(e.clientY-box.top).toFixed(0)}px`);
  tag.textContent=text;
  tag.classList.add('on');
}
function renderRuler(w:number){
  const rx=document.querySelector<HTMLDivElement>('#ruler-x'),ry=document.querySelector<HTMLDivElement>('#ruler-y');
  const canvas=document.querySelector<HTMLDivElement>('#canvas'),stage=document.querySelector<HTMLDivElement>('#panel-stage'),wrap=document.querySelector<HTMLElement>('.canvas-wrap');
  if(!rx||!ry||!canvas||!stage||!wrap)return;
  const originX=stage.offsetLeft-canvas.scrollLeft,originY=stage.offsetTop-canvas.scrollTop;
  const mm=PX*zoom;
  const minor=mm>=3.2?1:mm>=1.4?5:10,label=mm>=1.4?10:mm>=.7?20:50;
  wrap.style.setProperty('--mm',`${mm}px`);
  wrap.style.setProperty('--ox',`${originX.toFixed(1)}px`);
  wrap.style.setProperty('--oy',`${originY.toFixed(1)}px`);
  wrap.style.setProperty('--grid-mm',String(label));
  const ticks=(length:number,origin:number,extent:number,vertical:boolean)=>{
    const from=Math.floor(-origin/mm/minor)*minor,to=Math.ceil((length-origin)/mm/minor)*minor;
    let out='';
    for(let v=from;v<=to;v+=minor){
      const at=origin+v*mm,inside=v>=0&&v<=extent;
      const major=v%label===0,mid=v%(label/2)===0;
      const len=major?9:mid?6:3.5;
      out+=vertical
        ?`<line x1="${24-len}" x2="24" y1="${at.toFixed(1)}" y2="${at.toFixed(1)}" class="${inside?'':'out'}"/>`
        :`<line y1="${18-len}" y2="18" x1="${at.toFixed(1)}" x2="${at.toFixed(1)}" class="${inside?'':'out'}"/>`;
      if(major)out+=vertical
        ?`<text x="12" y="${(at-3).toFixed(1)}" transform="rotate(-90 12 ${(at-3).toFixed(1)})" text-anchor="middle" class="${inside?'':'out'}">${v}</text>`
        :`<text x="${(at+3).toFixed(1)}" y="8" class="${inside?'':'out'}">${v}</text>`;
    }
    return out;
  };
  const W=rx.clientWidth,H=ry.clientHeight;
  rx.innerHTML=`<svg width="${W}" height="18" aria-hidden="true">${ticks(W,originX,w,false)}</svg>`;
  ry.innerHTML=`<svg width="24" height="${H}" aria-hidden="true">${ticks(H,originY,PANEL_H,true)}</svg>`;
}
function renderSelectionBar(){
  const el=document.querySelector<HTMLDivElement>('#selection-bar')!,items=selectedItems();
  if(!items.length){el.classList.remove('show');el.innerHTML='';return;}
  el.classList.add('show');
  const allLocked=items.every(i=>i.locked);
  el.innerHTML=`<span class="selection-count">${items.length===1?esc(catalogMap.get(items[0].componentId)!.name):`${items.length} selected`}</span><span class="bar-divider"></span>`
    +(items.length>1?`<button data-selection-action="align-x" data-tooltip="Align horizontal centres">Align X</button><button data-selection-action="align-y" data-tooltip="Align vertical centres">Align Y</button><button data-selection-action="grid" data-tooltip="Arrange in a grid">Grid…</button><span class="bar-divider"></span>`:'')
    +(items.length>1?`<button data-selection-action="group" data-tooltip="Group · ⌘G">${items.every(i=>i.groupId)?'Regroup':'Group'}</button>`:'')
    +(items.some(i=>i.groupId)?`<button data-selection-action="ungroup" data-tooltip="Ungroup · ⇧⌘G">Ungroup</button>`:'')
    +`<button data-selection-action="repeat" data-tooltip="Repeat… · ⇧R">Repeat…</button><button data-selection-action="rotate" data-tooltip="Rotate 90° · R">Rotate</button><button data-selection-action="mirror" data-tooltip="Mirror across the centreline · M">Mirror</button><span class="bar-divider"></span><button data-selection-action="duplicate">Duplicate</button><button data-selection-action="lock">${allLocked?'Unlock':'Lock'}</button><button data-selection-action="hide">Hide</button><button class="danger-text" data-selection-action="delete">Delete</button>`;
  el.querySelectorAll<HTMLElement>('[data-selection-action]').forEach(b=>b.onclick=()=>{
    const action=b.dataset.selectionAction;
    if(action==='duplicate')duplicate();
    else if(action==='delete')remove();
    else if(action==='lock')toggleLock();
    else if(action==='hide')mutate(()=>items.forEach(i=>i.hidden=true));
    else if(action==='rotate')rotateSelection(90);
    else if(action==='mirror')mirrorSelection();
    else if(action==='grid')arrangeDialog();
    else if(action==='group')groupSelection();
    else if(action==='ungroup')ungroupSelection();
    else if(action==='repeat')repeatDialog();
    else if(action==='align-x')align('x');
    else if(action==='align-y')align('y');
  });
}
function bindCanvas(){
  const svg=document.querySelector<SVGSVGElement>('#panel-svg')!;
  svg.querySelectorAll<SVGRectElement>('.resize-handle').forEach(handle=>handle.onpointerdown=e=>{
    e.stopPropagation();
    const group=handle.closest<SVGGElement>('.panel-item'),item=project.items.find(x=>x.id===group?.dataset.id);
    if(!item||item.locked)return;
    selection=new Set([item.id]);
    const p=point(e,svg);
    drag={mode:'resize',itemId:item.id,corner:handle.dataset.resize as ResizeDrag['corner'],startX:p.x,startY:p.y,startWidth:item.width,startHeight:item.height,moved:false};
    capture(handle,e.pointerId);
  });
  svg.querySelectorAll<SVGGElement>('.panel-item').forEach(g=>g.onpointerdown=e=>{
    if(e.button===1||spaceHeld)return;
    e.stopPropagation();
    const id=g.dataset.id!,item=project.items.find(i=>i.id===id)!;
    if(e.shiftKey){
      const group=expandGroups([id],project.items);
      const remove=selection.has(id);
      group.forEach(member=>remove?selection.delete(member):selection.add(member));
    }
    else if(!selection.has(id))selectIds([id]);
    if(!item.locked){
      drag={mode:'move',startClientX:e.clientX,startClientY:e.clientY,orig:new Map(selectedItems().filter(i=>!i.locked).map(i=>[i.id,{x:i.x,y:i.y}])),moved:false};
      capture(g,e.pointerId);
      // Lift what is about to move: a shadow and a hair of scale, dropped again on release.
      svg.querySelectorAll<SVGGElement>('.panel-item').forEach(el=>el.classList.toggle('lifting',(drag as MoveDrag).orig.has(el.dataset.id!)));
    }
    renderChrome();renderInspector();
  });
  svg.onpointermove=e=>{
    if(drag)return;
    const p=point(e,svg);
    document.querySelector('#coordinates')!.textContent=`X ${p.x.toFixed(1)} · Y ${p.y.toFixed(1)}`;
    cursorTag(e,`${p.x.toFixed(1)}  ${p.y.toFixed(1)}`);
  };
  svg.onpointerleave=()=>{if(!drag)cursorTag(null);};
  applyCanvasA11y();
  svg.ondragover=e=>e.preventDefault();
  svg.ondrop=e=>{e.preventDefault();const id=e.dataTransfer?.getData('component');if(id){const p=point(e,svg);add(id,p.x,p.y);}};
}

/**
 * Empty space in the canvas starts a rubber-band selection; the middle button
 * or a held space bar pans instead. Items handle their own pointerdown and stop
 * propagation before this sees it.
 */
function bindCanvasSurface(){
  const canvas=canvasEl();
  canvas.addEventListener('pointerdown',e=>{
    if((e.target as HTMLElement).closest('.panel-item,.resize-handle'))return;
    if(e.button===1||spaceHeld||e.button===2){e.preventDefault();startPan(e);return;}
    if(e.button!==0)return;
    const svg=document.querySelector<SVGSVGElement>('#panel-svg');
    if(!svg)return;
    e.preventDefault();
    const p=point(e,svg);
    drag={mode:'marquee',startX:p.x,startY:p.y,x:p.x,y:p.y,base:e.shiftKey?new Set(selection):new Set(),moved:false};
    capture(canvas,e.pointerId);
  });
  canvas.addEventListener('contextmenu',e=>{if(spaceHeld)e.preventDefault();});
}

/** Pointer capture throws if the pointer has already been released; never let that break a drag. */
const capture=(el:Element,pointerId:number)=>{try{el.setPointerCapture?.(pointerId);}catch{/* pointer already gone */}};

const canvasEl=()=>document.querySelector<HTMLDivElement>('#canvas')!;
const stageEl=()=>document.querySelector<HTMLDivElement>('#panel-stage')!;

function startPan(e:PointerEvent){
  const canvas=canvasEl();
  drag={mode:'pan',startClientX:e.clientX,startClientY:e.clientY,scrollLeft:canvas.scrollLeft,scrollTop:canvas.scrollTop,moved:false};
  canvas.classList.add('panning');
}

function setZoomStatus(){const pct=Math.round(zoom*100);roll(document.querySelector<HTMLElement>('#zoom-status')!,{n:pct},`${pct}%`);}

/** Resizes the stage in place — far cheaper than rebuilding the SVG on every wheel tick. */
function applyZoom(){
  const w=panelWidth(project.panel),stage=stageEl(),svg=document.querySelector<SVGSVGElement>('#panel-svg');
  stage.style.width=`${w*PX*zoom}px`;
  stage.style.height=`${PANEL_H*PX*zoom}px`;
  if(svg)svg.style.transform=`scale(${zoom})`;
  setZoomStatus();
  renderRuler(w);
}

/** Zooms about a screen point so the panel does not slide away under the cursor. */
function zoomTo(next:number,clientX?:number,clientY?:number){
  const canvas=canvasEl(),stage=stageEl();
  const target=Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,next));
  const box=stage.getBoundingClientRect();
  const anchorX=clientX??box.left+box.width/2,anchorY=clientY??box.top+box.height/2;
  const mmX=(anchorX-box.left)/(PX*zoom),mmY=(anchorY-box.top)/(PX*zoom);
  zoom=target;
  applyZoom();
  const after=stage.getBoundingClientRect();
  canvas.scrollLeft+=after.left+mmX*PX*zoom-anchorX;
  canvas.scrollTop+=after.top+mmY*PX*zoom-anchorY;
  renderRuler(panelWidth(project.panel));
}

function zoomFit(){zoom=fitZoom();applyZoom();centreView();}
function centreView(){
  const canvas=canvasEl(),stage=stageEl();
  canvas.scrollLeft=(stage.offsetLeft+stage.offsetWidth/2)-canvas.clientWidth/2;
  canvas.scrollTop=Math.max(0,stage.offsetTop-40);
  renderRuler(panelWidth(project.panel));
}

/** Frames the current selection, used by preflight jumps and zoom-to-selection. */
function focusSelection(){
  const items=selectedItems();
  if(!items.length)return;
  const box=extent(items),canvas=canvasEl();
  const margin=8;
  const target=Math.min(4,Math.max(MIN_ZOOM,Math.min(
    canvas.clientWidth/((box.r-box.l+margin*2)*PX),
    canvas.clientHeight/((box.b-box.t+margin*2)*PX))));
  zoom=target;
  applyZoom();
  const stage=stageEl();
  canvas.scrollLeft=stage.offsetLeft+(box.l+box.r)/2*PX*zoom-canvas.clientWidth/2;
  canvas.scrollTop=stage.offsetTop+(box.t+box.b)/2*PX*zoom-canvas.clientHeight/2;
  renderRuler(panelWidth(project.panel));
}

/**
 * The canvas is a multi-select listbox: Tab enters it, Tab and Shift+Tab walk
 * the parts in layer order, Escape hands focus back to the page. Without this
 * there is no way to select anything without a pointer.
 */
function applyCanvasA11y(){
  const svg=document.querySelector<SVGSVGElement>('#panel-svg');
  if(!svg)return;
  svg.setAttribute('role','listbox');
  svg.setAttribute('aria-multiselectable','true');
  svg.setAttribute('aria-label','Panel components');
  const visible=project.items.filter(i=>!i.hidden);
  if(focusedId&&!visible.some(i=>i.id===focusedId))focusedId='';
  const tabStop=focusedId;
  svg.querySelectorAll<SVGGElement>('.panel-item').forEach(g=>{
    const id=g.dataset.id;if(!id)return;
    const item=project.items.find(i=>i.id===id);if(!item)return;
    const d=catalogMap.get(item.componentId);
    g.setAttribute('role','option');
    g.setAttribute('tabindex',id===tabStop?'0':'-1');
    g.setAttribute('aria-selected',String(selection.has(id)));
    g.setAttribute('aria-label',`${d?.name??'Component'}${item.label.trim()?` ${item.label.replace(/\n/g,' ')}`:''}, ${item.x.toFixed(1)} by ${item.y.toFixed(1)} millimetres${item.locked?', locked':''}`);
    g.onfocus=()=>{focusedId=id;drawFocusRing();};
  });
  drawFocusRing();
}

/**
 * A focus ring distinct from the selection outline, so both can be seen at
 * once — but only for the people it is for. Clicking or dragging a part sets
 * focusedId, which is what Tab resumes from; drawing a ring around it as well
 * leaves a blue outline sitting on the panel after every move.
 */
function drawFocusRing(){
  const layer=document.querySelector('#focus-layer');
  if(!layer)return;
  const item=focusRing||usingKeyboard?project.items.find(i=>i.id===focusedId&&!i.hidden):undefined;
  layer.innerHTML=item
    ?`<rect class="focus-ring ${item.id!==lastFocusId?'landing':''}" x="${item.x-item.width/2-2}" y="${item.y-item.height/2-2}" width="${item.width+4}" height="${item.height+4}"/>`
    :'';
  lastFocusId=item?.id??'';
}

function moveFocus(delta:number){
  const visible=project.items.filter(i=>!i.hidden);
  if(!visible.length)return false;
  const at=visible.findIndex(i=>i.id===focusedId);
  const next=visible[((at<0?(delta>0?-1:0):at)+delta+visible.length)%visible.length];
  focusedId=next.id;
  selectIds([next.id]);
  render();
  const g=document.querySelector<SVGGElement>(`.panel-item[data-id="${next.id}"]`);
  g?.focus({preventScroll:true});
  focusSelection();
  return true;
}

const marqueeRect=(d:MarqueeDrag)=>({l:Math.min(d.startX,d.x),r:Math.max(d.startX,d.x),t:Math.min(d.startY,d.y),b:Math.max(d.startY,d.y)});

function marqueeHits(d:MarqueeDrag){
  const box=marqueeRect(d);
  return project.items.filter(i=>!i.hidden&&i.x+i.width/2>box.l&&i.x-i.width/2<box.r&&i.y+i.height/2>box.t&&i.y-i.height/2<box.b);
}

function drawMarquee(d:MarqueeDrag){
  const layer=document.querySelector('#overlay-layer');
  if(!layer)return;
  const box=marqueeRect(d),hits=marqueeHits(d);
  const dims=`${(box.r-box.l).toFixed(1)} × ${(box.b-box.t).toFixed(1)}`;
  layer.innerHTML=`<rect class="marquee" x="${box.l}" y="${box.t}" width="${box.r-box.l}" height="${box.b-box.t}"/>`
    +hits.map(i=>`<rect class="marquee-hit" x="${i.x-i.width/2-.8}" y="${i.y-i.height/2-.8}" width="${i.width+1.6}" height="${i.height+1.6}" rx=".6"/>`).join('')
    +(box.r-box.l>4?`<text class="marquee-dim" x="${(box.r-.8).toFixed(2)}" y="${(box.b-.9).toFixed(2)}" text-anchor="end">${dims}</text>`:'');
  document.querySelector('#coordinates')!.textContent=units(`${dims} mm · ${hits.length} in range`);
}

function point(e:PointerEvent|DragEvent,svg:SVGSVGElement){const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM()!.inverse());}

function smartPosition(item:Item,x:number,y:number){
  const others=project.items.filter(i=>!selection.has(i.id)&&!i.hidden),tolerance=1.2/(PX*zoom),w=panelWidth(project.panel);let guide='';
  const snapAxis=(axis:'x'|'y',value:number,size:number,limit:number)=>{const own=[value-size/2,value,value+size/2],targets=[0,limit/2,limit,...others.flatMap(o=>axis==='x'?[o.x-o.width/2,o.x,o.x+o.width/2]:[o.y-o.height/2,o.y,o.y+o.height/2])];let best=Infinity,delta=0,target=0;own.forEach(a=>targets.forEach(t=>{const d=t-a;if(Math.abs(d)<Math.abs(best)){best=d;delta=d;target=t;}}));if(Math.abs(best)<=tolerance){guide+=axis==='x'?`<line class="smart-line" x1="${target}" y1="0" x2="${target}" y2="${PANEL_H}"/>`:`<line class="smart-line" x1="0" y1="${target}" x2="${w}" y2="${target}"/>`;return value+delta;}return value;};
  x=snapAxis('x',x,item.width,w);y=snapAxis('y',y,item.height,PANEL_H);
  let l=x-item.width/2,r=x+item.width/2,t=y-item.height/2,b=y+item.height/2;
  const row=others.filter(o=>Math.min(b,o.y+o.height/2)-Math.max(t,o.y-o.height/2)>-2),left=row.filter(o=>o.x+o.width/2<=l).sort((a,b)=>b.x+b.width/2-(a.x+a.width/2))[0],right=row.filter(o=>o.x-o.width/2>=r).sort((a,b)=>a.x-a.width/2-(b.x-b.width/2))[0];
  if(left&&right){const le=left.x+left.width/2,re=right.x-right.width/2,lg=l-le,rg=re-r;if(Math.abs(lg-rg)<=tolerance*1.6){const dx=(rg-lg)/2;x+=dx;l+=dx;r+=dx;const gap=(l-le);guide+=horizontalMeasure(le,l,y, gap,true)+horizontalMeasure(r,re,y,gap,true);}else{guide+=horizontalMeasure(le,l,y,lg,false)+horizontalMeasure(r,re,y,rg,false);}}
  else if(left){const le=left.x+left.width/2;guide+=horizontalMeasure(le,l,y,l-le,false);}else if(right){const re=right.x-right.width/2;guide+=horizontalMeasure(r,re,y,re-r,false);}
  const col=others.filter(o=>Math.min(r,o.x+o.width/2)-Math.max(l,o.x-o.width/2)>-2),above=col.filter(o=>o.y+o.height/2<=t).sort((a,b)=>b.y+b.height/2-(a.y+a.height/2))[0],below=col.filter(o=>o.y-o.height/2>=b).sort((a,b)=>a.y-a.height/2-(b.y-b.height/2))[0];
  if(above&&below){const ae=above.y+above.height/2,be=below.y-below.height/2,tg=t-ae,bg=be-b;if(Math.abs(tg-bg)<=tolerance*1.6){const dy=(bg-tg)/2;y+=dy;t+=dy;b+=dy;const gap=t-ae;guide+=verticalMeasure(ae,t,x,gap,true)+verticalMeasure(b,be,x,gap,true);}else{guide+=verticalMeasure(ae,t,x,tg,false)+verticalMeasure(b,be,x,bg,false);}}
  else if(above){const ae=above.y+above.height/2;guide+=verticalMeasure(ae,t,x,t-ae,false);}else if(below){const be=below.y-below.height/2;guide+=verticalMeasure(b,be,x,be-b,false);}
  return{x,y,guide};
}
function horizontalMeasure(a:number,b:number,y:number,d:number,equal:boolean){if(d<.2)return'';const mid=(a+b)/2,yy=Math.max(2,Math.min(PANEL_H-2,y));return`<path class="measure-line" d="M${a} ${yy-1.2}v2.4m0-1.2H${b}m0-1.2v2.4"/><text class="measure-text" x="${mid}" y="${yy-1.8}" text-anchor="middle">${d.toFixed(1)} mm</text>${equal?`<rect class="equal-pill" x="${mid-2.2}" y="${yy+.8}" width="4.4" height="2.3" rx="1.1"/><text class="equal-text" x="${mid}" y="${yy+2.45}" text-anchor="middle">=</text>`:''}`;}
function verticalMeasure(a:number,b:number,x:number,d:number,equal:boolean){if(d<.2)return'';const mid=(a+b)/2,xx=Math.max(2,Math.min(panelWidth(project.panel)-2,x));return`<path class="measure-line" d="M${xx-1.2} ${a}h2.4m-1.2 0V${b}m-1.2 0h2.4"/><text class="measure-text" x="${xx+2}" y="${mid+.6}">${d.toFixed(1)} mm</text>${equal?`<rect class="equal-pill" x="${xx-3.4}" y="${mid-1.15}" width="2.3" height="2.3" rx="1.1"/><text class="equal-text" x="${xx-2.25}" y="${mid+.55}" text-anchor="middle">=</text>`:''}`;}

/** Graphics inherit the panel's ink colour, so a label is never invisible on the surface it lands on. */
const defaultColor=(d:ComponentDefinition)=>['text','shape'].includes(d.renderer)?project.inkColor:d.color;

function add(componentId:string,x?:number,y?:number){const d=catalogMap.get(componentId);if(!d)return;const w=panelWidth(project.panel);const item:Item={id:uid(),componentId,x:sv(x??w/2),y:sv(y??PANEL_H/2),rotation:0,label:d.label,color:defaultColor(d),width:d.width,height:d.height,value:.62,locked:false,hidden:false,role:d.renderer==='led'?'light':d.renderer==='knob'||d.renderer==='slider'||d.renderer==='button'||d.renderer==='toggle'?'param':d.renderer==='jack'?'input':'none',identifier:''};selection=new Set([item.id]);mutate(()=>project.items.push(item));notify(`${d.name} added`);}

function preflightPanel(){
  const counts=issueCounts(issues);
  const badge=counts.errors?`<span class="badge bad">${counts.errors}</span>`:counts.warnings?`<span class="badge warning">${counts.warnings}</span>`:`<span class="badge good">Clear</span>`;
  const body=issues.length
    ?issues.map((issue,n)=>`<button class="issue ${issue.severity}" data-issue="${n}"><span class="issue-mark">${issue.severity==='error'?icon('cross'):icon('warn')}</span><span><strong>${esc(issue.message)}</strong><small>${esc(issue.detail)}</small></span></button>`).join('')
    :`<div class="clear-state">${icon('check')}<span>Nothing on this panel breaks an edge, a wall or a mounting slot.</span></div>`;
  return`<div class="subhead preflight-head">Preflight ${badge}</div><div class="preflight">${body}</div><p class="section-hint">Checks edge margins, cutout walls, mounting clashes, jack spacing and part depth. It is not a substitute for a datasheet.</p>`;
}
function bindPreflight(){
  document.querySelectorAll<HTMLElement>('[data-issue]').forEach(button=>button.onclick=()=>{
    const issue=issues[Number(button.dataset.issue)];
    if(!issue?.itemIds.length)return;
    selection=new Set(issue.itemIds);
    inspectorTab='context';
    render();
    focusSelection();
  });
}
function renderInspector(){const el=document.querySelector<HTMLDivElement>('#inspector')!;let items=selectedItems();if(inspectorTab==='layers'){document.querySelector('#inspector-title')!.textContent='Object layers';el.innerHTML=`<div class="pane-intro"><strong>${project.items.length} objects</strong><span>Reorder, hide or lock what is on the panel.</span></div><div id="layers"></div>`;renderLayers();return;}if(inspectorTab==='panel')items=[];document.querySelector('#inspector-title')!.textContent=inspectorTab==='panel'?'Panel settings':items.length>1?`${items.length} selected`:items.length===1?'Component':'Panel overview';if(items.length===0){el.innerHTML=`<div class="section-card"><div class="section-label">Panel geometry</div>${field('Width','hp',project.panel.hp,'number',1,'HP')}<div class="form-row"><label>Width profile</label><select id="width-mode"><option value="doepfer">Doepfer compatible</option><option value="nominal">Nominal HP × 5.08</option><option value="custom">Custom width</option></select></div>${project.panel.widthMode==='custom'?field('Custom width','customWidth',project.panel.customWidth,'number',.01,'mm'):''}<div class="two-col">${field('Thickness','thickness',project.panel.thickness,'number',.1,'mm')}<div class="form-row"><label>Mounting</label><select id="mounting"><option value="none">None</option><option value="two">2 slots · centred</option><option value="diagonal">2 slots · diagonal</option><option value="four">4 slots</option></select></div></div></div><div class="section-card finish-section"><div class="section-label">Surface finish</div><p class="section-hint">Pick a material, then adjust the three colours below it.</p><div class="finish-grid">${finishCards()}</div></div><div class="section-card"><div class="section-label">Custom palette</div><div class="named-colors"><label><span>Panel</span><input id="panel-color" aria-label="Panel colour" type="color" value="${project.panelColor}"></label><label><span>Ink</span><input id="ink-color" aria-label="Ink colour" type="color" value="${project.inkColor}"></label><label><span>Accent</span><input id="accent-color" aria-label="Accent colour" type="color" value="${project.accentColor}"></label></div></div>${preflightPanel()}`;bindPanelInspector();bindPreflight();return;}
 if(items.length>1){
   const box=extent(items);
   el.innerHTML=`<div class="selection-summary"><span class="selection-kicker">Multi-selection</span><strong>${items.length} components</strong><span>${(box.r-box.l).toFixed(1)} × ${(box.b-box.t).toFixed(1)} mm${items.every(i=>i.groupId)&&new Set(items.map(i=>i.groupId)).size===1?' · grouped':''}</span></div>
    <div class="section-card"><div class="section-label">Align &amp; distribute</div><div class="action-grid">
      <button id="i-align-x">Align X</button><button id="i-align-y">Align Y</button>
      <button id="i-distribute-h" ${items.length<3?'disabled':''}>Equal space H</button><button id="i-distribute-v" ${items.length<3?'disabled':''}>Equal space V</button>
      <button id="i-spread-h">Spread across</button><button id="i-spread-v">Spread down</button>
      <button id="i-center">Centre across</button><button id="i-center-v">Centre down</button><button id="i-grid">Arrange in a grid…</button>
    </div></div>
    <div class="section-card"><div class="section-label">Transform</div><div class="action-grid">
      <button id="i-rotate">Rotate 90°</button><button id="i-rotate-back">Rotate −90°</button>
      <button id="i-mirror">Mirror</button><button id="i-flip">Flip</button>
      <button id="i-match">Match sizes</button><button id="i-same">Select same part</button>
      <button id="i-repeat">Repeat…</button><button id="i-group">${items.every(i=>i.groupId)?'Regroup':'Group'}</button>
    </div></div>
    <button class="tool-button wide" id="duplicate">Duplicate selection</button>`;
   bindGroupButtons('i-');
   const on=(id:string,fn:()=>void)=>document.querySelector(`#i-${id}`)?.addEventListener('click',fn);
   on('center-v',()=>center('y'));on('spread-h',()=>spreadAcrossPanel('x'));on('spread-v',()=>spreadAcrossPanel('y'));
   on('grid',arrangeDialog);on('rotate',()=>rotateSelection(90));on('rotate-back',()=>rotateSelection(-90));
   on('mirror',mirrorSelection);on('flip',flipSelection);on('match',matchSizes);on('same',selectSameKind);
   on('repeat',repeatDialog);on('group',groupSelection);
   document.querySelector('#duplicate')!.addEventListener('click',duplicate);
   return;
 }
 const i=items[0],d=catalogMap.get(i.componentId)!,lockedSize=dimensionLocked(d);el.innerHTML=`<div class="part-heading"><span class="part-thumbnail large">${thumbnailSvg(d,project,i.color,46)}</span><div><strong>${d.name}</strong><small>${d.manufacturer?`${d.manufacturer} · ${d.partNumber}`:d.description}</small><div class="provenance">${d.source
  ?`<span class="provenance-mark ${d.status==='verified'?'traced':'partial'}">${d.status==='verified'?'Traced':'Cutout traced'}</span>${d.source.url?`<a href="${d.source.url}" target="_blank" rel="noreferrer">${esc(d.source.note)}</a>`:`<span>${esc(d.source.note)}</span>`}`
  :`<span>No datasheet behind these figures — check the real part.</span>`}</div><div class="mechanical-line">${d.id.includes('encoder')?'Endless rotation · Push switch · ':d.id.includes('lit')?'Illuminated · ':''}${cutoutLabel(d)} · ${d.depth?`${d.depth} mm deep`:'surface'}</div></div><span class="badge">${d.status}</span></div><div class="inspector-section"><div class="section-label">Transform</div><div class="two-col">${field('X','x',i.x,'number',.1,'mm')}${field('Y','y',i.y,'number',.1,'mm')}</div><div class="two-col">${field('Width','width',i.width,'number',.1,'mm',lockedSize)}${field('Height','height',i.height,'number',.1,'mm',lockedSize)}</div>${sizeControl(d)}${field('Rotation','rotation',i.rotation,'number',1,'°')}</div>${graphicsControl(i,d)}<div class="inspector-section"><div class="section-label">Appearance</div>${d.renderer==="image"?imageControl(i):""}${d.renderer!=='led'&&d.renderer!=='hole'?field('Label','label',i.label,'text'):''}${['knob','slider','touch','led'].includes(d.renderer)?field('Preview value','value',i.value,'range',.01):''}<div class="form-row"><label>Component colour</label><div class="color-row"><input id="item-color" aria-label="Component colour" type="color" value="${i.color}"><input id="item-color-text" aria-label="Component colour hex" value="${i.color}"></div></div></div><div class="inspector-section"><div class="section-label">Export mapping</div><div class="form-row"><label>VCV role</label><select id="role">${['none','param','input','output','light','custom'].map(x=>`<option value="${x}" ${i.role===x?'selected':''}>${x}</option>`).join('')}</select></div>${field('Order spec','item-spec',i.spec??'','text')}${field('Identifier','identifier',i.identifier,'text')}<div class="meta-grid"><span>Cutout</span><strong>${d.cutout?cutoutLabel(d):'None'}</strong><span>Rear depth</span><strong>${d.depth?`${d.depth} mm`:'—'}</strong><span>Keepout</span><strong>${d.keepout?`${d.keepout} mm`:'—'}</strong></div></div><div class="button-row layer-order"><button class="tool-button wide" id="send-back">Send back</button><button class="tool-button wide" id="bring-forward">Bring forward</button></div><div class="button-row"><button class="tool-button wide" id="duplicate">Duplicate</button><button class="tool-button" id="lock">${i.locked?'Unlock':'Lock'}</button></div>`;bindItemInspector(i);}

function field(label:string,id:string,value:string|number,type:string,step:string|number='',unit='',disabled=false){return`<div class="form-row"><label>${label}</label><div class="input-unit"><input id="field-${id}" type="${type}" value="${esc(String(value))}" ${step!==''?`step="${step}"`:''} ${type==='range'?'min="0" max="1"':''} ${disabled?'disabled':''}>${unit?`<span>${unit}</span>`:''}</div></div>`;}
function bindPanelInspector(){const get=(id:string)=>document.querySelector<HTMLInputElement|HTMLSelectElement>(id)!;get('#field-hp').onchange=e=>mutate(()=>{project.panel.hp=Math.max(2,Math.min(84,Number((e.target as HTMLInputElement).value)));});get('#width-mode').value=project.panel.widthMode;get('#width-mode').onchange=e=>mutate(()=>project.panel.widthMode=(e.target as HTMLSelectElement).value as Project['panel']['widthMode']);document.querySelector<HTMLInputElement>('#field-customWidth')?.addEventListener('change',e=>mutate(()=>project.panel.customWidth=Number((e.target as HTMLInputElement).value)));get('#field-thickness').onchange=e=>mutate(()=>project.panel.thickness=Number((e.target as HTMLInputElement).value));get('#mounting').value=project.panel.mounting;get('#mounting').onchange=e=>mutate(()=>project.panel.mounting=(e.target as HTMLSelectElement).value as Project['panel']['mounting']);document.querySelectorAll<HTMLElement>('[data-finish]').forEach(b=>b.onclick=()=>mutate(()=>applyFinish(project,b.dataset.finish!)));(['panel','ink','accent'] as const).forEach(k=>get(`#${k}-color`).oninput=e=>{project[`${k}Color`]=(e.target as HTMLInputElement).value;if(k==='panel'){project.panel.finish='custom-flat';document.querySelector('.finish-card.selected')?.classList.remove('selected');}persist();renderCanvas();});}
/**
 * Reads an artwork file into a data URL. SVG is stripped to a presentational
 * subset first; PNG is embedded as-is.
 */
async function readArtwork(file:File,limit:number):Promise<{url:string;note?:string}|null>{
  const isSvg=file.type==='image/svg+xml'||/\.svg$/i.test(file.name);
  if(!isSvg&&file.type!=='image/png'){notify('Choose a PNG or an SVG file');return null;}
  if(file.size>limit){notify(`Artwork must be smaller than ${Math.round(limit/1000)/1000} MB`);return null;}
  if(isSvg){
    const result=sanitizeSvg(await file.text());
    if(!result.ok){notify(result.reason);return null;}
    return{url:svgDataUrl(result.svg),note:result.removed.length?`SVG added — removed ${result.removed.join(', ')}`:'SVG artwork added'};
  }
  const url=await new Promise<string|null>(resolve=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(typeof reader.result==='string'?reader.result:null);
    reader.onerror=()=>resolve(null);
    reader.readAsDataURL(file);
  });
  if(!url){notify('Could not read that image');return null;}
  return{url,note:'PNG artwork added'};
}

function bindImageObject(i:Item){
  const input=document.querySelector<HTMLInputElement>('#item-image-file');
  if(input)input.onchange=async()=>{
    const file=input.files?.[0];
    input.value='';
    if(!file)return;
    const art=await readArtwork(file,1_500_000);
    if(!art)return;
    mutate(()=>{i.imageData=art.url;if(!i.label)i.label=file.name.replace(/\.(png|svg)$/i,'');});
    notify(art.note!);
  };
  document.querySelector('#remove-item-image')?.addEventListener('click',()=>{mutate(()=>delete i.imageData);notify('Artwork removed');});
}

function bindItemInspector(i:Item){bindImageObject(i);bindGraphicsControl(i,catalogMap.get(i.componentId)!);
  const spec=document.querySelector<HTMLInputElement>('#field-item-spec');
  if(spec)spec.onchange=()=>mutate(()=>{const value=spec.value.trim();value?i.spec=value:delete i.spec;});const preset=document.querySelector<HTMLSelectElement>('#size-preset');if(preset)preset.onchange=()=>{const next=catalogMap.get(preset.value);if(!next)return;mutate(()=>{i.componentId=next.id;i.width=next.width;i.height=next.height;});};document.querySelector("#send-back")?.addEventListener("click",()=>moveLayer(i,-1));document.querySelector("#bring-forward")?.addEventListener("click",()=>moveLayer(i,1));['x','y','width','height','rotation','label','value','identifier'].forEach(k=>{const e=document.querySelector<HTMLInputElement>(`#field-${k}`);if(!e)return;e.onchange=ev=>mutate(()=>{const v=(ev.target as HTMLInputElement).value;(i as unknown as Record<string,string|number>)[k]=['label','identifier'].includes(k)?v:Number(v);});e.oninput=k==='value'?ev=>{i.value=Number((ev.target as HTMLInputElement).value);renderCanvas();}:null;});const color=document.querySelector<HTMLInputElement>('#item-color')!,hex=document.querySelector<HTMLInputElement>('#item-color-text')!;color.oninput=()=>{i.color=color.value;hex.value=color.value;renderCanvas();};color.onchange=()=>mutate(()=>i.color=color.value);hex.onchange=()=>mutate(()=>i.color=hex.value);document.querySelector<HTMLSelectElement>('#role')!.onchange=e=>mutate(()=>i.role=(e.target as HTMLSelectElement).value as Item['role']);document.querySelector('#duplicate')!.addEventListener('click',duplicate);document.querySelector('#lock')!.addEventListener('click',()=>mutate(()=>i.locked=!i.locked));}
function renderLayers(){const el=document.querySelector('#layers');if(!el)return;el.innerHTML=`<div class="layers">${[...project.items].reverse().map(i=>{const d=catalogMap.get(i.componentId)!;return`<div class="layer ${selection.has(i.id)?'selected':''}" style="view-transition-name:l-${i.id.replace(/[^a-z0-9-]/gi,'')}"><button class="layer-main" data-layer="${i.id}"><span class="layer-icon">${thumbnailSvg(d,project,i.color,18)}</span><span class="layer-name">${esc(i.label||d.name)}</span></button><button class="layer-toggle ${i.hidden?'':'on'}" data-visibility="${i.id}" aria-label="${i.hidden?'Show':'Hide'}" aria-pressed="${!i.hidden}">${i.hidden?icon('eye-off'):icon('eye')}</button><button class="layer-toggle ${i.locked?'on':''}" data-lock="${i.id}" aria-label="${i.locked?'Unlock':'Lock'}" aria-pressed="${i.locked}">${i.locked?icon('lock'):icon('unlock')}</button></div>`}).join('')}</div>`;el.querySelectorAll<HTMLElement>('[data-layer]').forEach(b=>b.onclick=e=>{selection=(e.shiftKey?new Set([...selection,b.dataset.layer!]):new Set([b.dataset.layer!]));render();});el.querySelectorAll<HTMLElement>('[data-visibility]').forEach(b=>b.onclick=()=>{const i=project.items.find(x=>x.id===b.dataset.visibility)!;mutate(()=>i.hidden=!i.hidden);});el.querySelectorAll<HTMLElement>('[data-lock]').forEach(b=>b.onclick=()=>{const i=project.items.find(x=>x.id===b.dataset.lock)!;mutate(()=>i.locked=!i.locked);});}

const exact=(v:number)=>Math.round(v*100)/100;
/** Alignment and centring ignore the grid: snapping them would defeat the point. */
function align(axis:'x'|'y'){
  const a=editable();
  if(a.length<2)return;
  const avg=a.reduce((s,i)=>s+i[axis],0)/a.length;
  mutate(()=>a.forEach(i=>i[axis]=exact(avg)));
  notify(`Aligned ${axis==='x'?'horizontal':'vertical'} centres`);
}
function distribute(axis:'x'|'y'){
  const a=editable().sort((p,q)=>p[axis]-q[axis]);
  if(a.length<3)return;
  const first=a[0],last=a[a.length-1];
  const size=(i:Item)=>axis==='x'?i.width:i.height;
  const from=first[axis]-size(first)/2,to=last[axis]+size(last)/2;
  const total=a.reduce((s,i)=>s+size(i),0);
  const gap=(to-from-total)/(a.length-1);
  mutate(()=>applyPlacements(a,spreadBetween(a,axis,from,to)));
  notify(`Equal ${axis==='x'?'horizontal':'vertical'} spacing · ${gap.toFixed(2)} mm gaps`);
}
function center(axis:'x'|'y'='x'){
  const a=editable();
  if(!a.length)return;
  const size=(i:Item)=>axis==='x'?i.width:i.height;
  const min=Math.min(...a.map(i=>i[axis]-size(i)/2)),max=Math.max(...a.map(i=>i[axis]+size(i)/2));
  const span=axis==='x'?panelWidth(project.panel):PANEL_H;
  const delta=span/2-(min+max)/2;
  mutate(()=>a.forEach(i=>i[axis]=exact(i[axis]+delta)));
  notify(`Centred ${axis==='x'?'across the panel':'down the panel'}`);
}
function bindGroupButtons(prefix=''){document.querySelector(`#${prefix}align-x`)?.addEventListener('click',()=>align('x'));document.querySelector(`#${prefix}align-y`)?.addEventListener('click',()=>align('y'));document.querySelector(`#${prefix}distribute-h`)?.addEventListener('click',()=>distribute('x'));document.querySelector(`#${prefix}distribute-v`)?.addEventListener('click',()=>distribute('y'));document.querySelector(`#${prefix}center`)?.addEventListener('click',()=>center('x'));document.querySelector(`#${prefix}center-panel`)?.addEventListener('click',()=>center('x'));}
function moveLayer(item:Item,delta:number){
  const from=project.items.findIndex(x=>x.id===item.id),to=Math.max(0,Math.min(project.items.length-1,from+delta));
  if(from===to)return;
  const reorder=()=>mutate(()=>{project.items.splice(from,1);project.items.splice(to,0,item);});
  // With the layers list on screen, rows slide to their new order instead of re-rendering in place.
  if(inspectorTab==='layers'&&document.startViewTransition)document.startViewTransition(reorder);else reorder();
}
function duplicate(){const copies=selectedItems().map(i=>({...clone(i),id:uid(),x:sv(i.x+3),y:sv(i.y+3)}));if(!copies.length)return;selection=new Set(copies.map(i=>i.id));mutate(()=>project.items.push(...copies));}
function remove(){if(!selection.size)return;mutate(()=>project.items=project.items.filter(i=>!selection.has(i.id)));selection.clear();render();}
/* ---------- clipboard ---------- */

function copySelection(){
  const items=selectedItems();
  if(!items.length)return;
  clipboard=items.map(clone);
  navigator.clipboard?.writeText(JSON.stringify({five08:'items',version:2,items:clipboard},null,0)).catch(()=>{/* clipboard permission denied */});
  notify(`${items.length} component${items.length===1?'':'s'} copied`);
}

function cutSelection(){if(!selection.size)return;copySelection();remove();}

async function pasteClipboard(){
  let items=clipboard;
  try{
    const text=await navigator.clipboard.readText();
    const parsed=JSON.parse(text) as{five08?:string;items?:unknown};
    // Run pasted data through the same validator as an opened file.
    if(parsed?.five08==='items'&&Array.isArray(parsed.items))items=parseProject({...emptyProject(),items:parsed.items},catalogMap).items;
  }catch{/* not JSON, or no clipboard permission: use what we copied in this tab */}
  if(!items.length){notify('Nothing to paste');return;}
  const copies=items.map(i=>({...clone(i),id:uid(),x:sv(i.x+3),y:sv(i.y+3)}));
  selection=new Set(copies.map(i=>i.id));
  mutate(()=>project.items.push(...copies));
  notify(`${copies.length} component${copies.length===1?'':'s'} pasted`);
}

/* ---------- transforms ---------- */

const editable=()=>selectedItems().filter(i=>!i.locked);

function rotateSelection(delta:number){
  const items=editable();
  if(!items.length)return;
  mutate(()=>applyPlacements(items,items.length>1?rotateGroup(items,delta):rotatePlacements(items,delta)));
  notify(`Rotated ${delta>0?'':'−'}${Math.abs(delta)}°`);
}

function mirrorSelection(){
  const items=editable();
  if(!items.length)return;
  const axis=items.length>1?panelWidth(project.panel)/2:panelWidth(project.panel)/2;
  mutate(()=>applyPlacements(items,mirrorPlacements(items,axis)));
  notify('Mirrored across the panel centreline');
}

function flipSelection(){
  const items=editable();
  if(!items.length)return;
  mutate(()=>applyPlacements(items,flipVertical(items)));
  notify('Flipped top to bottom');
}

function matchSizes(){
  const items=editable().filter(i=>!dimensionLocked(catalogMap.get(i.componentId)!));
  if(items.length<2){notify('Select two or more resizable components');return;}
  mutate(()=>applyPlacements(items,matchSize(items)));
  notify('Sizes matched');
}

function spreadAcrossPanel(axis:'x'|'y'){
  const items=editable();
  if(items.length<2){notify('Select two or more components');return;}
  const margin=8;
  const span=axis==='x'?[margin,panelWidth(project.panel)-margin]:[margin,PANEL_H-margin];
  mutate(()=>applyPlacements(items,spreadBetween(items,axis,span[0],span[1])));
  notify(`Spread across the panel ${axis==='x'?'width':'height'}`);
}

function toggleLock(){
  const items=selectedItems();
  if(!items.length)return;
  const lock=items.some(i=>!i.locked);
  mutate(()=>items.forEach(i=>i.locked=lock));
  notify(lock?'Locked':'Unlocked');
}

let gridColumns=4,gridGapX=4,gridGapY=6;
function arrangeDialog(){
  const items=editable();
  if(items.length<2){notify('Select two or more components to arrange');return;}
  document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="modal"><div class="modal narrow" role="dialog" aria-modal="true" aria-label="Arrange in a grid">
    <div class="modal-head"><h2>Arrange ${items.length} components</h2><p>Reading order is kept. Columns take the width of their widest member.</p></div>
    <div class="section-card">
      ${field('Columns','grid-columns',Math.min(gridColumns,items.length),'number',1,'')}
      <div class="two-col">${field('Gap across','grid-gap-x',gridGapX,'number',.5,'mm')}${field('Gap down','grid-gap-y',gridGapY,'number',.5,'mm')}</div>
    </div>
    <div class="modal-actions"><button class="tool-button" id="cancel-modal">Cancel</button><button class="tool-button primary" id="apply-grid">Arrange</button></div>
  </div></div>`);
  document.querySelector('#cancel-modal')!.addEventListener('click',closeModal);
  document.querySelector('#apply-grid')!.addEventListener('click',()=>{
    const read=(id:string)=>Number(document.querySelector<HTMLInputElement>(`#field-${id}`)!.value);
    gridColumns=Math.max(1,Math.round(read('grid-columns')));
    gridGapX=read('grid-gap-x');gridGapY=read('grid-gap-y');
    mutate(()=>applyPlacements(items,gridPlacements(items,gridColumns,gridGapX,gridGapY)));
    closeModal();
    notify(`Arranged in ${gridColumns} column${gridColumns===1?'':'s'}`);
  });
}

function selectSameKind(){
  const items=selectedItems();
  if(!items.length)return;
  const kinds=new Set(items.map(i=>i.componentId));
  selection=new Set(project.items.filter(i=>!i.hidden&&kinds.has(i.componentId)).map(i=>i.id));
  render();
  notify(`${selection.size} matching components selected`);
}

function groupSelection(){
  const items=selectedItems();
  if(items.length<2){notify('Select two or more components to group');return;}
  const groupId=uid();
  mutate(()=>items.forEach(i=>i.groupId=groupId));
  notify(`Grouped ${items.length} components`);
}

function ungroupSelection(){
  const items=selectedItems().filter(i=>i.groupId);
  if(!items.length){notify('Nothing in the selection is grouped');return;}
  mutate(()=>items.forEach(i=>delete i.groupId));
  notify('Ungrouped');
}

let repeatCount=4,repeatDx=19,repeatDy=0;
function repeatDialog(){
  const items=selectedItems();
  if(!items.length){notify('Select something to repeat');return;}
  const box=extent(items);
  document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="modal"><div class="modal narrow" role="dialog" aria-modal="true" aria-label="Repeat selection">
    <div class="modal-head"><h2>Repeat ${items.length} component${items.length===1?'':'s'}</h2><p>The original stays where it is. Copies follow at a fixed offset — a channel strip, a row of jacks, a bank of steps.</p></div>
    <div class="section-card">
      ${field('Copies in total','repeat-count',repeatCount,'number',1,'')}
      <div class="two-col">${field('Offset across','repeat-dx',repeatDx,'number',.1,'mm')}${field('Offset down','repeat-dy',repeatDy,'number',.1,'mm')}</div>
      <p class="section-hint">The selection is ${(box.r-box.l).toFixed(1)} mm wide and ${(box.b-box.t).toFixed(1)} mm tall.</p>
      <label class="checkbox"><input type="checkbox" id="repeat-group" checked> Group each copy</label>
    </div>
    <div class="modal-actions"><button class="tool-button" id="cancel-modal">Cancel</button><button class="tool-button primary" id="apply-repeat">Repeat</button></div>
  </div></div>`);
  document.querySelector('#cancel-modal')!.addEventListener('click',closeModal);
  document.querySelector('#apply-repeat')!.addEventListener('click',()=>{
    const read=(id:string)=>Number(document.querySelector<HTMLInputElement>(`#field-${id}`)!.value);
    repeatCount=Math.max(2,Math.min(64,Math.round(read('repeat-count'))));
    repeatDx=read('repeat-dx');repeatDy=read('repeat-dy');
    const asGroups=document.querySelector<HTMLInputElement>('#repeat-group')!.checked;
    const copies=repeatItems(items,repeatCount,repeatDx,repeatDy,uid);
    if(asGroups)for(let pass=0;pass<repeatCount-1;pass++){
      const groupId=uid();
      copies.slice(pass*items.length,(pass+1)*items.length).forEach(c=>c.groupId=groupId);
    }else copies.forEach(c=>delete c.groupId);
    selection=new Set(copies.map(c=>c.id));
    mutate(()=>project.items.push(...copies));
    closeModal();
    notify(`${copies.length} cop${copies.length===1?'y':'ies'} placed`);
  });
}

/* ---------- project library ---------- */

function miniPanel(p:Project,px=86){
  const w=panelWidth(p.panel);
  const items=p.items.filter(i=>!i.hidden).slice(0,120).map(i=>{const d=catalogMap.get(i.componentId);return d?componentSvg(i,d,p,false,'design'):'';}).join('');
  return`<svg class="mini-panel-svg" viewBox="0 0 ${w} ${PANEL_H}" width="${(w/PANEL_H*px).toFixed(1)}" height="${px}" aria-hidden="true"><rect width="${w}" height="${PANEL_H}" rx=".6" fill="${p.panelColor}"/>${items}</svg>`;
}

const ago=(t:number)=>{
  const minutes=Math.round((Date.now()-t)/60000);
  if(minutes<1)return'just now';
  if(minutes<60)return`${minutes} min ago`;
  const hours=Math.round(minutes/60);
  if(hours<24)return`${hours} h ago`;
  return`${Math.round(hours/24)} d ago`;
};

function projectsDialog(){
  flush();
  const list=listProjects();
  const snapshots=listRecovery();
  const kb=Math.round(storageUsed()/1024);
  const card=(meta:{id:string;name:string;hp:number;parts:number;updatedAt:number})=>{
    const raw=readProject(meta.id);
    let preview='<div class="project-blank"></div>';
    try{if(raw)preview=miniPanel(parseProject(raw,catalogMap));}catch{/* unreadable document, show the blank */}
    return`<div class="project-card ${meta.id===projectId?'current':''}">
      <button class="project-open" data-open="${meta.id}" aria-label="Open ${esc(meta.name)}">${preview}</button>
      <div class="project-meta"><strong>${esc(meta.name)}</strong><small>${meta.hp} HP · ${meta.parts} part${meta.parts===1?'':'s'} · ${ago(meta.updatedAt)}</small></div>
      <div class="project-actions">
        <button data-rename="${meta.id}">Rename</button>
        <button data-copy="${meta.id}">Duplicate</button>
        <button class="danger" data-delete="${meta.id}" ${list.length<2?'disabled':''}>Delete</button>
      </div>
    </div>`;
  };
  document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="modal"><div class="modal library-modal" role="dialog" aria-modal="true" aria-label="Your panels">
    <div class="modal-head"><h2>Your panels</h2><p>Stored in this browser only. Export a .panel.json to move a design to another machine.</p></div>
    <div class="project-grid">${list.length?list.map(card).join(''):'<p class="clear-state">No saved panels yet.</p>'}</div>
    ${snapshots.length?`<details class="recovery"><summary>${snapshots.length} recovery snapshot${snapshots.length===1?'':'s'}</summary><div class="recovery-list">${snapshots.map((snap,n)=>`<button data-recover="${n}"><strong>${esc(snap.name)}</strong><small>${new Date(snap.savedAt).toLocaleString()}</small></button>`).join('')}</div></details>`:''}
    <div class="modal-actions"><span>${kb} kB of browser storage used</span><button class="tool-button" id="cancel-modal">Close</button><button class="tool-button primary" id="library-new">New panel</button></div>
  </div></div>`);
  document.querySelector('#cancel-modal')!.addEventListener('click',closeModal);
  document.querySelector('#library-new')!.addEventListener('click',()=>{closeModal();newProjectDialog();});
  document.querySelectorAll<HTMLElement>('[data-open]').forEach(b=>b.onclick=()=>{openProject(b.dataset.open!);closeModal();});
  document.querySelectorAll<HTMLElement>('[data-copy]').forEach(b=>b.onclick=()=>{
    const id=duplicateProject(b.dataset.copy!);
    closeModal();
    if(id){openProject(id);notify('Duplicated');}else notify('Could not duplicate — storage may be full');
  });
  document.querySelectorAll<HTMLElement>('[data-rename]').forEach(b=>b.onclick=()=>{
    const id=b.dataset.rename!,current=listProjects().find(m=>m.id===id);
    const name=window.prompt('Panel name',current?.name??'Untitled panel');
    if(!name)return;
    if(id===projectId){mutate(()=>project.name=name);}else renameProject(id,name);
    closeModal();projectsDialog();
  });
  document.querySelectorAll<HTMLElement>('[data-delete]').forEach(b=>b.onclick=()=>{
    const id=b.dataset.delete!,meta=listProjects().find(m=>m.id===id);
    if(!window.confirm(`Delete “${meta?.name??'this panel'}” from this browser? This cannot be undone.`))return;
    deleteProject(id);
    if(id===projectId){const next=listProjects()[0];if(next)openProject(next.id);}
    closeModal();projectsDialog();
  });
  document.querySelectorAll<HTMLElement>('[data-recover]').forEach(b=>b.onclick=()=>{
    const snap=listRecovery()[Number(b.dataset.recover)];
    if(!snap)return;
    try{
      const restored=parseProject(snap.project,catalogMap);
      const id=newProjectId();
      restored.name=`${restored.name} (recovered)`;
      saveProject(id,restored);
      openProject(id);
      closeModal();
      notify('Snapshot restored as a new panel');
    }catch{notify('That snapshot could not be read');}
  });
}

function openProject(id:string){
  flush();
  projectId=id;
  project=load(id);
  setActiveId(id);
  history.reset(project);
  selection.clear();
  zoom=fitZoom();
  render();
  centreView();
  setSaveStatus('saved');
}

/* ---------- commands ---------- */

const apple=/mac|iphone|ipad/i.test(navigator.userAgent);
const mod=apple?'\u2318':'Ctrl ';
const shiftMod=apple?'\u21e7\u2318':'Ctrl \u21e7';
const hasSelection=()=>selection.size>0;

function commands():Command[]{
  return[
    {id:'new',group:'File',title:'New panel from a template',keywords:'start template blank',run:newProjectDialog},
    {id:'library',group:'File',title:'Open a saved panel',keys:`${mod}O`,keywords:'projects library browse recover',run:projectsDialog},
    {id:'save',group:'File',title:'Download project file',keys:`${mod}S`,keywords:'json backup export',run:()=>void doExport('json')},
    {id:'import',group:'File',title:'Import a .panel.json file',keywords:'open load',run:()=>document.querySelector<HTMLInputElement>('#file-input')!.click()},
    {id:'export',group:'Export',title:'Export panel…',keys:`${mod}E`,keywords:'svg dxf png bom',run:exportDialog},
    {id:'export-dxf',group:'Export',title:'Export cutout DXF',keywords:'laser cnc fabrication r12',run:()=>void doExport('dxf')},
    {id:'export-cut',group:'Export',title:'Export cutout SVG',keywords:'drill machining',run:()=>void doExport('cut')},
    {id:'export-art',group:'Export',title:'Export artwork SVG',keywords:'graphics print',run:()=>void doExport('art')},
    {id:'export-png',group:'Export',title:'Export PNG render',keywords:'raster image screenshot',run:()=>void doExport('png')},
    {id:'export-bom',group:'Export',title:'Export bill of materials',keywords:'csv parts order',run:()=>void doExport('bom')},
    {id:'print',group:'Export',title:'Print a 1:1 drilling template',keys:`${mod}P`,keywords:'paper actual size template',run:()=>void doExport('print')},

    {id:'undo',group:'Edit',title:'Undo',keys:`${mod}Z`,enabled:()=>history.canUndo,run:undo},
    {id:'redo',group:'Edit',title:'Redo',keys:`${shiftMod}Z`,enabled:()=>history.canRedo,run:redo},
    {id:'copy',group:'Edit',title:'Copy selection',keys:`${mod}C`,enabled:hasSelection,run:copySelection},
    {id:'cut',group:'Edit',title:'Cut selection',keys:`${mod}X`,enabled:hasSelection,run:cutSelection},
    {id:'paste',group:'Edit',title:'Paste',keys:`${mod}V`,run:()=>void pasteClipboard()},
    {id:'duplicate',group:'Edit',title:'Duplicate selection',keys:`${mod}D`,enabled:hasSelection,run:duplicate},
    {id:'delete',group:'Edit',title:'Delete selection',keys:'Del',enabled:hasSelection,run:remove},
    {id:'select-all',group:'Edit',title:'Select everything',keys:`${mod}A`,run:()=>{selection=new Set(project.items.filter(i=>!i.hidden).map(i=>i.id));render();}},
    {id:'select-same',group:'Edit',title:'Select all of the same part',enabled:hasSelection,keywords:'similar matching kind',run:selectSameKind},
    {id:'lock',group:'Edit',title:'Lock or unlock selection',keys:'L',enabled:hasSelection,run:toggleLock},
    {id:'group',group:'Edit',title:'Group selection',keys:`${mod}G`,enabled:()=>selection.size>1,keywords:'strip channel bind together',run:groupSelection},
    {id:'ungroup',group:'Edit',title:'Ungroup selection',keys:`${shiftMod}G`,enabled:hasSelection,run:ungroupSelection},
    {id:'repeat',group:'Arrange',title:'Repeat selection…',keys:'⇧R',enabled:hasSelection,keywords:'array duplicate channel strip row bank',run:repeatDialog},

    {id:'align-x',group:'Arrange',title:'Align horizontal centres',enabled:()=>selection.size>1,run:()=>align('x')},
    {id:'align-y',group:'Arrange',title:'Align vertical centres',enabled:()=>selection.size>1,run:()=>align('y')},
    {id:'space-h',group:'Arrange',title:'Equal horizontal spacing',enabled:()=>selection.size>2,run:()=>distribute('x')},
    {id:'space-v',group:'Arrange',title:'Equal vertical spacing',enabled:()=>selection.size>2,run:()=>distribute('y')},
    {id:'spread-h',group:'Arrange',title:'Spread across the panel width',enabled:()=>selection.size>1,run:()=>spreadAcrossPanel('x')},
    {id:'spread-v',group:'Arrange',title:'Spread down the panel height',enabled:()=>selection.size>1,run:()=>spreadAcrossPanel('y')},
    {id:'grid',group:'Arrange',title:'Arrange in a grid…',enabled:()=>selection.size>1,keywords:'matrix rows columns jacks',run:arrangeDialog},
    {id:'centre',group:'Arrange',title:'Centre across the panel width',enabled:hasSelection,run:()=>center('x')},
    {id:'centre-v',group:'Arrange',title:'Centre down the panel height',enabled:hasSelection,run:()=>center('y')},
    {id:'rotate-cw',group:'Arrange',title:'Rotate 90° clockwise',keys:'R',enabled:hasSelection,run:()=>rotateSelection(90)},
    {id:'rotate-ccw',group:'Arrange',title:'Rotate 90° anticlockwise',keys:'⌥R',enabled:hasSelection,run:()=>rotateSelection(-90)},
    {id:'mirror',group:'Arrange',title:'Mirror across the panel centreline',keys:'M',enabled:hasSelection,keywords:'flip symmetry',run:mirrorSelection},
    {id:'flip',group:'Arrange',title:'Flip top to bottom',enabled:hasSelection,run:flipSelection},
    {id:'match-size',group:'Arrange',title:'Match sizes to the largest',enabled:()=>selection.size>1,run:matchSizes},

    {id:'view-design',group:'View',title:'Hardware view',keys:`${apple?'\u2325':'Alt '}1`,run:()=>{view='design';render();}},
    {id:'view-cutout',group:'View',title:'Cutout view',keys:`${apple?'\u2325':'Alt '}2`,run:()=>{view='cutout';render();}},
    {id:'view-rear',group:'View',title:'Rear clearance view',keys:`${apple?'\u2325':'Alt '}3`,run:()=>{view='rear';render();}},
    {id:'zoom-fit',group:'View',title:'Fit the panel to the window',keys:'0',run:zoomFit},
    {id:'zoom-selection',group:'View',title:'Zoom to selection',keys:'F',enabled:hasSelection,run:focusSelection},
    {id:'zoom-100',group:'View',title:'Zoom to 100%',keys:'1',run:()=>zoomTo(1)},
    {id:'grid-toggle',group:'View',title:'Show or hide the grid',keys:'G',run:()=>{showGrid=!showGrid;savePrefs();render();}},
    {id:'snap-toggle',group:'View',title:'Turn grid snapping on or off',run:()=>{snap=!snap;savePrefs();render();}},
    {id:'guides-toggle',group:'View',title:'Turn smart guides on or off',run:()=>{smartGuides=!smartGuides;savePrefs();renderChrome();}},
    {id:'safe-toggle',group:'View',title:'Show or hide safe zones',run:()=>{showSafe=!showSafe;savePrefs();render();}},
    {id:'rack-toggle',group:'View',title:'Show the panel in a rack',keywords:'case neighbours rails context',run:()=>{showRack=!showRack;render();}},
    {id:'grid-size',group:'View',title:`Cycle the grid step (now ${grids[gridIndex]} mm)`,run:cycleGrid},
    {id:'theme',group:'View',title:`Theme: ${theme} — switch to ${nextTheme(theme)}`,keywords:'dark light appearance',run:()=>setTheme(nextTheme(theme))},
    {id:'focus-ring',group:'View',title:`Focus ring: ${focusRing?'always shown':'only when tabbing'}`,detail:focusRing?'Outline every focused part, pointer or keyboard':'Outline a part only when the keyboard put focus on it',keywords:'outline blue accessibility a11y keyboard highlight',run:()=>{focusRing=!focusRing;savePrefs();notify(focusRing?'Focus ring always shown':'Focus ring only when tabbing');drawFocusRing();}},

    {id:'panel-tab',group:'Panel',title:'Panel settings',run:()=>{rightOpen=true;inspectorTab='panel';render();}},
    {id:'layers-tab',group:'Panel',title:'Object layers',run:()=>{rightOpen=true;inspectorTab='layers';render();}},
    {id:'help',group:'Help',title:'Keyboard shortcuts',keys:'?',run:helpDialog},
  ];
}

function cycleGrid(){
  gridIndex=(gridIndex+1)%grids.length;
  savePrefs();
  render();
  notify(`Grid step ${grids[gridIndex]} mm`);
}

function setTheme(next:Theme){
  theme=next;
  applyTheme(theme);
  savePrefs();
  renderChrome();
  notify(`Theme: ${theme}`);
}

function undo(){const previous=history.undo();if(!previous)return;project=previous;keepSelection();persist();render();}
function redo(){const next=history.redo();if(!next)return;project=next;keepSelection();persist();render();}
/** After a history jump, keep the parts that still exist selected. */
function keepSelection(){const live=new Set(project.items.map(i=>i.id));selection=new Set([...selection].filter(id=>live.has(id)));}

type Template={id:string;name:string;note:string;build:()=>Project};

const TEMPLATES:Template[]=[
  {id:'blank',name:'Blank panel',note:'12 HP, nothing on it',build:()=>emptyProject()},
  {id:'voice',name:'Synth voice',note:'12 HP · 3 controls, 3 jacks',build:()=>{
    const p=emptyProject();p.name='Synth voice';
    ['knob-large','knob-medium','knob-medium','jack-mono','jack-mono','jack-mono','led-3mm'].forEach((id,n)=>
      p.items.push(makeItem(id,[30,18,42,18,30,42,30][n],[31,61,61,98,98,98,112][n],['PITCH','SHAPE','MOD','V/OCT','FM','OUT',''][n])));
    return p;}},
  {id:'mixer',name:'Four channel mixer',note:'16 HP · level and input per channel',build:()=>{
    const p=emptyProject();p.name='Four channel mixer';p.panel.hp=16;
    for(let n=0;n<4;n++)p.items.push(makeItem('knob-medium',12+n*19,34,'LEVEL'),makeItem('jack-mono',12+n*19,72,'IN'));
    p.items.push(makeItem('knob-large',40,98,'MASTER'),makeItem('jack-mono',62,103,'OUT'));
    return p;}},
  {id:'sequencer',name:'Eight step sequencer',note:'20 HP · step knobs and LEDs',build:()=>{
    const p=emptyProject();p.name='Eight step sequencer';p.panel.hp=20;
    for(let n=0;n<8;n++){const x=10+(n%4)*25,y=30+Math.floor(n/4)*34;p.items.push(makeItem('knob-small',x,y,`${n+1}`),makeItem('led-3mm',x,y+10,''));}
    p.items.push(makeItem('button-round',18,105,'RUN'),makeItem('jack-mono',50,105,'CLOCK'),makeItem('jack-mono',78,105,'CV'));
    return p;}},
  {id:'multiple',name:'Buffered multiple',note:'4 HP · a column of jacks',build:()=>{
    const p=emptyProject();p.name='Buffered multiple';p.panel.hp=4;p.panel.mounting='two';
    const w=panelWidth(p.panel);
    [18,32,46,66,80,94,108].forEach((y,n)=>p.items.push(makeItem('jack-mono',w/2,y,n===0?'IN':n===3?'IN':'OUT')));
    return p;}},
  {id:'dual-vca',name:'Dual VCA',note:'8 HP · two mirrored channels',build:()=>{
    const p=emptyProject();p.name='Dual VCA';p.panel.hp=8;
    const w=panelWidth(p.panel);
    [0,1].forEach(channel=>{
      const top=22+channel*58;
      p.items.push(makeItem('knob-medium',w/2,top,'GAIN'),makeItem('jack-mono',w/2-8,top+22,'IN'),makeItem('jack-mono',w/2+8,top+22,'OUT'),makeItem('led-3mm',w/2,top+34,''));
    });
    return p;}},
];

function newProjectDialog(){
  document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="modal"><div class="modal library-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <div class="modal-head"><h2 id="modal-title">Start a new panel</h2><p>Every template is a normal project — move, delete or resize anything in it.</p></div>
    <div class="template-grid">${TEMPLATES.map(t=>`<button class="template" data-template="${t.id}"><div class="template-preview">${miniPanel(t.build(),78)}</div><strong>${t.name}</strong><small>${t.note}</small></button>`).join('')}</div>
    <div class="modal-actions"><span>Added to your panels; the one you have open is untouched.</span><button class="tool-button" id="cancel-modal">Cancel</button></div>
  </div></div>`);
  document.querySelector('#cancel-modal')!.addEventListener('click',closeModal);
  document.querySelectorAll<HTMLElement>('[data-template]').forEach(b=>b.onclick=()=>makeTemplate(b.dataset.template!));
}

function makeTemplate(type:string){
  const template=TEMPLATES.find(t=>t.id===type);
  if(!template)return;
  saveRecovery();
  const built=template.build();
  const id=newProjectId();
  const written=saveProject(id,built);
  closeModal();
  if(!written.ok){notify('Browser storage is full. Delete a panel first.');return;}
  openProject(id);
  notify(`${template.name} created`);
}

function makeItem(id:string,x:number,y:number,label:string){const d=catalogMap.get(id)!;return{id:uid(),componentId:id,x,y,rotation:0,label,color:d.color,width:d.width,height:d.height,value:.6,locked:false,hidden:false,role:d.renderer==='jack'?'input':d.renderer==='led'?'light':'param',identifier:''} as Item;}

let exportDpi=300,engraveLabels=false;
const EXPORTS:Array<{id:string;mark:IconName;title:string;blurb:string}>=[
  {id:'art',mark:'art',title:'Artwork SVG',blurb:'Front-panel graphics at physical size'},
  {id:'cut',mark:'cut',title:'Cutout SVG',blurb:'Outline, slots and apertures only'},
  {id:'dxf',mark:'dxf',title:'Cutout DXF',blurb:'R12 file for laser cutters and panel shops'},
  {id:'png',mark:'png',title:'PNG render',blurb:'Raster image for posts and documentation'},
  {id:'print',mark:'print',title:'Print at 1:1',blurb:'Cutout template with centre marks and a scale bar'},
  {id:'vcv',mark:'vcv',title:'VCV Rack SVG',blurb:'Artwork with component-role markers'},
  {id:'bom',mark:'bom',title:'Bill of materials',blurb:'CSV of parts, cutouts and depths'},
  {id:'json',mark:'json',title:'Project file',blurb:'Editable .panel.json you can re-open'},
];

function exportDialog(){
  const counts=issueCounts(issues);
  const tone=counts.errors?'bad':counts.warnings?'warning':'good';
  const summary=counts.errors?`${icon('cross')}${counts.errors} error${counts.errors===1?'':'s'} to fix first`
    :counts.warnings?`${icon('warn')}${counts.warnings} warning${counts.warnings===1?'':'s'}`
    :`${icon('check')}Layout checks pass`;
  const detail=counts.errors?'Holes break an edge, overlap, or clash with a mounting slot.'
    :counts.warnings?'Not fatal, but worth a look before you spend money on metal.'
    :'Every dimension still needs checking against the real part before fabrication.';
  document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="modal"><div class="modal export-modal" role="dialog" aria-modal="true" aria-label="Export panel">
    <div class="modal-head"><h2>Export</h2><p>${esc(project.name)} · ${project.panel.hp} HP · ${panelWidth(project.panel).toFixed(2)} × ${PANEL_H} mm · ${esc(project.panel.material)} ${project.panel.thickness} mm</p></div>
    <figure class="plot-preview" id="plot-preview">${plotSheetSvg(project,catalogMap,{engrave:engraveLabels})}<figcaption>The cutout drawing as the shop receives it — outline, cutouts, mounting and engraving on their own layers, a centre mark in every hole.</figcaption></figure>
    <div class="export-preflight ${tone}"><strong>${summary}</strong><span>${detail}</span></div>
    <div class="export-options">${EXPORTS.map(e=>`<button data-export="${e.id}"><span>${icon(e.mark)}</span><div><strong>${e.title}</strong><small>${e.blurb}</small></div></button>`).join('')}</div>
    <div class="export-settings">
      <label>Raster resolution<select id="export-dpi">${[150,300,600,1200].map(d=>`<option value="${d}" ${d===exportDpi?'selected':''}>${d} dpi</option>`).join('')}</select></label>
      <label class="checkbox"><input type="checkbox" id="export-engrave" ${engraveLabels?'checked':''}> Add labels to DXF as engraving</label>
    </div>
    <div class="modal-actions"><button class="tool-button" id="cancel-modal">Close</button></div>
  </div></div>`);
  document.querySelector('#cancel-modal')!.addEventListener('click',closeModal);
  document.querySelector<HTMLSelectElement>('#export-dpi')!.onchange=e=>{exportDpi=Number((e.target as HTMLSelectElement).value);};
  document.querySelector<HTMLInputElement>('#export-engrave')!.onchange=e=>{engraveLabels=(e.target as HTMLInputElement).checked;const preview=document.querySelector('#plot-preview svg');if(preview)preview.outerHTML=plotSheetSvg(project,catalogMap,{engrave:engraveLabels});};
  document.querySelectorAll<HTMLElement>('[data-export]').forEach(b=>b.onclick=()=>{void doExport(b.dataset.export!);closeModal();});
}

const SHORTCUTS:Array<[string,Array<[string,string]>]>=[
  ['Getting around',[['All commands',`${mod}K`],['Find a part','/'],['Fit the panel','0'],['Zoom to selection','F'],['Zoom at the pointer',`${mod}scroll`],['Pan the canvas','Space drag'],['Deselect','Esc']]],
  ['Selection',[['Rubber-band select','Drag empty space'],['Add to selection','⇧ click'],['Select everything',`${mod}A`],['Select the same part','Palette'],['Lock or unlock','L']]],
  ['Editing',[['Copy / cut / paste',`${mod}C · ${mod}X · ${mod}V`],['Duplicate',`${mod}D`],['Delete','⌫'],['Undo / redo',`${mod}Z · ${shiftMod}Z`],['Rotate 90°','R · ⇧R'],['Mirror across the centreline','M']]],
  ['Precision',[['Nudge by the grid step','Arrow'],['Nudge 1 mm','⇧ Arrow'],['Ignore snapping','Alt drag'],['Keep proportions while resizing','⇧ resize'],['Cycle the grid step','Palette'],['Show or hide the grid','G']]],
  ['Files',[['Your panels',`${mod}O`],['Download project file',`${mod}S`],['Export…',`${mod}E`],['Print at 1:1',`${mod}P`]]],
];

function helpDialog(){
  document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="modal"><div class="modal shortcuts-modal" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title">
    <div class="modal-head"><span class="eyebrow">Five08</span><h2 id="shortcuts-title">Shortcuts</h2><p>Drag a part onto the panel, or click a library row to drop it at the centre.</p></div>
    <div class="shortcut-grid">${SHORTCUTS.map(([title,rows])=>`<section><h3>${title}</h3>${rows.map(([label,keys])=>`<div><span>${label}</span><kbd>${keys}</kbd></div>`).join('')}</section>`).join('')}</div>
    <div class="guide-tip"><strong>Smart guides</strong><span>Blue lines align centres and edges while you drag. Red measurements show the gap to the nearest neighbour, and a matching “=” badge means two gaps are equal. Hold Alt to place a part anywhere, ignoring the grid.</span></div>
    <div class="guide-tip"><strong>Focus ring</strong><span>Tab into the panel and the part you are on wears a blue outline. Clicking or dragging never draws one. To outline whatever is focused however you got there, search “focus ring” in the command palette.</span></div>
    <div class="guide-tip"><strong>Before you cut metal</strong><span>Preflight checks edge margins, cutout walls, mounting clashes, jack spacing and part depth. Generic component dimensions are starting points — check every one against the real datasheet.</span></div>
    <div class="modal-actions"><button class="tool-button primary" id="cancel-modal">Close</button></div>
  </div></div>`);
  document.querySelector('#cancel-modal')!.addEventListener('click',closeModal);
  document.querySelector<HTMLElement>('#cancel-modal')!.focus();
}
function closeModal(){document.querySelector('#modal')?.remove();}
/** Builds a clean, physical-size SVG of the current panel with editor chrome stripped out. */
function exportableSvg(kind:'art'|'cut'|'vcv'){
  const previous=view;
  view=kind==='cut'?'cutout':'design';
  renderCanvas();
  const svg=document.querySelector<SVGSVGElement>('#panel-svg')!.cloneNode(true) as SVGSVGElement;
  view=previous;renderCanvas();
  // Guides, selection, and the rendered grain of the material: none of it is artwork.
  svg.querySelectorAll('.design-guide,.selection-ui,.empty-panel,#smart-guide-layer,#marquee,.panel-texture,.screw,.light-sheet,#overlay-layer,#focus-layer').forEach(n=>n.remove());
  svg.removeAttribute('style');
  svg.setAttribute('width',`${panelWidth(project.panel).toFixed(2)}mm`);
  svg.setAttribute('height',`${PANEL_H}mm`);
  svg.setAttribute('xmlns','http://www.w3.org/2000/svg');
  if(kind==='vcv'){
    const colors:Record<string,string>={param:'#ff0000',input:'#00ff00',output:'#0000ff',light:'#ff00ff',custom:'#ffff00'};
    const layer=document.createElementNS('http://www.w3.org/2000/svg','g');
    layer.setAttribute('id','components');
    project.items.filter(i=>i.role!=='none').forEach(i=>{
      const e=document.createElementNS('http://www.w3.org/2000/svg','circle');
      e.setAttribute('cx',String(i.x));e.setAttribute('cy',String(i.y));e.setAttribute('r','1.5');
      e.setAttribute('fill',colors[i.role]||'#ffff00');
      if(i.identifier)e.setAttribute('id',i.identifier);
      layer.appendChild(e);
    });
    svg.appendChild(layer);
  }
  return new XMLSerializer().serializeToString(svg);
}

function bomCsv(){
  // Two of the same part with different values are two lines to order, not one.
  const rows=new Map<string,{d:ComponentDefinition;spec:string;n:number}>();
  project.items.forEach(i=>{
    const d=catalogMap.get(i.componentId);if(!d)return;
    const spec=i.spec?.trim()??'';
    const key=`${i.componentId}\u0000${spec}`;
    const row=rows.get(key);
    row?row.n++:rows.set(key,{d,spec,n:1});
  });
  const cell=(v:string|number|undefined)=>`"${String(v??'').replace(/"/g,'""')}"`;
  return['Quantity,Part,Order spec,Manufacturer,Part number,Cutout mm,Rear depth mm,Dimensions from,Source',
    ...[...rows.values()].sort((a,b)=>a.d.name.localeCompare(b.d.name)||a.spec.localeCompare(b.spec)).map(({d,spec,n})=>
      [n,cell(d.name),cell(spec),cell(d.manufacturer),cell(d.partNumber),d.cutout??'',d.depth??'',
       cell(d.status==='verified'?'datasheet':d.source?'cutout traced':'generic estimate'),cell(d.source?.url??d.source?.note)].join(','))
  ].join('\n');
}

async function doExport(type:string){
  const name=slug(project.name);
  pulse(document.querySelector('#export'),'flash-ok');
  try{
    if(type==='json'){download(`${name}.panel.json`,JSON.stringify(project,null,2),'application/json');notify('Project file saved');return;}
    if(type==='bom'){download(`${name}-bom.csv`,bomCsv(),'text/csv');notify('Bill of materials exported');return;}
    if(type==='cut'){download(`${name}-cut.svg`,cutoutSvg(project,catalogMap),'image/svg+xml');notify('Cutout SVG exported');return;}
    if(type==='dxf'){download(`${name}-cut.dxf`,panelDxf(project,catalogMap,{engraveLabels}),'application/dxf');notify(`DXF exported${engraveLabels?' with engraving layer':''}`);return;}
    if(type==='print'){printSheet(templateSvg(project,catalogMap),`${esc(project.name)} · ${project.panel.hp} HP · ${panelWidth(project.panel).toFixed(2)} × ${PANEL_H} mm · cutout template at 1:1 — check the 100 mm bar with a ruler before you drill`);return;}
    if(type==='png'){
      const svg=exportableSvg('art');
      notify(`Rendering ${exportDpi} dpi PNG…`);
      const blob=await svgToPng(svg,panelWidth(project.panel),PANEL_H,exportDpi,project.panelColor);
      downloadBlob(`${name}-${exportDpi}dpi.png`,blob);
      notify('PNG exported');
      return;
    }
    download(`${name}-${type}.svg`,exportableSvg(type as 'art'|'vcv'),'image/svg+xml');
    notify('SVG exported');
  }catch(err){
    notify(err instanceof Error?err.message:'Export failed');
  }
}
function downloadBlob(name:string,blob:Blob){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000);}
function download(name:string,data:string,type:string){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);}
function slug(s:string){return s.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'panel';}

document.querySelector<HTMLInputElement>('#library-search')!.oninput=e=>{libraryQuery=(e.target as HTMLInputElement).value;renderLibrary();};document.querySelector('#delete')!.addEventListener('click',remove);document.querySelector('#undo')!.addEventListener('click',undo);document.querySelector('#redo')!.addEventListener('click',redo);document.querySelector('#new-project')!.addEventListener('click',newProjectDialog);document.querySelector('#open-library')!.addEventListener('click',projectsDialog);document.querySelector('#open-palette')!.addEventListener('click',()=>openPalette(commands()));document.querySelector('#theme-toggle')!.addEventListener('click',()=>setTheme(nextTheme(theme)));document.querySelector('#tool-grid')!.addEventListener('click',arrangeDialog);document.querySelector('#tool-mirror')!.addEventListener('click',mirrorSelection);document.querySelector('#tool-rotate')!.addEventListener('click',()=>rotateSelection(90));document.querySelector('#zoom-selection')!.addEventListener('click',focusSelection);document.querySelector('#export')!.addEventListener('click',exportDialog);document.querySelector('#help')!.addEventListener('click',helpDialog);document.querySelector('#save-json')!.addEventListener('click',()=>void doExport('json'));document.querySelector<HTMLInputElement>('#file-input')!.onchange=async e=>{const f=(e.target as HTMLInputElement).files?.[0];if(!f)return;if(f.size>5_000_000){notify("Project file is larger than 5 MB");return;}try{
  const {project:imported,stripped}=sanitizeProjectArtwork(parseProject(JSON.parse(await f.text()),catalogMap));
  if(stripped)notify(`${stripped} piece${stripped===1?'':'s'} of artwork had unsafe markup removed`);
  const id=newProjectId();
  saveProject(id,imported);
  openProject(id);
  notify(`Opened ${imported.name}`);
}catch(err){notify(err instanceof Error?err.message:'That file is not a Five08 project');}
(e.target as HTMLInputElement).value='';};document.querySelector<HTMLInputElement>('#project-name')!.onchange=e=>mutate(()=>project.name=(e.target as HTMLInputElement).value);document.querySelectorAll<HTMLElement>('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view as typeof view;render();});document.querySelectorAll<HTMLElement>('[data-inspector-tab]').forEach(b=>b.onclick=()=>{inspectorTab=b.dataset.inspectorTab as typeof inspectorTab;render();});document.querySelector('#collapse-left')!.addEventListener('click',()=>{leftOpen=false;renderChrome();});document.querySelector('#open-left')!.addEventListener('click',()=>{leftOpen=true;renderChrome();});document.querySelector('#collapse-right')!.addEventListener('click',()=>{rightOpen=false;renderChrome();});document.querySelector('#open-right')!.addEventListener('click',()=>{rightOpen=true;renderChrome();});document.querySelector('#warning-count')!.addEventListener('click',()=>{rightOpen=true;inspectorTab='panel';render();});bindGroupButtons();document.querySelector('#smart-guides')!.addEventListener('click',()=>{smartGuides=!smartGuides;savePrefs();renderChrome();});document.querySelector('#toggle-safe')!.addEventListener('click',()=>{showSafe=!showSafe;savePrefs();render();});document.querySelector('#toggle-rack')!.addEventListener('click',()=>{showRack=!showRack;render();});document.querySelector('#zoom-in')!.addEventListener('click',()=>zoomTo(zoom*1.2));document.querySelector('#zoom-out')!.addEventListener('click',()=>zoomTo(zoom/1.2));document.querySelector('#zoom-fit')!.addEventListener('click',zoomFit);document.querySelector('#zoom-100')!.addEventListener('click',()=>zoomTo(1));document.querySelector('#snap-toggle')!.addEventListener('click',()=>{snap=!snap;savePrefs();render();});document.querySelector('#grid-cycle')!.addEventListener('click',cycleGrid);document.querySelector('#grid-toggle')!.addEventListener('click',()=>{showGrid=!showGrid;savePrefs();render();});
window.addEventListener('pointermove',e=>{
  if(!drag)return;
  const current=drag;
  if(current.mode==='pan'){
    const canvas=canvasEl();
    canvas.scrollLeft=current.scrollLeft-(e.clientX-current.startClientX);
    canvas.scrollTop=current.scrollTop-(e.clientY-current.startClientY);
    current.moved=true;
    renderRuler(panelWidth(project.panel));
    return;
  }
  const svg=document.querySelector<SVGSVGElement>('#panel-svg');
  if(!svg)return;
  const p=point(e,svg);
  if(current.mode==='marquee'){
    current.x=p.x;current.y=p.y;
    current.moved=current.moved||Math.abs(p.x-current.startX)>.4||Math.abs(p.y-current.startY)>.4;
    drawMarquee(current);
    cursorTag(null);
    return;
  }
  if(current.mode==='resize'){
    const item=project.items.find(i=>i.id===current.itemId);
    if(!item)return;
    const def=catalogMap.get(item.componentId)!;
    const dx=(p.x-current.startX)*(current.corner.includes('e')?2:-2),dy=(p.y-current.startY)*(current.corner.includes('s')?2:-2);
    const rawW=Math.max(.5,current.startWidth+dx),rawH=Math.max(.5,current.startHeight+dy);
    const proportional=['knob','jack','button','led','hole'].includes(def.renderer);
    if(proportional||e.shiftKey){
      const scale=Math.max(rawW/current.startWidth,rawH/current.startHeight);
      item.width=Math.max(.5,current.startWidth*scale);
      item.height=Math.max(.5,current.startHeight*scale);
    }else{item.width=rawW;item.height=rawH;}
    current.moved=current.moved||Math.abs(dx)>.01||Math.abs(dy)>.01;
    const g=svg.querySelector<SVGGElement>(`[data-id="${item.id}"]`);
    g?.setAttribute('transform',`translate(${item.x} ${item.y}) rotate(${item.rotation}) scale(${item.width/current.startWidth} ${item.height/current.startHeight})`);
    document.querySelector('#coordinates')!.textContent=`W ${item.width.toFixed(1)} · H ${item.height.toFixed(1)}`;
    cursorTag(e,`${item.width.toFixed(1)} × ${item.height.toFixed(1)}`);
    return;
  }
  const panelRect=svg.getBoundingClientRect();
  const dx=(e.clientX-current.startClientX)/(panelRect.width/panelWidth(project.panel));
  const dy=(e.clientY-current.startClientY)/(panelRect.height/PANEL_H);
  const moving=selectedItems().filter(i=>!i.locked);
  current.moved=current.moved||Math.abs(dx)>.05||Math.abs(dy)>.05;
  let guide='';
  moving.forEach((i,n)=>{
    const o=current.orig.get(i.id);
    if(!o)return;
    let x=e.altKey?Math.round((o.x+dx)*100)/100:magneticGrid(o.x+dx),y=e.altKey?Math.round((o.y+dy)*100)/100:magneticGrid(o.y+dy);
    if(smartGuides&&!e.altKey&&moving.length===1){const smart=smartPosition(i,x,y);x=smart.x;y=smart.y;guide=smart.guide;}
    i.x=x;i.y=y;
    const g=svg.querySelector<SVGGElement>(`[data-id="${i.id}"]`);
    g?.setAttribute('transform',`translate(${i.x} ${i.y}) rotate(${i.rotation})`);
    if(n===0){document.querySelector('#coordinates')!.textContent=`X ${i.x.toFixed(1)} · Y ${i.y.toFixed(1)}`;cursorTag(e,`${i.x.toFixed(1)}  ${i.y.toFixed(1)}`);}
  });
  // A guide that has just appeared, or moved to a new target, ticks once so
  // the snap is felt rather than merely seen. One that is merely still does not.
  const key=guide.match(/<line class="smart-line"[^>]*>/g)?.join('')??'';
  if(key&&key!==lastGuideKey)guide=guide.replaceAll('class="smart-line"','class="smart-line fresh"');
  lastGuideKey=key;
  const layer=svg.querySelector('#smart-guide-layer');
  if(layer)layer.innerHTML=guide;
});

window.addEventListener('pointerup',()=>{
  if(!drag)return;
  const finished=drag;
  drag=null;
  cursorTag(null);
  lastGuideKey='';
  if(finished.mode==='pan'){canvasEl().classList.remove('panning');return;}
  if(finished.mode==='marquee'){
    const hits=finished.moved?marqueeHits(finished).map(i=>i.id):[];
    selection=expandGroups([...finished.base,...hits],project.items);
    render();
    return;
  }
  finished.moved?mutate(()=>{}):render();
});
window.addEventListener('pointercancel',()=>{drag=null;canvasEl().classList.remove('panning');render();});

canvasEl().addEventListener('scroll',()=>renderRuler(panelWidth(project.panel)),{passive:true});
canvasEl().addEventListener('wheel',e=>{
  if(e.ctrlKey||e.metaKey){
    e.preventDefault();
    zoomTo(zoom*Math.exp(-e.deltaY*.01),e.clientX,e.clientY);
  }
},{passive:false});

window.addEventListener('resize',()=>renderRuler(panelWidth(project.panel)));
window.addEventListener('beforeunload',flush);

const typing=(t:EventTarget|null)=>{const el=t as HTMLElement|null;return!!el&&(['INPUT','SELECT','TEXTAREA'].includes(el.tagName)||el.isContentEditable);};

/* Which input put focus where, decided the way :focus-visible decides it. */
window.addEventListener('keydown',()=>{usingKeyboard=true;},{capture:true});
window.addEventListener('pointerdown',()=>{if(!usingKeyboard)return;usingKeyboard=false;drawFocusRing();},{capture:true});

window.addEventListener('keyup',e=>{if(e.code==='Space'){spaceHeld=false;canvasEl().classList.remove('pannable');}});

window.addEventListener('keydown',e=>{
  const meta=e.metaKey||e.ctrlKey,key=e.key.toLowerCase();
  if(e.key==='Escape'){
    if(document.querySelector('#palette')){document.querySelector('#palette')!.remove();return;}
    if(document.querySelector('#modal')){closeModal();return;}
    if(!typing(e.target)&&(selection.size||focusedId)){
      // Park focus on the canvas itself rather than nowhere: blurring to <body>
      // leaves the browser resuming Tab from inside the parts it just left.
      const inCanvas=(document.activeElement as HTMLElement|null)?.closest?.('.panel-item');
      selection.clear();focusedId='';render();
      if(inCanvas)canvasEl().focus({preventScroll:true});
      return;
    }
  }
  if(e.key==='Tab'&&!typing(e.target)&&!document.querySelector('#modal,#palette')
     &&(document.activeElement as HTMLElement|null)?.closest?.('.panel-item')){
    if(moveFocus(e.shiftKey?-1:1))e.preventDefault();
    return;
  }
  if((e.key==='Enter'||e.key==='ArrowDown')&&document.activeElement===canvasEl()&&!typing(e.target)){
    if(moveFocus(1))e.preventDefault();
    return;
  }
  if(meta&&key==='k'){e.preventDefault();openPalette(commands());return;}
  if(typing(e.target))return;
  if(e.code==='Space'&&!e.repeat){spaceHeld=true;canvasEl().classList.add('pannable');e.preventDefault();return;}
  if(meta&&key==='z'){e.preventDefault();e.shiftKey?redo():undo();}
  else if(meta&&key==='y'){e.preventDefault();redo();}
  else if(meta&&key==='d'){e.preventDefault();duplicate();}
  else if(meta&&key==='c'){e.preventDefault();copySelection();}
  else if(meta&&key==='x'){e.preventDefault();cutSelection();}
  else if(meta&&key==='v'){e.preventDefault();pasteClipboard();}
  else if(meta&&key==='a'){e.preventDefault();selection=new Set(project.items.filter(i=>!i.hidden).map(i=>i.id));render();}
  else if(meta&&key==='s'){e.preventDefault();flush();doExport('json');}
  else if(meta&&key==='e'){e.preventDefault();exportDialog();}
  else if(meta&&key==='o'){e.preventDefault();projectsDialog();}
  else if(meta&&key==='p'){e.preventDefault();void doExport('print');}
  else if(key==='/'){e.preventDefault();leftOpen=true;renderChrome();document.querySelector<HTMLInputElement>('#library-search')!.focus();}
  else if(['delete','backspace'].includes(key)){e.preventDefault();remove();}
  else if(e.key==='?'){helpDialog();}
  else if(meta&&key==='g'){e.preventDefault();e.shiftKey?ungroupSelection():groupSelection();}
  else if(key==='r'&&selection.size){e.preventDefault();e.shiftKey?repeatDialog():rotateSelection(e.altKey?-90:90);}
  else if(key==='m'&&selection.size){e.preventDefault();mirrorSelection();}
  else if(key==='l'&&selection.size){e.preventDefault();toggleLock();}
  else if(key==='g'){e.preventDefault();showGrid=!showGrid;savePrefs();render();}
  else if(key==='f'){e.preventDefault();selection.size?focusSelection():zoomFit();}
  else if(key==='1'){e.preventDefault();zoomTo(1);}
  else if(key==='2'){e.preventDefault();zoomTo(2);}
  else if(key==='0'){e.preventDefault();zoomFit();}
  else if(key==='+'||key==='='){e.preventDefault();zoomTo(zoom*1.2);}
  else if(key==='-'){e.preventDefault();zoomTo(zoom/1.2);}
  else if(['1','2','3'].includes(e.key)&&e.altKey){e.preventDefault();view=(['design','cutout','rear'] as const)[Number(e.key)-1];render();}
  else if(['arrowleft','arrowright','arrowup','arrowdown'].includes(key)&&selection.size){
    e.preventDefault();
    const step=e.shiftKey?1:snap?grids[gridIndex]:.1;
    mutate(()=>selectedItems().filter(i=>!i.locked).forEach(i=>{
      if(key==='arrowleft')i.x-=step;
      if(key==='arrowright')i.x+=step;
      if(key==='arrowup')i.y-=step;
      if(key==='arrowdown')i.y+=step;
    }));
  }
});

document.querySelector('#palette-key')!.textContent=apple?'⌘K':'Ctrl K';
document.querySelector('#skip-canvas')!.addEventListener('click',()=>{
  const visible=project.items.filter(i=>!i.hidden);
  if(!visible.length){notify('The panel is empty — add a part from the library first');return;}
  focusedId=focusedId||visible[0].id;
  selectIds([focusedId]);
  render();
  document.querySelector<SVGGElement>(`.panel-item[data-id="${focusedId}"]`)?.focus();
});
document.querySelector('#skip-inspector')!.addEventListener('click',()=>{
  rightOpen=true;renderChrome();
  document.querySelector<HTMLElement>('#inspector input,#inspector select,#inspector button')?.focus();
});
bindCanvasSurface();
registerOffline(()=>notify('A new version of Five08 is ready — reload to use it'));
applyTheme(theme);
watchSystemTheme(()=>{if(theme==='system')applyTheme(theme);});
leftOpen=leftOpenAtBoot();
rightOpen=window.innerWidth>1020;
render();
zoomFit();
persist();
if(new URLSearchParams(location.search).has('new')){window.history.replaceState(null,'','/app/');newProjectDialog();}
