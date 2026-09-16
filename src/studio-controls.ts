import {DEFAULT_DESIGN,DEFAULT_RULES,DEFAULT_SCALE,parseDesign,parseRules,parseScale,type Item,type Project} from './model';

let typographyOpen=true,rulesOpen=false;

const number=(label:string,id:string,value:number,min:number,max:number,step:number,unit='mm')=>
  `<label class="studio-field"><span>${label}</span><span class="input-unit"><input id="${id}" type="number" value="${value}" min="${min}" max="${max}" step="${step}"><span>${unit}</span></span></label>`;

export function designControls(p:Project){
  const d=p.design??DEFAULT_DESIGN,r=p.rules??DEFAULT_RULES;
  return`<details class="studio-section" data-studio-section="type" ${typographyOpen?'open':''}><summary>Panel typography</summary><div class="studio-fields">
    <label class="studio-field">Font<select id="design-font">${['mono','sans','condensed'].map(f=>`<option ${f===d.font?'selected':''} value="${f}">${f==='mono'?'Mono':f==='sans'?'Sans':'Condensed'}</option>`).join('')}</select></label>
    <div class="two-col">${number('Legend size','design-labelSize',d.labelSize,.8,6,.1)}${number('Weight','design-weight',d.weight,100,900,100,'')}</div>
    <label class="studio-checkbox"><input id="design-uppercase" type="checkbox" ${d.uppercase?'checked':''}>Uppercase legends</label>
    <label class="studio-checkbox"><input id="design-outputLabels" type="checkbox" ${d.outputLabels==='inverted'?'checked':''}>Inverted output labels</label>
    <button class="tool-button wide" id="design-reset-overrides">Reset individual font overrides</button>
  </div></details><details class="studio-section" data-studio-section="rules" ${rulesOpen?'open':''}><summary>Preflight rules</summary><div class="studio-fields">
    ${number('Panel-edge clearance','rule-edgeMargin',r.edgeMargin,0,10,.1)}
    ${number('Minimum cutout wall','rule-minWall',r.minWall,.1,5,.1)}
    ${number('Jack centre spacing','rule-jackPitch',r.jackPitch,6,30,.1)}
    ${number('Available rear depth','rule-rearDepth',r.rearDepth,5,200,1)}
    ${number('Knob finger clearance','rule-fingerGap',r.fingerGap,0,15,.5)}
    ${number('Minimum text size','rule-minText',r.minText,.5,5,.1)}
    <button class="tool-button wide" id="rule-reset">Restore default rules</button>
  </div></details>`;
}

export function bindDesignControls(root:HTMLElement,p:Project,mutate:(fn:()=>void)=>void){
  root.querySelectorAll<HTMLDetailsElement>('[data-studio-section]').forEach(el=>el.addEventListener('toggle',()=>{
    if(!el.isConnected)return;
    if(el.dataset.studioSection==='type')typographyOpen=el.open;else rulesOpen=el.open;
  }));
  root.querySelectorAll<HTMLInputElement|HTMLSelectElement>('[id^="design-"]').forEach(el=>{
    if(el.tagName==='BUTTON')return;
    el.addEventListener('change',()=>mutate(()=>{
      const key=el.id.slice(7),value=key==='uppercase'?(el as HTMLInputElement).checked:key==='outputLabels'?((el as HTMLInputElement).checked?'inverted':'plain'):el.value;
      p.design=parseDesign({...p.design??DEFAULT_DESIGN,[key]:value});
    }));
  });
  root.querySelector('#design-reset-overrides')?.addEventListener('click',()=>mutate(()=>p.items.forEach(i=>{delete i.font;delete i.weight;})));
  root.querySelectorAll<HTMLInputElement>('input[id^="rule-"]').forEach(el=>el.addEventListener('change',()=>mutate(()=>{
    p.rules=parseRules({...p.rules??DEFAULT_RULES,[el.id.slice(5)]:el.value});
  })));
  root.querySelector('#rule-reset')?.addEventListener('click',()=>mutate(()=>delete p.rules));
}

export function scaleControls(i:Item){
  const s=i.scale??DEFAULT_SCALE;
  return`<div class="studio-fields">
    <div class="two-col">${number('Start angle','scale-start',s.start,-360,360,1,'deg')}${number('Sweep','scale-sweep',s.sweep,10,360,1,'deg')}</div>
    ${number('Major tick every','scale-majorEvery',s.majorEvery,1,32,1,'ticks')}
    <div class="two-col">${number('Tick length','scale-tickLength',s.tickLength,.2,10,.1)}${number('Line weight','scale-lineWidth',s.lineWidth,.1,2,.05)}</div>
  </div>`;
}
export function bindScaleControls(root:HTMLElement,i:Item,mutate:(fn:()=>void)=>void){
  root.querySelectorAll<HTMLInputElement>('[id^="scale-"]').forEach(el=>el.addEventListener('change',()=>mutate(()=>{
    i.scale=parseScale({...i.scale??DEFAULT_SCALE,[el.id.slice(6)]:el.value});
  })));
}
