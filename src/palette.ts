/**
 * Command palette. Every editor action is registered here, which doubles as
 * the app's own discoverability: search "mirror", "dxf" or "dark" and the tool
 * turns up with its shortcut next to it.
 */
export type Command={
  id:string; title:string; group:string;
  keys?:string; detail?:string; keywords?:string;
  enabled?:()=>boolean; run:()=>void;
};

const escapeHtml=(s:string)=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]!));

/** Subsequence match, so "mrh" still finds "Mirror horizontally". */
export function score(command:Command,query:string):number{
  if(!query)return 1;
  const haystack=`${command.title} ${command.group} ${command.keywords??''}`.toLowerCase();
  const needle=query.toLowerCase().trim();
  if(haystack.includes(needle))return 100-haystack.indexOf(needle);
  let at=0,hits=0;
  for(const ch of needle){
    const found=haystack.indexOf(ch,at);
    if(found<0)return 0;
    at=found+1;hits++;
  }
  return hits/haystack.length;
}

export const rank=(commands:Command[],query:string)=>
  commands.map(c=>({c,s:score(c,query)})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s).map(x=>x.c).slice(0,40);

export function openPalette(commands:Command[]){
  document.querySelector('#palette')?.remove();
  const available=commands.filter(c=>c.enabled?.()!==false);
  const host=document.createElement('div');
  host.className='modal-backdrop palette-backdrop';
  host.id='palette';
  host.innerHTML=`<div class="palette" role="dialog" aria-modal="true" aria-label="Commands">
    <input id="palette-input" type="text" autocomplete="off" spellcheck="false" placeholder="Search commands…" aria-label="Search commands">
    <div class="palette-results" id="palette-results" role="listbox"></div>
    <footer><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>↵</kbd> run</span><span><kbd>esc</kbd> close</span></footer>
  </div>`;
  document.body.append(host);

  const input=host.querySelector<HTMLInputElement>('#palette-input')!;
  const results=host.querySelector<HTMLDivElement>('#palette-results')!;
  let matches=rank(available,'');
  let cursor=0;

  const draw=()=>{
    results.innerHTML=matches.length
      ?matches.map((c,n)=>`<button class="palette-item ${n===cursor?'on':''}" data-index="${n}" role="option" aria-selected="${n===cursor}">
          <span class="palette-group">${escapeHtml(c.group)}</span>
          <span class="palette-title">${escapeHtml(c.title)}</span>
          ${c.detail?`<span class="palette-detail">${escapeHtml(c.detail)}</span>`:''}
          ${c.keys?`<span class="palette-keys">${escapeHtml(c.keys)}</span>`:''}
        </button>`).join('')
      :`<p class="palette-empty">Nothing matches that.</p>`;
    results.querySelector('.palette-item.on')?.scrollIntoView({block:'nearest'});
  };

  const close=()=>{host.remove();};
  const run=(command?:Command)=>{if(!command)return;close();command.run();};

  input.oninput=()=>{matches=rank(available,input.value);cursor=0;draw();};
  input.onkeydown=e=>{
    if(e.key==='ArrowDown'||(e.key==='n'&&e.ctrlKey)){e.preventDefault();cursor=(cursor+1)%Math.max(matches.length,1);draw();}
    else if(e.key==='ArrowUp'||(e.key==='p'&&e.ctrlKey)){e.preventDefault();cursor=(cursor-1+matches.length)%Math.max(matches.length,1);draw();}
    else if(e.key==='Enter'){e.preventDefault();run(matches[cursor]);}
    else if(e.key==='Escape'){e.preventDefault();close();}
  };
  results.onclick=e=>{
    const button=(e.target as HTMLElement).closest<HTMLElement>('.palette-item');
    if(button)run(matches[Number(button.dataset.index)]);
  };
  host.onpointerdown=e=>{if(e.target===host)close();};

  draw();
  input.focus();
}
