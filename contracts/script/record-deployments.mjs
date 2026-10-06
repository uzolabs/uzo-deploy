// Records what Deploy.s.sol and DeploySmoke.s.sol broadcast into config/deployments.json, after
// checking it on chain, and adds the sending wallets to config/team-addresses.json.
// Usage: node script/record-deployments.mjs testnet|mainnet
//
// Factories: checks each has code and that the tip jar factory's usdt() equals the SDK's USDT.
// Factories reused from an earlier run keep their existing entry.
// Smoke tests: reads the factories' Deployed events from the DeploySmoke receipts.
// Chain data comes from the Uzo SDK only.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import {
  createPublicClient,
  http,
  getAddress,
  parseAbi,
  parseAbiItem,
  decodeEventLog,
  hexToString,
  isAddressEqual,
} from "viem";
import { addresses, botChain, botChainTestnet } from "@uzolabs/sdk";

const network = process.argv[2] ?? "testnet";
const chain = { testnet: botChainTestnet, mainnet: botChain }[network];
if (!chain) throw new Error(`Unknown network "${network}". Use testnet or mainnet.`);

const FACTORIES = {
  UzoTokenFactory: { key: "token", templateId: "uzo.token", version: 1 },
  UzoNFTFactory: { key: "nft", templateId: "uzo.nft", version: 1 },
  UzoTipJarFactory: { key: "tipJar", templateId: "uzo.tipjar", version: 1 },
};

const deployedEvent = parseAbiItem(
  "event Deployed(address indexed deployer, address indexed instance, bytes32 indexed templateId, uint16 version)",
);

const broadcast = (script) =>
  new URL(`../broadcast/${script}/${chain.id}/run-latest.json`, import.meta.url);
const configPath = new URL("../../config/deployments.json", import.meta.url);
const teamPath = new URL("../../config/team-addresses.json", import.meta.url);

const config = JSON.parse(readFileSync(configPath, "utf8"));
const team = JSON.parse(readFileSync(teamPath, "utf8"));
const client = createPublicClient({ chain, transport: http() });
const entry = (config.chains[String(chain.id)] ??= { network, factories: {} });

/** Adds `address` to team-addresses.json for this chain, with a label, if it is not there. */
function addTeam(address, label) {
  const a = getAddress(address);
  let row = team.addresses.find((t) => isAddressEqual(t.address, a));
  if (!row) {
    row = { address: a, label, chains: [] };
    team.addresses.push(row);
    console.log(`Team address added: ${a} (${label})`);
  }
  if (!row.chains.includes(chain.id)) row.chains.push(chain.id);
}

function receiptFor(run, tx) {
  const receipt = run.receipts.find((r) => r.transactionHash === tx.hash);
  if (!receipt || Number(receipt.status) !== 1) {
    throw new Error(`${tx.contractName ?? "transaction"}: no successful receipt for ${tx.hash}`);
  }
  return receipt;
}

// 1. Factories.
if (existsSync(broadcast("Deploy.s.sol"))) {
  const run = JSON.parse(readFileSync(broadcast("Deploy.s.sol"), "utf8"));
  for (const tx of run.transactions) {
    const meta = FACTORIES[tx.contractName];
    if (!meta || !tx.contractAddress) continue;
    const receipt = receiptFor(run, tx);
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
    addTeam(tx.transaction.from, "Factory deployer");
    console.log(`${tx.contractName}: ${address} (block ${entry.factories[meta.key].deployBlock})`);
  }
} else {
  console.log(`No Deploy.s.sol broadcast for chain ${chain.id}; factories unchanged.`);
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

// 2. Smoke-test instances, deployed by the team through the factories.
if (existsSync(broadcast("DeploySmoke.s.sol"))) {
  const run = JSON.parse(readFileSync(broadcast("DeploySmoke.s.sol"), "utf8"));
  const ours = Object.values(entry.factories).map((f) => getAddress(f.address));
  entry.smokeTests ??= [];
  for (const tx of run.transactions) {
    const receipt = receiptFor(run, tx);
    for (const l of receipt.logs) {
      if (!ours.some((a) => isAddressEqual(a, l.address))) continue;
      const { args } = decodeEventLog({ abi: [deployedEvent], data: l.data, topics: l.topics });
      const instance = getAddress(args.instance);
      if (entry.smokeTests.some((s) => isAddressEqual(s.address, instance))) continue;
      entry.smokeTests.push({
        templateId: hexToString(args.templateId, { size: 32 }).replace(/\0+$/, ""),
        version: args.version,
        address: instance,
        deployer: getAddress(args.deployer),
        deployBlock: Number(BigInt(receipt.blockNumber)),
        txHash: tx.hash,
        verified: false,
      });
      addTeam(args.deployer, "Smoke test deployer");
      console.log(`Smoke test ${entry.smokeTests.at(-1).templateId}: ${instance}`);
    }
  }
}

writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
writeFileSync(teamPath, JSON.stringify(team, null, 2) + "\n");
console.log(`Updated config/deployments.json and config/team-addresses.json for chain ${chain.id}.`);
