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

/** Reflow the landing example without changing any real-world component size. */
export function resizeDemoPanel(project:Project,hp:number){
  const source=demoPanel();
  const sourceWidth=panelWidth(source.panel);
  project.panel.hp=hp;
  project.panel.customWidth=hp*HP_MM-.4;
  const width=panelWidth(project.panel);
  const compact=hp<=8;
  project.items.forEach((item,n)=>{
    const original=source.items[n];
    item.width=original.width;
    item.height=original.height;
    item.y=original.y;
    item.x=Math.round(original.x/sourceWidth*width*10)/10;
  });
  if(!compact)return;

  const at=(label:string,renderer:string)=>project.items.find(item=>item.label===label&&catalogMap.get(item.componentId)?.renderer===renderer)!;
  const label=at('WAVEFOLDER','text');
  label.x=width/2;
  label.width=Math.min(label.width,width-4);
  at('FOLD','knob').x=width/2;
  Object.assign(at('SYMMETRY','knob'),{x:8,y:58});
  Object.assign(at('DRIVE','knob'),{x:width-8,y:58});
  Object.assign(at('RANGE','toggle'),{x:width/2,y:76});

  const leds=project.items.filter(item=>catalogMap.get(item.componentId)?.renderer==='led');
  Object.assign(leds[0],{x:9,y:88});
  Object.assign(leds[1],{x:width-9,y:88});

  const jacks=project.items.filter(item=>catalogMap.get(item.componentId)?.renderer==='jack');
  const columns=[width*.27,width*.73];
  jacks.forEach((jack,n)=>Object.assign(jack,{x:columns[n%2],y:n<2?101.5:113.5}));
}
