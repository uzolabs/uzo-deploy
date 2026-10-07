import type { NextConfig } from "next"

// RainbowKit bundles the Base Account connector, whose Coinbase SDK lazily imports x402
// payment packages. Uzo Deploy never reaches that code, so they resolve to an empty module.
const unused = ["@x402/core/client", "@x402/evm", "@x402/evm/exact/client", "@x402/evm/upto/client", "@x402/svm/exact/client"]

const nextConfig: NextConfig = {
  // The end-to-end tests build into their own folder (see playwright.config.ts).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // /api/verify reads our own standard JSON inputs from disk; ship them with the function.
  outputFileTracingIncludes: {
    "/api/verify": ["./contracts/verify/*.json"],
  },
  // WalletConnect pulls in optional Node-only loggers that the browser bundle never uses.
  serverExternalPackages: ["pino-pretty"],
  turbopack: {
    resolveAlias: Object.fromEntries(unused.map((m) => [m, "./lib/empty-module.cjs"])),
  },
}

export default nextConfig
