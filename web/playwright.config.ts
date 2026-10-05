import { defineConfig } from "@playwright/test";

// Ports of their own, so a run never collides with the dev servers.
const APP_PORT = 3101;
const MOCK_PORT = 8597;
const MOCK_ORIGIN = `http://127.0.0.1:${MOCK_PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  // The mock API keeps one in-memory store, so tests run one at a time.
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    // In production nginx sets this from the session; here it stands in for being signed in.
    extraHTTPHeaders: { "X-Auth-Email": "partner@example.com" },
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node dev/mock-api.mjs",
      env: { MOCK_PORT: String(MOCK_PORT), MOCK_SPEED: "0.02" },
      port: MOCK_PORT,
      reuseExistingServer: false,
    },
    {
      // Rewrites are fixed at build time, so the mock's address is set for both steps.
      command: `npm run build && npx next start -p ${APP_PORT}`,
      env: { BRIEF_API_INTERNAL: MOCK_ORIGIN, RADAR_API_INTERNAL: MOCK_ORIGIN },
      port: APP_PORT,
      reuseExistingServer: false,
      timeout: 240_000,
    },
  ],
});
