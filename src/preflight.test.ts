import {describe,expect,it} from 'vitest';
import {catalogMap} from './catalog';
import {emptyProject,type Item,type Project} from './model';
import {MIN_JACK_PITCH,issueCounts,preflight} from './preflight';

const item=(componentId:string,x:number,y:number,extra:Partial<Item>={}):Item=>{
  const d=catalogMap.get(componentId)!;
  return{id:`${componentId}-${x}-${y}`,componentId,x,y,rotation:0,label:'',color:d.color,width:d.width,height:d.height,value:.5,locked:false,hidden:false,role:'none',identifier:'',...extra};
};
const codes=(p:Project)=>preflight(p,catalogMap).map(i=>i.code);

describe('preflight',()=>{
  it('passes a plausible layout',()=>{
    const p=emptyProject();
    p.items=[item('knob-medium',30,30),item('jack-mono',20,100),item('jack-mono',40,100)];
    expect(preflight(p,catalogMap)).toEqual([]);
  });

  it('flags a part hanging off the panel',()=>{
    const p=emptyProject();
    p.items=[item('knob-medium',-4,30)];
    expect(codes(p)).toContain('off-panel');
  });

  it('flags cutouts that would merge',()=>{
    const p=emptyProject();
    p.items=[item('jack-mono',30,60),item('jack-mono',32,60)];
    expect(codes(p)).toContain('cutout-overlap');
  });

  it('warns about a wall too thin to machine',()=>{
    const p=emptyProject();
    p.items=[item('jack-mono',25,60),item('jack-mono',32,60)];
    const found=codes(p);
    expect(found).toContain('thin-wall');
    expect(found).not.toContain('cutout-overlap');
  });

  it('warns when jack nuts leave no room for a spanner',()=>{
    const p=emptyProject();
    p.items=[item('jack-mono',25,60),item('jack-mono',25+MIN_JACK_PITCH-1,60)];
    expect(codes(p)).toContain('jack-pitch');
  });

  it('catches a cutout landing on a mounting slot',()=>{
    const p=emptyProject();
    p.panel.mounting='four';
    p.items=[item('jack-mono',7.5,3)];
    expect(codes(p)).toContain('mounting-clash');
  });

  it('warns that a deep part will not fit a skiff',()=>{
    const p=emptyProject();
    p.items=[item('button-arcade',30,64)];
    expect(codes(p)).toContain('deep-part');
  });

  it('ignores hidden components',()=>{
    const p=emptyProject();
    p.items=[item('knob-medium',-4,30,{hidden:true})];
    expect(preflight(p,catalogMap)).toEqual([]);
  });

  it('notices a custom width that is not a whole number of HP',()=>{
    const p=emptyProject();
    p.panel.widthMode='custom';
    p.panel.customWidth=42;
    expect(codes(p)).toContain('off-hp');
  });

  it('reports errors before warnings',()=>{
    const p=emptyProject();
    p.items=[item('knob-medium',-4,30),item('button-arcade',30,80)];
    const issues=preflight(p,catalogMap);
    expect(issues[0].severity).toBe('error');
    expect(issueCounts(issues)).toEqual({errors:1,warnings:1});
  });
});
