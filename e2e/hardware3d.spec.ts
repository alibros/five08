import {expect,test,type Page} from '@playwright/test';
import {catalog} from '../src/catalog';
import {emptyProject,type Item} from '../src/model';

async function pixels(page:Page){
  return page.locator('#inspection-scene canvas').evaluate(canvas=>{
    const small=document.createElement('canvas');small.width=180;small.height=140;
    const context=small.getContext('2d')!;context.drawImage(canvas as HTMLCanvasElement,0,0,180,140);
    const data=context.getImageData(0,0,180,140).data;
    let visible=0,hash=0;
    for(let n=0;n<data.length;n+=4){
      if(Math.abs(data[n]-data[0])+Math.abs(data[n+1]-data[1])+Math.abs(data[n+2]-data[2])>25)visible++;
      hash=(hash*31+data[n]+data[n+1]+data[n+2])>>>0;
    }
    return{visible,hash};
  });
}

function fixture(family:'rotary'|'controls'|'indicators'){
  const p=emptyProject();p.name=`3D ${family}`;p.panel.hp=44;
  const parts=catalog.filter(d=>family==='rotary'?d.renderer==='knob':family==='controls'?['slider','button','toggle','touch'].includes(d.renderer):['display','connector','jack','led'].includes(d.renderer));
  p.items=parts.map((d,n):Item=>{
    let x=20+(n%6)*36,y=18+Math.floor(n/6)*31;
    if(family==='controls'){
      if(n<6){x=16+n*36;y=35;}else{x=12+((n-6)%10)*22;y=89+Math.floor((n-6)/10)*27;}
    }
    return{id:d.id,componentId:d.id,x,y,rotation:0,label:d.label,color:d.color,width:d.width,height:d.height,value:.6,hidden:false,locked:false,role:'none',identifier:''};
  });
  return p;
}

for(const family of ['rotary','controls','indicators'] as const)test(`3D renders the complete ${family} family and exposes every view`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.setViewportSize({width:1280,height:900});await page.goto('/app/');
  await page.locator('#file-input').setInputFiles({name:'catalog.panel.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture(family)))});
  await expect(page.locator('#project-name')).toHaveValue(`3D ${family}`);
  await page.click('#inspect-3d');await expect(page.locator('#inspection-scene')).toHaveAttribute('data-ready','true');
  await expect(page.locator('#inspect-rear')).not.toBeChecked();
  await expect.poll(async()=>(await pixels(page)).visible).toBeGreaterThan(800);
  await page.click('[data-camera="front"]');const front=await pixels(page);
  await page.uncheck('#inspect-hardware');await expect.poll(async()=>(await pixels(page)).hash).not.toBe(front.hash);
  await page.check('#inspect-hardware');
  await page.click('[data-camera="side"]');await expect.poll(async()=>(await pixels(page)).visible).toBeGreaterThan(200);
  const side=await pixels(page);expect(side.hash).not.toBe(front.hash);
  await page.click('[data-camera="rear"]');await expect.poll(async()=>(await pixels(page)).hash).not.toBe(side.hash);
  const rear=await pixels(page);
  // Rear openings must not be covered by the front hardware or invented connector backs.
  await page.uncheck('#inspect-hardware');
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  expect((await pixels(page)).hash).toBe(rear.hash);
  await page.check('#inspect-hardware');
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  expect((await pixels(page)).hash).toBe(rear.hash);
  await page.check('#inspect-rear');await expect.poll(async()=>(await pixels(page)).hash).not.toBe(rear.hash);
  await page.setViewportSize({width:390,height:844});await page.click('[data-camera="iso"]');
  await expect.poll(async()=>(await pixels(page)).visible).toBeGreaterThan(800);
  expect(await page.locator('.inspection-modal').evaluate(el=>el.scrollWidth<=innerWidth)).toBe(true);
  await page.click('#close-inspection');await page.setViewportSize({width:1280,height:900});await page.click('#inspect-3d');
  await expect(page.locator('#inspection-scene')).toHaveAttribute('data-ready','true');
  await expect(page.locator('#inspection-scene canvas')).toHaveCount(1);
  await page.click('#close-inspection');expect(errors).toEqual([]);
});

test('display and switch preview states are editable and survive reopening 3D',async({page})=>{
  await page.goto('/app/');await page.click('#new-project');await page.click('[data-template="blank"]');
  for(const id of ['toggle-3','button-lit','vu-meter']){
    await page.click(`[data-component="${id}"]`);
    const input=page.locator('#field-value');await expect(input).toBeVisible();
    await input.fill('0.2');
    await page.click('#inspect-3d');await expect(page.locator('#inspection-scene')).toHaveAttribute('data-ready','true');await page.click('#close-inspection');
    await expect(page.locator('#field-value')).toHaveValue('0.2');
  }
});
