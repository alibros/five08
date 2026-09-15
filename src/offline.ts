/**
 * Registers the offline cache. Five08 keeps projects in the browser, so being
 * able to open it without a network is the difference between a tool you can
 * rely on and a website.
 */
export function registerOffline(onUpdate?:()=>void){
  if(!import.meta.env.PROD||!('serviceWorker' in navigator))return;
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('/sw.js').then(registration=>{
      registration.addEventListener('updatefound',()=>{
        const worker=registration.installing;
        if(!worker)return;
        worker.addEventListener('statechange',()=>{
          if(worker.state==='installed'&&navigator.serviceWorker.controller)onUpdate?.();
        });
      });
    }).catch(()=>{/* offline support is a bonus, never a blocker */});
  });
}
