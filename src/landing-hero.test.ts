import {describe,expect,it} from 'vitest';
import {demoPanel} from './demo';
import {showcaseArtwork} from './landing-hero';

describe('showcase artwork',()=>{
  it('keeps the printed legends and scales without baking flat hardware into the 3D panel',()=>{
    const p=demoPanel(),art=showcaseArtwork(p);
    const doc=new DOMParser().parseFromString(art,'image/svg+xml');
    expect(doc.querySelector('parsererror')).toBeNull();
    const [x,y,width,height]=doc.documentElement.getAttribute('viewBox')!.split(' ').map(Number);
    expect([x,y,height]).toEqual([0,0,128.5]);expect(width).toBeCloseTo(101.2);
    expect(doc.querySelectorAll('.component-hardware,.design-guide,.led-body')).toHaveLength(0);
    expect(doc.querySelectorAll('.component-artwork').length).toBeGreaterThan(0);
    expect(art).toContain('HALO');expect(art).toContain('POSITION');expect(art).toContain('OUT L');
    expect(art).not.toContain('WAVE 01');
    const knob=doc.querySelector('[data-kind="knob"]')!;
    expect(knob.querySelector('circle')).toBeNull();expect(knob.textContent).toBe('POSITION');
  });

  it('does not print hidden graphics or component labels',()=>{
    const p=demoPanel();p.items.forEach(i=>{if(i.label==='HALO'||i.label==='POSITION')i.hidden=true;});
    const art=showcaseArtwork(p);
    expect(art).not.toContain('HALO');expect(art).not.toContain('POSITION');expect(art).toContain('TEXTURE');
  });
});
