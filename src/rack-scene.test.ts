import {describe,expect,it} from 'vitest';
import {demoPanel,resizeDemoPanel} from './demo';
import {catalogMap} from './catalog';
import {cutoutSvg} from './svg';
import {rackSceneSvg} from './rack-scene';

const parse=(svg:string)=>new DOMParser().parseFromString(svg,'image/svg+xml');

describe('rack illustration',()=>{
  it('renders sharp modules, shaded plugs and rails behind the panel edges',()=>{
    const svg=rackSceneSvg(demoPanel()),doc=parse(svg);
    expect(doc.querySelector('parsererror')).toBeNull();
    expect(doc.querySelectorAll('.rack-neighbour')).toHaveLength(2);
    expect(doc.querySelectorAll('.rack-rail')).toHaveLength(2);
    expect(doc.querySelectorAll('.cable')).toHaveLength(3);
    expect(doc.querySelectorAll('.patch-plug,.plug-barrel,.plug-relief')).toHaveLength(18);
    expect(doc.querySelectorAll('.rack-screws .screw')).toHaveLength(12);
    expect(doc.querySelectorAll('[data-detail="socket well"]')).toHaveLength(15);
    expect(svg).not.toContain('defocus');
    const rails=doc.querySelector('.rack-rails')!,hero=doc.querySelector('.hero-module')!;
    expect(rails.compareDocumentPosition(hero)&4).toBe(4);
    const railRects=[...doc.querySelectorAll('.rack-rail')];
    expect(railRects[0].getAttribute('transform')).toMatch(/ -8\)$/);
    expect(railRects[1].getAttribute('transform')).toMatch(/ 128\.5\)$/);
  });

  it('is self-contained and every material reference resolves exactly once',()=>{
    const svg=rackSceneSvg(demoPanel()),doc=parse(svg);
    const ids=[...doc.querySelectorAll('[id]')].map(el=>el.id);
    expect(new Set(ids).size).toBe(ids.length);
    for(const [,id] of svg.matchAll(/url\(#([^)]+)\)/g))expect(ids.filter(value=>value===id)).toHaveLength(1);
    expect(svg).not.toMatch(/NaN|Infinity|undefined/);
  });

  for(const hp of [6,10,20])it(`keeps plugs on the real jack centres at ${hp} HP without modifying the project`,()=>{
    const p=demoPanel();resizeDemoPanel(p,hp);
    const before=structuredClone(p),cuts=cutoutSvg(p,catalogMap),doc=parse(rackSceneSvg(p));
    for(const label of ['IN L','OUT L','CV']){
      const jack=p.items.find(i=>i.label===label)!;
      const plug=doc.querySelector(`.patch-plug[data-jack-label="${label}"]`)!;
      expect(Number(plug.getAttribute('data-socket-x'))).toBe(jack.x);
      expect(Number(plug.getAttribute('data-socket-y'))).toBe(jack.y);
    }
    expect(doc.querySelectorAll('.hero-module [data-rack-component="jack-thonk"]')).toHaveLength(6);
    expect(p).toEqual(before);
    expect(cutoutSvg(p,catalogMap)).toBe(cuts);
    expect(rackSceneSvg(p)).toBe(rackSceneSvg(p));
  });

  it('does not draw hidden parts or patch cables to missing sockets',()=>{
    const p=demoPanel();
    p.items.forEach(i=>{if(['HALO','IN L','OUT L','CV'].includes(i.label))i.hidden=true;});
    const doc=parse(rackSceneSvg(p));
    expect(doc.querySelectorAll('.cable,.patch-plug')).toHaveLength(0);
    expect(doc.querySelector('.hero-module')!.textContent).not.toContain('HALO');
    expect(doc.querySelectorAll('.hero-module [data-detail="socket well"]')).toHaveLength(3);
  });
});
