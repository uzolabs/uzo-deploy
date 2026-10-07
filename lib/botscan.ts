import "server-only"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { createPublicClient, getAddress, http, isAddressEqual, type Address, type Hash } from "viem"
import { uzoTipJarFactoryAbi, uzoTokenAbi } from "@/lib/abi/generated"
import { explorerUrl, type BotChain } from "@/lib/chains"
import { factoriesFor } from "@/lib/deployments"
import {
  bytes32ToId,
  constructorArgsFor,
  findDeployedEvent,
  isTemplateId,
  verificationForm,
  verificationRequest,
} from "@/lib/verify"

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** A failure the person can act on. The message is safe to show. */
export class VerifyError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message)
  }
}

type AddressInfo = { is_verified?: boolean; creation_transaction_hash?: string | null }

async function addressInfo(chain: BotChain, address: Address): Promise<AddressInfo | null> {
  const res = await fetch(`${explorerUrl(chain)}/api/v2/addresses/${address}`, {
    headers: { accept: "application/json" },
    cache: "no-store",
  }).catch(() => null)
  if (!res?.ok) return null
  return (await res.json().catch(() => null)) as AddressInfo | null
}

/** true or false from BOTScan, or null when BOTScan does not answer. Unknown is never "not verified". */
export async function isVerified(chain: BotChain, address: Address): Promise<boolean | null> {
  const info = await addressInfo(chain, address)
  return info ? info.is_verified === true : null
}

async function creationTx(chain: BotChain, address: Address) {
  for (let i = 0; i < 5; i++) {
    const hash = (await addressInfo(chain, address))?.creation_transaction_hash
    if (hash) return hash as Hash
    await sleep(2000)
  }
  throw new VerifyError("BOTScan has not indexed this contract yet. Try again in a few seconds.", 409)
}

export type VerifyResult = {
  address: Address
  templateId: string
  version: number
  txHash: Hash
  status: "verified" | "already verified" | "pending"
  seconds: number
}

/**
 * Checks the address was created by one of our recorded factories, rebuilds the constructor
 * arguments from the creation transaction and submits our own standard JSON input to BOTScan.
 * Nothing about the contract comes from the client except its address and, optionally, the hash.
 */
export async function verifyInstance(chain: BotChain, rawAddress: string, txHash?: Hash): Promise<VerifyResult> {
  const started = Date.now()
  const seconds = () => (Date.now() - started) / 1000
  const instance = getAddress(rawAddress)
  const factories = Object.values(factoriesFor(chain.id)).map((f) => getAddress(f.address))
  if (factories.length === 0) throw new VerifyError(`There are no Uzo factories on ${chain.name} yet.`)

  const client = createPublicClient({ chain, transport: http() })
  const hash = txHash ?? (await creationTx(chain, instance))
  const receipt = await client.getTransactionReceipt({ hash }).catch(() => null)
  if (!receipt) throw new VerifyError("That transaction was not found on chain.", 404)
  if (receipt.status !== "success") throw new VerifyError("The creation transaction failed.")

  const event = findDeployedEvent(receipt.logs, factories, instance)
  if (!event) throw new VerifyError("This address was not created by a Uzo factory.")
  if (!isTemplateId(event.templateId)) throw new VerifyError(`Unknown template ${event.templateId}.`)

  const [onChainId, onChainVersion] = await client.readContract({
    address: instance,
    abi: uzoTokenAbi,
    functionName: "uzoTemplate",
  })
  if (bytes32ToId(onChainId) !== event.templateId || onChainVersion !== event.version) {
    throw new VerifyError("The contract does not report the template its factory recorded.")
  }

  const base = { address: instance, templateId: event.templateId, version: event.version, txHash: hash }
  if (await isVerified(chain, instance)) return { ...base, status: "already verified", seconds: seconds() }

  const tx = await client.getTransaction({ hash })
  if (!tx.to || !isAddressEqual(tx.to, event.factory)) {
    // Deployed through another contract, such as a multisig. Phase 4 adds a fallback for this.
    throw new VerifyError("The creation transaction did not call the factory directly, so it cannot be rebuilt yet.")
  }
  const usdt =
    event.templateId === "uzo.tipjar"
      ? await client.readContract({ address: event.factory, abi: uzoTipJarFactoryAbi, functionName: "usdt" })
      : undefined
  const req = verificationRequest(instance, event.templateId, constructorArgsFor(event.templateId, tx.input, usdt))
  const input = await readFile(path.join(process.cwd(), "contracts", "verify", req.inputFile))

  const res = await fetch(`${explorerUrl(chain)}/api/v2/smart-contracts/${instance}/verification/via/standard-input`, {
    method: "POST",
    body: verificationForm(req, input),
    cache: "no-store",
  })
  const body = (await res.json().catch(() => ({}))) as { message?: string }
  if (/already verified/i.test(body.message ?? "")) return { ...base, status: "already verified", seconds: seconds() }
  if (!res.ok) throw new VerifyError(`BOTScan rejected the request (${res.status}). Try again shortly.`, 502)

  // BOTScan verifies in the background. The smoke tests took 6 to 10 seconds.
  for (let i = 0; i < 20; i++) {
    await sleep(2000)
    if (await isVerified(chain, instance)) return { ...base, status: "verified", seconds: seconds() }
  }
  return { ...base, status: "pending", seconds: seconds() }
}
