// Prints chain data from @uzolabs/sdk as shell exports, so Foundry never has it typed in.
// Usage: eval "$(node script/sdk-env.mjs)"            testnet only (default, used by CI)
//        eval "$(node script/sdk-env.mjs --mainnet)"  adds mainnet (manual runs only)
import { addresses, botChain, botChainTestnet } from "@uzolabs/sdk";

const lines = [];
const add = (prefix, chain) => {
  const id = chain.id;
  lines.push(`export ${prefix}_CHAIN_ID=${id}`);
  lines.push(`export ${prefix}_RPC_URL=${chain.rpcUrls.default.http[0]}`);
  lines.push(`export ${prefix}_EXPLORER_URL=${chain.blockExplorers.default.url}`);
  lines.push(`export ${prefix}_USDT=${addresses[id].usdt}`);
};

add("BOT_TESTNET", botChainTestnet);
if (process.argv.includes("--mainnet")) add("BOT_MAINNET", botChain);

console.log(lines.join("\n"));
