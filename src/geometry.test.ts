import {describe,expect,it} from 'vitest';
import {catalogMap} from './catalog';
import {cutoutLabel} from './geometry';

describe('cutout description',()=>{
  it('keeps a label to one decimal place, not the raw computation',()=>
    expect(cutoutLabel(catalogMap.get('oled-13')!)).toBe('30.1 × 15.5 cutout'));

  it('describes a round hole by diameter',()=>
    expect(cutoutLabel(catalogMap.get('jack-mono')!)).toBe('Ø6.2 cutout'));

  it('describes a rectangular window by its sides, not a diameter',()=>{
    // The OLED carries cutout:22 as its nominal size but cuts a rectangle. The
    // old hand-written version read that field directly and advertised "Ø22".
    const label=cutoutLabel(catalogMap.get('oled-096')!);
    expect(label).not.toContain('Ø');
    expect(label).toBe('21.5 × 12.9 cutout');
  });

  it('calls a fader opening a slot',()=>
    expect(cutoutLabel(catalogMap.get('slider-45')!)).toBe('2.2 × 45.1 slot'));

  it('says plainly when a part sits on the surface',()=>
    expect(cutoutLabel(catalogMap.get('text-label')!)).toBe('No cutout · surface mounted'));

  it('reports what a parametric opening cuts at its default size',()=>
    expect(cutoutLabel(catalogMap.get('cutout-rect')!)).toBe('18 × 10 cutout'));
});
