import type { Address } from "viem"
import deployments from "@/config/deployments.json"
import type { TemplateKey } from "@/config/templates"

type FactoryEntry = {
  contract: string
  address: string
  deployBlock: number
  txHash: string
  templateId: string
  version: number
}

type ChainEntry = { network: string; factories: Partial<Record<TemplateKey, FactoryEntry>> }

const chains = deployments.chains as Record<string, ChainEntry>

/** Every factory recorded for a chain, keyed by template. Empty when none are deployed. */
export function factoriesFor(chainId: number): Partial<Record<TemplateKey, FactoryEntry>> {
  return chains[String(chainId)]?.factories ?? {}
}

export function factoryFor(chainId: number, key: TemplateKey) {
  const entry = factoriesFor(chainId)[key]
  return entry ? { ...entry, address: entry.address as Address } : undefined
}

export function isAvailable(chainId: number, key: TemplateKey) {
  return factoryFor(chainId, key) !== undefined
}
