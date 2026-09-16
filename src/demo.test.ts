import {describe,expect,it} from 'vitest';
import {catalogMap} from './catalog';
import {demoPanel,resizeDemoPanel} from './demo';
import {panelWidth} from './model';
import {preflight} from './preflight';

describe('the panel on the public page',()=>{
  it('passes the same checks the editor applies',()=>{
    const issues=preflight(demoPanel(),catalogMap);
    expect(issues.map(i=>`${i.code}: ${i.message}`)).toEqual([]);
  });

  it('reflows a narrow panel without changing physical component sizes',()=>{
    const project=demoPanel();
    const original=project.items.map(item=>({width:item.width,height:item.height}));
    resizeDemoPanel(project,6);
    project.items.forEach((item,n)=>{
      if(catalogMap.get(item.componentId)?.category==='Graphics')return;
      expect(item.width).toBe(original[n].width);
      expect(item.height).toBe(original[n].height);
    });
    const jacks=project.items.filter(item=>catalogMap.get(item.componentId)?.renderer==='jack');
    expect(new Set(jacks.map(item=>item.y))).toEqual(new Set([91,102,113]));
    expect(jacks.every(item=>item.x-item.width/2>=0&&item.x+item.width/2<=panelWidth(project.panel))).toBe(true);
  });

  it('restores the showcase after narrowing without losing its control settings',()=>{
    const project=demoPanel(),original=structuredClone(project.items);project.items[4].value=.9;
    resizeDemoPanel(project,6);resizeDemoPanel(project,20);
    expect(project.items[4].value).toBe(.9);
    project.items.forEach((item,n)=>{
      expect(item.x).toBeCloseTo(original[n].x,1);expect(item.y).toBe(original[n].y);
      expect(item.width).toBe(original[n].width);expect(item.height).toBe(original[n].height);
    });
    expect(preflight(project,catalogMap)).toEqual([]);
  });
});
