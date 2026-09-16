import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {clamp,type ComponentDefinition,type Item} from './model';
import {dinContacts,faderTravel,fluteInset,hardwareColors,knobAngle,oledTrace,previewValue,ringSegments,sevenSegments,tint,togglePosition,vuDial,VU_LETTERS} from './hardware-visual';

type Material = THREE.MeshStandardMaterial;
type Profile = Array<[radius:number,z:number]>;
export type HardwareModel = {front:THREE.Group};

/** Per-inspection resources: repeated parts share meshes, finishes and small details. */
export class HardwareResources {
  private geometries = new Map<string,THREE.BufferGeometry>();
  private materials = new Map<string,Material>();

  geometry(key:string,build:()=>THREE.BufferGeometry){
    let geometry=this.geometries.get(key);
    if(!geometry){geometry=build();this.geometries.set(key,geometry);}
    return geometry;
  }

  material(color:string,finish:'plastic'|'rubber'|'metal'|'glass'|'light'|'matte'='plastic',level=1){
    const key=`${color}:${finish}:${level}`;
    let material=this.materials.get(key);
    if(!material){
      material=new THREE.MeshPhysicalMaterial({color:finish==='light'?shade(color,.12):color,
        metalness:finish==='metal'?.9:0,
        roughness:finish==='metal'?.26:finish==='rubber'?.82:finish==='matte'?.65:finish==='glass'?.15:.44,
        clearcoat:finish==='glass'?.85:finish==='plastic'?.12:0,
        clearcoatRoughness:.22,emissiveIntensity:0,
        ...(finish==='light'?{emissive:color,emissiveIntensity:.3+level*.9,roughness:.3}:{}),
      });
      this.materials.set(key,material);
    }
    return material;
  }

  dispose(){
    this.geometries.forEach(g=>g.dispose());this.materials.forEach(m=>m.dispose());
    this.geometries.clear();this.materials.clear();
  }
}

const TAU=Math.PI*2;
const {dark:DARK,steel:STEEL,gold:GOLD}=hardwareColors;
const shade=(color:string,factor:number)=>`#${new THREE.Color(color).multiplyScalar(factor).getHexString()}`;

// XY corner radii must not be limited by the very shallow depth of a socket lip.
function roundedShape(w:number,h:number,r:number){
  const s=new THREE.Shape(),x=w/2-r,y=h/2-r;
  s.moveTo(-x,-h/2);s.lineTo(x,-h/2);s.absarc(x,-y,r,-Math.PI/2,0,false);
  s.lineTo(w/2,y);s.absarc(x,y,r,0,Math.PI/2,false);
  s.lineTo(-x,h/2);s.absarc(-x,y,r,Math.PI/2,Math.PI,false);
  s.lineTo(-w/2,-y);s.absarc(-x,-y,r,Math.PI,Math.PI*1.5,false);
  s.closePath();return s;
}

class Builder {
  constructor(readonly resources:HardwareResources){}

  mesh(parent:THREE.Group,geometry:THREE.BufferGeometry,material:Material,name:string,x=0,y=0,z=0){
    const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.position.set(x,y,z);
    mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }

  box(parent:THREE.Group,w:number,h:number,depth:number,z:number,material:Material,name:string,x=0,y=0,r=.2){
    const geometry=this.resources.geometry(`box:${w}:${h}:${depth}:${r}`,()=>new RoundedBoxGeometry(w,h,depth,2,r));
    return this.mesh(parent,geometry,material,name,x,y,z+depth/2);
  }

  frame(parent:THREE.Group,w:number,h:number,iw:number,ih:number,r:number,ir:number,depth:number,material:Material,name:string){
    const geometry=this.resources.geometry(`frame:${w}:${h}:${iw}:${ih}:${r}:${ir}:${depth}`,()=>{
      const shape=roundedShape(w,h,r);shape.holes.push(new THREE.Path(roundedShape(iw,ih,ir).getPoints(24).reverse()));
      return new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:24});
    });
    return this.mesh(parent,geometry,material,name,0,0,.01);
  }

  plate(parent:THREE.Group,w:number,h:number,r:number,depth:number,z:number,material:Material,name:string){
    const geometry=this.resources.geometry(`plate:${w}:${h}:${r}:${depth}`,()=>new THREE.ExtrudeGeometry(roundedShape(w,h,r),{depth,bevelEnabled:false,curveSegments:24}));
    return this.mesh(parent,geometry,material,name,0,0,z);
  }

  cylinder(parent:THREE.Group,r:number,depth:number,z:number,material:Material,name:string,x=0,y=0,segments=48){
    const geometry=this.resources.geometry(`cylinder:${r}:${depth}:${segments}`,()=>{
      const g=new THREE.CylinderGeometry(r,r,depth,segments);g.rotateX(Math.PI/2);return g;
    });
    return this.mesh(parent,geometry,material,name,x,y,z+depth/2);
  }

  lathe(parent:THREE.Group,profile:Profile,material:Material,name:string,flutes=0){
    const geometry=this.resources.geometry(`lathe:${JSON.stringify(profile)}:${flutes}`,()=>{
      const g=new THREE.LatheGeometry(profile.map(([r,z])=>new THREE.Vector2(r,z)),flutes?128:64);
      g.rotateX(Math.PI/2);
      if(flutes){
        const pos=g.attributes.position;
        for(let n=0;n<pos.count;n++){
          const x=pos.getX(n),y=pos.getY(n),r=Math.hypot(x,y);
          if(!r)continue;
          const inset=fluteInset(Math.atan2(y,x),flutes);
          pos.setXY(n,x*inset,y*inset);
        }
        g.computeVertexNormals();
      }
      return g;
    });
    return this.mesh(parent,geometry,material,name);
  }

  ring(parent:THREE.Group,outer:number,inner:number,depth:number,z:number,material:Material,name:string,segments=64){
    const geometry=this.resources.geometry(`ring:${outer}:${inner}:${depth}:${segments}`,()=>{
      const bevel=Math.min(.12,depth*.2,(outer-inner)*.15);
      // Compensate for the bevel's polygon miter so the outside size stays exact.
      const radius=outer-bevel/Math.cos(Math.PI/(segments===6?6:64));
      const shape=new THREE.Shape();
      if(segments===6){
        for(let n=0;n<6;n++){
          const x=radius*Math.cos(n*TAU/6),y=radius*Math.sin(n*TAU/6);
          if(n===0)shape.moveTo(x,y);else shape.lineTo(x,y);
        }
        shape.closePath();
      }else shape.absarc(0,0,radius,0,TAU,false);
      const hole=new THREE.Path();hole.absarc(0,0,inner+bevel/Math.cos(Math.PI/64),0,TAU,true);shape.holes.push(hole);
      const g=new THREE.ExtrudeGeometry(shape,{depth:depth-2*bevel,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,curveSegments:32});
      g.translate(0,0,bevel);
      return g;
    });
    return this.mesh(parent,geometry,material,name,0,0,z);
  }

  dome(parent:THREE.Group,r:number,height:number,z:number,material:Material,name:string,x=0,y=0){
    const geometry=this.resources.geometry(`dome:${r}:${height}`,()=>{
      const g=new THREE.SphereGeometry(r,32,12,0,TAU,0,Math.PI/2);
      g.rotateX(Math.PI/2);g.scale(1,1,height/r);return g;
    });
    return this.mesh(parent,geometry,material,name,x,y,z);
  }

  line(parent:THREE.Group,a:THREE.Vector3,b:THREE.Vector3,r:number,material:Material,name:string){
    const mesh=this.cylinder(parent,r,a.distanceTo(b),0,material,name);
    mesh.position.copy(a).add(b).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),b.clone().sub(a).normalize());return mesh;
  }
}

function pointer(b:Builder,g:THREE.Group,r:number,z:number,value:number,material:Material){
  const angle=-knobAngle(value)*Math.PI/180;
  const line=b.box(g,Math.max(.45,r*.08),r*.64,.12,z,material,'pointer',Math.cos(angle)*r*.52,Math.sin(angle)*r*.52,.04);
  line.rotation.z=angle-Math.PI/2;
}

function knob(b:Builder,g:THREE.Group,d:ComponentDefinition,i:Item,accent:string){
  const r=Math.min(d.width,d.height)/2,res=b.resources;
  const encoder=d.id.startsWith('encoder'),metal=d.id==='encoder-metal';
  const material=res.material(i.color,metal?'metal':d.id==='knob-soft-touch'?'rubber':'plastic');
  const dark=res.material(DARK,'rubber'),ink=res.material(accent,'matte');
  const skirt=d.id==='knob-skirted',concentric=d.id==='knob-concentric',halo=d.id==='encoder-ring';
  const height=d.id==='knob-soft-touch'?8:clamp(r*1.15,9,14);
  b.cylinder(g,r*.53,1.5,0,res.material(STEEL,'metal'),'shaft collar');
  if(halo){
    b.ring(g,r,r*.71,.7,.12,dark,'halo carrier');
    for(const s of ringSegments(24,r*.87,i.value,270)){
      const led=b.box(g,.8,1.1,.32,.84,res.material(s.active?accent:'#30383b',s.active?'light':'matte',.65),'halo segment',s.x,-s.y,.1);
      led.rotation.z=-(s.angle-90)*Math.PI/180;
    }
  }
  const capR=halo?r*.73:r;
  if(skirt||concentric){
    b.lathe(g,[[0,.8],[r*.93,.8],[r,1.2],[r,2.2],[r*.88,2.8],[0,2.8]],material,'skirt');
    if(skirt){
      for(let n=0;n<11;n++){
        const a=-(135+n*27)*Math.PI/180;
        const tick=b.box(g,.18,r*.14,.04,2.83,dark,'skirt graduation',Math.cos(a)*r*.82,Math.sin(a)*r*.82,.01);
        tick.rotation.z=a-Math.PI/2;
      }
    }
  }
  if(concentric){
    b.lathe(g,[[0,1],[r,1],[r,5],[r*.9,5.7],[0,5.7]],material,'lower concentric cap',24);
    b.cylinder(g,r*.88,.02,5.7,material,'lower top insert');
    pointer(b,g,r,5.73,.28,ink);
    b.lathe(g,[[0,5.8],[r*.58,5.8],[r*.58,11.3],[r*.48,11.9],[0,11.9]],res.material(shade(i.color,1.7)),'upper concentric cap',20);
    b.cylinder(g,r*.47,.02,11.9,res.material(shade(i.color,1.7)),'upper top insert');
    pointer(b,g,r*.55,11.94,i.value,ink);return;
  }
  const base=skirt?capR*.72:capR;
  b.lathe(g,[[0,1],[base*.93,1],[base,1.5],[base,height-1],[base*.93,height-.25],[base*.86,height],[0,height]],material,'cap',d.id==='knob-fluted'?16:metal?64:encoder?36:0);
  if(metal)b.cylinder(g,base*.78,.12,height,res.material(shade(i.color,1.15),'metal'),'machined top');
  else b.cylinder(g,base*.8,.08,height-.02,res.material(shade(i.color,1.15),d.id==='knob-soft-touch'?'rubber':'matte'),'top insert');
  if(encoder){
    const a=-knobAngle(i.value)*Math.PI/180;
    b.cylinder(g,.45,.1,height+.14,ink,'position dot',Math.cos(a)*base*.57,Math.sin(a)*base*.57,24);
    b.ring(g,base*.47,base*.44,.06,height+.1,res.material(shade(i.color,1.65),metal?'metal':'plastic'),'push inset');
  }else if(d.id!=='rotary-switch')pointer(b,g,base,height+.13,i.value,ink);
  if(d.id==='rotary-switch'){
    const grip=b.box(g,r*.42,r*1.48,1.3,height+.1,material,'selector grip',0,0,.45);
    grip.rotation.z=-(knobAngle(i.value)+90)*Math.PI/180;
    pointer(b,g,base*.82,height+1.44,i.value,ink);
  }
}

function jack(b:Builder,g:THREE.Group,d:ComponentDefinition,i:Item){
  const r=d.width/2,banana=d.id==='banana',res=b.resources;
  const metal=res.material(STEEL,'metal'),black=res.material(DARK,'rubber'),bore=banana?2:1.75;
  b.ring(g,r,bore,.45,.02,banana?res.material(i.color):metal,'washer');
  b.ring(g,r*.88,bore,1.5,.47,banana?res.material(i.color):metal,'hex retaining nut',6);
  b.ring(g,banana?r*.62:2.7,bore,1.3,1.97,banana?metal:res.material(i.color),'socket collar');
  b.ring(g,bore+.28,bore,.26,3.27,metal,'socket lip');
  b.ring(g,bore+.02,bore-.12,5,-1.7,black,'socket well');
  b.cylinder(g,bore-.1,.12,-1.7,black,'socket interior');
  b.box(g,.28,.8,.12,-.7,res.material(GOLD,'metal'),'contact spring',bore-.28,0,.02);
}

function slider(b:Builder,g:THREE.Group,d:ComponentDefinition,i:Item){
  const vertical=d.orientation!=='horizontal',travel=faderTravel(d),res=b.resources;
  const track=new THREE.Group();track.name='fader assembly';g.add(track);
  if(!vertical)track.rotation.z=-Math.PI/2;
  b.plate(track,3.2,travel+6,1.4,.8,-.5,res.material(DARK,'rubber'),'recessed track');
  b.box(track,.55,travel+3,.3,.18,res.material(STEEL,'metal'),'guide rail',0,0,.1);
  const y=(i.value-.5)*travel;
  b.box(track,1.7,2.8,3,.3,res.material(STEEL,'metal'),'fader stem',0,y);
  b.box(track,10,5.5,3,2.3,res.material(i.color),'fader cap',0,y,.6);
  b.box(track,8.8,.45,.12,5.32,res.material(DARK,'matte'),'fader index',0,y,.08);
  for(const offset of [-1.6,1.6])b.box(track,8.3,.23,.16,5.17,res.material(shade(i.color,.6)),'cap grip',0,y+offset,.04);
}

function button(b:Builder,g:THREE.Group,d:ComponentDefinition,i:Item){
  const res=b.resources,w=d.width,h=d.height;
  const rectangular=d.cutoutShape==='rect'||d.id==='button-tact',lit=d.id.includes('lit'),metal=d.id==='button-metal';
  const rim=res.material(metal?STEEL:DARK,metal?'metal':'plastic');
  const face=res.material(lit?tint(i.color,-.65+i.value*.65):i.color,lit&&i.value>0?'light':metal?'metal':'plastic',i.value*.6);
  const elevation=d.id==='button-arcade'?4.5:d.id==='button-tact'?3.2:3.6;
  if(rectangular){
    b.box(g,w,h,1.4,.05,rim,'button bezel',0,0,.5);
    b.box(g,w-1.6,h-1.6,elevation-1,1.3,face,'button cap',0,0,.65);
    if(lit)b.box(g,w-3,h-3,.12,elevation+.34,res.material(tint(i.color,-.55+i.value*.65),i.value>0?'light':'plastic',i.value*.3),'diffuser',0,0,.35);
  }else{
    const r=w/2;
    b.lathe(g,[[0,.02],[r*.93,.02],[r,.4],[r,1],[r*.88,1.5],[0,1.5]],rim,'round bezel');
    b.lathe(g,[[0,1],[r*.78,1],[r*.78,elevation-.55],[r*.7,elevation],[0,elevation]],face,'button cap');
    if(metal)b.ring(g,r*.76,r*.65,.06,elevation+.02,res.material(shade(i.color,.65),'metal'),'etched ring');
    if(d.id==='button-arcade')b.dome(g,r*.7,.5,elevation,face,'convex cap');
  }
}

function toggle(b:Builder,g:THREE.Group,d:ComponentDefinition,i:Item){
  const res=b.resources,metal=res.material(STEEL,'metal'),dark=res.material(DARK,'plastic');
  if(d.id==='slide-switch'){
    b.box(g,d.width,d.height,1.3,.02,metal,'slide bezel',0,0,.6);
    b.box(g,9,4,.3,1.3,dark,'slide channel',0,0,.5);
    const x=togglePosition(d.id,i.value)*2.25;
    b.box(g,3.8,3.1,2,1.5,res.material(i.color),'slide actuator',x,0,.2);
    for(let n=-1;n<=1;n++)b.box(g,.25,2.6,.15,3.51,res.material(tint(i.color,-.5)),'actuator ridge',x+n*.85,0,.03);
    return;
  }
  b.ring(g,d.width/2,2.7,.45,.02,metal,'toggle washer');
  b.ring(g,d.width*.43,2.7,1.4,.47,metal,'toggle nut',6);
  b.ring(g,3.05,1.75,1.1,1.88,metal,'toggle bushing');
  b.dome(g,1.8,1.5,2.6,dark,'pivot seal');
  const lever=new THREE.Group();lever.name='toggle lever';lever.position.z=2.8;
  const position=togglePosition(d.id,i.value);
  lever.rotation.x=-position*.38;g.add(lever);
  b.lathe(lever,[[0,0],[.8,0],[.8,5.8],[1.05,6.4],[1.05,9],[.7,9.5],[0,9.5]],res.material(i.color,'metal'),'polished lever');
}

function led(b:Builder,g:THREE.Group,d:ComponentDefinition,i:Item){
  const res=b.resources;
  if(d.id==='led-ring'){
    for(const s of ringSegments(12,d.width*.39,i.value)){
      const x=s.x,y=-s.y;
      b.cylinder(g,1.1,.45,0,res.material(DARK),'LED bezel',x,y,24);
      b.dome(g,.9,1,.38,res.material(s.active?i.color:'#3b4341',s.active?'light':'glass',.5),'LED lens',x,y);
    }
  }else{
    const r=d.width/2;
    b.cylinder(g,r,r*.38,0,res.material(shade(i.color,.4),'glass'),'LED flange');
    b.cylinder(g,r*.87,r*.65,r*.32,res.material(i.color,'glass'),'LED barrel');
    b.dome(g,r*.87,r*.87,r*.95,res.material(tint(i.color,-.75+i.value*.75),i.value>0?'light':'glass',i.value*.65),'LED lens');
  }
}

function sevenSegment(b:Builder,g:THREE.Group,w:number,h:number,z:number,value:number,color:string){
  const res=b.resources,active=res.material(color,'light',.7),off=res.material(shade(color,.035),'matte');
  for(const s of sevenSegments(w,h,value))b.box(g,s.width,s.height,.05,z,s.active?active:off,s.id,s.x,-s.y,.06);
}

function display(b:Builder,g:THREE.Group,d:ComponentDefinition,i:Item){
  const w=d.width,h=d.height,res=b.resources,dark=res.material('#070e13','glass');
  b.box(g,w,h,1.5,.01,res.material(DARK),'display bezel',0,0,.6);
  b.box(g,w-1.2,h-1.2,.35,1.4,dark,'display glass',0,0,.35);
  if(d.id==='bargraph'){
    for(let n=0;n<10;n++){
      const active=n<Math.round(i.value*10),color=n>=8?'#ff6649':n>=6?'#eec74b':i.color;
      b.box(g,w*.65,h*.067,.15,1.77,res.material(active?color:'#25322e',active?'light':'matte',.6),'meter segment',0,(n-4.5)*h*.088,.15);
    }
  }else if(d.id==='seven-seg')sevenSegment(b,g,w-2,h-1,1.8,i.value,i.color);
  else if(d.id==='vu-meter'){
    b.box(g,w-3,h-3,.06,1.78,res.material(i.color,'matte'),'meter dial',0,0,.4);
    const dial=vuDial(h,i.value);
    for(const t of dial.ticks)b.line(g,new THREE.Vector3(t.a.x,-dial.cy-t.a.y,1.92),new THREE.Vector3(t.b.x,-dial.cy-t.b.y,1.92),.07,res.material(t.red?'#b33b2e':'#27322f','matte'),'meter graduation');
    b.line(g,new THREE.Vector3(0,-dial.cy,2.1),new THREE.Vector3(dial.needle.x,-dial.cy-dial.needle.y,2.1),.13,res.material('#b73c2d','matte'),'meter needle');
    b.cylinder(g,1.3,.25,2.12,res.material(DARK),'meter pivot',0,-dial.cy,32);
    for(const points of VU_LETTERS)for(let n=1;n<points.length;n++)b.line(g,new THREE.Vector3(points[n-1][0],-points[n-1][1],1.92),new THREE.Vector3(points[n][0],-points[n][1],1.92),.09,res.material('#27322f','matte'),'VU lettering');
  }else{
    const phosphor=res.material(i.color,'light',.6),dim=res.material(shade(i.color,.22),'light',.05);
    // The display is geometric, not a downloaded image or font-dependent canvas texture.
    for(let n=0;n<5;n++)b.box(g,w*.1,.38,.04,1.79,dim,'display header',-w*.31+n*w*.105,h*.3,.02);
    b.box(g,w*.78,.12,.04,1.79,dim,'display divider',0,h*.18,.02);
    const curve=oledTrace(w,h,i.value).map(p=>new THREE.Vector3(p.x,-p.y,1.81));
    const geometry=res.geometry(`wave:${w}:${h}:${i.value}`,()=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curve),80,.1,4,false));
    b.mesh(g,geometry,phosphor,'OLED trace');
  }
}

function connector(b:Builder,g:THREE.Group,d:ComponentDefinition,i:Item){
  const res=b.resources,metal=res.material(d.id==='usb-c'?i.color:STEEL,'metal'),dark=res.material(d.id==='usb-c'?DARK:i.color,'rubber');
  if(d.id==='midi-din'){
    b.ring(g,d.width/2,7,.8,0,metal,'DIN flange');
    b.ring(g,7.7,6.7,2,.8,metal,'DIN socket shell');
    b.cylinder(g,6.7,1,1.2,dark,'DIN insulator');
    for(const p of dinContacts()){
      const hole=new THREE.Group();hole.name='DIN contact recess';hole.position.set(p.x,-p.y,2.22);g.add(hole);
      b.ring(hole,.78,.52,.1,0,metal,'DIN contact');
      b.cylinder(hole,.51,.03,.01,res.material('#030507','matte'),'DIN pin well',0,0,24);
    }
    b.box(g,1.4,1.8,.02,2.21,res.material('#030507','matte'),'DIN key',0,5.8,.1);
    return;
  }
  const w=d.width,h=d.height;
  b.frame(g,w,h,w-1.2,h-1,d.id==='usb-c'?h/2:.3,d.id==='usb-c'?(h-1)/2:.2,1.2,metal,'connector shell');
  b.plate(g,w-.5,h-.5,d.id==='usb-c'?(h-.5)/2:.2,.12,.02,dark,'connector opening');
  if(d.id==='usb-c'){
    b.box(g,6.6,.65,.4,.55,res.material('#303236'),'USB-C tongue',0,0,.15);
    for(const y of [-.22,.22])for(let n=0;n<12;n++)b.box(g,.18,.14,.04,.96,res.material(GOLD,'metal'),'USB-C contact',(n-5.5)*.45,y,.01);
  }else{
    b.box(g,w-3,.5,.12,.65,res.material(STEEL,'metal'),'card guide',0,-.65,.05);
    for(let n=0;n<8;n++)b.box(g,.35,.65,.08,.82,res.material(GOLD,'metal'),'SD contact',(n-3.5)*1.1,.4,.02);
  }
}

function touch(b:Builder,g:THREE.Group,d:ComponentDefinition,i:Item){
  const res=b.resources,dark=res.material(DARK,'rubber');
  if(d.id==='joystick'){
    const r=d.width/2;
    b.lathe(g,[[0,0],[r*.94,0],[r,.4],[r,1],[r*.86,1.6],[0,1.6]],dark,'joystick flange');
    for(let n=0;n<4;n++)b.lathe(g,[[0,1.6+n*.7],[r*(.65-n*.1),1.6+n*.7],[r*(.62-n*.1),2.1+n*.7],[0,2.1+n*.7]],dark,'rubber gaiter');
    const stick=new THREE.Group();stick.name='joystick actuator';stick.position.z=3.5;stick.rotation.y=(i.value-.5)*.5;g.add(stick);
    b.cylinder(stick,1.7,8,0,res.material(STEEL,'metal'),'joystick shaft');
    b.cylinder(stick,4.6,2,7,res.material(i.color),'joystick grip');
    b.dome(stick,4.6,3,9,res.material(i.color),'joystick crown');
  }else{
    b.box(g,d.width,d.height,.9,0,dark,'touch surround',0,0,.45);
    b.box(g,d.width-1.5,d.height-1.5,.1,.91,res.material('#2d363a','matte'),'touch surface',0,0,.04);
    for(let n=0;n<15;n++)b.box(g,d.width*.48,.16,.04,1.03,res.material(shade(i.color,.23),'matte'),'touch graduation',0,(n-7)*d.height*.057,.01);
    b.box(g,d.width*.66,.9,.07,1.08,res.material(i.color,'light',.35),'touch position',0,(i.value-.5)*(d.height-5),.1);
  }
}

/** Local XY is the catalogue footprint; positive Z is the front face. No fitting/scaling. */
export function createHardware(d:ComponentDefinition,i:Item,accent:string,resources:HardwareResources):HardwareModel{
  const front=new THREE.Group();front.name=d.id;front.userData.componentId=d.id;
  const b=new Builder(resources);
  if(i.hidden||d.category==='Graphics')return{front};
  i={...i,value:previewValue(i.value)};
  switch(d.renderer){
    case 'knob':knob(b,front,d,i,accent);break;
    case 'jack':jack(b,front,d,i);break;
    case 'slider':slider(b,front,d,i);break;
    case 'button':button(b,front,d,i);break;
    case 'toggle':toggle(b,front,d,i);break;
    case 'led':led(b,front,d,i);break;
    case 'display':display(b,front,d,i);break;
    case 'connector':connector(b,front,d,i);break;
    case 'touch':touch(b,front,d,i);break;
    // Cutouts are already subtracted from the panel; never fill them with a dummy solid.
    case 'hole':case 'shape':break;
  }
  return{front};
}

/** Static inspection details are batched by material, keeping dense panels inexpensive to orbit. */
export function batchHardware(source:THREE.Group):THREE.Group{
  source.updateMatrixWorld(true);
  const groups=new Map<THREE.Material,THREE.BufferGeometry[]>(),result=new THREE.Group();result.name=source.name;
  source.traverse(node=>{
    if(!(node instanceof THREE.Mesh)||Array.isArray(node.material))return;
    const geometry=node.geometry.index?node.geometry.toNonIndexed():node.geometry.clone();
    geometry.applyMatrix4(node.matrixWorld);
    const list=groups.get(node.material)??[];list.push(geometry);groups.set(node.material,list);
  });
  for(const [material,geometries] of groups){
    const merged=mergeGeometries(geometries,false);
    geometries.forEach(g=>g.dispose());
    if(!merged)throw new Error('Could not assemble 3D hardware');
    const mesh=new THREE.Mesh(merged,material);mesh.castShadow=true;mesh.receiveShadow=false;result.add(mesh);
  }
  return result;
}
