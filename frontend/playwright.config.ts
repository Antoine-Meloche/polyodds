import { defineConfig, devices } from '@playwright/test';

const rootDir = '..';
const frontendPort = 4173;
const backendPort = 3000;
const postgresPort = 55432;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${frontendPort}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: `bash ./scripts/e2e-postgres.sh up`,
      cwd: rootDir,
      port: postgresPort,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'cargo run -p backend',
      cwd: rootDir,
      port: backendPort,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: {
        DATABASE_URL: `postgres://polyodds:polyodds@127.0.0.1:${postgresPort}/polyodds_e2e`,
        JWT_SECRET: 'dev_only_secret_change_me_32_chars_min',
        BIND_ADDR: '127.0.0.1:3000',
        FRONTEND_ORIGIN: `http://127.0.0.1:${frontendPort}`,
        RUST_LOG: 'backend=info,tower_http=info',
      },
    },
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${frontendPort}`,
      cwd: '.',
      url: `http://127.0.0.1:${frontendPort}`,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});