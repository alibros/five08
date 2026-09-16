import {defineConfig} from '@playwright/test';

/**
 * The editor is a single module with top-level side effects, so it cannot be
 * unit-tested — which is how a toolbar button once shipped wired to an id that
 * did not exist. These run the built app in a real browser instead.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    ...(process.env.PLAYWRIGHT_CHROME_PATH?{launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROME_PATH}}:{}),
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/app/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
