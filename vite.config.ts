import {defineConfig} from 'vite';

export default defineConfig({
  build:{rollupOptions:{input:{landing:'index.html',app:'app/index.html'}}},
  // e2e/ belongs to Playwright; Vitest owns the unit tests beside the source.
  test:{include:['src/**/*.test.ts'],environment:'jsdom'},
});
