import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {cutoutShapes,mountingShapes,rotatePoint,type Shape} from './geometry';
import {DEFAULT_RULES,PANEL_H,panelWidth,type ComponentDefinition,type Project} from './model';

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

export function createInspection(host:HTMLElement,p:Project,definitions:Map<string,ComponentDefinition>,artwork:string){
  const w=panelWidth(p.panel),h=PANEL_H,t=p.panel.thickness;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#e2e6e4');
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  host.append(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','3D panel inspection');
  const camera=new THREE.PerspectiveCamera(32,1,.1,3000);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=false;controls.minDistance=20;controls.maxDistance=1800;
  const root=new THREE.Group();scene.add(root);
  scene.add(new THREE.HemisphereLight('#ffffff','#6e7c77',2.8));
  const key=new THREE.DirectionalLight('#ffffff',3.3);key.position.set(-90,120,180);scene.add(key);
  const rim=new THREE.DirectionalLight('#a8cbd3',2);rim.position.set(100,30,-150);scene.add(rim);
  const shape=new THREE.Shape([new THREE.Vector2(-w/2,-h/2),new THREE.Vector2(w/2,-h/2),new THREE.Vector2(w/2,h/2),new THREE.Vector2(-w/2,h/2)]);
  for(const s of [...mountingShapes(p.panel),...cutoutShapes(p.items,definitions)]){
    const points=contour(s).map(v=>new THREE.Vector2(v.x-w/2,h/2-v.y));
    shape.holes.push(new THREE.Path(points));
  }
  const panelGeometry=new THREE.ExtrudeGeometry(shape,{depth:t,bevelEnabled:false,curveSegments:48});
  panelGeometry.translate(0,0,-t);
  const metal=new THREE.MeshStandardMaterial({color:p.panelColor,metalness:.65,roughness:.38});
  root.add(new THREE.Mesh(panelGeometry,metal));
  const edges=new THREE.LineSegments(new THREE.EdgesGeometry(panelGeometry,25),new THREE.LineBasicMaterial({color:'#53615b',transparent:true,opacity:.35}));
  root.add(edges);
  const hardware=new THREE.Group(),rear=new THREE.Group();root.add(hardware,rear);
  for(const i of p.items.filter(i=>!i.hidden)){
    const d=definitions.get(i.componentId);
    if(!d||d.category==='Graphics'||d.renderer==='hole')continue;
    const part=new THREE.Group();part.position.set(i.x-w/2,h/2-i.y,0);part.rotation.z=-i.rotation*Math.PI/180;
    // Front elevations are illustrative: the catalogue specifies width/height and rear depth, not cap height.
    const round=['knob','jack','button','led'].includes(d.renderer);
    const elevation=d.renderer==='knob'?10:d.renderer==='jack'?3:d.renderer==='led'?2:4;
    const geometry=round?new THREE.CylinderGeometry(Math.min(d.width,d.height)/2,Math.min(d.width,d.height)/2,elevation,48):new THREE.BoxGeometry(d.width,d.height,elevation);
    if(round)geometry.rotateX(Math.PI/2);
    const material=new THREE.MeshStandardMaterial({color:d.renderer==='jack'?'#b1b4b0':i.color,roughness:.35,metalness:d.renderer==='jack'?.3:.15});
    const mesh=new THREE.Mesh(geometry,material);mesh.position.z=elevation/2;part.add(mesh);
    if(d.renderer==='knob'){
      const mark=new THREE.Mesh(new THREE.BoxGeometry(.65,d.height*.29,.12),new THREE.MeshBasicMaterial({color:p.accentColor}));
      const angle=-(i.value*270+135)*Math.PI/180;
      mark.position.set(Math.cos(angle)*d.width*.24,Math.sin(angle)*d.height*.24,elevation+.1);mark.rotation.z=angle-Math.PI/2;part.add(mark);
    }
    if(d.renderer==='jack'){
      const hole=new THREE.Mesh(new THREE.CircleGeometry(1.75,32),new THREE.MeshBasicMaterial({color:'#111713'}));
      hole.position.z=elevation+.02;part.add(hole);
    }
    hardware.add(part);
    if(d.depth){
      const body=new THREE.Mesh(new THREE.BoxGeometry(Math.max(d.width,d.keepout??0),Math.max(d.height,d.keepout??0),d.depth),new THREE.MeshStandardMaterial({color:d.depth>(p.rules??DEFAULT_RULES).rearDepth?'#d8452d':'#218e83',transparent:true,opacity:.26,depthWrite:false}));
      body.position.set(i.x-w/2,h/2-i.y,-t-d.depth/2);body.rotation.z=-i.rotation*Math.PI/180;rear.add(body);
      const border=new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry),new THREE.LineBasicMaterial({color:'#26877c',transparent:true,opacity:.55}));
      border.position.copy(body.position);border.rotation.copy(body.rotation);rear.add(border);
    }
  }
  let disposed=false;
  const render=()=>{if(!disposed)renderer.render(scene,camera);};
  controls.addEventListener('change',render);
  const resize=()=>{
    const box=host.getBoundingClientRect();if(!box.width||!box.height)return;
    renderer.setSize(box.width,box.height);camera.aspect=box.width/box.height;camera.updateProjectionMatrix();render();
  };
  const observer=new ResizeObserver(resize);observer.observe(host);
  const setView=(view:'front'|'rear'|'iso')=>{
    const aspect=host.clientWidth/Math.max(1,host.clientHeight);
    const distance=Math.max(h,w/Math.max(.3,aspect))/.48;
    camera.position.set(view==='iso'?distance*.52:0,view==='iso'?distance*.23:0,view==='rear'?-distance:distance);
    controls.target.set(0,0,-t/2);controls.update();render();
  };
  // A transparent artwork layer, kept separate from the metal and the openings.
  const texture=new THREE.Texture();
  const img=new Image();
  img.onload=()=>{
    if(disposed)return;
    texture.image=img;texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;
    const face=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));
    const uv=face.geometry.attributes.uv,positions=face.geometry.attributes.position;
    for(let n=0;n<uv.count;n++)uv.setXY(n,(positions.getX(n)+w/2)/w,(positions.getY(n)+h/2)/h);
    face.position.z=.025;root.add(face);render();
  };
  img.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(artwork)}`;
  resize();setView('iso');
  return{
    setView,
    setHardware:(visible:boolean)=>{hardware.visible=visible;render();},
    setRear:(visible:boolean)=>{rear.visible=visible;render();},
    dispose:()=>{
      disposed=true;observer.disconnect();controls.dispose();img.onload=null;texture.dispose();
      root.traverse(node=>{
        if(node instanceof THREE.Mesh||node instanceof THREE.LineSegments){
          node.geometry.dispose();const materials=Array.isArray(node.material)?node.material:[node.material];materials.forEach(m=>m.dispose());
        }
      });
      renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
    },
  };
}
