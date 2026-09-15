/* Screenshot a page of the dev server. Usage:
   node scripts/dev/shot.mjs <path> <out.png> [light|dark] [width] [height] [full 0|1] [scrollY] [hoverSelector] [clip x,y,w,h] */
import {chromium} from '@playwright/test';
const [,, url='/', out='shot.png', theme='light', w='1400', h='900', full='0', scroll='0', hover='', clip='']=process.argv;
const browser=await chromium.launch();
const ctx=await browser.newContext({viewport:{width:Number(w),height:Number(h)},colorScheme:theme,deviceScaleFactor:1});
const page=await ctx.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto('http://localhost:4173'+url,{waitUntil:'networkidle'});
await page.addStyleTag({content:'html{scroll-behavior:auto!important}'});
if(Number(scroll))await page.evaluate(y=>window.scrollTo(0,y),Number(scroll));
if(hover){await page.hover(hover);await page.waitForTimeout(500);}
await page.waitForTimeout(700);
const opts={path:out,fullPage:full==='1'};
if(clip){const [x,y,cw,ch]=clip.split(',').map(Number);opts.clip={x,y,width:cw,height:ch};}
await page.screenshot(opts);
if(errors.length)console.log('ERRORS',errors);
await browser.close();
