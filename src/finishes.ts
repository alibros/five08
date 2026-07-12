import type {Project} from './model';

export type PanelFinish={id:string;name:string;material:string;panel:string;ink:string;accent:string;description:string};
export const panelFinishes:PanelFinish[]=[
 {id:'brushed-silver',name:'Brushed silver',material:'Aluminium',panel:'#c9cbc7',ink:'#20231f',accent:'#ff6046',description:'Fine horizontal brushed grain'},
 {id:'black-anodized',name:'Black anodized',material:'Aluminium',panel:'#181b19',ink:'#eef0e8',accent:'#b8ff58',description:'Deep charcoal anodized metal'},
 {id:'powder-white',name:'Powder white',material:'Aluminium',panel:'#eeece4',ink:'#222420',accent:'#2c75ff',description:'Warm matte powder coat'},
 {id:'smoke-acrylic',name:'Smoke acrylic',material:'Acrylic',panel:'#29302f',ink:'#e9fff8',accent:'#63ffd0',description:'Translucent smoked acrylic'},
 {id:'clear-acrylic',name:'Clear acrylic',material:'Acrylic',panel:'#dcebea',ink:'#173331',accent:'#ff5d7c',description:'Clear glass-like acrylic'},
 {id:'fr4-green',name:'Green FR4',material:'FR4',panel:'#143d30',ink:'#e5efca',accent:'#efbf49',description:'Solder-mask green composite'},
 {id:'brushed-copper',name:'Brushed copper',material:'Metal',panel:'#a75f3f',ink:'#fff0dc',accent:'#6bffd0',description:'Warm directional copper grain'},
 {id:'walnut',name:'Bead-blasted',material:'Aluminium',panel:'#bfc0ba',ink:'#20221f',accent:'#ff5a36',description:'Soft matte bead-blasted aluminium'},
];
export const finishMap=new Map(panelFinishes.map(f=>[f.id,f]));
export function applyFinish(p:Project,id:string){const f=finishMap.get(id);if(!f)return;p.panel.finish=f.id;p.panel.material=f.material;p.panelColor=f.panel;p.inkColor=f.ink;p.accentColor=f.accent;}
