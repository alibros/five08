import {describe,expect,it} from 'vitest';
import {catalogMap} from './catalog';
import {panelDxf} from './dxf';
import {PANEL_H,emptyProject,type Item} from './model';

const item=(componentId:string,x:number,y:number,extra:Partial<Item>={}):Item=>{
  const d=catalogMap.get(componentId)!;
  return{id:componentId+x+y,componentId,x,y,rotation:0,label:'',color:d.color,width:d.width,height:d.height,value:.5,locked:false,hidden:false,role:'none',identifier:'',...extra};
};
const groups=(dxf:string,code:number,after:string)=>{
  const lines=dxf.split('\n'),out:string[]=[];
  for(let n=0;n<lines.length;n++)if(lines[n]===after)for(let m=n;m<lines.length&&m<n+40;m++)if(lines[m]===String(code)){out.push(lines[m+1]);break;}
  return out;
};

describe('DXF export',()=>{
  it('writes an R12 file scaled in millimetres',()=>{
    const dxf=panelDxf(emptyProject(),catalogMap);
    expect(dxf).toContain('AC1009');
    expect(dxf.startsWith('0\nSECTION\n')).toBe(true);
    expect(dxf.trimEnd().endsWith('EOF')).toBe(true);
    expect(dxf).toContain('$INSUNITS');
  });

  it('flips Y so the origin is the bottom-left corner',()=>{
    const p=emptyProject();
    p.items=[item('jack-mono',10,20)];
    const dxf=panelDxf(p,catalogMap);
    const centres=groups(dxf,20,'CIRCLE');
    expect(centres).toContain(String(PANEL_H-20));
  });

  it('cuts the jack hole at its datasheet diameter, not the knob cap size',()=>{
    const p=emptyProject();
    p.items=[item('jack-mono',10,20)];
    const radii=groups(panelDxf(p,catalogMap),40,'CIRCLE');
    expect(radii).toContain(String(catalogMap.get('jack-mono')!.cutout!/2));
  });

  it('keeps surface-only graphics out of the cut file',()=>{
    const p=emptyProject();
    p.items=[item('text-label',20,20,{label:'VCO'}),item('shape-rect',30,40)];
    const dxf=panelDxf(p,catalogMap);
    expect(dxf).not.toContain('\n8\nCUTOUTS\n');
    expect(dxf).toContain('\n8\nPANEL_OUTLINE\n');
  });

  it('engraves labels only when asked',()=>{
    const p=emptyProject();
    p.items=[item('knob-medium',20,40,{label:'cutoff'})];
    expect(panelDxf(p,catalogMap)).not.toContain('TEXT');
    const engraved=panelDxf(p,catalogMap,{engraveLabels:true});
    expect(engraved).toContain('ENGRAVING');
    expect(engraved).toContain('CUTOFF');
  });

  it('draws mounting slots as two arcs and two lines',()=>{
    const p=emptyProject();
    p.panel.mounting='four';
    const dxf=panelDxf(p,catalogMap);
    expect(dxf.match(/\nARC\n/g)?.length).toBe(8);
    expect(dxf).toContain('MOUNTING');
  });

  it('places two-slot mounting on the panel centreline',()=>{
    const p=emptyProject();
    p.panel.mounting='two';
    p.panel.widthMode='nominal';
    p.panel.hp=4;
    const dxf=panelDxf(p,catalogMap);
    expect(dxf.match(/\nARC\n/g)?.length).toBe(4);
  });
});
