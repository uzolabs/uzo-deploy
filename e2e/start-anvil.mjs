// Starts Anvil as a local fork of BOT Chain testnet for the end-to-end tests.
// The RPC URL and chain id come from @uzolabs/sdk, never typed in here.
// Mainnet is never forked: the tests must not touch real funds.
import { spawn } from "node:child_process"
import { botChainTestnet } from "@uzolabs/sdk"

const port = process.env.E2E_ANVIL_PORT ?? "8545"
const args = ["--fork-url", botChainTestnet.rpcUrls.default.http[0], "--chain-id", String(botChainTestnet.id), "--port", port]

const anvil = spawn("anvil", args, { stdio: "inherit", shell: process.platform === "win32" })
anvil.on("exit", (code) => process.exit(code ?? 0))
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => anvil.kill(signal))
