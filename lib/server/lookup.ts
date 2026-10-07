import "server-only"
import type { Address } from "viem"
import { uzoTokenAbi } from "@/lib/abi/generated"
import { networks, type NetworkKey } from "@/lib/chains"
import { deploymentOf } from "@/lib/server/data"
import { publicClient } from "@/lib/server/client"
import type { Deployment } from "@/lib/stats"
import { bytes32ToId } from "@/lib/verify"

export type Lookup = { network: NetworkKey; deployment: Deployment } | { network?: undefined; deployment?: undefined }

/**
 * Finds the factory record for an address on the given network, or on testnet then mainnet.
 * The contract must also report the same template through uzoTemplate(), so a record alone
 * is not enough.
 */
export async function findInstance(address: Address, network?: NetworkKey): Promise<Lookup> {
  const order: NetworkKey[] = network ? [network] : ["testnet", "mainnet"]
  for (const key of order) {
    const chain = networks[key]
    const deployment = await deploymentOf(chain, address)
    if (!deployment) continue
    const reported = await publicClient(chain)
      .readContract({ address, abi: uzoTokenAbi, functionName: "uzoTemplate" })
      .catch(() => null)
    if (reported && bytes32ToId(reported[0]) === deployment.templateId && reported[1] === deployment.version) {
      return { network: key, deployment }
    }
  }
  return {}
}

export function networkParam(value: string | string[] | undefined): NetworkKey | undefined {
  return value === "testnet" || value === "mainnet" ? value : undefined
}
