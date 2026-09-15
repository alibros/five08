import {describe,expect,it} from 'vitest';
import {catalogMap} from './catalog';
import {emptyProject} from './model';
import {componentSvg,cutoutSvg,panelFinishSurface,templateSvg} from './svg';

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
