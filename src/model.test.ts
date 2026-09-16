import {describe,expect,it} from 'vitest';
import {catalogMap} from './catalog';
import {HP_MM,dimensionLocked,emptyProject,panelWidth,parseProject} from './model';

describe('panel geometry',()=>{
  it('uses exact nominal HP geometry',()=>{const p=emptyProject();p.panel.widthMode='nominal';p.panel.hp=12;expect(panelWidth(p.panel)).toBe(12*HP_MM);});
  it('uses the Doepfer width allowance',()=>{const p=emptyProject();p.panel.widthMode='doepfer';p.panel.hp=12;expect(panelWidth(p.panel)).toBeCloseTo(60.56);});
});

describe('component sizing',()=>{
  it('locks factual connector dimensions',()=>expect(dimensionLocked(catalogMap.get('jack-mono')!)).toBe(true));
  it('keeps standard knob variants editable through presets',()=>{const knob=catalogMap.get('knob-medium')!;expect(knob.sizePresets?.map(x=>x.componentId)).toEqual(['knob-small','knob-medium','knob-large']);expect(dimensionLocked(knob)).toBe(true);});
});

describe('project import',()=>{
  it('sanitizes untrusted data without mutating it',()=>{const raw:any={version:2,name:'Unsafe',panel:{hp:999,widthMode:'bad',customWidth:-2,thickness:99,material:'Aluminium',finish:'brushed-silver',mounting:'bad'},panelColor:'red',inkColor:'#112233',accentColor:'#445566',items:[{id:'same',componentId:'knob-medium',x:'12',y:20,width:-5,height:9999,role:'admin',label:'x'.repeat(300)},{id:'same',componentId:'knob-medium'}],notes:'ok'};const p=parseProject(raw,catalogMap);expect(p.panel.hp).toBe(84);expect(p.panel.widthMode).toBe('doepfer');expect(p.panel.mounting).toBe('four');expect(p.panelColor).toBe('#d9d8d1');expect(p.items[0].width).toBe(15);expect(p.items[0].role).toBe('none');expect(p.items[0].label.length).toBe(200);expect(p.items[0].id).not.toBe(p.items[1].id);expect(raw.panel.hp).toBe(999);});
  it('rejects unsupported files',()=>expect(()=>parseProject({version:99},catalogMap)).toThrow('Unsupported project format'));
  it('accepts only bounded embedded PNG surfaces',()=>{const base=emptyProject();const valid=parseProject({...base,panelImage:'data:image/png;base64,aGVsbG8='},catalogMap);expect(valid.panelImage).toContain('image/png');const invalid=parseProject({...base,panelImage:'data:image/svg+xml,<svg onload=alert(1)>'},catalogMap);expect(invalid.panelImage).toBeUndefined();});
});
