export type Category = 'Controls'|'Jacks & connectors'|'Switches & buttons'|'Indicators & displays'|'Panel hardware'|'Graphics';
export type Renderer = 'knob'|'jack'|'slider'|'button'|'toggle'|'led'|'display'|'connector'|'hole'|'text'|'shape'|'touch'|'image'|'scale'|'arrow';
export type PartStatus = 'generic'|'verified';

/**
 * Where a dimension came from. A cutout figure is only as good as its source,
 * so parts carry one and the interface shows it rather than asking you to
 * trust the number.
 */
export type PartSource = { note:string; url?:string };

export type ComponentDefinition = {
  id:string; name:string; category:Category; renderer:Renderer; tags:string[];
  width:number; height:number; cutout?:number; cutoutShape?:'circle'|'rect'|'obround'; cutoutWidth?:number; cutoutHeight?:number;
  /** Fraction of the item a parametric rect cutout occupies. 1 = the whole footprint. */
  cutoutInset?:number; keepout?:number; depth?:number;
  color:string; label:string; status:PartStatus; description:string;
  manufacturer?:string; partNumber?:string; source?:PartSource; orientation?:'vertical'|'horizontal';
  libraryHidden?:boolean; resizable?:boolean;
  sizePresets?:Array<{label:string;componentId:string}>;
};

export type Item = {
  id:string; componentId:string; x:number; y:number; rotation:number; label:string;
  color:string; width:number; height:number; value:number; locked:boolean; hidden:boolean;
  role:'none'|'param'|'input'|'output'|'light'|'custom'; identifier:string; imageData?:string;
  /** What to actually order: "B10k lin", "SPDT on-off-on". Appears in the BOM. */
  spec?:string;
  /* Typography, for text and anything else that carries a legend. */
  font?:TextFont; weight?:number; align?:TextAlign; tracking?:number;
  /** Repeat count for parts made of a series: scale ticks, ring segments. */
  count?:number;
  /** Members of a group share this id and are selected together. */
  groupId?:string;
};

export type TextFont='sans'|'condensed'|'mono';
export type TextAlign='start'|'middle'|'end';

/**
 * Fonts named in an exported SVG have to exist on whatever opens it, so the
 * choices map to stacks every machine already has. For fabrication, outline the
 * text in a vector editor before sending it — a substituted font changes the
 * artwork silently.
 */
export const FONT_STACK:Record<TextFont,string>={
  sans:'Arial, Helvetica, sans-serif',
  condensed:'"Arial Narrow", "Helvetica Neue", Arial, sans-serif',
  mono:'"Courier New", ui-monospace, monospace',
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
  const items=(r.items as unknown[]).slice(0,1000).flatMap(value=>{if(!value||typeof value!=='object')return[];const x=value as Record<string,unknown>,componentId=String(x.componentId||''),d=definitions.get(componentId);if(!d)return[];let id=safeText(x.id,80,uid());if(seen.has(id))id=uid();seen.add(id);const role=roles.includes(String(x.role) as Item['role'])?String(x.role) as Item['role']:'none',imageData=validPng(x.imageData);return[{id,componentId,x:clamp(num(x.x,10),-500,1000),y:clamp(num(x.y,20),-500,1000),rotation:clamp(num(x.rotation,0),-3600,3600),width:clamp(num(x.width,d.width),.5,500),height:clamp(num(x.height,d.height),.5,500),value:clamp(num(x.value,.5),0,1),label:safeText(x.label,200,''),color:validColor(x.color,d.color),locked:!!x.locked,hidden:!!x.hidden,role,identifier:safeText(x.identifier,100,''),...(imageData?{imageData}:{}),...(safeText(x.spec,80,'')?{spec:safeText(x.spec,80,'')}:{}),...textStyle(x)}];});
  const panelImage=validPng(r.panelImage);
  return{version:2,name:safeText(r.name,120,base.name),panel:{hp,widthMode,customWidth:clamp(num(panel.customWidth,hp*HP_MM),5,430),thickness:clamp(num(panel.thickness,2),.5,10),material,finish:safeText(panel.finish,50,finishForMaterial(material)),mounting},panelColor:validColor(r.panelColor,base.panelColor),inkColor:validColor(r.inkColor,base.inkColor),accentColor:validColor(r.accentColor,base.accentColor),...(panelImage?{panelImage}:{}),items,notes:safeText(r.notes,10000,'')};
}
const fonts:TextFont[]=['sans','condensed','mono'];
const aligns:TextAlign[]=['start','middle','end'];
function textStyle(x:Record<string,unknown>){
  const out:Partial<Item>={};
  if(fonts.includes(x.font as TextFont))out.font=x.font as TextFont;
  if(aligns.includes(x.align as TextAlign))out.align=x.align as TextAlign;
  if(Number.isFinite(Number(x.weight)))out.weight=clamp(Math.round(Number(x.weight)/100)*100,100,900);
  if(Number.isFinite(Number(x.tracking)))out.tracking=clamp(Number(x.tracking),-.2,1);
  if(Number.isFinite(Number(x.count)))out.count=clamp(Math.round(Number(x.count)),2,64);
  const groupId=safeText(x.groupId,80,'');
  if(groupId)out.groupId=groupId;
  return out;
}
export const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
const num=(v:unknown,fallback:number)=>Number.isFinite(Number(v))?Number(v):fallback;
const validColor=(v:unknown,fallback:string)=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v:fallback;
const safeText=(v:unknown,max:number,fallback:string)=>typeof v==='string'&&v.trim()?v.slice(0,max):fallback;
/**
 * Artwork is a PNG or an SVG data URL. This only checks the shape and the size;
 * SVG markup is stripped to a safe subset by artwork.ts wherever a project
 * enters the editor, because an export embeds it into a file someone may later
 * open directly in a browser.
 */
const validPng=(v:unknown)=>typeof v==='string'&&v.length<=2_800_000
  &&/^data:image\/(png|svg\+xml);base64,[a-z0-9+/=]+$/i.test(v)?v:undefined;
const finishForMaterial=(m:string)=>m==='Acrylic'?'smoke-acrylic':m==='FR4'?'fr4-green':m==='Wood'?'walnut':'brushed-silver';
