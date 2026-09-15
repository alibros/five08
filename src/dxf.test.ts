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

/** Reads a DXF back as entities. DXF is strictly pairwise: even line = group code, odd = value. */
function parse(dxf:string){
  const lines=dxf.split('\n'),out:Array<Record<string,string>>=[];
  let current:Record<string,string>|null=null;
  for(let n=0;n+1<lines.length;n+=2){
    const code=lines[n],value=lines[n+1];
    if(code==='0'){
      if(current)out.push(current);
      current=['LINE','CIRCLE','ARC','TEXT'].includes(value)?{type:value}:null;
      continue;
    }
    if(current)current[code]=value;
  }
  if(current)out.push(current);
  return out;
}
const layer=(entities:Array<Record<string,string>>,name:string)=>entities.filter(e=>e['8']===name);

describe('DXF round trip',()=>{
  it('reproduces the panel outline as a closed rectangle',()=>{
    const p=emptyProject();
    p.panel.mounting='none';
    const outline=layer(parse(panelDxf(p,catalogMap)),'PANEL_OUTLINE');
    expect(outline).toHaveLength(4);
    const xs=outline.flatMap(e=>[Number(e['10']),Number(e['11'])]);
    const ys=outline.flatMap(e=>[Number(e['20']),Number(e['21'])]);
    expect(Math.min(...xs)).toBeCloseTo(0);
    expect(Math.max(...xs)).toBeCloseTo(60.56);
    expect(Math.min(...ys)).toBeCloseTo(0);
    expect(Math.max(...ys)).toBeCloseTo(PANEL_H);
    // every corner is shared by exactly two segments, so the loop closes
    const corners=new Map<string,number>();
    outline.forEach(e=>{
      for(const key of [`${e['10']},${e['20']}`,`${e['11']},${e['21']}`])corners.set(key,(corners.get(key)??0)+1);
    });
    expect([...corners.values()]).toEqual([2,2,2,2]);
  });

  it('puts a cutout at the mirrored position with the right radius',()=>{
    const p=emptyProject();
    p.panel.mounting='none';
    p.items=[item('jack-mono',10,20)];
    const holes=layer(parse(panelDxf(p,catalogMap)),'CUTOUTS');
    expect(holes).toHaveLength(1);
    expect(Number(holes[0]['10'])).toBeCloseTo(10);
    expect(Number(holes[0]['20'])).toBeCloseTo(PANEL_H-20);
    expect(Number(holes[0]['40'])).toBeCloseTo(catalogMap.get('jack-mono')!.cutout!/2);
  });

  it('draws each mounting slot as an obround of the right size in the right corner',()=>{
    const p=emptyProject();
    p.panel.mounting='four';
    const slots=layer(parse(panelDxf(p,catalogMap)),'MOUNTING');
    const arcs=slots.filter(e=>e.type==='ARC');
    expect(arcs).toHaveLength(8);
    expect(slots.filter(e=>e.type==='LINE')).toHaveLength(8);
    const radii=new Set(arcs.map(e=>Number(e['40'])));
    expect([...radii]).toEqual([1.6]);
    const centres=arcs.map(e=>[Number(e['10']),Number(e['20'])] as const);
    const xs=[...new Set(centres.map(([x])=>x))].sort((a,b)=>a-b);
    // each cap centre sits (slot length − height)/2 either side of the slot centre
    expect(xs.map(x=>Math.round(x*100)/100)).toEqual([5.85,9.15,51.41,54.71]);
    const ys=[...new Set(centres.map(([,y])=>y))].sort((a,b)=>a-b);
    expect(ys).toEqual([3,PANEL_H-3]);
  });

  it('keeps a rotated rectangular cutout the same size',()=>{
    const p=emptyProject();
    p.panel.mounting='none';
    p.items=[item('button-lit-rect',30,60,{rotation:90})];
    const cut=layer(parse(panelDxf(p,catalogMap)),'CUTOUTS').filter(e=>e.type==='LINE');
    expect(cut).toHaveLength(4);
    const lengths=cut.map(e=>Math.hypot(Number(e['11'])-Number(e['10']),Number(e['21'])-Number(e['20'])));
    const d=catalogMap.get('button-lit-rect')!;
    expect(lengths.map(l=>Math.round(l*100)/100).sort((a,b)=>a-b))
      .toEqual([d.cutoutHeight!,d.cutoutHeight!,d.cutoutWidth!,d.cutoutWidth!].sort((a,b)=>a-b));
  });
});
