/* Regenerates the README screenshots: the public page and the editor with a template loaded. */
import {chromium} from '@playwright/test';
const browser=await chromium.launch();
const ctx=await browser.newContext({viewport:{width:1440,height:900},colorScheme:'light',deviceScaleFactor:2});
const page=await ctx.newPage();
await page.goto('http://localhost:4173/',{waitUntil:'networkidle'});
await page.addStyleTag({content:'html{scroll-behavior:auto!important}'});
await page.waitForTimeout(800);
await page.screenshot({path:'docs/images/five08-landing.jpg',type:'jpeg',quality:86});
await page.goto('http://localhost:4173/app/',{waitUntil:'networkidle'});
await page.click('#new-project');await page.click('[data-template="voice"]');
await page.waitForSelector('.panel-item');
await page.locator('.panel-item').nth(2).click();
await page.waitForTimeout(600);
await page.screenshot({path:'docs/images/five08-editor.jpg',type:'jpeg',quality:86});
await browser.close();
