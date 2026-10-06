// Verifies a contract deployed through a Uzo factory on BOTScan, using the Blockscout v2
// standard-input API and the committed files in contracts/verify/. This is the flow the app's
// /api/verify route will run (Phase 4), written as a script first so it can be tested on chain.
// Usage: node script/verify-instance.mjs testnet|mainnet <instance address> [creation tx hash]
//
// Steps, in order:
//   1. Find the creation transaction (argument, or BOTScan's address endpoint).
//   2. Read the receipt from the RPC and find our factory's Deployed event for this instance.
//      The factory must be one recorded in config/deployments.json. Nothing comes from a client.
//   3. Check uzoTemplate() on the instance matches the event.
//   4. Rebuild the constructor arguments from the factory call.
//   5. Submit the standard JSON input and poll until BOTScan reports it verified.
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  createPublicClient,
  http,
  getAddress,
  parseAbi,
  parseAbiItem,
  decodeEventLog,
  decodeFunctionData,
  encodeAbiParameters,
  parseAbiParameters,
  hexToString,
  isAddressEqual,
} from "viem";
import { botChain, botChainTestnet } from "@uzolabs/sdk";

const COMPILER = "v0.8.28+commit.7893614a";

const TEMPLATES = {
  "uzo.token": { name: "UzoToken", path: "src/templates/UzoToken.sol" },
  "uzo.nft": { name: "UzoNFT", path: "src/templates/UzoNFT.sol" },
  "uzo.tipjar": { name: "UzoTipJar", path: "src/templates/UzoTipJar.sol" },
};

const deployedEvent = parseAbiItem(
  "event Deployed(address indexed deployer, address indexed instance, bytes32 indexed templateId, uint16 version)",
);

const factoryAbi = parseAbi([
  "function deploy(bytes32 userSalt, string name, string symbol, uint256 initialSupply, address recipient) returns (address)",
  "function deploy(bytes32 userSalt, (string name, string symbol, string baseURI, uint256 maxSupply, address owner, address royaltyReceiver, uint96 royaltyBps) p) returns (address)",
  "function deploy(bytes32 userSalt, address recipient, string title) returns (address)",
  "function usdt() view returns (address)",
]);

const templateAbi = parseAbi(["function uzoTemplate() view returns (bytes32 id, uint16 version)"]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function bytes32ToId(b) {
  return hexToString(b, { size: 32 }).replace(/\0+$/, "");
}

async function getJson(url) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`GET ${url} returned ${res.status}`);
  return res.json();
}

/** Finds the creation transaction through BOTScan, waiting briefly for it to index. */
async function creationTx(explorer, address) {
  for (let i = 0; i < 10; i++) {
    const info = await getJson(`${explorer}/api/v2/addresses/${address}`).catch(() => null);
    if (info?.creation_transaction_hash) return info.creation_transaction_hash;
    await sleep(2000);
  }
  throw new Error(`BOTScan has no creation transaction for ${address} yet. Try again shortly.`);
}

/** Rebuilds the constructor arguments (hex, no 0x) from the factory call. */
async function constructorArgs(client, tx, factory, templateId) {
  if (!tx.to || !isAddressEqual(tx.to, factory)) {
    // Called through another contract (for example a multisig). Phase 4 adds a fallback that
    // reads the creation bytecode from BOTScan and strips our known creation code.
    throw new Error(`The creation transaction did not call the factory directly (to: ${tx.to}).`);
  }
  const { args } = decodeFunctionData({ abi: factoryAbi, data: tx.input });
  let encoded;
  if (templateId === "uzo.token") {
    const [, name, symbol, supply, recipient] = args;
    encoded = encodeAbiParameters(parseAbiParameters("string, string, uint256, address"), [
      name,
      symbol,
      supply,
      recipient,
    ]);
  } else if (templateId === "uzo.nft") {
    const p = args[1];
    encoded = encodeAbiParameters(
      parseAbiParameters("string, string, string, uint256, address, address, uint96"),
      [p.name, p.symbol, p.baseURI, p.maxSupply, p.owner, p.royaltyReceiver, p.royaltyBps],
    );
  } else if (templateId === "uzo.tipjar") {
    const [, recipient, title] = args;
    const usdt = await client.readContract({ address: factory, abi: factoryAbi, functionName: "usdt" });
    encoded = encodeAbiParameters(parseAbiParameters("address, address, string"), [
      recipient,
      usdt,
      title,
    ]);
  } else {
    throw new Error(`Unknown template ${templateId}`);
  }
  return encoded.slice(2);
}

/**
 * Steps 1 to 4: checks the instance came from one of our factories and builds the request.
 * Sends nothing to BOTScan except the optional creation transaction lookup.
 * `factories` is the chain's entry from config/deployments.json.
 */
export async function prepareVerification({ chain, factories, address, txHash, client }) {
  const explorer = chain.blockExplorers.default.url;
  client ??= createPublicClient({ chain, transport: http() });
  const instance = getAddress(address);

  const hash = txHash ?? (await creationTx(explorer, instance));
  const receipt = await client.getTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`Creation transaction ${hash} failed`);

  // Find the Deployed event for this instance, emitted by one of our recorded factories.
  const ours = Object.values(factories).map((f) => getAddress(f.address));
  let event;
  let factory;
  for (const l of receipt.logs) {
    if (!ours.some((a) => isAddressEqual(a, l.address))) continue;
    try {
      const decoded = decodeEventLog({ abi: [deployedEvent], data: l.data, topics: l.topics });
      if (isAddressEqual(decoded.args.instance, instance)) {
        event = decoded.args;
        factory = getAddress(l.address);
        break;
      }
    } catch {
      // Not a Deployed event.
    }
  }
  if (!event) throw new Error(`${instance} was not created by a Uzo factory in ${hash}`);

  const templateId = bytes32ToId(event.templateId);
  const template = TEMPLATES[templateId];
  if (!template) throw new Error(`Unknown template id ${templateId}`);

  const [onChainId, onChainVersion] = await client.readContract({
    address: instance,
    abi: templateAbi,
    functionName: "uzoTemplate",
  });
  if (bytes32ToId(onChainId) !== templateId || onChainVersion !== event.version) {
    throw new Error(`uzoTemplate() on ${instance} does not match the factory event`);
  }

  const tx = await client.getTransaction({ hash });
  const constructorArgsHex = await constructorArgs(client, tx, factory, templateId);

  return {
    address: instance,
    txHash: hash,
    factory,
    deployer: getAddress(event.deployer),
    templateId,
    version: event.version,
    contractName: `${template.path}:${template.name}`,
    inputFile: `${template.name}.json`,
    constructorArgs: constructorArgsHex,
  };
}

/** Step 5: submits a prepared request and polls until BOTScan reports it verified. */
export async function submitVerification({ chain, prepared, log = () => {} }) {
  const explorer = chain.blockExplorers.default.url;
  const { address, inputFile, contractName, constructorArgs: args } = prepared;
  const started = Date.now();

  const input = readFileSync(new URL(`../verify/${inputFile}`, import.meta.url));
  const form = new FormData();
  form.set("compiler_version", COMPILER);
  form.set("contract_name", contractName);
  form.set("license_type", "mit");
  form.set("autodetect_constructor_args", "false");
  form.set("constructor_args", args);
  form.set("files[0]", new Blob([input], { type: "application/json" }), inputFile);

  const res = await fetch(
    `${explorer}/api/v2/smart-contracts/${address}/verification/via/standard-input`,
    { method: "POST", body: form },
  );
  const body = await res.json().catch(() => ({}));
  log(`BOTScan: ${res.status} ${body.message ?? JSON.stringify(body)}`);
  if (!res.ok) throw new Error(`Verification request failed: ${res.status} ${JSON.stringify(body)}`);

  const result = { address, template: prepared.templateId, txHash: prepared.txHash };
  if (/already verified/i.test(body.message ?? "")) {
    return { ...result, status: "already verified", seconds: (Date.now() - started) / 1000 };
  }

  for (let i = 0; i < 30; i++) {
    await sleep(2000);
    const info = await getJson(`${explorer}/api/v2/addresses/${address}`).catch(() => null);
    if (info?.is_verified) {
      return { ...result, status: "verified", seconds: (Date.now() - started) / 1000 };
    }
  }
  throw new Error(`${address} is still not verified after 60 s`);
}

/** Prepares and submits. Returns { address, template, txHash, status, seconds }. */
export async function verifyInstance({ chain, factories, address, txHash, log = () => {} }) {
  const prepared = await prepareVerification({ chain, factories, address, txHash });
  log(`${prepared.contractName} v${prepared.version}, factory ${prepared.factory}, tx ${prepared.txHash}`);
  return submitVerification({ chain, prepared, log });
}

// Command line entry point. `--smoke` verifies every smoke test recorded in
// config/deployments.json and marks each one verified there.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [network = "testnet", address, txHash] = process.argv.slice(2);
  const chain = { testnet: botChainTestnet, mainnet: botChain }[network];
  if (!chain || !address) {
    console.error("Usage: node script/verify-instance.mjs testnet|mainnet <address> [tx hash]");
    console.error("       node script/verify-instance.mjs testnet|mainnet --smoke");
    process.exit(1);
  }
  const configPath = new URL("../../config/deployments.json", import.meta.url);
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const entry = config.chains[String(chain.id)] ?? {};
  const factories = entry.factories ?? {};
  if (!Object.keys(factories).length) throw new Error(`No factories recorded for chain ${chain.id}`);

  if (address === "--smoke") {
    for (const s of entry.smokeTests ?? []) {
      const result = await verifyInstance({
        chain,
        factories,
        address: s.address,
        txHash: s.txHash,
        log: console.log,
      });
      console.log(JSON.stringify(result));
      s.verified = true;
    }
    writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
  } else {
    const result = await verifyInstance({ chain, factories, address, txHash, log: console.log });
    console.log(JSON.stringify(result));
  }
}
