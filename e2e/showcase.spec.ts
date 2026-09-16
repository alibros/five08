import {expect,test,type Page} from '@playwright/test';
import {catalogMap} from '../src/catalog';
import type {Project} from '../src/model';

async function modelPixels(page:Page){
  return page.locator('#showcase-scene canvas').evaluate(canvas=>{
    const box=canvas.getBoundingClientRect(),w=240,h=Math.round(w*box.height/box.width);
    const small=document.createElement('canvas');small.width=w;small.height=h;
    const context=small.getContext('2d')!;context.drawImage(canvas as HTMLCanvasElement,0,0,w,h);
    const data=context.getImageData(0,0,w,h).data;
    let visible=0,hash=0,left=w,right=0,top=h,bottom=0;
    for(let n=0;n<data.length;n+=4){
      hash=(hash*31+data[n]+data[n+1]+data[n+2])>>>0;
      if(data[n+3]<30)continue;
      const x=(n/4)%w,y=Math.floor(n/4/w);visible++;
      left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
    }
    return{visible,hash,left:box.left+left/w*box.width,right:box.left+right/w*box.width,
      top:box.top+top/h*box.height,bottom:box.top+bottom/h*box.height};
  });
}

for(const viewport of [{width:1440,height:900},{width:2200,height:900},{width:800,height:900},{width:390,height:844},{width:320,height:568}]){
  test(`HALO is framed without covering the copy at ${viewport.width}px`,async({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.setViewportSize(viewport);await page.goto('/');
    await expect(page.locator('.showcase-pitch')).toHaveText('1 HP = 5.08 mm');
    await expect(page.locator('.showcase-pitch')).toBeInViewport();
    await expect(page.locator('#showcase-scene')).toHaveAttribute('data-ready','true');
    await expect.poll(async()=>(await modelPixels(page)).visible).toBeGreaterThan(600);
    const pixels=await modelPixels(page);
    const copy=(await page.locator('.showcase-copy').boundingBox())!;
    const scene=(await page.locator('#showcase').boundingBox())!;
    const foot=(await page.locator('.showcase-foot').boundingBox())!;
    const studio=(await page.locator('#studio').boundingBox())!;
    if(viewport.width>=760)expect(pixels.left).toBeGreaterThan(copy.x+copy.width);
    else expect(pixels.top).toBeGreaterThan(copy.y+copy.height+4);
    expect(pixels.left).toBeGreaterThan(scene.x+4);expect(pixels.right).toBeLessThan(scene.x+scene.width-4);
    expect(pixels.top).toBeGreaterThan(scene.y+4);expect(pixels.bottom).toBeLessThan(foot.y);
    expect(studio.y,'the next section is visible in the first viewport').toBeLessThan(viewport.height-30);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);
    await expect(page.locator('.showcase-poster')).toBeHidden();
    expect(errors).toEqual([]);
  });
}

test('showcase viewpoints and orbit work without trapping page scrolling',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1440,height:900});await page.goto('/');
  await expect(page.locator('#showcase-scene')).toHaveAttribute('data-ready','true');
  await expect.poll(async()=>(await modelPixels(page)).visible).toBeGreaterThan(600);
  let previous=(await modelPixels(page)).hash;
  for(const view of ['front','side','rear','iso']){
    await page.click(`[data-hero-view="${view}"]`);
    await expect(page.locator(`[data-hero-view="${view}"]`)).toHaveAttribute('aria-pressed','true');
    await expect.poll(async()=>(await modelPixels(page)).hash).not.toBe(previous);
    previous=(await modelPixels(page)).hash;
  }
  const model=await modelPixels(page),x=(model.left+model.right)/2,y=(model.top+model.bottom)/2;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+55,y+15,{steps:8});await page.mouse.up();
  await expect.poll(async()=>(await modelPixels(page)).hash).not.toBe(previous);
  await page.mouse.wheel(0,500);
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(200);
  expect(errors).toEqual([]);
});

test('the edited example stays in sync with the 3D scene and opens at physical size',async({page})=>{
  await page.goto('/');await expect(page.locator('#showcase-scene')).toHaveAttribute('data-ready','true');
  await expect.poll(async()=>(await modelPixels(page)).visible).toBeGreaterThan(600);
  const before=(await modelPixels(page)).hash;
  await page.click('[data-finish="powder-white"]');
  await page.click('#hp-down');await page.click('#hp-down');
  await page.evaluate(()=>scrollTo(0,0));
  await expect(page.locator('#showcase-size')).toContainText('18 HP');
  await expect.poll(async()=>(await modelPixels(page)).hash).not.toBe(before);
  await expect(page.locator('#showcase-scene canvas')).toHaveCount(1);
  await page.click('#hero-open-demo');await expect(page).toHaveURL(/\/app\//);
  await expect(page.locator('#project-name')).toHaveValue('HALO (from the site)');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem(`five08:doc:${localStorage.getItem('five08:active')}`)!)) as Project;
  expect(saved.panel.hp).toBe(18);expect(saved.panel.finish).toBe('powder-white');
  expect(saved.items.filter(i=>i.componentId==='jack-thonk')).toHaveLength(6);
  for(const item of saved.items){
    const part=catalogMap.get(item.componentId)!;if(part.category==='Graphics')continue;
    expect(item.width).toBe(part.width);expect(item.height).toBe(part.height);
  }
  expect(saved.items.find(i=>i.label==='HALO')?.color).toBe(saved.inkColor);
});

test('without WebGL the real render and editable example remain available',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    const original=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type:string,...args:unknown[]){
      if(type==='webgl2'||type==='webgl'||type==='experimental-webgl')return null;
      return original.apply(this,[type,...args] as Parameters<typeof original>);
    } as typeof original;
  });
  await page.goto('/');await expect(page.locator('#showcase-error')).toBeVisible();
  const poster=page.locator('.showcase-poster');await expect(poster).toBeVisible();
  await expect.poll(()=>poster.evaluate(image=>(image as HTMLImageElement).naturalWidth)).toBe(1000);
  await expect(page.locator('[data-hero-view="front"]')).toBeDisabled();
  await page.click('#hero-open-demo');await expect(page).toHaveURL(/\/app\//);
  await expect(page.locator('#project-name')).toHaveValue('HALO (from the site)');
  expect(errors).toEqual([]);
});

test('the example reports unavailable storage without navigating away',async({page})=>{
  await page.addInitScript(()=>{Storage.prototype.setItem=()=>{throw new DOMException('Storage unavailable','QuotaExceededError');};});
  await page.goto('/');await page.click('#hero-open-demo');
  await expect(page.locator('#showcase-status')).toContainText('storage is full or unavailable');
  await expect(page).toHaveURL(/\/$/);
});

test('brand typography, balanced logo spacing and page copy stay consistent',async({page})=>{
  await page.goto('/');await page.evaluate(()=>document.fonts.ready);
  await expect(page.locator('.masthead .wordmark img')).toHaveAttribute('src',/five08-logo\.svg\?v=.+/);
  await expect(page.locator('#showcase-title')).toHaveCSS('font-family',/Chakra Petch/);
  await expect(page.locator('#showcase-title')).toHaveText('FIVE08');
  await expect(page.locator('.showcase-summary')).toHaveCount(0);
  const logo=await page.evaluate(async()=>{
    const source=await(await fetch('/five08-logo.svg')).text();
    const svg=new DOMParser().parseFromString(source,'image/svg+xml').documentElement;
    svg.setAttribute('style','position:fixed;top:-5000px;width:120px;height:40px');document.body.append(svg);
    const mark=svg.querySelector<SVGGraphicsElement>('#wordmark')!,box=mark.getBBox();
    const letters=svg.querySelector<SVGGraphicsElement>('#wordmark-letters')!.getBBox();
    const digits=svg.querySelector<SVGGraphicsElement>('#wordmark-digits')!.getBBox();
    const dot=svg.querySelector<SVGGraphicsElement>('#wordmark circle')!.getBBox();
    const result={left:box.x,right:120-box.x-box.width,font:mark.dataset.typeface,textNodes:svg.querySelectorAll('text').length,
      lettersTop:letters.y,digitsTop:digits.y,lettersHeight:letters.height,digitsHeight:digits.height,
      leftGap:dot.x-letters.x-letters.width,rightGap:digits.x-dot.x-dot.width};
    svg.remove();return result;
  });
  expect(logo.font).toBe('Chakra Petch Medium');expect(logo.textNodes).toBe(0);
  expect(logo.left).toBeCloseTo(15,1);expect(logo.right).toBeCloseTo(logo.left,1);
  expect(logo.lettersTop).toBeCloseTo(logo.digitsTop,2);
  expect(logo.lettersHeight).toBeCloseTo(logo.digitsHeight,2);
  expect(logo.leftGap).toBeCloseTo(logo.rightGap,2);
  expect(await page.locator('body').innerText()).not.toContain('From the first knob to the final cut');
  expect(await page.locator('body').innerText()).not.toContain('\u2014');
  expect(await page.title()).not.toContain('\u2014');
  await expect(page.getByRole('heading',{name:/HALO|Stereo texture/i})).toHaveCount(0);
});
