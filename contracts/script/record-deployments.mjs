// Writes the factory addresses and deploy blocks from a Deploy.s.sol broadcast into
// config/deployments.json, after checking them on chain.
// Usage: node script/record-deployments.mjs testnet|mainnet
//
// Checks that each factory has code and that the tip jar factory's usdt() equals the SDK's
// USDT. Factories reused from an earlier run keep their existing entry. Chain data comes from
// the Uzo SDK only.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createPublicClient, http, getAddress, parseAbi } from "viem";
import { addresses, botChain, botChainTestnet } from "@uzolabs/sdk";

const network = process.argv[2] ?? "testnet";
const chain = { testnet: botChainTestnet, mainnet: botChain }[network];
if (!chain) throw new Error(`Unknown network "${network}". Use testnet or mainnet.`);

const FACTORIES = {
  UzoTokenFactory: { key: "token", templateId: "uzo.token", version: 1 },
  UzoNFTFactory: { key: "nft", templateId: "uzo.nft", version: 1 },
  UzoTipJarFactory: { key: "tipJar", templateId: "uzo.tipjar", version: 1 },
};

const broadcastPath = new URL(`../broadcast/Deploy.s.sol/${chain.id}/run-latest.json`, import.meta.url);
const configPath = new URL("../../config/deployments.json", import.meta.url);

if (!existsSync(broadcastPath)) {
  throw new Error(`No broadcast found for chain ${chain.id}. Run Deploy.s.sol with --broadcast first.`);
}
const run = JSON.parse(readFileSync(broadcastPath, "utf8"));
const config = JSON.parse(readFileSync(configPath, "utf8"));
const client = createPublicClient({ chain, transport: http() });

const entry = (config.chains[String(chain.id)] ??= { network, factories: {} });

for (const tx of run.transactions) {
  const meta = FACTORIES[tx.contractName];
  if (!meta || !tx.contractAddress) continue;
  const receipt = run.receipts.find((r) => r.transactionHash === tx.hash);
  if (!receipt || Number(receipt.status) !== 1) {
    throw new Error(`${tx.contractName}: no successful receipt for ${tx.hash}`);
  }
  const address = getAddress(tx.contractAddress);
  const code = await client.getCode({ address });
  if (!code || code === "0x") throw new Error(`${tx.contractName}: no code at ${address}`);

  entry.factories[meta.key] = {
    contract: tx.contractName,
    address,
    deployBlock: Number(BigInt(receipt.blockNumber)),
    txHash: tx.hash,
    templateId: meta.templateId,
    version: meta.version,
  };
  console.log(`${tx.contractName}: ${address} (block ${entry.factories[meta.key].deployBlock})`);
}

// The tip jar factory fixes USDT forever. It must be the SDK's USDT.
const tipJar = entry.factories.tipJar;
if (tipJar) {
  const onChain = await client.readContract({
    address: tipJar.address,
    abi: parseAbi(["function usdt() view returns (address)"]),
    functionName: "usdt",
  });
  const expected = getAddress(addresses[chain.id].usdt);
  if (getAddress(onChain) !== expected) {
    throw new Error(`UzoTipJarFactory.usdt() is ${onChain}, but the SDK says ${expected}`);
  }
  console.log(`UzoTipJarFactory.usdt() matches the SDK: ${expected}`);
}

writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
console.log(`Updated config/deployments.json for chain ${chain.id}.`);
