import {expect,test,type Page} from '@playwright/test';

async function checkCableConnections(page:Page){
  const errors=await page.locator('.rack-scene').evaluate(svg=>{
    const cables=[...svg.querySelectorAll<SVGPathElement>('.cable-jacket')];
    const plugs=[...svg.querySelectorAll<SVGGElement>('.patch-plug')];
    return cables.flatMap((cable,n)=>[0,1].map(end=>{
      const point=cable.getPointAtLength(end?cable.getTotalLength():0).matrixTransform(cable.getCTM()!);
      const relief=new DOMPoint(0,10.2).matrixTransform(plugs[n*2+end].getCTM()!);
      return Math.hypot(point.x-relief.x,point.y-relief.y);
    }));
  });
  expect(errors).toHaveLength(6);
  for(const error of errors)expect(error).toBeLessThan(.1);
}

for(const width of [1440,390])test(`rack hardware and cables remain visible and connected at ${width}px`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width,height:900});
  await page.goto('/');
  const rack=page.locator('.rack-scene');
  await rack.scrollIntoViewIfNeeded();
  await expect(rack.locator('.patch-plug')).toHaveCount(6);
  await expect(rack.locator('.plug-barrel')).toHaveCount(6);
  await expect(rack.locator('.rack-fader-shadow')).toHaveCount(4);
  await checkCableConnections(page);

  const bounds=(await rack.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x+bounds.width).toBeLessThanOrEqual(width+1);
  for(const selector of ['.cable-jacket','.patch-plug','.rack-screws']){
    for(const element of await rack.locator(selector).all()){
      const box=(await element.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(bounds.x);
      expect(box.y).toBeGreaterThanOrEqual(bounds.y);
      expect(box.x+box.width).toBeLessThanOrEqual(bounds.x+bounds.width);
      expect(box.y+box.height).toBeLessThanOrEqual(bounds.y+bounds.height);
    }
  }

  const pixels=await rack.evaluate(async svg=>{
    const image=new Image();image.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.outerHTML)}`;await image.decode();
    const canvas=document.createElement('canvas');canvas.width=640;canvas.height=300;
    const ctx=canvas.getContext('2d')!;ctx.drawImage(image,0,0,640,300);
    const data=ctx.getImageData(0,0,640,300).data;
    let metal=0,red=0,amber=0;
    for(let n=0;n<data.length;n+=4){
      const [r,g,b]=data.slice(n,n+3);
      if(r>140&&g>140&&b>140)metal++;
      if(r>110&&r>g*1.6&&r>b*1.5)red++;
      if(r>150&&g>110&&b<110)amber++;
    }
    return{metal,red,amber};
  });
  expect(pixels.metal).toBeGreaterThan(10000);
  expect(pixels.red).toBeGreaterThan(100);
  expect(pixels.amber).toBeGreaterThan(100);
  expect(errors).toEqual([]);
});

test('patch leads follow the demo reflow without scaling jack hardware',async({page})=>{
  await page.goto('/');
  const rack=page.locator('.rack-scene'),before=await rack.getAttribute('viewBox');
  for(let n=0;n<14;n++)await page.click('#hp-down');
  await expect(page.locator('#hp-value')).toHaveText('6 HP');
  await expect(rack).not.toHaveAttribute('viewBox',before!);
  await expect.poll(()=>rack.locator('.patch-plug[data-jack-label="IN L"]').getAttribute('data-socket-y')).toBe('91');
  await checkCableConnections(page);
  const radii=await rack.locator('.hero-module [data-detail="washer"] > circle:first-child').evaluateAll(circles=>circles.map(circle=>Number(circle.getAttribute('r'))));
  expect(radii).toEqual([5,5,5,5,5,5]);
});
