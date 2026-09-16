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
    locked:false,hidden:false,role:d.category==='Graphics'?'none':d.renderer==='jack'?'input':d.renderer==='led'?'light':'param',identifier:''};
};

export function demoPanel():Project{
  const project:Project={
    version:2,name:'HALO - Stereo texture processor',
    panel:{hp:20,widthMode:'doepfer',customWidth:101.2,thickness:2,material:'Aluminium',finish:'black-anodized',mounting:'four'},
    panelColor:'#202b2e',inkColor:'#e6eeea',accentColor:'#ff7955',items:[],
    design:{font:'sans',weight:500,labelSize:1.8,uppercase:true,outputLabels:'inverted'},
    notes:'HALO is a showcase panel design, not an electronic circuit or a commercially available module. Verify real components against their datasheets before fabrication.',
  };
  const w=panelWidth(project.panel);
  project.items=[
    {...place('text-label',26,13,'HALO',.5,{width:34,height:6}),color:project.inkColor,font:'sans',weight:500},
    {...place('text-label',26,20,'STEREO TEXTURE',.5,{width:34,height:1.65}),color:project.inkColor,font:'mono',weight:400},
    {...place('oled-091',75,15,'',.62),color:'#8be4ce'},
    {...place('knob-scale',26,43,'',.5,{width:31,height:31}),color:project.inkColor,count:13},
    {...place('knob-large',26,43,'POSITION',.62),color:'#bdc7c7'},
    {...place('encoder-ring',75,43,'TEXTURE',.44),color:'#2e383b'},
    {...place('button-lit-square',w/2,45,'HOLD',.35),color:'#79d5bc'},
    {...place('knob-fluted',20,79,'SIZE',.32),color:'#3d4b4d'},
    place('toggle-3',w/2,80,'MODE'),
    {...place('knob-soft-touch',w-20,79,'SPACE',.7),color:'#3d4b4d'},
    place('led-3mm',w/2-4,65,''),
    place('led-3mm',w/2+4,65,''),
    {...place('divider',w/2,99,'',.5,{width:w-18,height:.3}),color:project.inkColor},
    ...[12,27,42,w-42,w-27,w-12].map((x,n)=>({
      ...place('jack-thonk',x,110,['IN L','IN R','CV','GATE','OUT L','OUT R'][n]),
      role:(n>=4?'output':'input') as Item['role'],
    })),
    {...place('text-label',w/2,122,'FIVE08 / H-01',.5,{width:38,height:1.5}),color:project.inkColor,font:'mono',weight:400},
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
  const compact=hp<=10;
  project.items.forEach((item,n)=>{
    const original=source.items[n];
    item.width=original.width;
    item.height=original.height;
    item.y=original.y;
    item.x=Math.round(original.x/sourceWidth*width*10)/10;
    if(catalogMap.get(item.componentId)?.category==='Graphics')item.width=Math.min(original.width,Math.max(2,width-6));
  });
  if(!compact)return;

  // A deliberately overfull narrow layout demonstrates preflight; never shrink hardware to fit.
  const jacks=project.items.filter(item=>catalogMap.get(item.componentId)?.renderer==='jack');
  const columns=[width*.27,width*.73];
  jacks.forEach((jack,n)=>Object.assign(jack,{x:columns[n%2],y:91+Math.floor(n/2)*11}));
}
