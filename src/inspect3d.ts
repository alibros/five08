import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {cutoutShapes,mountingShapes,rotatePoint,type Shape} from './geometry';
import {DEFAULT_RULES,PANEL_H,panelWidth,type ComponentDefinition,type Project} from './model';
import {batchHardware,createHardware,HardwareResources} from './hardware3d';

/** Tessellation is for the on-screen mesh only; machining exports keep analytic curves. */
export function contour(s:Shape):Array<{x:number;y:number}>{
  if(s.kind==='circle')return Array.from({length:64},(_,n)=>({x:s.cx+s.r*Math.cos(n*Math.PI/32),y:s.cy+s.r*Math.sin(n*Math.PI/32)}));
  if(s.kind==='rect')return[[-s.w/2,-s.h/2],[s.w/2,-s.h/2],[s.w/2,s.h/2],[-s.w/2,s.h/2]].map(([x,y])=>rotatePoint(s.cx+x,s.cy+y,s.cx,s.cy,s.rotation));
  const r=Math.min(s.w,s.h)/2,a=Math.max(s.w,s.h)/2-r,angle=s.rotation+(s.h>s.w?90:0);
  return Array.from({length:66},(_,n)=>{
    const right=n<33,t=(right?-Math.PI/2:Math.PI/2)+(n%33)*Math.PI/32;
    const point=rotatePoint((right?a:-a)+r*Math.cos(t),r*Math.sin(t),0,0,angle);
    return{x:point.x+s.cx,y:point.y+s.cy};
  });
}

export type InspectionView='front'|'rear'|'iso'|'side';
type Insets={left:number;right:number;top:number;bottom:number};
export type InspectionOptions={
  background?:string|null;
  /** Reserve room for HTML overlays without stretching or cropping the model. */
  insets?:(width:number,height:number)=>Insets;
  pageInteraction?:boolean;
};

function panelMaterial(p:Project){
  const finish=p.panel.finish,acrylic=finish.includes('acrylic');
  const brushed=finish.startsWith('brushed'),metal=brushed||finish==='black-anodized'||finish==='walnut';
  const material=new THREE.MeshPhysicalMaterial({color:p.panelColor,
    metalness:metal?(finish==='black-anodized'?.6:.82):.05,
    roughness:brushed?.36:finish==='powder-white'?.72:finish==='walnut'?.62:acrylic?.16:.42,
    clearcoat:acrylic?.6:finish==='fr4-green'?.45:0,
    ...(acrylic?{transparent:true,opacity:finish==='clear-acrylic'?.3:.8,depthWrite:false,side:THREE.DoubleSide}:{}),
  });
  // A tiny deterministic height map gives real light-dependent grain, not baked reflections.
  const data=new Uint8Array(128*128*4);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
    const n=(x+y*128)*4,v=128+Math.round(Math.sin(y*127.1)*22+Math.sin(x*12.7+y*31.3)*5);
    data[n]=data[n+1]=data[n+2]=v;data[n+3]=255;
  }
  const grain=new THREE.DataTexture(data,128,128);grain.wrapS=grain.wrapT=THREE.RepeatWrapping;
  grain.repeat.set(.035,.1);grain.magFilter=grain.minFilter=THREE.LinearFilter;grain.needsUpdate=true;
  if(brushed||finish==='walnut'){material.bumpMap=grain;material.bumpScale=brushed?.035:.015;}
  return{material,grain};
}

export function createInspection(host:HTMLElement,p:Project,definitions:Map<string,ComponentDefinition>,artwork:string,options:InspectionOptions={}){
  const w=panelWidth(p.panel),h=PANEL_H,t=p.panel.thickness;
  const scene=new THREE.Scene();scene.background=options.background===null?null:new THREE.Color(options.background??'#dce1e4');
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:options.background===null,preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  host.append(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','3D panel inspection');
  const camera=new THREE.PerspectiveCamera(32,1,.1,3000);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true;controls.dampingFactor=.16;controls.minDistance=15;controls.maxDistance=2000;
  if(options.pageInteraction){controls.enableZoom=false;controls.enablePan=false;renderer.domElement.style.touchAction='pan-y';}
  const root=new THREE.Group();scene.add(root);
  const environmentScene=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);
  const environment=pmrem.fromScene(environmentScene,.04);scene.environment=environment.texture;scene.environmentIntensity=.75;
  environmentScene.dispose();pmrem.dispose();
  scene.add(new THREE.HemisphereLight('#f4f7ff','#7a818a',.7));
  const key=new THREE.DirectionalLight('#fff6e9',3.1);key.position.set(-70,100,150);key.castShadow=true;
  key.shadow.mapSize.set(2048,2048);key.shadow.normalBias=.075;key.shadow.bias=-.00012;key.shadow.radius=4;
  const span=Math.max(w,h)*.85+30;
  Object.assign(key.shadow.camera,{left:-span,right:span,top:span,bottom:-span,near:1,far:800});
  key.shadow.camera.updateProjectionMatrix();scene.add(key);
  const rim=new THREE.DirectionalLight('#cfdeee',2.2);rim.position.set(100,40,-120);scene.add(rim);
  const shape=new THREE.Shape([new THREE.Vector2(-w/2,-h/2),new THREE.Vector2(w/2,-h/2),new THREE.Vector2(w/2,h/2),new THREE.Vector2(-w/2,h/2)]);
  for(const s of [...mountingShapes(p.panel),...cutoutShapes(p.items,definitions)]){
    const points=contour(s).map(v=>new THREE.Vector2(v.x-w/2,h/2-v.y));
    shape.holes.push(new THREE.Path(points));
  }
  const panelGeometry=new THREE.ExtrudeGeometry(shape,{depth:t,bevelEnabled:false,curveSegments:48});
  panelGeometry.translate(0,0,-t);
  const {material:metal,grain}=panelMaterial(p);
  const panel=new THREE.Mesh(panelGeometry,metal);panel.castShadow=true;panel.receiveShadow=true;root.add(panel);
  const edges=new THREE.LineSegments(new THREE.EdgesGeometry(panelGeometry,25),new THREE.LineBasicMaterial({color:'#72828a',transparent:true,opacity:.2}));
  root.add(edges);
  const resources=new HardwareResources(),hardwareSource=new THREE.Group(),rear=new THREE.Group();
  hardwareSource.name='Hardware';rear.name='Clearance envelopes';rear.visible=false;
  for(const i of p.items.filter(i=>!i.hidden)){
    const d=definitions.get(i.componentId);
    if(!d||d.category==='Graphics')continue;
    const {front}=createHardware(d,i,p.accentColor,resources);
    front.position.set(i.x-w/2,h/2-i.y,0);front.rotation.z=-i.rotation*Math.PI/180;hardwareSource.add(front);
    if(d.depth){
      const color=d.depth>(p.rules??DEFAULT_RULES).rearDepth?'#d8452d':'#218e83';
      const body=new THREE.Mesh(new THREE.BoxGeometry(Math.max(d.width,d.keepout??0),Math.max(d.height,d.keepout??0),d.depth),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.12,depthWrite:false}));
      body.position.set(i.x-w/2,h/2-i.y,-t-d.depth/2);body.rotation.z=-i.rotation*Math.PI/180;rear.add(body);
      const border=new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry),new THREE.LineBasicMaterial({color,transparent:true,opacity:.7}));
      border.position.copy(body.position);border.rotation.copy(body.rotation);rear.add(border);
    }
  }
  const hardware=batchHardware(hardwareSource);hardwareSource.clear();root.add(hardware,rear);
  const sceneSphere=new THREE.Box3().setFromObject(root).getBoundingSphere(new THREE.Sphere());
  // Damping only schedules frames while the camera moves; idle inspections do no GPU work.
  let disposed=false,frame=0,hardwareEnabled=true,preset:InspectionView|undefined;
  const render=()=>{
    if(disposed||frame)return;
    frame=requestAnimationFrame(()=>{
      frame=0;controls.update();
      // From behind, show the actual openings instead of speculative component backs.
      hardware.visible=hardwareEnabled&&camera.position.z>=0;
      // Tight clip planes preserve sub-millimetre detail even on wide panels at a distance.
      const distance=camera.position.distanceTo(sceneSphere.center);
      camera.near=Math.max(.1,distance-sceneSphere.radius*1.2);
      camera.far=Math.max(100,distance+sceneSphere.radius*1.3);camera.updateProjectionMatrix();
      renderer.render(scene,camera);
    });
  };
  controls.addEventListener('change',render);
  const resize=()=>{
    const box=host.getBoundingClientRect();if(!box.width||!box.height)return;
    renderer.setSize(box.width,box.height);camera.aspect=box.width/box.height;camera.updateProjectionMatrix();
    const pad=options.insets?.(box.width,box.height);
    if(pad)camera.setViewOffset(box.width,box.height,-(pad.left-pad.right)/2,-(pad.top-pad.bottom)/2,box.width,box.height);
    if(preset)setView(preset);else render();
  };
  const observer=new ResizeObserver(resize);observer.observe(host);
  const setView=(view:InspectionView)=>{
    preset=view;
    const bounds=new THREE.Box3().setFromObject(root),center=bounds.getCenter(new THREE.Vector3());
    const direction=new THREE.Vector3(view==='iso'?.55:view==='side'?1:0,view==='iso'?.26:0,view==='rear'?-1:view==='side'?.04:1).normalize();
    const right=new THREE.Vector3().crossVectors(camera.up,direction).normalize(),up=new THREE.Vector3().crossVectors(direction,right);
    const pad=options.insets?.(host.clientWidth,host.clientHeight)??{left:0,right:0,top:0,bottom:0};
    const viewFractionX=Math.max(.1,1-(pad.left+pad.right)/host.clientWidth),viewFractionY=Math.max(.1,1-(pad.top+pad.bottom)/host.clientHeight);
    const fullTanV=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),tanV=fullTanV*viewFractionY,tanH=fullTanV*camera.aspect*viewFractionX;
    let distance=20;
    for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
      const corner=new THREE.Vector3(x,y,z).sub(center),depth=corner.dot(direction);
      distance=Math.max(distance,depth+Math.abs(corner.dot(right))/tanH,depth+Math.abs(corner.dot(up))/tanV);
    }
    // Clear residual orbit momentum before choosing a precise camera preset.
    controls.enableDamping=false;controls.update();
    controls.target.copy(center);camera.position.copy(center).addScaledVector(direction,distance*1.13);
    controls.update();controls.enableDamping=true;render();
  };
  controls.addEventListener('start',()=>{preset=undefined;});
  // A transparent artwork layer, kept separate from the metal and the openings.
  const texture=new THREE.Texture();
  const img=new Image();
  img.onload=()=>{
    if(disposed)return;
    texture.image=img;texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;
    texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    const face=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshStandardMaterial({map:texture,transparent:true,depthWrite:false,roughness:.66,metalness:.05}));
    const uv=face.geometry.attributes.uv,positions=face.geometry.attributes.position;
    for(let n=0;n<uv.count;n++)uv.setXY(n,(positions.getX(n)+w/2)/w,(positions.getY(n)+h/2)/h);
    face.position.z=.035;face.receiveShadow=true;root.add(face);host.dataset.ready='true';render();
  };
  img.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(artwork)}`;
  resize();setView('iso');
  return{
    setView,
    setHardware:(visible:boolean)=>{hardwareEnabled=visible;render();},
    setRear:(visible:boolean)=>{rear.visible=visible;render();},
    dispose:()=>{
      disposed=true;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();img.onload=null;texture.dispose();grain.dispose();
      const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
      root.traverse(node=>{
        if(node instanceof THREE.Mesh||node instanceof THREE.LineSegments){
          geometries.add(node.geometry);(Array.isArray(node.material)?node.material:[node.material]).forEach(m=>materials.add(m));
        }
      });
      geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());resources.dispose();environment.dispose();key.shadow.dispose();
      delete host.dataset.ready;
      renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
    },
  };
}
