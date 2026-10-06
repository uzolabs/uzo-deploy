// Prints chain data from @uzolabs/sdk as shell exports, so Foundry never has it typed in.
// Usage: eval "$(node script/sdk-env.mjs)"            testnet only (default, used by CI)
//        eval "$(node script/sdk-env.mjs --mainnet)"  adds mainnet (manual runs only)
// PowerShell: node script/sdk-env.mjs --powershell | Invoke-Expression
import { addresses, botChain, botChainTestnet } from "@uzolabs/sdk";

const ps = process.argv.includes("--powershell");
const lines = [];
const set = (name, value) => lines.push(ps ? `$env:${name} = "${value}"` : `export ${name}=${value}`);
const add = (prefix, chain) => {
  const id = chain.id;
  set(`${prefix}_CHAIN_ID`, id);
  set(`${prefix}_RPC_URL`, chain.rpcUrls.default.http[0]);
  set(`${prefix}_EXPLORER_URL`, chain.blockExplorers.default.url);
  set(`${prefix}_USDT`, addresses[id].usdt);
};

add("BOT_TESTNET", botChainTestnet);
if (process.argv.includes("--mainnet")) add("BOT_MAINNET", botChain);

console.log(lines.join("\n"));
