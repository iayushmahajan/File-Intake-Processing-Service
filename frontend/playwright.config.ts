import { defineConfig } from "@playwright/test";
const workspace = process.env.E2E_WORKSPACE;
if (!workspace)
  throw new Error("Use pnpm test:e2e so database and files are isolated.");
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: "http://127.0.0.1:5174",
    browserName: "chromium",
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command:
        "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5174",
      url: "http://127.0.0.1:5174",
      reuseExistingServer: false,
      env: { VITE_API_BASE_URL: "http://127.0.0.1:8011" },
    },
  ],
});
