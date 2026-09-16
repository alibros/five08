import {describe,expect,it} from 'vitest';
import {catalogMap} from './catalog';
import {dinContacts,faderPosition,faderTravel,knobAngle,oledTrace,previewValue,ringSegments,sevenSegments,tint,togglePosition,vuDial} from './hardware-visual';

describe('shared front-view hardware layouts',()=>{
  it('uses a five-contact 180 degree DIN arc opposite the key',()=>{
    const contacts=dinContacts();expect(contacts).toHaveLength(5);
    for(const p of contacts){expect(Math.hypot(p.x,p.y)).toBeCloseTo(4.5);expect(p.y).toBeGreaterThanOrEqual(0);}
    expect(contacts[0].x).toBe(-4.5);expect(contacts[4].x).toBe(4.5);
    expect(contacts[2].y).toBe(4.5);
    for(let n=1;n<contacts.length;n++)expect(contacts[n].x).toBeGreaterThan(contacts[n-1].x);
  });

  it('uses the same clockwise 270 degree sweep as printed knob scales',()=>{
    expect([0,.5,1].map(knobAngle)).toEqual([135,270,405]);
    expect(ringSegments(24,8,.5,270).filter(s=>s.active)).toHaveLength(12);
    const ring=ringSegments(12,8,.5);
    expect(ring[0].y).toBeCloseTo(-8);expect(ring[3].x).toBeCloseTo(8);
    expect(ring.filter(s=>s.active)).toHaveLength(6);
  });

  it('keeps fader caps inside their physical footprints at both stops',()=>{
    for(const [id,travel] of [['slider-20',20],['slider-30',30],['slider-45',45],['crossfader',35]] as const){
      const d=catalogMap.get(id)!;expect(faderTravel(d)).toBe(travel);
      for(const value of [0,.5,1]){
        const p=faderPosition(d,value),horizontal=d.orientation==='horizontal';
        expect(Math.abs(p.x)+(horizontal?2.75:5)).toBeLessThanOrEqual(d.width/2);
        expect(Math.abs(p.y)+(horizontal?5:2.75)).toBeLessThanOrEqual(d.height/2);
      }
      expect(faderPosition(d,1)).toEqual(d.orientation==='horizontal'?{x:travel/2,y:0}:{x:0,y:-travel/2});
    }
  });

  it('distinguishes binary switches from three-position toggles',()=>{
    expect([0,.5,1].map(v=>togglePosition('toggle-3',v))).toEqual([-1,0,1]);
    for(const id of ['toggle-2','slide-switch'])expect([0,.49,.5,1].map(v=>togglePosition(id,v))).toEqual([-1,-1,1,1]);
  });

  it('draws seven-segment numbers using actual segment masks',()=>{
    expect(sevenSegments(12,8,0).filter(s=>s.active)).toHaveLength(12);
    expect(sevenSegments(12,8,1).filter(s=>s.active)).toHaveLength(12);
    const eleven=sevenSegments(12,8,11/99).filter(s=>s.active);
    expect(eleven).toHaveLength(4);
    expect(eleven.map(s=>s.id)).toEqual(['digit 0 segment b','digit 0 segment c','digit 1 segment b','digit 1 segment c']);
  });

  it('moves the VU needle left to right and gives the OLED a contained trace',()=>{
    expect(vuDial(24,0).needle.x).toBeLessThan(0);expect(vuDial(24,1).needle.x).toBeGreaterThan(0);
    for(const value of [0,.5,1]){
      const dial=vuDial(24,value);expect(dial.cy+dial.needle.y).toBeLessThan(dial.cy);
      for(const p of oledTrace(25,15,value)){
        expect(Math.abs(p.x)).toBeLessThan(12.5);expect(Math.abs(p.y)).toBeLessThan(7.5);
      }
    }
  });

  it('clamps imported preview values without producing non-finite coordinates',()=>{
    expect([-1,0,.5,1,2,NaN,Infinity].map(previewValue)).toEqual([0,0,.5,1,1,.5,.5]);
    expect(knobAngle(NaN)).toBe(270);expect(ringSegments(12,8,NaN).filter(s=>s.active)).toHaveLength(6);
    expect(tint('#808080',-.5)).toBe('#404040');expect(tint('#000000',.5)).toBe('#808080');
  });
});
