import {beforeEach,describe,expect,it} from 'vitest';
import {emptyProject} from './model';
import {activeId,deleteProject,duplicateProject,listProjects,listRecovery,migrateLegacy,newProjectId,pushRecovery,readPrefs,readProject,renameProject,saveProject,setActiveId,storageUsed,writePrefs} from './store';

/** An in-memory stand-in for localStorage, with an optional byte ceiling. */
class MemoryStorage implements Storage {
  private map=new Map<string,string>();
  limit=Infinity;
  get length(){return this.map.size;}
  key(n:number){return[...this.map.keys()][n]??null;}
  getItem(k:string){return this.map.get(k)??null;}
  removeItem(k:string){this.map.delete(k);}
  clear(){this.map.clear();}
  setItem(k:string,v:string){
    const total=[...this.map].reduce((s,[key,value])=>s+key.length+value.length,0)+k.length+v.length;
    if(total>this.limit){const err=new DOMException('exceeded','QuotaExceededError');throw err;}
    this.map.set(k,v);
  }
}

let storage:MemoryStorage;
beforeEach(()=>{
  storage=new MemoryStorage();
  globalThis.window={localStorage:storage} as unknown as Window&typeof globalThis;
});

describe('project library',()=>{
  it('saves a project and lists it with usable metadata',()=>{
    const p=emptyProject();
    p.name='Wavefolder';
    p.panel.hp=8;
    const id=newProjectId();
    expect(saveProject(id,p)).toEqual({ok:true});
    const [meta]=listProjects();
    expect(meta.name).toBe('Wavefolder');
    expect(meta.hp).toBe(8);
    expect(meta.parts).toBe(0);
    expect(readProject(id)).toMatchObject({name:'Wavefolder'});
  });

  it('lists the most recently saved project first',()=>{
    const first=newProjectId(),second=newProjectId();
    saveProject(first,{...emptyProject(),name:'First'});
    saveProject(second,{...emptyProject(),name:'Second'});
    expect(listProjects().map(m=>m.name)).toEqual(['Second','First']);
  });

  it('reports a full browser instead of silently losing work',()=>{
    storage.limit=200;
    const result=saveProject(newProjectId(),emptyProject());
    expect(result).toEqual({ok:false,reason:'quota'});
  });

  it('survives a browser that blocks storage entirely',()=>{
    globalThis.window={get localStorage():Storage{throw new DOMException('denied','SecurityError');}} as unknown as Window&typeof globalThis;
    expect(listProjects()).toEqual([]);
    expect(readProject('anything')).toBeNull();
    expect(saveProject('x',emptyProject())).toEqual({ok:false,reason:'unavailable'});
    expect(readPrefs().theme).toBe('system');
  });

  it('renames and duplicates without touching the original',()=>{
    const id=newProjectId();
    saveProject(id,{...emptyProject(),name:'Original'});
    renameProject(id,'Renamed');
    const copyId=duplicateProject(id)!;
    expect(copyId).not.toBe(id);
    expect(listProjects().map(m=>m.name).sort()).toEqual(['Renamed','Renamed copy']);
  });

  it('deletes a project and clears it as the active one',()=>{
    const id=newProjectId();
    saveProject(id,emptyProject());
    setActiveId(id);
    deleteProject(id);
    expect(listProjects()).toEqual([]);
    expect(readProject(id)).toBeNull();
    expect(activeId()).toBe('');
  });

  it('moves a pre-library project across exactly once',()=>{
    storage.setItem('five08-project-v2',JSON.stringify({version:2,name:'Legacy',panel:{},items:[]}));
    const migrated=migrateLegacy();
    expect(migrated?.raw).toMatchObject({name:'Legacy'});
    expect(storage.getItem('five08-project-v2')).toBeNull();
    expect(migrateLegacy()).toBeNull();
  });

  it('ignores a corrupt index rather than losing the library',()=>{
    storage.setItem('five08:index','{not json');
    expect(listProjects()).toEqual([]);
  });
});

describe('recovery snapshots',()=>{
  it('keeps snapshots newest first and strips embedded artwork',()=>{
    const p=emptyProject();
    p.name='With art';
    p.panelImage='data:image/png;base64,aGVsbG8=';
    pushRecovery(p);
    pushRecovery({...emptyProject(),name:'Later'});
    const list=listRecovery();
    expect(list.map(s=>s.name)).toEqual(['Later','With art']);
    expect((list[1].project as{panelImage?:string}).panelImage).toBeUndefined();
  });

  it('caps the snapshot history',()=>{
    for(let n=0;n<12;n++)pushRecovery({...emptyProject(),name:`Snapshot ${n}`});
    expect(listRecovery()).toHaveLength(8);
  });
});

describe('preferences',()=>{
  it('round-trips and falls back to defaults for missing keys',()=>{
    writePrefs({theme:'dark',grid:2.54,snap:false,smartGuides:true,showGrid:false,showSafe:true});
    expect(readPrefs()).toMatchObject({theme:'dark',grid:2.54,snap:false});
    storage.setItem('five08:prefs',JSON.stringify({theme:'light'}));
    expect(readPrefs()).toMatchObject({theme:'light',grid:1,snap:true});
  });
});

describe('storage meter',()=>{
  it('counts only Five08 keys',()=>{
    storage.setItem('someone-else','x'.repeat(500));
    const before=storageUsed();
    saveProject(newProjectId(),emptyProject());
    expect(storageUsed()).toBeGreaterThan(before);
    expect(before).toBe(0);
  });
});
