/* Lists every horizontal rule on the public page with its x-range, so a line
   that looks broken can be traced to the two elements drawing it. */
import {chromium} from '@playwright/test';
const b=await chromium.launch();
const p=await b.newPage({viewport:{width:1400,height:900}});
await p.goto('http://localhost:4173/',{waitUntil:'networkidle'});
await p.addStyleTag({content:'html{scroll-behavior:auto!important}'});
const rows=await p.evaluate(()=>{
  const out=[];
  document.querySelectorAll('*').forEach(el=>{
    const cs=getComputedStyle(el),r=el.getBoundingClientRect();
    const top=parseFloat(cs.borderTopWidth),bot=parseFloat(cs.borderBottomWidth);
    if((top>0||bot>0)&&r.width>100){
      out.push({sel:el.tagName.toLowerCase()+'.'+[...el.classList].join('.'),x:Math.round(r.x),w:Math.round(r.width),y:Math.round(r.y+window.scrollY),top,bot});
    }
  });
  return out;
});
console.log(JSON.stringify(rows,null,1));
await b.close();
