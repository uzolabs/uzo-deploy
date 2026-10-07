// Typed ABIs for the app, generated from the Foundry build in contracts/out.
// Run `forge build` in contracts/ first, then `pnpm abi`. CI regenerates and diffs the output.
import { defineConfig } from "@wagmi/cli"
import { foundry } from "@wagmi/cli/plugins"

export default defineConfig({
  out: "lib/abi/generated.ts",
  plugins: [
    foundry({
      project: "contracts",
      forge: { build: false },
      include: [
        "UzoToken.sol/**",
        "UzoNFT.sol/**",
        "UzoTipJar.sol/**",
        "UzoTokenFactory.sol/**",
        "UzoNFTFactory.sol/**",
        "UzoTipJarFactory.sol/**",
      ],
    }),
  ],
})
