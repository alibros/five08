import {describe,expect,it} from 'vitest';
import {catalog,catalogMap} from './catalog';
import {DEFAULT_DESIGN,DEFAULT_RULES,DEFAULT_SCALE,dimensionLocked,emptyProject,parseProject,type Item} from './model';
import {copyItems,extent,repeatItems} from './arrange';
import {makeAssembly,instantiateAssembly,parseAssembly,readAssemblies,writeAssemblies} from './assemblies';
import {scaleTicks} from './design';
import {componentSvg,cutoutSvg,textSvg} from './svg';
import {panelKiCad,shapeToKiCad} from './kicad';
import {preflight} from './preflight';
import {contour} from './inspect3d';
import {panelDxf} from './dxf';

function item(componentId='knob-medium',extra:Partial<Item>={}):Item{
  const d=catalogMap.get(componentId)!;
  return{id:'a',componentId,x:20,y:40,rotation:0,label:'cutoff',color:d.color,width:d.width,height:d.height,value:.5,locked:false,hidden:false,role:'none',identifier:'',...extra};
}

describe('physical invariants',()=>{
  it('locks every hardware renderer but leaves graphics editable',()=>{
    for(const d of catalog)expect(dimensionLocked(d),d.id).toBe(d.category!=='Graphics'||d.resizable===false);
  });
  it('restores catalog dimensions for every imported hardware part',()=>{
    const raw={...emptyProject(),items:catalog.filter(d=>d.category!=='Graphics').map(d=>item(d.id,{width:123,height:99}))};
    const parsed=parseProject(raw,catalogMap);
    for(const i of parsed.items){const d=catalogMap.get(i.componentId)!;expect([i.width,i.height]).toEqual([d.width,d.height]);}
    expect(raw.items[0].width).toBe(123);
  });
  it('normalizes legacy hardware too',()=>{
    const p=parseProject({version:1,hp:8,items:[{id:'legacy',kind:'jack',size:2,x:10,y:30}]},catalogMap);
    expect(p.items[0].width).toBe(9);
  });
  it('preserves deliberately resized artwork',()=>{
    const p=parseProject({...emptyProject(),items:[item('text-label',{width:33,height:2.5})]},catalogMap);
    expect([p.items[0].width,p.items[0].height]).toEqual([33,2.5]);
  });
  it('replaces IDs that could break SVG attributes or CSS selectors',()=>{
    const p=parseProject({...emptyProject(),items:[item('knob-medium',{id:'x" onload="alert(1)'})]},catalogMap);
    expect(p.items[0].id).toMatch(/^[a-z0-9_-]+$/i);
  });
  it('uses the real outline as the SVG machining centreline',()=>{
    const svg=cutoutSvg(emptyProject(),catalogMap);
    expect(svg).toContain('<rect x="0" y="0" width="60.56" height="128.5"');
  });
  it('accounts for rotated extents',()=>{
    const b=extent([item('slider-30',{width:10,height:40,x:0,y:0,rotation:90})]);
    expect(b.r-b.l).toBeCloseTo(40);expect(b.b-b.t).toBeCloseTo(10);
  });
});

describe('assemblies and independent copies',()=>{
  it('makes independent groups for every repeated channel',()=>{
    let id=0;
    const source=[item('knob-medium',{groupId:'source'}),item('jack-mono',{id:'b',groupId:'source'})];
    const copies=repeatItems(source,3,20,0,()=>String(++id));
    expect(copies[0].groupId).toBe(copies[1].groupId);
    expect(copies[0].groupId).not.toBe(copies[2].groupId);
    expect(copies[0].groupId).not.toBe('source');
    expect(source[0].groupId).toBe('source');
    expect(copyItems(source,0,0,()=>String(++id))[0].groupId).not.toBe('source');
  });
  it('centres an assembly without scaling it and instances it independently',()=>{
    const a=makeAssembly('Channel',[item(),item('jack-mono',{id:'b',y:70})],catalogMap);
    const box=extent(a.items);expect(box.l+box.r).toBeCloseTo(0);expect(box.t+box.b).toBeCloseTo(0);
    const first=instantiateAssembly(a,30,60),second=instantiateAssembly(a,50,60);
    expect(first[0].width).toBe(15);expect(first[0].groupId).not.toBe(second[0].groupId);
    expect(first[0].identifier).toBe('');expect(first[0].groupId).toBe(first[1].groupId);
  });
  it('roundtrips the local library and tolerates damaged entries',()=>{
    localStorage.clear();const a=makeAssembly('Channel',[item()],catalogMap);
    writeAssemblies([a]);expect(readAssemblies(catalogMap)[0].name).toBe('Channel');
    localStorage.setItem('five08.assemblies.v1',JSON.stringify([a,{version:99}]));
    expect(readAssemblies(catalogMap)).toHaveLength(1);
  });
  it('refuses unknown or empty assemblies instead of silently dropping parts',()=>{
    expect(()=>parseAssembly({version:1,items:[]},catalogMap)).toThrow();
    expect(()=>parseAssembly({version:1,items:[item('knob-medium',{componentId:'unknown'})]},catalogMap)).toThrow('unknown');
  });
  it('does not allow active SVG to enter through the assembly importer',()=>{
    const imageData=`data:image/svg+xml;base64,${btoa('<svg viewBox="0 0 10 10"><script>alert(1)</script><rect width="5" height="5"/></svg>')}`;
    const a=parseAssembly({version:1,items:[item('png-image',{imageData})]},catalogMap);
    expect(atob(a.items[0].imageData!.split(',')[1])).not.toContain('script');
  });
  it('surfaces quota errors without overwriting a saved library',()=>{
    const storage={setItem:()=>{throw new Error('quota');}} as unknown as Storage;
    expect(()=>writeAssemblies([],storage)).toThrow('full');
  });
});

describe('panel design and scales',()=>{
  it('inherits global typography and distinguishes outputs without resizing them',()=>{
    const p=emptyProject();p.design={...DEFAULT_DESIGN,font:'sans',weight:400,labelSize:2.7,uppercase:false,outputLabels:'inverted'};
    const i=item('jack-mono',{role:'output',label:'Audio out'}),svg=componentSvg(i,catalogMap.get(i.componentId)!,p,false,'design');
    expect(svg).toContain('font-size="2.7"');expect(svg).toContain('font-weight="400"');expect(svg).toContain('Audio out');
    expect(svg).toContain('class="component-legend"');expect(i.width).toBe(9);
  });
  it('uses panel legend size and case in DXF engraving',()=>{
    const p=emptyProject();p.design={...DEFAULT_DESIGN,labelSize:2.6,uppercase:false};p.items=[item('jack-mono',{label:'Audio out',rotation:90})];
    const dxf=panelDxf(p,catalogMap,{engraveLabels:true});
    expect(dxf).toContain('40\n2.6\n1\nAudio out');
    expect(dxf).toContain('10\n11.9\n20\n88.5');
  });
  it('escapes font attributes so condensed fonts produce valid SVG',()=>{
    const doc=new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${textSvg(item('text-label',{font:'condensed'}),'#000')}</svg>`,'image/svg+xml');
    expect(doc.querySelector('parsererror')).toBeNull();
  });
  it('supports bipolar, partial and full-ring tick geometry',()=>{
    const i=item('knob-scale',{width:20,height:20,count:5,scale:{...DEFAULT_SCALE,start:180,sweep:180}});
    const ticks=scaleTicks(i);expect(ticks[0].x2).toBeCloseTo(-10);expect(ticks[4].x2).toBeCloseTo(10);
    i.scale!.sweep=360;const ring=scaleTicks(i);expect(ring[0].x2).not.toBeCloseTo(ring[4].x2);
  });
  it('clamps untrusted rule and style values on import',()=>{
    const p=parseProject({...emptyProject(),design:{font:'bad',labelSize:999,weight:9000},rules:{minWall:-5,rearDepth:Infinity},items:[item('knob-scale',{scale:{...DEFAULT_SCALE,sweep:9000}})]},catalogMap);
    expect(p.design?.font).toBe('mono');expect(p.design?.labelSize).toBe(6);expect(p.rules?.minWall).toBe(.1);expect(p.rules?.rearDepth).toBe(25);expect(p.items[0].scale?.sweep).toBe(360);
  });
  it('categorizes checks and honours custom depth and readability rules',()=>{
    const p=emptyProject();p.items=[item('button-arcade'),item('text-label',{id:'t',x:30,y:95,height:1})];
    p.rules={...DEFAULT_RULES,rearDepth:200};
    const issues=preflight(p,catalogMap);expect(issues.some(i=>i.code==='deep-part')).toBe(false);
    expect(issues.find(i=>i.code==='small-text')?.category).toBe('Artwork');
  });
  it('checks finger clearance independently of cutout machining',()=>{
    const p=emptyProject();p.items=[item(),item('knob-medium',{id:'b',x:36})];p.rules={...DEFAULT_RULES,fingerGap:3};
    expect(preflight(p,catalogMap).find(i=>i.code==='finger-gap')?.category).toBe('Ergonomics');
  });
  it('reports a true skirt collision as an assembly error',()=>{
    const p=emptyProject();p.items=[item(),item('knob-medium',{id:'b',x:34})];
    const issue=preflight(p,catalogMap).find(i=>i.code==='hardware-overlap');
    expect(issue?.severity).toBe('error');expect(issue?.category).toBe('Assembly');
  });
});

describe('KiCad and 3D share physical geometry',()=>{
  it('exports an exact mechanical board with thickness and no phantom circuitry',()=>{
    const p=emptyProject();p.items=[item('jack-mono'),item('jack-mono',{id:'hidden',x:50,hidden:true})];
    const board=panelKiCad(p,catalogMap);
    expect(board).toContain('(thickness 2)');expect(board).toContain('(start 60.56 0)');
    expect(board).toContain('(center 20 40) (end 23.1 40)');expect(board).not.toContain('(center 50');
    expect(board).not.toContain('(footprint');expect(board.match(/\(gr_arc /g)).toHaveLength(8);
  });
  it('keeps rotated slots circular at the ends',()=>{
    const s={kind:'obround' as const,cx:20,cy:30,w:10,h:4,rotation:90};
    const board=shapeToKiCad(s);expect(board).toContain('(start 22 27) (end 22 33)');
    expect(board).toContain('(mid 20 35)');
    const points=contour(s);expect(Math.max(...points.map(p=>p.y))).toBeCloseTo(35);
    expect(Math.min(...points.map(p=>p.x))).toBeCloseTo(18);
  });
  it('handles circular slots without zero-length edges',()=>{
    expect(shapeToKiCad({kind:'obround',cx:1,cy:2,w:4,h:4,rotation:20})).toContain('gr_circle');
  });
});
