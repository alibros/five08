import {execSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {defineConfig} from 'vite';

/* The title block on the public page carries a real revision and date, read
   from git at build time. Outside a checkout it degrades to a plain build. */
const git=(args:string)=>{try{return execSync(`git ${args}`,{stdio:['ignore','pipe','ignore']}).toString().trim();}catch{return'';}};
const sha=git('rev-parse --short HEAD');
const count=git('rev-list --count HEAD');
const date=(git('log -1 --format=%cs')||new Date().toISOString().slice(0,10));
// Brand assets can change between commits; the offline cache needs their content revision.
const brandRevision=createHash('sha256').update(readFileSync(new URL('./public/five08-logo.svg',import.meta.url))).digest('hex').slice(0,12);

export default defineConfig({
  define:{
    __FIVE08_REV__:JSON.stringify(sha?`${count}.${sha}`:'dev'),
    __FIVE08_DATE__:JSON.stringify(date),
    __FIVE08_BRAND_REV__:JSON.stringify(brandRevision),
  },
  build:{rollupOptions:{input:{landing:'index.html',app:'app/index.html'}}},
  // e2e/ belongs to Playwright; Vitest owns the unit tests beside the source.
  test:{include:['src/**/*.test.ts'],environment:'jsdom'},
});
