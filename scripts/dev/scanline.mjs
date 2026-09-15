/* Reports which element is on top at each x along a horizontal line, so a rule
   that looks broken can be traced to whatever is covering it. */
import {chromium} from '@playwright/test';
const [,, url='/', y='57.5', theme='light']=process.argv;
const b=await chromium.launch();
const p=await b.newPage({viewport:{width:1400,height:900},colorScheme:theme});
await p.goto('http://localhost:4173'+url,{waitUntil:'networkidle'});
await p.waitForTimeout(500);
const runs=await p.evaluate(([y])=>{
  const name=el=>el?el.tagName.toLowerCase()+(el.className&&typeof el.className==='string'?'.'+el.className.trim().split(/\s+/).join('.'):''):'none';
  const out=[];
  for(let x=0;x<1400;x+=2){
    const stack=document.elementsFromPoint(x,y).slice(0,2).map(name).join(' > ');
    if(!out.length||out.at(-1).stack!==stack)out.push({x,stack});
  }
  return out;
},[Number(y)]);
runs.forEach(r=>console.log(String(r.x).padStart(5),r.stack));
await b.close();
