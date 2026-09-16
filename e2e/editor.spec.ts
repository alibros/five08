import {expect,test,type Page} from '@playwright/test';

/** Fails the test on any console error, so a silent exception cannot pass. */
const watchConsole=(page:Page)=>{
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  return errors;
};

const openTemplate=async(page:Page,template:string)=>{
  await page.goto('/app/');
  await page.click('#new-project');
  await page.click(`[data-template="${template}"]`);
  await expect(page.locator('.panel-item').first()).toBeVisible();
};

test.describe('editor',()=>{
  test('loads, saves and reopens a panel',async({page})=>{
    const errors=watchConsole(page);
    await openTemplate(page,'voice');
    await expect(page.locator('#project-name')).toHaveValue('Synth voice');
    await page.reload();
    await expect(page.locator('#project-name')).toHaveValue('Synth voice');
    await expect(page.locator('.panel-item')).toHaveCount(7);
    expect(errors).toEqual([]);
  });

  test('every toolbar control is actually wired up',async({page})=>{
    // The class of bug this exists for: markup using one id and the binder
    // querying another, leaving a button that looks fine and does nothing.
    const errors=watchConsole(page);
    await openTemplate(page,'voice');
    await page.keyboard.press('Control+a');

    const before=await page.locator('.panel-item').first().getAttribute('transform');
    await page.click('#center-panel');
    expect(await page.locator('.panel-item').first().getAttribute('transform')).not.toBe(before);

    for(const id of ['#align-x','#align-y','#distribute-h','#distribute-v','#tool-grid','#tool-mirror','#tool-rotate']){
      const control=page.locator(id);
      await expect(control,`${id} is missing from the toolbar`).toHaveCount(1);
      await expect(control,`${id} should be enabled with a selection`).toBeEnabled();
    }
    await page.click('#tool-mirror');
    await page.click('#tool-rotate');
    await page.click('#zoom-fit');
    await page.click('#zoom-100');
    await page.click('#grid-toggle');
    await page.click('#snap-toggle');
    expect(errors).toEqual([]);
  });

  test('undo and redo walk the whole edit',async({page})=>{
    const errors=watchConsole(page);
    await openTemplate(page,'voice');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await expect(page.locator('.panel-item')).toHaveCount(0);
    await page.keyboard.press('Control+z');
    await expect(page.locator('.panel-item')).toHaveCount(7);
    await page.keyboard.press('Control+Shift+z');
    await expect(page.locator('.panel-item')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('groups move and repeat as one',async({page})=>{
    const errors=watchConsole(page);
    await openTemplate(page,'voice');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Control+g');
    await page.keyboard.press('Escape');
    await page.locator('.panel-item').first().click({force:true});
    await expect(page.locator('#selection-status')).toContainText('7 selected');
    expect(errors).toEqual([]);
  });

  test('the canvas can be reached and driven from the keyboard',async({page})=>{
    const errors=watchConsole(page);
    await openTemplate(page,'voice');
    await page.keyboard.press('Escape');

    await page.locator('#skip-canvas').focus();
    await page.keyboard.press('Enter');
    const focused=()=>page.evaluate(()=>document.activeElement?.getAttribute('aria-label')??'');
    expect(await focused()).toMatch(/millimetres/);

    await page.keyboard.press('Tab');
    const second=await focused();
    await page.keyboard.press('Shift+Tab');
    expect(await focused()).not.toBe(second);

    // Escape must hand focus back, or Tab can never leave the canvas
    await page.keyboard.press('Escape');
    expect(await page.evaluate(()=>document.activeElement?.id)).toBe('canvas');

    await expect(page.locator('#panel-svg')).toHaveAttribute('role','listbox');
    expect(errors).toEqual([]);
  });

  test('the focus ring is for the keyboard, not the pointer',async({page})=>{
    const errors=watchConsole(page);
    await openTemplate(page,'voice');
    const ring=page.locator('.focus-ring');

    // Clicking and dragging a part must not leave an outline behind
    const knob=page.locator('.panel-item').nth(2);
    const box=(await knob.boundingBox())!;
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
    await page.mouse.down();
    await page.mouse.move(box.x+box.width/2+20,box.y+box.height/2+14,{steps:4});
    await page.mouse.up();
    await expect(ring).toHaveCount(0);

    // Tabbing to a part still draws one
    await page.keyboard.press('Escape');
    await page.locator('#skip-canvas').focus();
    await page.keyboard.press('Enter');
    await expect(ring).toHaveCount(1);

    // And it goes away again as soon as a pointer takes over
    await page.locator('.panel-item').nth(4).click({force:true});
    await expect(ring).toHaveCount(0);

    // Turning the option on outlines whatever is focused, however you got there
    await page.keyboard.press('Control+k');
    await page.locator('#palette-input').fill('focus ring');
    await page.keyboard.press('Enter');
    await expect(page.locator('#toast')).toContainText('always shown');
    await page.locator('.panel-item').nth(3).click({force:true});
    await expect(ring).toHaveCount(1);
    expect(errors).toEqual([]);
  });

  test('every export produces a file',async({page})=>{
    const errors=watchConsole(page);
    await openTemplate(page,'mixer');
    for(const kind of ['art','cut','dxf','vcv','bom','json','png']){
      const download=page.waitForEvent('download');
      await page.click('#export');
      await page.click(`[data-export="${kind}"]`);
      expect((await download).suggestedFilename(),`${kind} produced no file`).toBeTruthy();
    }
    expect(errors).toEqual([]);
  });

  test('preflight finds a broken layout and selects the culprit',async({page})=>{
    const errors=watchConsole(page);
    await openTemplate(page,'sequencer');
    await page.click('[data-inspector-tab="panel"]');
    await page.fill('#field-hp','4');
    await page.dispatchEvent('#field-hp','change');
    await expect(page.locator('#warning-count')).toContainText('error');
    await page.locator('.preflight .issue').first().click();
    await expect(page.locator('#selection-status')).not.toContainText('components');
    expect(errors).toEqual([]);
  });

  test('the bench reads back what the pointer is over',async({page})=>{
    const errors=watchConsole(page);
    await openTemplate(page,'voice');
    const stage=(await page.locator('#panel-stage').boundingBox())!;
    await page.mouse.move(stage.x+stage.width/2,stage.y+stage.height*.3);
    await expect(page.locator('#cursor-tag')).toHaveClass(/on/);
    await expect(page.locator('#cursor-tag')).toHaveText(/\d+\.\d\s+\d+\.\d/);
    // Rulers carry real ticks, numbered every 10 mm
    await expect(page.locator('#ruler-x text',{hasText:/^50$/})).toHaveCount(1);
    expect(errors).toEqual([]);
  });

  test('the light table fades the hardware and keeps the artwork',async({page})=>{
    const errors=watchConsole(page);
    await openTemplate(page,'voice');
    await page.click('[data-component="text-label"]');
    await page.check('#light-table');
    await expect(page.locator('#panel-svg .panel-finish')).toHaveCSS('opacity','0.1');
    await expect(page.locator('.panel-item[data-kind="text"]').first()).toHaveCSS('opacity','1');
    await expect(page.locator('.panel-item[data-kind="knob"]').first()).toHaveCSS('opacity','0.2');
    await page.uncheck('#light-table');
    await expect(page.locator('#panel-svg .panel-finish')).toHaveCSS('opacity','1');
    expect(errors).toEqual([]);
  });

  test('the export dialog shows the drawing the shop will get',async({page})=>{
    const errors=watchConsole(page);
    await openTemplate(page,'mixer');
    await page.click('#export');
    const sheet=page.locator('.plot-sheet');
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText('CUTOUTS');
    await expect(sheet).toContainText('Four channel mixer');
    // Engraving only appears on the sheet once it is going into the DXF
    await expect(sheet.locator('text',{hasText:'MASTER'})).toHaveCount(0);
    await page.check('#export-engrave');
    await expect(page.locator('.plot-sheet').locator('text',{hasText:'MASTER'})).toHaveCount(1);
    expect(errors).toEqual([]);
  });

  test('the command palette runs its commands',async({page})=>{
    const errors=watchConsole(page);
    await openTemplate(page,'voice');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Control+k');
    await page.locator('#palette-input').fill('mirror');
    await page.keyboard.press('Enter');
    await expect(page.locator('#palette')).toHaveCount(0);
    await expect(page.locator('#toast')).toContainText('Mirrored');
    expect(errors).toEqual([]);
  });
});

test.describe('public page',()=>{
  test('renders the demo panel and hands it to the editor',async({page})=>{
    const errors=watchConsole(page);
    await page.goto('/');
    await expect(page.locator('.panel-render')).toBeVisible();
    await expect(page.locator('#demo-caption')).toContainText('Preflight: clear');
    await page.click('[data-view="cutout"]');
    await expect(page.locator('#demo-panel .cut, #demo-panel circle')).not.toHaveCount(0);
    await page.click('#open-demo');
    await expect(page).toHaveURL(/\/app\//);
    await expect(page.locator('#project-name')).toHaveValue(/Wavefolder/);
    expect(errors).toEqual([]);
  });

  test('the sheet edge stays a closed rectangle',async({page})=>{
    // The frame used to sit behind everything, so the sticky header painted
    // over its top edge and left a stub at each end.
    const errors=watchConsole(page);
    await page.goto('/');
    const geo=await page.evaluate(()=>{
      const frame=document.querySelector('.sheet-frame')!,head=document.querySelector('.masthead')!;
      return{
        frameTop:frame.getBoundingClientRect().top,
        headTop:head.getBoundingClientRect().top,
        frameZ:Number(getComputedStyle(frame).zIndex),
        headZ:Number(getComputedStyle(head).zIndex),
      };
    });
    expect(geo.headTop,'the header starts below the sheet edge').toBeGreaterThan(geo.frameTop);
    expect(geo.frameZ,'the sheet edge draws above the header').toBeGreaterThan(geo.headZ);
    expect(errors).toEqual([]);
  });

  test('the sheet is a page, not the window',async({page})=>{
    // On a wide screen a viewport-width frame leaves the content column
    // stranded in the middle with no relationship to the sheet edge.
    const errors=watchConsole(page);
    await page.setViewportSize({width:2200,height:900});
    await page.goto('/');
    const geo=await page.evaluate(()=>{
      const frame=document.querySelector('.sheet-frame')!.getBoundingClientRect();
      const head=document.querySelector('.masthead')!.getBoundingClientRect();
      return{frameW:frame.width,left:head.left-frame.left,right:frame.right-head.right};
    });
    expect(geo.frameW).toBeLessThan(1400);
    expect(Math.abs(geo.left-geo.right),'the sheet is centred on the column').toBeLessThan(2);
    expect(geo.left,'a steady margin between the sheet edge and the column').toBeGreaterThan(40);
    expect(errors).toEqual([]);
  });

  test('the hero panel can be used, not just looked at',async({page})=>{
    const errors=watchConsole(page);
    await page.goto('/');
    const panel=page.locator('.panel-render');
    await expect(panel).toBeVisible();
    const box=(await panel.boundingBox())!;

    // Hovering reads out millimetres, in the same language as the editor
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
    await expect(page.locator('#demo-readout')).toHaveText(/X [\d.]+\s+Y [\d.]+\smm/);

    // Dragging the FOLD knob turns it and lights the indicators
    await page.mouse.move(box.x+box.width/2,box.y+box.height*0.22);
    await page.mouse.down();
    await page.mouse.move(box.x+box.width/2,box.y+box.height*0.22-80,{steps:8});
    await expect(page.locator('#demo-readout')).toHaveText(/FOLD 100%/);
    await page.mouse.up();
    const lit=await page.evaluate(()=>[...document.querySelectorAll('#demo-panel circle')].filter(c=>c.getAttribute('fill')==='#ff5d3b').length);
    expect(lit,'both indicators should follow the knob to full').toBe(2);

    // The switch has somewhere to go
    await page.mouse.click(box.x+box.width/2,box.y+box.height*(64/128.5));
    expect(await page.evaluate(()=>document.querySelector('#demo-panel')!.innerHTML.includes('rotate(180)'))).toBe(true);
    expect(errors).toEqual([]);
  });

  test('hovering a part dimensions it',async({page})=>{
    const errors=watchConsole(page);
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto('/');
    await page.evaluate(()=>document.fonts.ready);
    await page.locator('.panel-item').nth(3).hover();
    const notes=page.locator('#hero-notes');
    await expect(notes.locator('text')).not.toHaveCount(0);
    await expect(notes).toContainText('cutout');
    await page.mouse.move(5,5);
    await expect(notes.locator('text')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('narrowing the panel makes preflight object, live',async({page})=>{
    const errors=watchConsole(page);
    await page.goto('/');
    await expect(page.locator('#hp-value')).toHaveText('12 HP');
    await expect(page.locator('#demo-caption')).toContainText('Preflight: clear');

    for(let n=0;n<5;n++)await page.click('#hp-down');
    await expect(page.locator('#hp-value')).toHaveText('7 HP');
    await expect(page.locator('#hp-mm')).toHaveText('35.16 mm');
    await expect(page.locator('#demo-caption')).toContainText('warning');

    for(let n=0;n<5;n++)await page.click('#hp-up');
    await expect(page.locator('#demo-caption')).toContainText('Preflight: clear');
    expect(errors).toEqual([]);
  });

  test('the width control has ends',async({page})=>{
    await page.goto('/');
    for(let n=0;n<12;n++)await page.click('#hp-down');
    await expect(page.locator('#hp-value')).toHaveText('6 HP');
    for(let n=0;n<20;n++)await page.click('#hp-up');
    await expect(page.locator('#hp-value')).toHaveText('20 HP');
  });
});
