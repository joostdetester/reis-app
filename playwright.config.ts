import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:5183',
  },
  webServer: {
    command: 'npm run dev -- --port 5183',
    url: 'http://localhost:5183',
    reuseExistingServer: true,
  },
})
