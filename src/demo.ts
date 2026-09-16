import {catalogMap} from './catalog';
import {HP_MM,panelWidth,uid,type Item,type Project} from './model';

/**
 * The panel shown on the public page. It is a normal project, rendered by the
 * editor's own code, and `demo.test.ts` holds it to the same preflight checks
 * the editor applies — so the page cannot advertise a layout that would fail.
 */
const place=(componentId:string,x:number,y:number,label='',value=.5,size?:{width:number;height:number}):Item=>{
  const d=catalogMap.get(componentId)!;
  return{id:uid(),componentId,x,y,rotation:0,label,color:d.color,width:size?.width??d.width,height:size?.height??d.height,value,
    locked:false,hidden:false,role:d.renderer==='jack'?'input':d.renderer==='led'?'light':'param',identifier:''};
};

export function demoPanel():Project{
  const project:Project={
    version:2,name:'Wavefolder',
    panel:{hp:12,widthMode:'doepfer',customWidth:60.56,thickness:2,material:'Aluminium',finish:'brushed-silver',mounting:'four'},
    panelColor:'#d9d8d1',inkColor:'#1b1c19',accentColor:'#ff5d3b',items:[],notes:'',
  };
  const w=panelWidth(project.panel);
  project.items=[
    {...place('text-label',w/2,12,'WAVEFOLDER',.5,{width:34,height:3.4}),color:project.inkColor},
    place('knob-large',w/2,33,'FOLD',.62),
    place('knob-medium',13,62,'SYMMETRY',.38),
    place('knob-medium',w-13,62,'DRIVE',.71),
    place('toggle-2',w/2,64,'RANGE'),
    place('led-3mm',22,84,''),
    place('led-3mm',w-22,84,''),
    place('jack-mono',9.5,106,'IN'),
    place('jack-mono',23,106,'CV'),
    place('jack-mono',37.5,106,'FOLD'),
    place('jack-mono',51,106,'OUT'),
  ];
  return project;
}

/** Keep the landing-page example legible while demonstrating narrow panels. */
export function resizeDemoPanel(project:Project,hp:number){
  const source=demoPanel();
  const sourceWidth=panelWidth(source.panel);
  project.panel.hp=hp;
  project.panel.customWidth=hp*HP_MM-.4;
  const scale=panelWidth(project.panel)/sourceWidth;
  project.items.forEach((item,n)=>{
    const original=source.items[n];
    item.x=Math.round(original.x*scale*10)/10;
    item.width=Math.round(original.width*scale*10)/10;
    item.height=Math.round(original.height*scale*10)/10;
  });
}
