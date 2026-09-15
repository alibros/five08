import {describe,expect,it} from 'vitest';
import {applyPlacements,gridPlacements,matchSize,mirrorPlacements,rotateGroup,spreadBetween} from './arrange';
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
