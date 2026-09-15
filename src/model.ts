export type Category = 'Controls'|'Jacks & connectors'|'Switches & buttons'|'Indicators & displays'|'Panel hardware'|'Graphics';
export type Renderer = 'knob'|'jack'|'slider'|'button'|'toggle'|'led'|'display'|'connector'|'hole'|'text'|'shape'|'touch'|'image';
export type PartStatus = 'generic'|'verified';

export type ComponentDefinition = {
  id:string; name:string; category:Category; renderer:Renderer; tags:string[];
  width:number; height:number; cutout?:number; cutoutShape?:'circle'|'rect'; cutoutWidth?:number; cutoutHeight?:number; keepout?:number; depth?:number;
  color:string; label:string; status:PartStatus; description:string;
  manufacturer?:string; partNumber?:string; orientation?:'vertical'|'horizontal';
  libraryHidden?:boolean; resizable?:boolean;
  sizePresets?:Array<{label:string;componentId:string}>;
};

export type Item = {
  id:string; componentId:string; x:number; y:number; rotation:number; label:string;
  color:string; width:number; height:number; value:number; locked:boolean; hidden:boolean;
  role:'none'|'param'|'input'|'output'|'light'|'custom'; identifier:string; imageData?:string;
};

export type PanelProfile = {
  hp:number; widthMode:'nominal'|'doepfer'|'custom'; customWidth:number;
  thickness:number; material:string; finish:string; mounting:'none'|'two'|'diagonal'|'four';
};

export type Project = {
  version:2; name:string; panel:PanelProfile; panelColor:string; inkColor:string;
  accentColor:string; panelImage?:string; items:Item[]; notes:string;
};

export const PANEL_H = 128.5;
export const HP_MM = 5.08;
export const panelWidth = (p:PanelProfile) => p.widthMode==='custom' ? p.customWidth : p.widthMode==='doepfer' ? Math.max(5,p.hp*HP_MM-.4) : p.hp*HP_MM;
export const uid = () => crypto.randomUUID?.() ?? Math.random().toString(36).slice(2,11);
export const clone = <T,>(x:T):T => structuredClone(x);
export const dimensionLocked=(d:ComponentDefinition)=>d.resizable===false||d.status==='verified'||['jack','connector','toggle','hole'].includes(d.renderer);
export const emptyProject = ():Project => ({version:2,name:'Untitled panel',panel:{hp:12,widthMode:'doepfer',customWidth:60.56,thickness:2,material:'Aluminium',finish:'brushed-silver',mounting:'four'},panelColor:'#d9d8d1',inkColor:'#1b1c19',accentColor:'#ff5d3b',items:[],notes:''});

type V1Item={id:string;kind:string;x:number;y:number;size:number;label:string;color:string;value?:number};
type V1Project={version:1;name:string;hp:number;panelColor:string;inkColor:string;accentColor:string;items:V1Item[]};
const legacyMap:Record<string,string>={knob:'knob-medium',jack:'jack-mono',led:'led-3mm',button:'button-round',fader:'slider-30',display:'oled-096',switch:'toggle-2',screw:'mount-hole',label:'text-label'};

export function parseProject(raw:unknown, definitions:Map<string,ComponentDefinition>):Project {
  if(!raw||typeof raw!=='object') throw new Error('Project is not an object');
  const r=raw as Record<string,unknown>;
  if(r.version===1){const old=r as unknown as V1Project;const p=emptyProject();p.name=String(old.name||'Imported panel');p.panel.hp=clamp(Number(old.hp)||12,2,84);p.panel.customWidth=p.panel.hp*HP_MM-.4;p.panelColor=validColor(old.panelColor,p.panelColor);p.inkColor=validColor(old.inkColor,p.inkColor);p.accentColor=validColor(old.accentColor,p.accentColor);p.items=(old.items||[]).map(x=>{const def=definitions.get(legacyMap[x.kind]||'shape-circle')!;return{id:String(x.id||uid()),componentId:def.id,x:num(x.x,10),y:num(x.y,20),rotation:0,label:String(x.label||def.label),color:validColor(x.color,def.color),width:num(x.size,def.width),height:x.kind==='fader'?num(x.size,def.height):def.height,value:num(x.value,.5),locked:false,hidden:false,role:'none',identifier:''};});return p;}
  if(r.version!==2||!Array.isArray(r.items)||!r.panel||typeof r.panel!=='object') throw new Error('Unsupported project format');
  const base=emptyProject(),panel=r.panel as Record<string,unknown>;
  const widthMode=['nominal','doepfer','custom'].includes(String(panel.widthMode))?String(panel.widthMode) as PanelProfile['widthMode']:base.panel.widthMode;
  const mounting=['none','two','diagonal','four'].includes(String(panel.mounting))?String(panel.mounting) as PanelProfile['mounting']:base.panel.mounting;
  const hp=clamp(num(panel.hp,12),2,84),material=safeText(panel.material,40,base.panel.material);
  const roles:Item['role'][]=['none','param','input','output','light','custom'];const seen=new Set<string>();
  const items=(r.items as unknown[]).slice(0,1000).flatMap(value=>{if(!value||typeof value!=='object')return[];const x=value as Record<string,unknown>,componentId=String(x.componentId||''),d=definitions.get(componentId);if(!d)return[];let id=safeText(x.id,80,uid());if(seen.has(id))id=uid();seen.add(id);const role=roles.includes(String(x.role) as Item['role'])?String(x.role) as Item['role']:'none',imageData=validPng(x.imageData);return[{id,componentId,x:clamp(num(x.x,10),-500,1000),y:clamp(num(x.y,20),-500,1000),rotation:clamp(num(x.rotation,0),-3600,3600),width:clamp(num(x.width,d.width),.5,500),height:clamp(num(x.height,d.height),.5,500),value:clamp(num(x.value,.5),0,1),label:safeText(x.label,200,''),color:validColor(x.color,d.color),locked:!!x.locked,hidden:!!x.hidden,role,identifier:safeText(x.identifier,100,''),...(imageData?{imageData}:{})}];});
  const panelImage=validPng(r.panelImage);
  return{version:2,name:safeText(r.name,120,base.name),panel:{hp,widthMode,customWidth:clamp(num(panel.customWidth,hp*HP_MM),5,430),thickness:clamp(num(panel.thickness,2),.5,10),material,finish:safeText(panel.finish,50,finishForMaterial(material)),mounting},panelColor:validColor(r.panelColor,base.panelColor),inkColor:validColor(r.inkColor,base.inkColor),accentColor:validColor(r.accentColor,base.accentColor),...(panelImage?{panelImage}:{}),items,notes:safeText(r.notes,10000,'')};
}
export const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
const num=(v:unknown,fallback:number)=>Number.isFinite(Number(v))?Number(v):fallback;
const validColor=(v:unknown,fallback:string)=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v:fallback;
const safeText=(v:unknown,max:number,fallback:string)=>typeof v==='string'&&v.trim()?v.slice(0,max):fallback;
const validPng=(v:unknown)=>typeof v==='string'&&v.length<=2_100_000&&/^data:image\/png;base64,[a-z0-9+/=]+$/i.test(v)?v:undefined;
const finishForMaterial=(m:string)=>m==='Acrylic'?'smoke-acrylic':m==='FR4'?'fr4-green':m==='Wood'?'walnut':'brushed-silver';
