import {afterEach,describe,expect,it,vi} from 'vitest';
import * as THREE from 'three';
import {catalog,catalogMap} from './catalog';
import type {Item} from './model';
import {batchHardware,createHardware,HardwareResources} from './hardware3d';
import {dinContacts,faderPosition,ringSegments} from './hardware-visual';

let resources=new HardwareResources();
afterEach(()=>{resources.dispose();resources=new HardwareResources();});
const item=(id:string,value=.6):Item=>{
  const d=catalogMap.get(id)!;
  return{id,componentId:id,x:0,y:0,rotation:0,label:'',color:d.color,width:d.width,height:d.height,value,locked:false,hidden:false,role:'none',identifier:''};
};
const model=(id:string,value=.6)=>createHardware(catalogMap.get(id)!,item(id,value),'#ff6046',resources);
const bounds=(g:THREE.Object3D)=>new THREE.Box3().setFromObject(g,true);
const hardware=catalog.filter(d=>d.category!=='Graphics'&&d.renderer!=='hole'&&d.renderer!=='shape');

describe('the complete 3D hardware catalog',()=>{
  for(const d of hardware)it(`${d.id} has a detailed, physical-size front model`,()=>{
    for(const value of [0,.5,1]){
      const {front}=model(d.id,value),box=bounds(front);
      let meshes=0;front.traverse(node=>{if(node instanceof THREE.Mesh)meshes++;});
      expect(meshes).toBeGreaterThan(1);
      for(const coordinate of [box.min.x,box.max.x,box.min.y,box.max.y,box.min.z,box.max.z])expect(Number.isFinite(coordinate)).toBe(true);
      expect(box.min.x).toBeGreaterThanOrEqual(-d.width/2-.01);
      expect(box.max.x).toBeLessThanOrEqual(d.width/2+.01);
      expect(box.min.y).toBeGreaterThanOrEqual(-d.height/2-.01);
      expect(box.max.y).toBeLessThanOrEqual(d.height/2+.01);
      expect(box.max.z).toBeGreaterThan(.1);
    }
  });

  it('does not invent rear housings, solder pins or connector backs',()=>{
    for(const d of hardware){
      const m=model(d.id),box=bounds(m.front);
      expect(Object.keys(m)).toEqual(['front']);
      // Socket wells and fader tracks are shallow recesses in the front, not rear housings.
      expect(box.min.z,d.id).toBeGreaterThanOrEqual(-1.701);
    }
  });

  it('does not invent solids in bare holes, slots, or graphic artwork',()=>{
    for(const d of catalog.filter(d=>d.renderer==='hole'||d.renderer==='shape'||d.category==='Graphics')){
      expect(model(d.id).front.children,d.id).toHaveLength(0);
    }
  });

  it('renders the variant-specific details rather than a generic block',()=>{
    const details:Record<string,string>={
      'knob-concentric':'upper concentric cap','knob-skirted':'skirt graduation','encoder-ring':'halo segment',
      'encoder-metal':'machined top','jack-thonk':'hex retaining nut','banana':'socket well',
      'slider-45':'fader cap','crossfader':'fader index','toggle-3':'polished lever','slide-switch':'slide actuator',
      'button-lit-square':'diffuser','button-arcade':'convex cap','led-ring':'LED lens',
      'bargraph':'meter segment','seven-seg':'digit 0 segment a','oled-096':'OLED trace','vu-meter':'meter needle',
      'usb-c':'USB-C tongue','midi-din':'DIN contact','sd-slot':'SD contact',
      'touch-strip':'touch position','joystick':'joystick crown',
    };
    for(const [id,name] of Object.entries(details))expect(model(id).front.getObjectByName(name),id).toBeDefined();
  });

  it('uses preview values for knob, fader, lever, meter and indicator states',()=>{
    for(const [id,name] of [['knob-medium','pointer'],['slider-30','fader cap'],['crossfader','fader cap'],['slide-switch','slide actuator'],['touch-strip','touch position'],['vu-meter','meter needle']]){
      const low=model(id,0).front.getObjectByName(name)!,high=model(id,1).front.getObjectByName(name)!;
      expect(low.position.toArray(),id).not.toEqual(high.position.toArray());
    }
    expect(model('toggle-3',0).front.getObjectByName('toggle lever')!.rotation.x).not.toBe(model('toggle-3',1).front.getObjectByName('toggle lever')!.rotation.x);
    const lens=(value:number)=>model('led-3mm',value).front.getObjectByName('LED lens') as THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>;
    expect(lens(1).material.emissiveIntensity).toBeGreaterThan(lens(0).material.emissiveIntensity);
  });

  it('ignores stretched item dimensions and never mutates the project',()=>{
    const d=catalogMap.get('jack-mono')!,i={...item(d.id),width:50,height:50},before=structuredClone(i);
    const box=bounds(createHardware(d,i,'#ff6046',resources).front);
    expect(box.getSize(new THREE.Vector3()).x).toBeCloseTo(9,4);expect(i).toEqual(before);
  });

  it('projects DIN contacts, faders and illuminated rings into the shared 2D layout',()=>{
    const contacts=model('midi-din').front.children.filter(n=>n.name==='DIN contact recess');
    expect(contacts).toHaveLength(5);
    dinContacts().forEach((p,n)=>{expect(contacts[n].position.x).toBeCloseTo(p.x);expect(contacts[n].position.y).toBeCloseTo(-p.y);});
    for(const value of [0,.5,1]){
      for(const id of ['slider-20','slider-30','slider-45','crossfader']){
        const cap=model(id,value).front.getObjectByName('fader cap')!,p=faderPosition(catalogMap.get(id)!,value),world=cap.getWorldPosition(new THREE.Vector3());
        expect(world.x).toBeCloseTo(p.x);expect(world.y).toBeCloseTo(-p.y);
      }
      const ring=model('led-ring',value).front.children.filter(n=>n.name==='LED lens');
      ringSegments(12,22*.39,value).forEach((p,n)=>{
        expect(ring[n].position.x).toBeCloseTo(p.x);expect(ring[n].position.y).toBeCloseTo(-p.y);
        expect(((ring[n] as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity>0).toBe(p.active);
      });
    }
  });

  it('recesses USB-C contacts inside a capsule-shaped metal shell',()=>{
    const {front}=model('usb-c');
    const contacts=front.children.filter(n=>n.name==='USB-C contact');expect(contacts).toHaveLength(24);
    expect(new Set(contacts.map(n=>n.position.y)).size).toBe(2);
    const shell=bounds(front.getObjectByName('connector shell')!);
    const tongue=bounds(front.getObjectByName('USB-C tongue')!);
    expect(tongue.max.z).toBeLessThan(shell.max.z);
    const geometry=(front.getObjectByName('connector shell') as THREE.Mesh).geometry;
    // The silhouette must contain rounded ends, not square corners hidden by a black box.
    for(const name of ['connector shell','connector opening']){
      const points=(front.getObjectByName(name) as THREE.Mesh).geometry.attributes.position;
      for(let n=0;n<points.count;n++){
        const x=Math.abs(points.getX(n)),y=Math.abs(points.getY(n));
        if(x>3)expect((x-3)**2+y*y).toBeLessThanOrEqual(2.5**2+.001);
      }
    }
    expect(geometry.getAttribute('normal').count).toBeGreaterThan(24);
  });

  it('does not illuminate switched-off lenses or a non-illuminated metal button',()=>{
    for(const id of ['led-3mm','led-ring','encoder-ring','button-lit','button-lit-square','button-metal']){
      model(id,0).front.traverse(n=>{
        if(n instanceof THREE.Mesh)expect((n.material as THREE.MeshStandardMaterial).emissiveIntensity,id).toBe(0);
      });
    }
  });

  it('keeps the selector index above its raised grip',()=>{
    const {front}=model('rotary-switch');
    expect(bounds(front.getObjectByName('pointer')!).min.z).toBeGreaterThan(bounds(front.getObjectByName('selector grip')!).max.z);
  });

  it('omits hidden items entirely',()=>{
    const d=catalogMap.get('knob-medium')!,m=createHardware(d,{...item(d.id),hidden:true},'#ff6046',resources);
    expect(m.front.children).toHaveLength(0);
  });

  it('honours component colour without changing the physical footprint',()=>{
    const colours=(front:THREE.Group)=>{
      const values:string[]=[];
      front.traverse(n=>{if(n instanceof THREE.Mesh)values.push((n.material as THREE.MeshStandardMaterial).color.getHexString());});return values;
    };
    for(const d of hardware){
      const original=model(d.id).front,recoloured=createHardware(d,{...item(d.id),color:'#2858ac'},'#ff6046',resources).front;
      expect(colours(recoloured),d.id).not.toEqual(colours(original));
      expect(bounds(recoloured)).toEqual(bounds(original));
    }
  });
});

describe('inspection resource use',()=>{
  it('shares repeated geometry and materials, then releases them',()=>{
    const a=model('knob-medium').front.getObjectByName('cap') as THREE.Mesh,b=model('knob-medium').front.getObjectByName('cap') as THREE.Mesh;
    expect(a.geometry).toBe(b.geometry);expect(a.material).toBe(b.material);
    const geometry=vi.spyOn(a.geometry,'dispose'),material=vi.spyOn(a.material as THREE.Material,'dispose');
    resources.dispose();expect(geometry).toHaveBeenCalledOnce();expect(material).toHaveBeenCalledOnce();
  });

  it('batches dense hardware without changing placement or dimensions',()=>{
    const source=new THREE.Group();
    for(let n=0;n<12;n++){
      const {front}=model('knob-medium');
      front.position.set(n*18,40,0);front.rotation.z=Math.PI/6;source.add(front);
    }
    const before=bounds(source),batch=batchHardware(source),after=bounds(batch);
    expect(after.min.distanceTo(before.min)).toBeLessThan(.001);expect(after.max.distanceTo(before.max)).toBeLessThan(.001);
    expect(batch.children.length).toBeLessThan(12);
    batch.traverse(node=>{if(node instanceof THREE.Mesh)node.geometry.dispose();});
  });
});
