import {beforeEach,describe,expect,it} from 'vitest';
import {applyPlacements,expandGroups,gridPlacements,matchSize,mirrorPlacements,repeatItems,rotateGroup,spreadBetween} from './arrange';
import {catalogMap} from './catalog';
import type {Item} from './model';

const item=(id:string,x:number,y:number,w=10,h=10):Item=>
  ({id,componentId:'knob-medium',x,y,rotation:0,label:'',color:'#000000',width:w,height:h,value:.5,locked:false,hidden:false,role:'none',identifier:''});

describe('grid arrange',()=>{
  it('lays a selection out in reading order with the requested gaps',()=>{
    const items=[item('a',0,0),item('b',40,0),item('c',0,40),item('d',40,40)];
    const placed=gridPlacements(items,2,5,5);
    applyPlacements(items,placed);
    expect(items.map(i=>[i.x,i.y])).toEqual([[0,0],[15,0],[0,15],[15,15]]);
  });

  it('gives each column the width of its widest member',()=>{
    const items=[item('a',0,0,20,10),item('b',40,0,10,10)];
    applyPlacements(items,gridPlacements(items,2,4,4));
    const edgeGap=items[1].x-items[1].width/2-(items[0].x+items[0].width/2);
    expect(edgeGap).toBe(4);
    expect(items[1].x-items[0].x).toBe(19);
  });

  it('ignores a selection too small to arrange',()=>expect(gridPlacements([item('a',0,0)],2,4,4)).toEqual([]));
});

describe('mirror',()=>{
  it('reflects positions across the panel centreline and reverses rotation',()=>{
    const items=[{...item('a',10,20),rotation:30}];
    applyPlacements(items,mirrorPlacements(items,30));
    expect(items[0].x).toBe(50);
    expect(items[0].y).toBe(20);
    expect(items[0].rotation).toBe(-30);
  });
});

describe('rotate group',()=>{
  it('turns the whole arrangement about its shared centre',()=>{
    const items=[item('a',0,0),item('b',20,0)];
    applyPlacements(items,rotateGroup(items,90));
    expect(items[0].x).toBeCloseTo(10);
    expect(items[0].y).toBeCloseTo(-10);
    expect(items[1].y).toBeCloseTo(10);
    expect(items[0].rotation).toBe(90);
  });
});

describe('spread',()=>{
  it('leaves equal edge-to-edge gaps between the endpoints',()=>{
    const items=[item('a',0,0,10),item('b',5,0,10),item('c',9,0,10)];
    applyPlacements(items,spreadBetween(items,'x',0,50));
    const gaps=[items[1].x-items[1].width/2-(items[0].x+items[0].width/2),items[2].x-items[2].width/2-(items[1].x+items[1].width/2)];
    expect(gaps[0]).toBeCloseTo(gaps[1]);
    expect(items[0].x-items[0].width/2).toBeCloseTo(0);
    expect(items[2].x+items[2].width/2).toBeCloseTo(50);
  });
});

describe('match size',()=>{
  it('grows every item to the largest in the selection',()=>{
    const items=[item('a',0,0,10,10),item('b',20,0,18,14)];
    applyPlacements(items,matchSize(items));
    expect(items[0].width).toBe(18);
    expect(items[0].height).toBe(14);
  });
});

describe('catalog integrity',()=>{
  it('keeps every size preset pointing at a real part',()=>{
    for(const d of catalogMap.values())for(const preset of d.sizePresets??[])expect(catalogMap.has(preset.componentId)).toBe(true);
  });
});

describe('array repeat',()=>{
  let n=0;
  const ids=()=>`copy-${++n}`;
  beforeEach(()=>{n=0;});

  it('leaves the original in place and offsets each pass',()=>{
    const copies=repeatItems([item('a',10,20)],4,15,0,ids);
    expect(copies).toHaveLength(3);
    expect(copies.map(c=>c.x)).toEqual([25,40,55]);
    expect(copies.every(c=>c.y===20)).toBe(true);
  });

  it('repeats a whole strip together',()=>{
    const strip=[item('knob',10,20),item('jack',10,60)];
    const copies=repeatItems(strip,3,19,0,ids);
    expect(copies).toHaveLength(4);
    expect(copies.map(c=>[c.x,c.y])).toEqual([[29,20],[29,60],[48,20],[48,60]]);
  });

  it('gives every copy a fresh id and keeps the source untouched',()=>{
    const source=[item('a',10,20)];
    const copies=repeatItems(source,3,5,5,ids);
    expect(new Set(copies.map(c=>c.id)).size).toBe(2);
    expect(copies.some(c=>c.id==='a')).toBe(false);
    expect(source[0].x).toBe(10);
  });

  it('does nothing for a count below two',()=>expect(repeatItems([item('a',0,0)],1,5,0,ids)).toEqual([]));
});

describe('groups',()=>{
  const grouped=(id:string,group?:string)=>({...item(id,0,0),...(group?{groupId:group}:{})});

  it('pulls in every sibling when one member is selected',()=>{
    const items=[grouped('a','g1'),grouped('b','g1'),grouped('c')];
    expect([...expandGroups(['a'],items)].sort()).toEqual(['a','b']);
  });

  it('leaves ungrouped items alone',()=>{
    const items=[grouped('a','g1'),grouped('b','g1'),grouped('c')];
    expect([...expandGroups(['c'],items)]).toEqual(['c']);
  });

  it('expands across several groups at once',()=>{
    const items=[grouped('a','g1'),grouped('b','g1'),grouped('c','g2'),grouped('d','g2')];
    expect([...expandGroups(['a','c'],items)].sort()).toEqual(['a','b','c','d']);
  });
});
