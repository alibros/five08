/* Screenshot the export dialog and the layers tab of the editor. */
import {chromium} from '@playwright/test';
const [,, out='.', theme='light']=process.argv;
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1400,height:900},colorScheme:theme});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto('http://localhost:4173/app/',{waitUntil:'networkidle'});
await page.click('#new-project');await page.click('[data-template="mixer"]');
await page.waitForSelector('.panel-item');
await page.click('#export');await page.waitForTimeout(400);
await page.screenshot({path:`${out}/d-export.png`});
await page.keyboard.press('Escape');
await page.click('[data-inspector-tab="layers"]');await page.waitForTimeout(300);
await page.screenshot({path:`${out}/d-layers.png`,clip:{x:1080,y:60,width:320,height:600}});
if(errors.length)console.log('ERRORS',errors);
await browser.close();
