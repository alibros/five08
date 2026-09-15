import {describe,expect,it} from 'vitest';
import {catalogMap} from './catalog';
import {demoPanel} from './demo';
import {preflight} from './preflight';

describe('the panel on the public page',()=>{
  it('passes the same checks the editor applies',()=>{
    const issues=preflight(demoPanel(),catalogMap);
    expect(issues.map(i=>`${i.code}: ${i.message}`)).toEqual([]);
  });
});
