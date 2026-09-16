import {expect,test,type Page} from '@playwright/test';

const toolbarControls=['#open-palette','#new-project','#open-library','#save-json','#export','#help'];

async function tooltipBox(page:Page,selector:string){
  // Pseudo-elements have no DOM boundingClientRect; inspect their rendered box.
  const client=await page.context().newCDPSession(page);
  try{
    const {root}=await client.send('DOM.getDocument');
    const {nodeId}=await client.send('DOM.querySelector',{nodeId:root.nodeId,selector});
    const {node}=await client.send('DOM.describeNode',{nodeId});
    const after=node.pseudoElements?.find(node=>node.pseudoType==='after');
    expect(after).toBeDefined();
    const {model}=await client.send('DOM.getBoxModel',{backendNodeId:after!.backendNodeId});
    const [left,top,right,,,bottom]=model.border;
    return {left,top,right,bottom};
  }finally{await client.detach();}
}

for(const width of [1440,1024]){
  test(`toolbar hover stays stable and tooltips follow their buttons at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:900});
    await page.emulateMedia({colorScheme:width===1440?'light':'dark'});
    await page.goto('/app/');
    await page.evaluate(()=>document.fonts.ready);

    for(const selector of toolbarControls){
      const control=page.locator(selector);
      const before=(await control.boundingBox())!;
      // An edge hover catches layout shifts that a centred pointer can miss.
      await page.mouse.move(before.x+1,before.y+before.height/2);
      const samples=await control.evaluate(async el=>{
        const start=performance.now(),samples=[];
        do{
          await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
          const box=el.getBoundingClientRect(),tip=getComputedStyle(el,'::after');
          samples.push({x:box.x,y:box.y,width:box.width,height:box.height,hover:el.matches(':hover'),opacity:Number(tip.opacity)});
        }while(performance.now()-start<650);
        return samples;
      });
      for(const sample of samples){
        expect(sample.hover,`${selector} must not lose hover`).toBe(true);
        for(const key of ['x','y','width','height'] as const){
          expect(Math.abs(sample[key]-before[key]),`${selector} ${key} must not change on hover`).toBeLessThan(.1);
        }
      }
      for(let i=1;i<samples.length;i++){
        expect(samples[i].opacity,`${selector} tooltip must not flash`).toBeGreaterThanOrEqual(samples[i-1].opacity);
      }
      expect(samples.at(-1)!.opacity).toBe(1);

      const tip=await tooltipBox(page,selector);
      expect(tip.top-before.y-before.height).toBeGreaterThanOrEqual(6);
      expect(tip.top-before.y-before.height).toBeLessThanOrEqual(9);
      expect(tip.left).toBeGreaterThanOrEqual(0);
      expect(tip.right).toBeLessThanOrEqual(width);
      expect(tip.right).toBeGreaterThan(before.x);
      expect(tip.left).toBeLessThan(before.x+before.width);
      if(selector!=='#help')expect(Math.abs((tip.left+tip.right)/2-before.x-before.width/2)).toBeLessThan(1);

      await page.mouse.move(0,90);
      await expect.poll(()=>control.evaluate(el=>getComputedStyle(el,'::after').visibility)).toBe('hidden');
    }
  });
}

test('toolbar tooltips follow keyboard focus with reduced motion',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/app/');
  await page.evaluate(()=>document.fonts.ready);
  await page.locator('#open-palette').focus();
  await page.keyboard.press('Tab');
  const button=page.locator('#new-project');
  await expect(button).toBeFocused();
  await expect.poll(()=>button.evaluate(el=>getComputedStyle(el,'::after').opacity)).toBe('1');
  const bounds=(await button.boundingBox())!,tip=await tooltipBox(page,'#new-project');
  expect(Math.abs(tip.top-bounds.y-bounds.height-7)).toBeLessThanOrEqual(1);
  await page.keyboard.press('Tab');
  await expect(page.locator('#open-library')).toBeFocused();
  await expect.poll(()=>button.evaluate(el=>getComputedStyle(el,'::after').visibility)).toBe('hidden');
});

test('canvas toolbar tooltips appear above their controls',async({page})=>{
  await page.goto('/app/');
  const button=page.locator('#zoom-fit');
  await button.hover();
  await expect.poll(()=>button.evaluate(el=>getComputedStyle(el,'::after').opacity)).toBe('1');
  const bounds=(await button.boundingBox())!,tip=await tooltipBox(page,'#zoom-fit');
  expect(bounds.y-tip.bottom).toBeGreaterThanOrEqual(6);
  expect(bounds.y-tip.bottom).toBeLessThanOrEqual(9);
});
