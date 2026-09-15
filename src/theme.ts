export type Theme='system'|'light'|'dark';

const META:Record<'light'|'dark',string>={light:'#f2f0e9',dark:'#131512'};

export const systemPrefersDark=()=>typeof matchMedia==='function'&&matchMedia('(prefers-color-scheme: dark)').matches;
export const resolveTheme=(theme:Theme):'light'|'dark'=>theme==='system'?(systemPrefersDark()?'dark':'light'):theme;

export function applyTheme(theme:Theme){
  const resolved=resolveTheme(theme);
  const root=document.documentElement;
  if(theme==='system')delete root.dataset.theme;else root.dataset.theme=theme;
  root.style.colorScheme=resolved;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',META[resolved]);
  return resolved;
}

/** Keeps a `system` preference in step with the OS while the editor is open. */
export function watchSystemTheme(onChange:()=>void){
  if(typeof matchMedia!=='function')return;
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',onChange);
}

export const nextTheme=(theme:Theme):Theme=>theme==='system'?'light':theme==='light'?'dark':'system';
