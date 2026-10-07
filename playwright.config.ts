import { defineConfig, devices } from "@playwright/test"

// End-to-end tests run against a local Anvil fork of BOT Chain testnet. The app connects a
// mock wallet for Anvil's first public dev account, so no real key and no real network
// is ever used. See e2e/start-anvil.mjs and components/wallet/providers.tsx.

const ANVIL_PORT = 8545
const APP_PORT = 3100

/** Anvil's first dev account. Public and unlocked on every Anvil node. */
export const E2E_ACCOUNT = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

const env = {
  NEXT_PUBLIC_E2E_ACCOUNT: E2E_ACCOUNT,
  NEXT_PUBLIC_TESTNET_RPC_URL: `http://127.0.0.1:${ANVIL_PORT}`,
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: "e2e-placeholder",
}

export default defineConfig({
  testDir: "e2e",
  // Every test shares one fork and one wallet, so run them one after another.
  workers: 1,
  fullyParallel: false,
  timeout: 120_000,
  expect: { timeout: 30_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 800 } } },
  ],
  webServer: [
    {
      command: "node e2e/start-anvil.mjs",
      port: ANVIL_PORT,
      env: { E2E_ANVIL_PORT: String(ANVIL_PORT) },
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      // A separate build directory, so the E2E build never replaces a normal one.
      command: `pnpm next build && pnpm next start --port ${APP_PORT}`,
      url: `http://localhost:${APP_PORT}`,
      env: { ...env, NEXT_DIST_DIR: ".next-e2e" },
      reuseExistingServer: !process.env.CI,
      timeout: 600_000,
    },
  ],
})
