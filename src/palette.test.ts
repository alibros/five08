import {describe,expect,it} from 'vitest';
import {rank,score,type Command} from './palette';

const command=(title:string,group='Edit',keywords=''):Command=>({id:title,title,group,keywords,run(){}});

describe('command search',()=>{
  it('prefers a direct substring match',()=>{
    const list=[command('Rotate 90°'),command('Mirror horizontally')];
    expect(rank(list,'mirror')[0].title).toBe('Mirror horizontally');
  });

  it('matches scattered initials',()=>expect(score(command('Mirror horizontally'),'mrh')).toBeGreaterThan(0));
  it('rejects letters that are out of order',()=>expect(score(command('Mirror'),'zq')).toBe(0));
  it('searches keywords as well as titles',()=>expect(rank([command('Export cut file','File','dxf laser')],'dxf')).toHaveLength(1));
  it('returns everything for an empty query',()=>expect(rank([command('a'),command('b')],'')).toHaveLength(2));
});
