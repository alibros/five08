import {describe,expect,it} from 'vitest';
import {catalog,catalogMap} from './catalog';
import {emptyProject,type Item} from './model';
import {arrowSvg,componentSvg,cutoutSvg,panelFinishSurface,panelViewTransform,scaleSvg,templateSvg,textSvg,thumbnailSvg} from './svg';

describe('rear projection',()=>{
  const p=emptyProject();
  const item=(id:string):Item=>{const d=catalogMap.get(id)!;return{id,componentId:id,x:18,y:27,rotation:30,label:'FRONT',color:d.color,width:d.width,height:d.height,value:.5,locked:false,hidden:false,role:'none',identifier:''};};

  it('mirrors only the rear viewing transform',()=>{
    expect(panelViewTransform(101.2,'rear')).toBe('translate(101.2 0) scale(-1 1)');
    expect(panelViewTransform(101.2,'design')).toBe('');
    expect(panelViewTransform(101.2,'cutout')).toBe('');
  });

  it('shows actual openings and readable depth annotations without modifying the item',()=>{
    const i=item('jack-mono'),before=structuredClone(i);
    const rear=componentSvg(i,catalogMap.get(i.componentId)!,p,false,'rear');
    expect(rear).toContain('class="cut"');
    expect(rear).toContain('class="rear-keepout"');
    expect(rear).toContain('transform="rotate(-30) scale(-1 1)"');
    expect(rear).not.toContain('component-legend');
    expect(i).toEqual(before);
  });

  it('omits front artwork, including parts without rear keepouts',()=>{
    for(const d of catalog.filter(d=>d.category==='Graphics'))expect(componentSvg(item(d.id),d,p,false,'rear')).toBe('');
    const hole=item('mount-hole');
    expect(componentSvg(hole,catalogMap.get(hole.componentId)!,p,false,'rear')).toContain('class="cut"');
  });
});

describe('machining export',()=>it('uses explicit geometry without visual texture',()=>{const p=emptyProject();p.items=[{id:'a',componentId:'button-lit-rect',x:20,y:30,rotation:0,label:'',color:'#ffffff',width:18,height:10,value:.5,locked:false,hidden:false,role:'none',identifier:''}];const svg=cutoutSvg(p,catalogMap);expect(svg).toContain('width="14.4"');expect(svg).toContain('height="8"');expect(svg).not.toContain('panel-surface');expect(svg).not.toContain('<text');}));
describe('custom surface',()=>it('embeds a PNG beneath the panel details',()=>{const p=emptyProject();p.panelImage='data:image/png;base64,aGVsbG8=';const svg=panelFinishSurface(p,60);expect(svg).toContain('class="panel-custom-image"');expect(svg).toContain('preserveAspectRatio="xMidYMid slice"');}));
describe('PNG artwork',()=>it('renders a transparent image as a resizable component',()=>{const p=emptyProject(),d=catalogMap.get('png-image')!,i={id:'image',componentId:d.id,x:20,y:20,rotation:0,label:'overlay',color:d.color,width:30,height:18,value:.5,locked:false,hidden:false,role:'none' as const,identifier:'',imageData:'data:image/png;base64,aGVsbG8='};const svg=componentSvg(i,d,p,false,'design');expect(svg).toContain('<image');expect(svg).toContain('width="30"');expect(svg).toContain('height="18"');expect(svg).toContain('data:image/png');}));

describe('1:1 print template',()=>{
  it('is sized in millimetres and carries a 100 mm reference bar',()=>{
    const p=emptyProject();
    p.items=[{id:'a',componentId:'jack-mono',x:20,y:30,rotation:0,label:'IN',color:'#111111',width:9,height:9,value:.5,locked:false,hidden:false,role:'input',identifier:''}];
    const svg=templateSvg(p,catalogMap);
    expect(svg).toContain('mm"');
    expect(svg).toContain('must measure exactly 100 mm');
    expect(svg).toContain('M0 144.5H100');
  });

  it('marks every hole centre so it can be punched',()=>{
    const p=emptyProject();
    p.panel.mounting='none';
    p.items=[{id:'a',componentId:'jack-mono',x:20,y:30,rotation:0,label:'',color:'#111111',width:9,height:9,value:.5,locked:false,hidden:false,role:'input',identifier:''}];
    const svg=templateSvg(p,catalogMap);
    // jack-mono cuts Ø6.2, so the mark reaches 1.2 mm past the rim
    expect(svg).toContain('M15.7 30H24.3M20 25.7V34.3');
  });

  it('leaves artwork out of the template',()=>{
    const p=emptyProject();
    p.items=[{id:'a',componentId:'text-label',x:20,y:30,rotation:0,label:'CUTOFF',color:'#111111',width:20,height:4,value:.5,locked:false,hidden:false,role:'none',identifier:''}];
    expect(templateSvg(p,catalogMap)).not.toContain('CUTOFF');
  });
});

describe('panel legends',()=>{
  const label=(over:Partial<Item>={}):Item=>({id:'t',componentId:'text-label',x:20,y:30,rotation:0,label:'CUTOFF',color:'#111111',width:20,height:4,value:.5,locked:false,hidden:false,role:'none',identifier:'',...over});

  it('lays a multi-line legend out around its centre',()=>{
    const svg=textSvg(label({label:'V/OCT\nIN'}),'#000');
    expect(svg).toContain('<tspan x="0" y="-2.500">V/OCT</tspan>');
    expect(svg).toContain('<tspan x="0" y="2.500">IN</tspan>');
  });

  it('anchors to the edge it is aligned to',()=>{
    expect(textSvg(label({align:'start'}),'#000')).toContain('text-anchor="start"');
    expect(textSvg(label({align:'start'}),'#000')).toContain('x="-10"');
    expect(textSvg(label({align:'end'}),'#000')).toContain('x="10"');
  });

  it('names a font that will exist on a fabricator’s machine',()=>{
    expect(textSvg(label({font:'condensed'}),'#000')).toContain('Arial Narrow');
    expect(textSvg(label(),'#000')).not.toContain('system-ui');
  });

  it('escapes text rather than letting it become markup',()=>
    expect(textSvg(label({label:'<script>'}),'#000')).toContain('&lt;script&gt;'));

  it('draws a knob scale as a 270 degree arc of ticks',()=>{
    const ticks=scaleSvg(label({componentId:'knob-scale',width:26,height:26,count:11}),'#000').match(/<line/g);
    expect(ticks).toHaveLength(11);
    expect(scaleSvg(label({count:5}),'#000').match(/<line/g)).toHaveLength(5);
  });

  it('points the arrow along its own width so rotation aims it',()=>{
    const svg=arrowSvg(label({width:14,height:2.6}),'#000');
    expect(svg).toContain('M-7 0H');
    expect(svg).toContain('<path d="M7 0L');
  });
});

describe('library thumbnails',()=>{
  const project=emptyProject();

  it('never lets a preview pass as a panel item',()=>{
    // A thumbnail carrying class="panel-item" and a data-id makes document-wide
    // lookups find a picture in the sidebar instead of the part on the panel.
    const svg=thumbnailSvg(catalogMap.get('knob-medium')!,project);
    expect(svg).not.toContain('panel-item');
    expect(svg).not.toContain('data-id');
    expect(svg).toContain('part-preview');
  });

  it('draws the component itself, not a second impression of it',()=>{
    // The guarantee: whatever the panel renderer produces for a part is exactly
    // what the library shows. If these ever diverge, someone has reintroduced a
    // parallel set of drawings.
    for(const d of catalog){
      const item:Item={id:`thumb-${d.id}`,componentId:d.id,x:0,y:0,rotation:0,
        label:d.renderer==='text'?d.label||'Aa':'',color:d.color,width:d.width,height:d.height,
        value:.62,locked:false,hidden:false,role:'none',identifier:''};
      const span=Number(thumbnailSvg(d,project).match(/viewBox="0 0 ([\d.]+)/)![1]);
      const body=componentSvg({...item,x:span/2,y:span/2},d,project,false,'design','preview');
      const inner=body.slice(body.indexOf('>')+1,body.lastIndexOf('</g>'));
      expect(thumbnailSvg(d,project),`${d.id} thumbnail differs from its panel rendering`).toContain(inner);
    }
  });

  it('centres every part in a square box with room around it',()=>{
    for(const d of catalog){
      const svg=thumbnailSvg(d,project);
      const [,,w,h]=svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)!.map(Number) as unknown as number[];
      const box=Number(svg.match(/viewBox="0 0 ([\d.]+)/)![1]);
      expect(box,`${d.id}`).toBeGreaterThan(Math.max(d.width,d.height));
      expect(svg,`${d.id}`).toContain(`translate(${box/2} ${box/2})`);
      void w;void h;
    }
  });

  it('uses contained lens highlights without external filters or clipped halos',()=>{
    for(const id of ['led-3mm','led-ring','encoder-ring','knob-medium']){
      const d=catalogMap.get(id)!,svg=thumbnailSvg(d,project);
      expect(svg).not.toContain('url(#');
      expect(Number(svg.match(/viewBox="0 0 ([\d.]+)/)![1])).toBeCloseTo(d.width*1.18,1);
    }
  });

  it('shows words only for a text part',()=>{
    expect(thumbnailSvg(catalogMap.get('text-label')!,project)).toContain('<text');
    expect(thumbnailSvg(catalogMap.get('knob-medium')!,project)).not.toContain('<text');
  });

  it('takes a colour override so the inspector can preview the real item',()=>
    expect(thumbnailSvg(catalogMap.get('knob-medium')!,project,'#abcdef')).toContain('#abcdef'));

  it('gives monochrome previews contrast without recolouring the part',()=>{
    const text=catalogMap.get('text-label')!,hole=catalogMap.get('mount-hole')!;
    const light=thumbnailSvg(text,project,'#ffffff'),dark=thumbnailSvg(text,project,'#15191c');
    expect(light).toContain('fill="#262b2d"');expect(light).toContain('fill="#ffffff"');
    expect(dark).toContain('fill="#dbe0e2"');expect(dark).toContain('fill="#15191c"');
    expect(thumbnailSvg(hole,{...project,inkColor:'#ffffff'})).toContain('fill="#262b2d"');
    expect(thumbnailSvg(catalogMap.get('midi-din')!,project)).not.toContain('preview-surface');
  });

  it('reflects a part’s real proportions',()=>{
    // A 45 mm fader is tall and thin; a knob is square. The old drawings made
    // both a circle in a 40×40 box.
    const fader=thumbnailSvg(catalogMap.get('slider-45')!,project);
    expect(fader).toContain('data-detail="recessed track"');
    expect(fader).toContain('width="3.2" height="51"');
    expect(Number(fader.match(/viewBox="0 0 ([\d.]+)/)![1])).toBeGreaterThan(60);
    // Small indicators remain recognisable at sidebar size.
    expect(Number(thumbnailSvg(catalogMap.get('led-3mm')!,project).match(/viewBox="0 0 ([\d.]+)/)![1])).toBeLessThan(12);
  });
});
