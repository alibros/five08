import {applyTheme as apply,nextTheme,systemPrefersDark,watchSystemTheme,type Theme} from './theme';

const KEY='five08:site-theme';

export function readTheme():Theme{
  try{const raw=localStorage.getItem(KEY);return raw==='light'||raw==='dark'?raw:'system';}catch{return'system';}
}

export function applyTheme(theme:Theme){
  try{theme==='system'?localStorage.removeItem(KEY):localStorage.setItem(KEY,theme);}catch{/* private mode */}
  return apply(theme);
}

export {nextTheme,systemPrefersDark,watchSystemTheme,type Theme};
