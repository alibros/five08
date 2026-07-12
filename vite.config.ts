import {defineConfig} from 'vite';

export default defineConfig({
  build:{rollupOptions:{input:{landing:'index.html',app:'app/index.html'}}}
});
