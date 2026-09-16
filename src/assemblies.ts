import {extent,copyItems} from './arrange';
import {sanitizeProjectArtwork} from './artwork';
import {emptyProject,parseProject,uid,type ComponentDefinition,type Item} from './model';

export type Assembly={version:1;id:string;name:string;items:Item[]};
const KEY='five08.assemblies.v1';
const MAX_BYTES=2_000_000;

export function parseAssembly(raw:unknown,definitions:Map<string,ComponentDefinition>):Assembly{
  if(!raw||typeof raw!=='object')throw new Error('Not a Five08 assembly');
  const data=raw as Record<string,unknown>;
  if(data.version!==1||!Array.isArray(data.items)||!data.items.length||data.items.length>100)
    throw new Error('An assembly needs 1-100 components');
  const parsed=parseProject({...emptyProject(),items:data.items},definitions);
  if(parsed.items.length!==data.items.length)throw new Error('This assembly contains unknown components');
  const {project}=sanitizeProjectArtwork(parsed);
  return{version:1,id:typeof data.id==='string'?data.id.slice(0,80):uid(),
    name:typeof data.name==='string'&&data.name.trim()?data.name.trim().slice(0,80):'Untitled assembly',items:project.items};
}

export function makeAssembly(name:string,items:Item[],definitions:Map<string,ComponentDefinition>):Assembly{
  const box=extent(items);
  return parseAssembly({version:1,id:uid(),name,items:copyItems(items,-(box.l+box.r)/2,-(box.t+box.b)/2,uid)},definitions);
}

export function instantiateAssembly(assembly:Assembly,x:number,y:number):Item[]{
  const groupId=uid();
  return copyItems(assembly.items,x,y,uid).map(i=>({...i,groupId,locked:false,hidden:false,identifier:''}));
}

export function readAssemblies(definitions:Map<string,ComponentDefinition>,storage:Storage=localStorage):Assembly[]{
  try{
    const value=storage.getItem(KEY);
    if(!value||value.length>MAX_BYTES)return[];
    const data:unknown=JSON.parse(value);
    if(!Array.isArray(data))return[];
    return data.slice(0,50).flatMap(raw=>{try{return[parseAssembly(raw,definitions)];}catch{return[];}});
  }catch{return[];}
}

export function writeAssemblies(assemblies:Assembly[],storage:Storage=localStorage){
  const json=JSON.stringify(assemblies);
  if(assemblies.length>50||json.length>MAX_BYTES)throw new Error('Assembly library is full. Export and remove an assembly first.');
  try{storage.setItem(KEY,json);}catch{throw new Error('Browser storage is unavailable or full. Download a backup before continuing.');}
}
