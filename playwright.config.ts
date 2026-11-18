import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 2,
  timeout: 30000,
  expect: { timeout: 7000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173/",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // 离线缓存会接管请求，page.route 的模拟就拦不到了；只有 pwa.spec.ts 打开它
    serviceWorkers: "block",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm run preview",
    url: "http://127.0.0.1:4173/",
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
