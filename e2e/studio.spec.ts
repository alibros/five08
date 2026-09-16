import {expect,test,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';

async function open(page:Page){
  await page.goto('/app/');await page.click('#new-project');await page.click('[data-template="voice"]');
}
async function downloadText(page:Page,kind:string){
  await page.click('#export');const waiting=page.waitForEvent('download');await page.click(`[data-export="${kind}"]`);
  const file=await waiting;return readFile((await file.path())!,'utf8');
}

test('hardware size survives panel resizing, standard-size changes and reload',async({page})=>{
  await open(page);await page.locator('.panel-item').first().click({force:true});
  await expect(page.locator('#field-width')).toBeDisabled();
  await expect(page.locator('.resize-handle')).toHaveCount(0);
  await page.selectOption('#size-preset','knob-small');await expect(page.locator('#field-width')).toHaveValue('10');
  await page.click('[data-inspector-tab="panel"]');await page.fill('#field-hp','6');await page.locator('#field-hp').press('Tab');
  const json=JSON.parse(await downloadText(page,'json'));expect(json.items[0].width).toBe(10);expect(json.items[3].width).toBe(9);
  await page.reload();await page.click('[data-inspector-tab="context"]');await page.locator('.panel-item').first().click({force:true});await expect(page.locator('#field-width')).toHaveValue('10');
});

test('Fit frames the full physical panel below the toolbar',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await open(page);await page.click('#zoom-fit');
  const stage=(await page.locator('#panel-stage').boundingBox())!,bar=(await page.locator('.precision-bar').boundingBox())!,bottom=(await page.locator('.canvas-toolbar').boundingBox())!;
  expect(stage.y).toBeGreaterThan(bar.y+bar.height);
  expect(stage.y+stage.height).toBeLessThan(bottom.y);
});

test('panel typography is visible, undoable and persisted',async({page})=>{
  await open(page);await page.click('[data-inspector-tab="panel"]');
  await page.selectOption('#design-font','sans');await page.fill('#design-labelSize','2.6');await page.locator('#design-labelSize').press('Tab');
  await expect(page.locator('.component-legend text').first()).toHaveAttribute('font-size','2.6');
  await page.click('#undo');await expect(page.locator('.component-legend text').first()).toHaveAttribute('font-size','2');
  await page.click('#redo');
  const saved=JSON.parse(await downloadText(page,'json'));expect(saved.design.labelSize).toBe(2.6);
  await page.reload();await expect(page.locator('.component-legend text').first()).toHaveAttribute('font-size','2.6');
});

test('scale controls survive a save and use the configured sweep',async({page})=>{
  await open(page);await page.click('[data-component="knob-scale"]');
  await page.fill('#scale-sweep','180');await page.locator('#scale-sweep').press('Tab');
  await page.fill('#scale-start','180');await page.locator('#scale-start').press('Tab');
  await page.fill('#field-ticks','7');await page.locator('#field-ticks').press('Tab');
  await expect(page.locator('.panel-item[data-kind="scale"] line')).toHaveCount(7);
  const project=JSON.parse(await downloadText(page,'json'));expect(project.items.at(-1).scale.sweep).toBe(180);
  await page.reload();await expect(page.locator('.panel-item[data-kind="scale"] line')).toHaveCount(7);
});

test('assemblies persist across projects and insert as independent groups',async({page})=>{
  await open(page);await page.keyboard.press('Control+a');await page.click('#open-assemblies');
  await page.fill('#assembly-name','Voice strip');await page.locator('#assembly-save button').click();
  await expect(page.locator('.assembly-row')).toHaveCount(1);await page.click('#assembly-close');
  await page.click('#new-project');await page.click('[data-template="blank"]');await page.click('#open-assemblies');
  await page.click('[data-insert="0"]');await expect(page.locator('.panel-item')).toHaveCount(7);
  await page.keyboard.press('Control+d');await expect(page.locator('.panel-item')).toHaveCount(14);
  await page.keyboard.press('Escape');await page.locator('.panel-item').first().click({force:true});
  await expect(page.locator('#selection-status')).toContainText('7 selected');
  await page.reload();await page.click('#open-assemblies');await expect(page.locator('.assembly-info strong')).toHaveText('Voice strip');
});

test('preflight rules persist and issues are categorized',async({page})=>{
  await open(page);await page.click('[data-inspector-tab="panel"]');
  await page.locator('summary',{hasText:'Preflight rules'}).click();
  await page.fill('#rule-rearDepth','5');await page.locator('#rule-rearDepth').press('Tab');
  await expect(page.locator('[data-studio-section="rules"]')).toHaveAttribute('open','');
  await expect(page.locator('.preflight-category h3').first()).toContainText('Assembly');
  const p=JSON.parse(await downloadText(page,'json'));expect(p.rules.rearDepth).toBe(5);
});

test('artwork excludes hardware, VCV excludes hidden markers, KiCad includes physical openings',async({page})=>{
  await open(page);
  const art=await downloadText(page,'art');expect(art).not.toContain('component-hardware');expect(art).toContain('component-legend');expect(art).toContain('60.56mm');
  const pcb=await downloadText(page,'kicad');expect(pcb).toContain('(thickness 2)');expect(pcb).toContain('(layer "Edge.Cuts")');
  await page.click('[data-inspector-tab="layers"]');await page.locator('[data-visibility]').first().click();
  const vcv=await downloadText(page,'vcv');expect(vcv).not.toContain('fill="#ff00ff"');
});

async function pixels(page:Page){
  return page.locator('#inspection-scene canvas').evaluate(canvas=>{
    const source=canvas as HTMLCanvasElement,c=document.createElement('canvas');c.width=160;c.height=120;
    const ctx=c.getContext('2d')!;ctx.drawImage(source,0,0,160,120);const data=ctx.getImageData(0,0,160,120).data;
    let visible=0,hash=0;for(let i=0;i<data.length;i+=4){if(Math.abs(data[i]-data[0])+Math.abs(data[i+1]-data[1])+Math.abs(data[i+2]-data[2])>25)visible++;hash=(hash*31+data[i])>>>0;}
    return{visible,hash};
  });
}
test('3D inspection is nonblank, interactive, responsive and disposed on close',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1440,height:1000});await open(page);await page.click('#inspect-3d');
  await expect(page.locator('#inspection-scene canvas')).toBeVisible();
  await expect.poll(async()=>(await pixels(page)).visible).toBeGreaterThan(300);
  const before=await pixels(page);
  await page.click('[data-camera="rear"]');await expect.poll(async()=>(await pixels(page)).hash).not.toBe(before.hash);
  const rear=await pixels(page);
  const box=(await page.locator('#inspection-scene canvas').boundingBox())!;
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+80,box.y+box.height/2+20,{steps:4});await page.mouse.up();
  await expect.poll(async()=>(await pixels(page)).hash).not.toBe(rear.hash);
  await page.setViewportSize({width:390,height:844});await page.click('[data-camera="front"]');
  await expect.poll(async()=>(await pixels(page)).visible).toBeGreaterThan(300);
  expect(await page.locator('.inspection-modal').evaluate(el=>el.scrollWidth<=innerWidth)).toBe(true);
  await page.keyboard.press('Delete');await page.click('#close-inspection');
  await expect(page.locator('#inspection-scene canvas')).toHaveCount(0);await expect(page.locator('.panel-item')).toHaveCount(7);
  expect(errors).toEqual([]);
});
