import {describe,expect,it} from 'vitest';
import {History,MIN_ENTRIES,weigh} from './history';
import {emptyProject,type Project} from './model';

const named=(name:string):Project=>({...emptyProject(),name});
const heavy=(name:string,kb:number):Project=>({...emptyProject(),name,notes:'x'.repeat(kb*1024)});

describe('undo history',()=>{
  it('starts with nowhere to go',()=>{
    const h=new History(named('a'));
    expect(h.canUndo).toBe(false);
    expect(h.canRedo).toBe(false);
    expect(h.undo()).toBeNull();
  });

  it('walks back and forward through states',()=>{
    const h=new History(named('a'));
    h.push(named('b'));h.push(named('c'));
    expect(h.undo()?.name).toBe('b');
    expect(h.undo()?.name).toBe('a');
    expect(h.canUndo).toBe(false);
    expect(h.redo()?.name).toBe('b');
    expect(h.redo()?.name).toBe('c');
    expect(h.canRedo).toBe(false);
  });

  it('drops the redo branch once you edit after undoing',()=>{
    const h=new History(named('a'));
    h.push(named('b'));h.push(named('c'));
    h.undo();
    h.push(named('d'));
    expect(h.canRedo).toBe(false);
    expect(h.undo()?.name).toBe('b');
  });

  it('hands back copies, so a later edit cannot rewrite the past',()=>{
    const h=new History(named('a'));
    h.push(named('b'));
    const restored=h.undo()!;
    restored.name='mutated';
    expect(h.redo()?.name).toBe('b');
    expect(h.undo()?.name).toBe('a');
  });

  it('budgets by bytes, not by step count',()=>{
    // Each step weighs about 64 kB, so a 600 kB budget should hold roughly nine
    // of them — comfortably above the floor, so the budget is what binds.
    const h=new History(emptyProject(),600*1024);
    for(let n=0;n<40;n++)h.push(heavy(`step ${n}`,32));
    expect(h.depth).toBeLessThan(40);
    expect(h.depth).toBeGreaterThan(MIN_ENTRIES);
    expect(h.bytes).toBeLessThanOrEqual(600*1024);
    expect(h.canUndo).toBe(true);
  });

  it('keeps a floor of steps however heavy the project',()=>{
    const h=new History(emptyProject(),1);
    for(let n=0;n<10;n++)h.push(heavy(`step ${n}`,512));
    expect(h.depth).toBe(MIN_ENTRIES);
    expect(h.undo()).not.toBeNull();
  });

  it('keeps a deep history for light projects',()=>{
    const h=new History(named('start'));
    for(let n=0;n<120;n++)h.push(named(`step ${n}`));
    expect(h.depth).toBe(121);
  });

  it('counts an embedded image against the budget',()=>{
    const bare=emptyProject();
    const withArt={...bare,panelImage:'data:image/png;base64,'+'A'.repeat(200_000)};
    expect(weigh(withArt)).toBeGreaterThan(weigh(bare)*10);
  });

  it('forgets everything when a different project is opened',()=>{
    const h=new History(named('a'));
    h.push(named('b'));
    h.reset(named('other'));
    expect(h.canUndo).toBe(false);
    expect(h.depth).toBe(1);
  });
});
