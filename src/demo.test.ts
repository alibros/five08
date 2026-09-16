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
      if(item.componentId==='text-label')return;
      expect(item.width).toBe(original[n].width);
      expect(item.height).toBe(original[n].height);
    });
    const jacks=project.items.filter(item=>catalogMap.get(item.componentId)?.renderer==='jack');
    expect(new Set(jacks.map(item=>item.y))).toEqual(new Set([101.5,113.5]));
    expect(jacks.every(item=>item.x-item.width/2>=0&&item.x+item.width/2<=panelWidth(project.panel))).toBe(true);
  });
});
