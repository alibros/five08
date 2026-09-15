/* Measures every section rule's drawn width at a range of scroll positions. */
import {chromium} from '@playwright/test';
const b=await chromium.launch();
const p=await b.newPage({viewport:{width:1400,height:900}});
await p.goto('http://localhost:4173/',{waitUntil:'networkidle'});
await p.addStyleTag({content:'html{scroll-behavior:auto!important}'});
for(const y of [0,400,800,1200,1600,2000,2400,2800,3200,3600]){
  await p.evaluate(v=>window.scrollTo(0,v),y);
  await p.waitForTimeout(160);
  const rows=await p.evaluate(()=>[...document.querySelectorAll('.band')].map(band=>{
    const r=band.querySelector('.rule').getBoundingClientRect();
    const head=band.querySelector('h2').getBoundingClientRect();
    return{no:band.dataset.no,w:Math.round(r.width),ruleY:Math.round(r.y),headY:Math.round(head.y)};
  }));
  const onscreen=rows.filter(r=>r.headY>-60&&r.headY<900);
  console.log(`scroll ${String(y).padStart(4)}  `+(onscreen.length?onscreen.map(r=>`${r.no} rule=${r.w}px@y${r.ruleY} head@y${r.headY}`).join('   '):'—'));
}
await b.close();
