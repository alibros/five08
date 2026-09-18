import {expect,test} from '@playwright/test';
import {catalog} from '../src/catalog';
import {emptyProject,type ComponentDefinition,type Item} from '../src/model';
import {componentSvg,thumbnailSvg} from '../src/svg';

const item=(d:ComponentDefinition,value:number,rotation=0):Item=>({
  id:d.id,componentId:d.id,x:0,y:0,rotation,label:'',color:d.color,width:d.width,height:d.height,value,locked:false,hidden:false,role:'none',identifier:'',
});

test('every physical 2D drawing stays within its footprint at all stops and rotations',async({page})=>{
  await page.goto('/app/');
  const p=emptyProject(),fixtures=catalog.filter(d=>d.category!=='Graphics').flatMap(d=>[0,.5,1].flatMap(value=>[0,37,90].map(rotation=>({
    id:d.id,value,rotation,width:d.width,height:d.height,body:componentSvg(item(d,value,rotation),d,p,false,'design','preview'),
  }))));
  const failures=await page.evaluate(fixtures=>{
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.style.position='absolute';svg.style.left='-10000px';document.body.append(svg);
    const failures=[];
    for(const f of fixtures){
      svg.innerHTML=`<g>${f.body}</g>`;const box=(svg.firstElementChild as SVGGElement).getBBox();
      const angle=f.rotation*Math.PI/180,w=Math.abs(Math.cos(angle))*f.width+Math.abs(Math.sin(angle))*f.height,h=Math.abs(Math.sin(angle))*f.width+Math.abs(Math.cos(angle))*f.height;
      if(box.x < -w/2-.001 || box.y < -h/2-.001 || box.x+box.width > w/2+.001 || box.y+box.height > h/2+.001)failures.push({id:f.id,value:f.value,rotation:f.rotation,box:{x:box.x,y:box.y,width:box.width,height:box.height}});
    }
    svg.remove();return failures;
  },fixtures);
  expect(failures).toEqual([]);
});

test('catalog thumbnails rasterize independently on light and dark backgrounds',async({page})=>{
  await page.goto('/app/');
  const p=emptyProject(),fixtures=catalog.map(d=>({id:d.id,svg:thumbnailSvg(d,p,d.color,96).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ')}));
  const failures=await page.evaluate(async fixtures=>{
    const canvas=document.createElement('canvas');canvas.width=canvas.height=96;
    const context=canvas.getContext('2d')!,failures=[];
    for(const f of fixtures){
      const image=new Image();image.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(f.svg)}`;await image.decode();
      for(const background of ['#eeeeee','#181c20']){
        context.fillStyle=background;context.fillRect(0,0,96,96);context.drawImage(image,0,0);
        const data=context.getImageData(0,0,96,96).data;let visible=0;
        for(let n=0;n<data.length;n+=4)if(Math.abs(data[n]-data[0])+Math.abs(data[n+1]-data[1])+Math.abs(data[n+2]-data[2])>20)visible++;
        if(visible<20)failures.push({id:f.id,background,visible});
      }
    }
    return failures;
  },fixtures);
  expect(failures).toEqual([]);
});

test('the editor updates every control family without allowing a physical resize',async({page})=>{
  await page.goto('/app/');await page.click('#new-project');await page.click('[data-template="blank"]');
  for(const id of ['encoder-ring','slider-20','toggle-3','slide-switch','button-lit-square','led-ring','seven-seg','oled-096','vu-meter','touch-strip','joystick']){
    await page.click(`[data-component="${id}"]`);
    const value=page.locator('#field-value');await value.fill('0');
    const drawing=page.locator('.panel-item:has(.selection-ui) .component-hardware');
    const before=await drawing.innerHTML();await value.fill('1');
    await expect.poll(()=>drawing.innerHTML(),{message:`${id} should change visibly`}).not.toBe(before);
    await expect(page.locator('#field-width')).toBeDisabled();await expect(page.locator('#field-height')).toBeDisabled();
    await page.click('#delete');
  }
});

for(const width of [1440,1100])test(`picker previews are legible and stable at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});await page.goto('/app/');
  if(await page.locator('.layout').evaluate(el=>el.classList.contains('left-closed')))await page.click('#open-left');
  const card=page.locator('[data-component="knob-medium"]');await card.scrollIntoViewIfNeeded();
  const before=await card.boundingBox();await card.hover();
  await expect(card.locator('.add-part svg')).toBeVisible();
  expect(await card.boundingBox()).toEqual(before);
  const failures=await page.locator('.part-card').evaluateAll(cards=>cards.flatMap(card=>{
    const preview=card.querySelector('.part-thumbnail')!,svg=preview.querySelector('svg')!;
    const box=preview.getBoundingClientRect(),drawing=svg.getBoundingClientRect(),name=card.querySelector('strong')!;
    const good=drawing.width>=70&&drawing.height>=70&&drawing.left>=box.left&&drawing.right<=box.right+.1
      &&drawing.top>=box.top&&drawing.bottom<=box.bottom+.1&&card.scrollWidth<=card.clientWidth&&name.scrollHeight<=name.clientHeight+1;
    return good?[]:[card.getAttribute('data-component')];
  }));
  expect(failures).toEqual([]);
});
