import {describe,expect,it} from 'vitest';
import {catalog,catalogMap,categories} from './catalog';
import {dimensionLocked} from './model';

describe('parts library',()=>{
  it('keeps every id unique',()=>{
    const ids=catalog.map(d=>d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only calls a part verified when it can be traced',()=>{
    for(const d of catalog.filter(p=>p.status==='verified')){
      expect(d.manufacturer,`${d.id} is verified without a manufacturer`).toBeTruthy();
      expect(d.partNumber,`${d.id} is verified without a part number`).toBeTruthy();
      expect(d.source?.note,`${d.id} is verified without a source`).toBeTruthy();
    }
  });

  it('gives every citation a note and a resolvable link',()=>{
    for(const d of catalog.filter(p=>p.source)){
      expect(d.source!.note.length).toBeGreaterThan(8);
      if(d.source!.url)expect(d.source!.url).toMatch(/^https:\/\//);
    }
  });

  it('cites a source for the cutouts people drill most',()=>{
    for(const id of ['knob-medium','knob-large','encoder','jack-thonk','mount-hole'])
      expect(catalogMap.get(id)?.source?.note,`${id} has no cited cutout`).toBeTruthy();
  });

  it('locks the dimensions of anything traced to a datasheet',()=>{
    for(const d of catalog.filter(p=>p.status==='verified'))
      expect(dimensionLocked(d),`${d.id} is verified but resizable`).toBe(true);
  });

  it('never records a cutout of zero, which silently exports no hole at all',()=>{
    for(const d of catalog)
      if(d.cutout!==undefined)expect(d.cutout,`${d.id} has a falsy cutout`).toBeGreaterThan(0);
  });

  it('gives anything that has to pass through the panel an opening',()=>{
    // A connector or a hole with no cutout would be machined as a blank panel.
    for(const d of catalog.filter(p=>p.renderer==='connector'||p.renderer==='hole'||p.renderer==='jack'))
      expect(d.cutout,`${d.id} would be exported with no opening`).toBeTruthy();
  });

  it('does not cut a round hole for a rectangular part',()=>{
    for(const d of catalog){
      if(!d.cutout||d.cutoutShape)continue;
      if(d.renderer==='hole'&&d.orientation==='horizontal')continue;
      const aspect=Math.max(d.width,d.height)/Math.min(d.width,d.height);
      expect(aspect,`${d.id} is ${d.width}×${d.height} but cuts a circle`).toBeLessThan(1.6);
    }
  });

  it('keeps a circular cutout within clearance of the part that carries it',()=>{
    // A 3 mm LED wants a Ø3.1 hole, so a small clearance over the body is right;
    // a hole substantially larger than the part is a data error.
    for(const d of catalog.filter(p=>p.cutout&&!p.cutoutShape&&p.renderer!=='hole'))
      expect(d.cutout!,`${d.id} cuts a Ø${d.cutout} hole in a ${d.width}×${d.height} part`)
        .toBeLessThanOrEqual(Math.min(d.width,d.height)*1.05+.2);
  });

  it('files every part under a real category',()=>{
    for(const d of catalog)expect(categories).toContain(d.category);
  });

  it('keeps hidden parts reachable through a preset',()=>{
    const reachable=new Set(catalog.flatMap(d=>d.sizePresets?.map(p=>p.componentId)??[]));
    for(const d of catalog.filter(p=>p.libraryHidden))
      expect(reachable.has(d.id),`${d.id} is hidden and has no preset pointing at it`).toBe(true);
  });
});
