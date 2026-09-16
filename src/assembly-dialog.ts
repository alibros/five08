import {catalogMap} from './catalog';
import {makeAssembly,instantiateAssembly,parseAssembly,readAssemblies,writeAssemblies,type Assembly} from './assemblies';
import {extent} from './arrange';
import {panelWidth,PANEL_H,uid,type Item,type Project} from './model';
import {componentSvg,esc} from './svg';

type Actions={project:Project;selected:Item[];insert:(items:Item[])=>void;close:()=>void;notify:(message:string)=>void;download:(name:string,data:string,type:string)=>void;icon:(name:'save'|'trash')=>string};
export function assemblyDialog(actions:Actions){
  const {project,selected,close,notify,download}=actions;
  let saved=readAssemblies(catalogMap);
  const thumb=(a:Assembly)=>{
    const b=extent(a.items),w=Math.max(10,b.r-b.l)+10,h=Math.max(10,b.b-b.t)+10;
    return`<svg viewBox="${b.l-5} ${b.t-5} ${w} ${h}" aria-hidden="true">${a.items.filter(i=>!i.hidden).map(i=>componentSvg(i,catalogMap.get(i.componentId)!,project,false,'design','preview')).join('')}</svg>`;
  };
  const draw=()=>{
    document.querySelector('#modal')?.remove();
    document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="modal"><section class="modal assembly-modal" role="dialog" aria-modal="true" aria-label="Saved assemblies">
      <header class="modal-head"><h2>Assemblies</h2><span class="mono">${saved.length} / 50 saved locally</span></header>
      <form class="assembly-save" id="assembly-save"><label class="sr-only" for="assembly-name">Assembly name</label><input id="assembly-name" required maxlength="80" placeholder="Assembly name" ${selected.length?'':'disabled'}><button class="tool-button" ${selected.length?'':'disabled'}>Save selection (${selected.length})</button></form>
      <div class="assembly-list">${saved.map((a,n)=>`<article class="assembly-row"><div class="assembly-preview">${thumb(a)}</div><div class="assembly-info"><strong>${esc(a.name)}</strong><span class="mono">${a.items.length} parts</span></div><button class="tool-button" data-insert="${n}" aria-label="Insert ${esc(a.name)}">Insert</button><button class="icon-button" data-download="${n}" aria-label="Download ${esc(a.name)}" title="Download assembly">${actions.icon('save')}</button><button class="icon-button" data-remove="${n}" aria-label="Delete ${esc(a.name)}" title="Delete assembly">${actions.icon('trash')}</button></article>`).join('')||'<p class="assembly-empty">No saved assemblies</p>'}</div>
      <footer class="modal-actions"><label class="tool-button assembly-import">Import assembly<input id="assembly-import" type="file" accept=".json,application/json" hidden></label><button class="tool-button" id="assembly-close">Close</button></footer>
    </section></div>`);
    const root=document.querySelector<HTMLElement>('#modal')!;
    root.querySelector<HTMLElement>(selected.length?'#assembly-name':'#assembly-close')!.focus();
    root.querySelector('#assembly-close')!.addEventListener('click',close);
    root.querySelector<HTMLFormElement>('#assembly-save')!.onsubmit=e=>{
      e.preventDefault();
      try{const name=root.querySelector<HTMLInputElement>('#assembly-name')!.value;
        const next=[...saved,makeAssembly(name,selected,catalogMap)];writeAssemblies(next);saved=next;draw();notify('Assembly saved locally');
      }catch(error){notify((error as Error).message);}
    };
    root.querySelectorAll<HTMLButtonElement>('[data-insert]').forEach(b=>b.onclick=()=>{
      const a=saved[Number(b.dataset.insert)];
      actions.insert(instantiateAssembly(a,panelWidth(project.panel)/2,PANEL_H/2));close();notify(`${a.name} inserted`);
    });
    root.querySelectorAll<HTMLButtonElement>('[data-download]').forEach(b=>b.onclick=()=>{
      const a=saved[Number(b.dataset.download)];download(`${a.name.replace(/[^a-z0-9]+/gi,'-')}.assembly.json`,JSON.stringify(a,null,2),'application/json');
    });
    root.querySelectorAll<HTMLButtonElement>('[data-remove]').forEach(b=>b.onclick=()=>{
      if(!window.confirm(`Delete "${saved[Number(b.dataset.remove)].name}" from this browser?`))return;
      try{const next=saved.filter((_,n)=>n!==Number(b.dataset.remove));writeAssemblies(next);saved=next;draw();}catch(error){notify((error as Error).message);}
    });
    root.querySelector<HTMLInputElement>('#assembly-import')!.onchange=async e=>{
      const file=(e.target as HTMLInputElement).files?.[0];if(!file)return;
      try{
        if(file.size>2_000_000)throw new Error('Assembly file is larger than 2 MB');
        const a=parseAssembly(JSON.parse(await file.text()),catalogMap);a.id=uid();
        if(!root.isConnected)return;
        const next=[...saved,a];writeAssemblies(next);saved=next;draw();notify('Assembly imported');
      }catch(error){notify((error as Error).message);}
    };
  };
  draw();
}
