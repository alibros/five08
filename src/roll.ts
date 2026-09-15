/**
 * Writes a figure into a rolling readout. The element holds two children: a
 * span whose ::before draws the digits from a CSS counter driven by a
 * registered custom property (so the browser interpolates it), and a hidden
 * span carrying the real text for readers and tests.
 */
export function roll(host:HTMLElement,vars:Record<string,number>,text:string){
  const digits=host.firstElementChild as HTMLElement|null;
  if(digits)Object.entries(vars).forEach(([k,v])=>digits.style.setProperty(`--${k}`,String(v)));
  const label=host.lastElementChild;
  if(label&&label!==digits)label.textContent=text;
}

/** Runs a one-shot animation class on an element, restarting it if it is already running. */
export function pulse(el:Element|null,className:string){
  if(!el)return;
  el.classList.remove(className);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(className);
}
