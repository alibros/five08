import {clone,uid,type Project} from './model';

/**
 * Browser-local project storage.
 *
 * Five08 keeps an index of named projects plus one document per project, so a
 * corrupt or oversized document can never take the whole library down with it.
 * Nothing here talks to a network.
 */

const INDEX_KEY='five08:index';
const ACTIVE_KEY='five08:active';
const RECOVERY_KEY='five08:recovery';
const PREFS_KEY='five08:prefs';
const docKey=(id:string)=>`five08:doc:${id}`;
const LEGACY_KEYS=['five08-project-v2','panel-studio-project-v2','panel-studio-project'];
const RECOVERY_LIMIT=8;

export type ProjectMeta={id:string;name:string;hp:number;parts:number;finish:string;updatedAt:number};
export type WriteResult={ok:true}|{ok:false;reason:'quota'|'unavailable'};
export type RecoverySnapshot={savedAt:string;name:string;project:unknown};

const store=():Storage|null=>{try{const s=window.localStorage;const probe='five08:probe';s.setItem(probe,'1');s.removeItem(probe);return s;}catch{return null;}};
const readJson=<T,>(key:string,fallback:T):T=>{const s=store();if(!s)return fallback;try{const raw=s.getItem(key);return raw?JSON.parse(raw) as T:fallback;}catch{return fallback;}};
const writeJson=(key:string,value:unknown):WriteResult=>{const s=store();if(!s)return{ok:false,reason:'unavailable'};try{s.setItem(key,JSON.stringify(value));return{ok:true};}catch(err){return{ok:false,reason:err instanceof DOMException&&/quota/i.test(err.name)?'quota':'unavailable'};}};

export const metaOf=(id:string,p:Project):ProjectMeta=>({id,name:p.name,hp:p.panel.hp,parts:p.items.length,finish:p.panel.finish,updatedAt:Date.now()});

export function listProjects():ProjectMeta[]{
  return readJson<ProjectMeta[]>(INDEX_KEY,[]).filter(m=>m&&typeof m.id==='string').sort((a,b)=>b.updatedAt-a.updatedAt);
}

export function readProject(id:string):unknown|null{
  const s=store();if(!s)return null;
  try{const raw=s.getItem(docKey(id));return raw?JSON.parse(raw):null;}catch{return null;}
}

export function saveProject(id:string,project:Project):WriteResult{
  const written=writeJson(docKey(id),project);
  if(!written.ok)return written;
  const index=listProjects().filter(m=>m.id!==id);
  index.unshift(metaOf(id,project));
  return writeJson(INDEX_KEY,index.slice(0,60));
}

export function deleteProject(id:string){
  const s=store();if(!s)return;
  try{s.removeItem(docKey(id));}catch{/* nothing to remove */}
  writeJson(INDEX_KEY,listProjects().filter(m=>m.id!==id));
  if(activeId()===id)setActiveId('');
}

export function renameProject(id:string,name:string){
  const raw=readProject(id) as Project|null;if(!raw)return;
  raw.name=name;saveProject(id,raw);
}

export const activeId=()=>{const s=store();try{return s?.getItem(ACTIVE_KEY)||'';}catch{return '';}};
export const setActiveId=(id:string)=>{const s=store();try{id?s?.setItem(ACTIVE_KEY,id):s?.removeItem(ACTIVE_KEY);}catch{/* private mode */}};

/** Moves a pre-index single-slot project into the library exactly once. */
export function migrateLegacy():{id:string;raw:unknown}|null{
  const s=store();if(!s)return null;
  for(const key of LEGACY_KEYS){
    let raw:unknown;
    try{const text=s.getItem(key);if(!text)continue;raw=JSON.parse(text);}catch{continue;}
    const id=uid();
    try{s.setItem(docKey(id),JSON.stringify(raw));s.removeItem(key);}catch{return null;}
    return {id,raw};
  }
  return null;
}

export function newProjectId(){return uid();}

export function duplicateProject(id:string):string|null{
  const raw=readProject(id) as Project|null;if(!raw)return null;
  const copy=clone(raw);copy.name=`${copy.name} copy`;
  const nextId=newProjectId();
  return saveProject(nextId,copy).ok?nextId:null;
}

export function pushRecovery(project:Project){
  const trimmed:Project={...clone(project),panelImage:undefined,items:project.items.map(i=>({...i,imageData:undefined}))};
  const list=listRecovery();
  list.unshift({savedAt:new Date().toISOString(),name:project.name,project:trimmed});
  writeJson(RECOVERY_KEY,list.slice(0,RECOVERY_LIMIT));
}

export const listRecovery=()=>readJson<RecoverySnapshot[]>(RECOVERY_KEY,[]).filter(s=>s&&typeof s.savedAt==='string');
export const clearRecovery=()=>{const s=store();try{s?.removeItem(RECOVERY_KEY);}catch{/* private mode */}};

export type Prefs={theme:'system'|'light'|'dark';grid:number;snap:boolean;smartGuides:boolean;showGrid:boolean;showSafe:boolean};
export const defaultPrefs:Prefs={theme:'system',grid:1,snap:true,smartGuides:true,showGrid:true,showSafe:true};
export const readPrefs=():Prefs=>({...defaultPrefs,...readJson<Partial<Prefs>>(PREFS_KEY,{})});
export const writePrefs=(prefs:Prefs)=>{writeJson(PREFS_KEY,prefs);};

/** Approximate bytes used by Five08 keys, for the storage meter in the project browser. */
export function storageUsed():number{
  const s=store();if(!s)return 0;
  let total=0;
  try{for(let n=0;n<s.length;n++){const key=s.key(n);if(!key?.startsWith('five08'))continue;total+=key.length+(s.getItem(key)?.length??0);}}catch{return total;}
  return total*2;
}
