import {expect,test,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {catalogMap} from '../src/catalog';
import {emptyProject,panelWidth,type Item} from '../src/model';

function fixture(){
  const p=emptyProject();p.name='Asymmetric rear';p.panel.hp=20;p.panel.mounting='diagonal';
  p.items=[['jack-mono',18,32,0],['button-lit-rect',72,80,30],['text-label',25,14,0]].map(([id,x,y,rotation]):Item=>{
    const d=catalogMap.get(String(id))!;
    return{id:d.id,componentId:d.id,x:Number(x),y:Number(y),rotation:Number(rotation),width:d.width,height:d.height,
      color:d.color,label:'FRONT',value:.5,hidden:false,locked:false,role:'none',identifier:''};
  });
  return p;
}

async function open(page:Page){
  await page.setViewportSize({width:1440,height:1000});await page.goto('/app/');
  await page.locator('#file-input').setInputFiles({name:'rear.panel.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture()))});
  await expect(page.locator('#project-name')).toHaveValue('Asymmetric rear');await page.click('#zoom-fit');
}

async function centre(page:Page,id:string){
  return page.locator(`.panel-item[data-id="${id}"]`).evaluate(el=>{
    const p=new DOMPoint(0,0).matrixTransform((el as SVGGraphicsElement).getScreenCTM()!);return{x:p.x,y:p.y};
  });
}

async function exported(page:Page,kind:string){
  await page.click('#export');const waiting=page.waitForEvent('download');await page.click(`[data-export="${kind}"]`);
  const file=await waiting;return readFile((await file.path())!,'utf8');
}

test('rear mirrors the physical drawing, leaves depth text readable and preserves exports',async({page})=>{
  await open(page);
  const original=JSON.parse(await exported(page,'json')),art=await exported(page,'art'),cut=await exported(page,'cut');
  const front=await centre(page,'jack-mono');
  await page.click('#views [data-view="rear"]');
  const rear=await centre(page,'jack-mono'),panel=(await page.locator('#panel-svg').boundingBox())!;
  expect(front.x+rear.x).toBeCloseTo(2*panel.x+panel.width,1);expect(front.y).toBeCloseTo(rear.y,1);
  await expect(page.locator('.panel-item[data-id="text-label"]')).toHaveCount(0);
  await expect(page.locator('#panel-svg .mounting')).not.toHaveCount(0);
  const matrix=await page.locator('[data-id="button-lit-rect"] .rear-depth').evaluate(el=>{
    const m=(el as SVGGraphicsElement).getScreenCTM()!;return{a:m.a,b:m.b,c:m.c,d:m.d};
  });
  expect(matrix.a).toBeGreaterThan(0);expect(matrix.d).toBeGreaterThan(0);expect(matrix.b).toBeCloseTo(0,5);expect(matrix.c).toBeCloseTo(0,5);
  const ticks=await page.locator('#ruler-x text').evaluateAll(nodes=>nodes.filter(n=>!n.classList.contains('out')).map(n=>({x:Number(n.getAttribute('x')),value:Number(n.textContent)})).sort((a,b)=>a.x-b.x));
  expect(ticks.length).toBeGreaterThan(2);
  for(let i=1;i<ticks.length;i++)expect(ticks[i].value).toBeLessThan(ticks[i-1].value);
  expect(JSON.parse(await exported(page,'json'))).toEqual(original);
  expect(await exported(page,'art')).toBe(art);expect(await exported(page,'cut')).toBe(cut);
  await expect(page.locator('#panel-content')).toHaveAttribute('transform',`translate(${panelWidth(fixture().panel)} 0) scale(-1 1)`);
});

test('rear dragging, arrows, selection and drop use the displayed orientation',async({page})=>{
  await open(page);await page.click('#views [data-view="rear"]');
  const p=await centre(page,'jack-mono'),panel=(await page.locator('#panel-svg').boundingBox())!;
  const mm=panel.width/panelWidth(fixture().panel);
  await page.keyboard.down('Alt');await page.mouse.move(p.x,p.y);await page.mouse.down();
  await page.mouse.move(p.x+5*mm,p.y,{steps:5});await page.mouse.up();await page.keyboard.up('Alt');
  await expect(page.locator('#field-x')).toHaveValue('13');
  expect((await centre(page,'jack-mono')).x).toBeCloseTo(p.x+5*mm,1);
  await page.keyboard.press('ArrowRight');await expect(page.locator('#field-x')).toHaveValue('12');
  await page.click('#undo');await expect(page.locator('#field-x')).toHaveValue('13');
  await page.click('#zoom-selection');
  const focused=await centre(page,'jack-mono'),canvas=(await page.locator('#canvas').boundingBox())!;
  expect(focused.x).toBeGreaterThan(canvas.x+10);expect(focused.x).toBeLessThan(canvas.x+canvas.width-10);
  await page.click('#zoom-fit');await page.keyboard.press('Escape');
  const updated=await centre(page,'jack-mono');
  await page.mouse.move(updated.x-8*mm,updated.y-8*mm);await page.mouse.down();
  await page.mouse.move(updated.x+8*mm,updated.y+8*mm,{steps:5});await page.mouse.up();
  await expect(page.locator('#field-x')).toHaveValue('13');
  const stage=(await page.locator('#panel-svg').boundingBox())!;
  const drop={x:stage.x+30*mm,y:stage.y+55*mm};
  await page.locator('#panel-svg').evaluate((svg,drop)=>{
    const transfer=new DataTransfer();transfer.setData('component','led-3mm');
    svg.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,clientX:drop.x,clientY:drop.y,dataTransfer:transfer}));
  },drop);
  await expect(page.locator('#field-x')).toHaveValue(String(Math.round(panelWidth(fixture().panel)-30)));
  await expect(page.locator('#field-y')).toHaveValue('55');
});

test('landing rear preview mirrors the same geometry without front legends',async({page})=>{
  await page.goto('/');
  const before=await page.locator('.panel-drawing').getAttribute('transform');expect(before).toBe('');
  await page.click('[data-view="rear"]');
  await expect(page.locator('.panel-drawing')).toHaveAttribute('transform',/translate\(.+\) scale\(-1 1\)/);
  await expect(page.locator('.panel-drawing .component-legend')).toHaveCount(0);
  await expect(page.locator('.panel-drawing .rear-depth').first()).toBeVisible();
});
