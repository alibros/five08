import {describe,expect,it} from 'vitest';
import {catalog,catalogMap} from './catalog';
import {hardwareSvg} from './hardware2d';
import {componentSvg,cutoutSvg,templateSvg} from './svg';
import {emptyProject,type Item} from './model';

const item=(id:string,value=.6):Item=>{
  const d=catalogMap.get(id)!;
  return{id,componentId:id,x:20,y:30,rotation:0,label:'',color:d.color,width:d.width,height:d.height,value,locked:false,hidden:false,role:'none',identifier:''};
};
const hardware=catalog.filter(d=>d.category!=='Graphics'&&!['hole','shape'].includes(d.renderer));
const render=(id:string,value=.6)=>hardwareSvg(catalogMap.get(id)!,item(id,value),'#ff6046')!;
function drawing(id:string,value=.6){
  return new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${render(id,value)}</svg>`,'image/svg+xml');
}

describe('the complete 2D hardware catalog',()=>{
  for(const d of hardware)it(`${d.id} is self-contained, dimension-locked artwork`,()=>{
    for(const value of [0,.5,1]){
      const i=item(d.id,value),before=structuredClone(i),body=hardwareSvg(d,i,'#ff6046')!;
      const doc=drawing(d.id,value);
      expect(doc.querySelector('parsererror')).toBeNull();
      expect(doc.querySelectorAll('[data-detail]').length).toBeGreaterThan(1);
      expect(body).not.toMatch(/NaN|Infinity|undefined|url\(|<image|<text| id=/);
      expect(hardwareSvg(d,{...i,width:90,height:90},'#ff6046')).toBe(body);
      expect(i).toEqual(before);
      const light=emptyProject(),dark={...light,inkColor:'#ffffff',panelColor:'#111111'};
      expect(componentSvg(i,d,light,false,'design')).toBe(componentSvg(i,d,dark,false,'design'));
    }
  });

  it('does not mistake cutouts or graphics for physical hardware',()=>{
    for(const d of catalog.filter(d=>!hardware.includes(d)))expect(hardwareSvg(d,item(d.id),'#ff6046')).toBeNull();
  });

  it('honours the component colour for every hardware family',()=>{
    for(const d of hardware){
      expect(hardwareSvg(d,{...item(d.id),color:'#2858ac'},'#ff6046'),d.id).not.toBe(render(d.id));
    }
  });

  it('gives DIN five female contact wells and USB-C a tongue with two contact rows',()=>{
    const din=drawing('midi-din'),usb=drawing('usb-c');
    expect(din.querySelectorAll('[data-detail="DIN contact"]')).toHaveLength(5);
    expect(din.querySelectorAll('[data-detail="DIN key"]')).toHaveLength(1);
    const contacts=[...din.querySelectorAll('[data-detail="DIN contact"] circle:last-child')];
    expect(contacts.map(c=>Number(c.getAttribute('cy')))).toEqual([0,3.182,4.5,3.182,0]);
    expect(usb.querySelectorAll('[data-detail="USB-C contact"]')).toHaveLength(24);
    expect(usb.querySelectorAll('[data-detail="USB-C tongue"]')).toHaveLength(1);
    expect(usb.querySelector('[data-detail="connector opening"] rect')?.getAttribute('rx')).toBe('2');
    expect(drawing('midi-trs').querySelector('[data-detail="DIN contact"]')).toBeNull();
  });

  it('makes all stateful renderers respond to preview values',()=>{
    for(const d of hardware.filter(d=>['knob','slider','toggle','led','display','touch'].includes(d.renderer)||d.id.includes('lit'))){
      expect(render(d.id,0),d.id).not.toBe(render(d.id,1));
      expect(render(d.id,-1),d.id).toBe(render(d.id,0));
      expect(render(d.id,2),d.id).toBe(render(d.id,1));
      expect(render(d.id,NaN),d.id).toBe(render(d.id,.5));
    }
  });

  it('switches illuminated rings fully off and fully on',()=>{
    for(const [id,count] of [['led-ring',12],['encoder-ring',24],['bargraph',10]] as const){
      expect(drawing(id,0).querySelectorAll('[data-active="true"]')).toHaveLength(0);
      expect(drawing(id,1).querySelectorAll('[data-active="true"]')).toHaveLength(count);
    }
  });

  it('keeps front visual details out of rear views and manufacturing exports',()=>{
    const p=emptyProject();p.panel.mounting='none';p.items=hardware.map(d=>item(d.id));
    for(const i of p.items){
      const d=catalogMap.get(i.componentId)!;
      expect(componentSvg(i,d,p,false,'rear')).not.toContain('data-detail');
      expect(componentSvg(i,d,p,false,'cutout')).not.toContain('data-detail');
      const node=new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${componentSvg(i,d,p,false,'design')}</svg>`,'image/svg+xml');
      for(const detail of node.querySelectorAll('[data-detail]'))expect(detail.closest('.component-hardware')).not.toBeNull();
    }
    for(const svg of [cutoutSvg(p,catalogMap),templateSvg(p,catalogMap)])expect(svg).not.toContain('data-detail');
    const cuts=cutoutSvg(p,catalogMap);p.items=p.items.map(i=>({...i,value:1,color:'#00ff00'}));
    expect(cutoutSvg(p,catalogMap)).toBe(cuts);
  });
});
