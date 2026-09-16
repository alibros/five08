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

  it('scales the presentation geometry with a narrow panel',()=>{
    const project=demoPanel();
    const original=project.items.map(item=>({x:item.x,width:item.width,height:item.height}));
    resizeDemoPanel(project,6);
    const scale=panelWidth(project.panel)/60.56;
    project.items.forEach((item,n)=>{
      expect(item.x).toBeCloseTo(original[n].x*scale,1);
      expect(item.width).toBeCloseTo(original[n].width*scale,1);
      expect(item.height).toBeCloseTo(original[n].height*scale,1);
    });
  });
});
