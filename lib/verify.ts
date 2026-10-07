// Builds a BOTScan verification request for an instance created by a Uzo factory.
// Pure functions only, so they run in tests; lib/botscan.ts does the network and file work.
// Ported from contracts/script/verify-instance.mjs, which verified the Phase 2 smoke tests.
import {
  decodeEventLog,
  decodeFunctionData,
  encodeAbiParameters,
  getAddress,
  hexToString,
  isAddressEqual,
  parseAbiParameters,
  type Address,
  type Hex,
  type Log,
} from "viem"
import { uzoNftFactoryAbi, uzoTipJarFactoryAbi, uzoTokenFactoryAbi } from "@/lib/abi/generated"

/** The exact compiler the committed standard JSON inputs were built with. */
export const COMPILER = "v0.8.28+commit.7893614a"

export const VERIFY_TEMPLATES = {
  "uzo.token": { name: "UzoToken", path: "src/templates/UzoToken.sol" },
  "uzo.nft": { name: "UzoNFT", path: "src/templates/UzoNFT.sol" },
  "uzo.tipjar": { name: "UzoTipJar", path: "src/templates/UzoTipJar.sol" },
} as const

export type TemplateId = keyof typeof VERIFY_TEMPLATES

const factoryAbi = [...uzoTokenFactoryAbi, ...uzoNftFactoryAbi, ...uzoTipJarFactoryAbi]
const deployedAbi = uzoTokenFactoryAbi.filter((x) => x.type === "event" && x.name === "Deployed")

export function bytes32ToId(b: Hex) {
  return hexToString(b, { size: 32 }).replace(/\0+$/, "")
}

export function isTemplateId(id: string): id is TemplateId {
  return id in VERIFY_TEMPLATES
}

export type DeployedEvent = {
  factory: Address
  deployer: Address
  instance: Address
  templateId: string
  version: number
}

/** Finds the Deployed event for `instance` emitted by one of `factories`. */
export function findDeployedEvent(
  logs: readonly Pick<Log, "address" | "data" | "topics">[],
  factories: readonly Address[],
  instance: Address,
): DeployedEvent | undefined {
  for (const l of logs) {
    if (!factories.some((f) => isAddressEqual(f, l.address))) continue
    try {
      const { eventName, args } = decodeEventLog({ abi: deployedAbi, data: l.data, topics: l.topics as never })
      if (eventName !== "Deployed" || !isAddressEqual(args.instance, instance)) continue
      return {
        factory: getAddress(l.address),
        deployer: getAddress(args.deployer),
        instance: getAddress(args.instance),
        templateId: bytes32ToId(args.templateId),
        version: args.version,
      }
    } catch {
      // Not a Deployed event.
    }
  }
  return undefined
}

/**
 * Rebuilds the instance's constructor arguments from the factory call, as hex without 0x.
 * The tip jar's USDT is not in the call: the factory passes its own immutable, read by the caller.
 */
export function constructorArgsFor(templateId: TemplateId, calldata: Hex, usdt?: Address) {
  const { functionName, args } = decodeFunctionData({ abi: factoryAbi, data: calldata })
  if (functionName !== "deploy") throw new Error(`Expected a deploy call, got ${functionName}`)
  let encoded: Hex
  if (templateId === "uzo.token") {
    const [, name, symbol, supply, recipient] = args as readonly [Hex, string, string, bigint, Address]
    encoded = encodeAbiParameters(parseAbiParameters("string, string, uint256, address"), [
      name,
      symbol,
      supply,
      recipient,
    ])
  } else if (templateId === "uzo.nft") {
    const p = (args as readonly [Hex, NftParamsTuple])[1]
    encoded = encodeAbiParameters(
      parseAbiParameters("string, string, string, uint256, address, address, uint96"),
      [p.name, p.symbol, p.baseURI, p.maxSupply, p.owner, p.royaltyReceiver, p.royaltyBps],
    )
  } else {
    if (!usdt) throw new Error("The tip jar needs the factory's USDT address")
    const [, recipient, title] = args as readonly [Hex, Address, string]
    encoded = encodeAbiParameters(parseAbiParameters("address, address, string"), [recipient, usdt, title])
  }
  return encoded.slice(2)
}

type NftParamsTuple = {
  name: string
  symbol: string
  baseURI: string
  maxSupply: bigint
  owner: Address
  royaltyReceiver: Address
  royaltyBps: bigint
}

export type VerificationRequest = {
  address: Address
  contractName: string
  inputFile: string
  constructorArgs: string
}

export function verificationRequest(address: Address, templateId: TemplateId, constructorArgs: string): VerificationRequest {
  const t = VERIFY_TEMPLATES[templateId]
  return { address, contractName: `${t.path}:${t.name}`, inputFile: `${t.name}.json`, constructorArgs }
}

/** The multipart form BOTScan's v2 standard-input endpoint expects. */
export function verificationForm(req: VerificationRequest, input: string | Uint8Array) {
  const form = new FormData()
  form.set("compiler_version", COMPILER)
  form.set("contract_name", req.contractName)
  form.set("license_type", "mit")
  form.set("autodetect_constructor_args", "false")
  form.set("constructor_args", req.constructorArgs)
  const body = typeof input === "string" ? input : new Uint8Array(input)
  form.set("files[0]", new Blob([body], { type: "application/json" }), req.inputFile)
  return form
}

/** The command anyone can run from a clone of the repo if the app's verification fails. */
export function manualVerifyCommand(network: "testnet" | "mainnet", address: string, txHash?: string) {
  return `node script/verify-instance.mjs ${network} ${address}${txHash ? ` ${txHash}` : ""}`
}
