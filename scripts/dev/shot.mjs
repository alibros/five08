/* Screenshot a page of the dev server. Usage:
   node scripts/dev/shot.mjs <path> <out.png> [light|dark] [width] [height] [full 0|1] [scrollY] */
import {chromium} from '@playwright/test';
const [,, url='/', out='shot.png', theme='light', w='1400', h='900', full='0', scroll='0']=process.argv;
const browser=await chromium.launch();
const ctx=await browser.newContext({viewport:{width:Number(w),height:Number(h)},colorScheme:theme,deviceScaleFactor:1});
const page=await ctx.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto('http://localhost:4173'+url,{waitUntil:'networkidle'});
await page.addStyleTag({content:'html{scroll-behavior:auto!important}'});
if(Number(scroll))await page.evaluate(y=>window.scrollTo(0,y),Number(scroll));
await page.waitForTimeout(700);
await page.screenshot({path:out,fullPage:full==='1'});
if(errors.length)console.log('ERRORS',errors);
await browser.close();
