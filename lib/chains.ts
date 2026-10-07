// Chain data comes from @uzolabs/sdk only. Nothing here is re-typed.
import { addresses, botChain, botChainTestnet } from "@uzolabs/sdk"

export { addresses, botChain, botChainTestnet }

export type NetworkKey = "testnet" | "mainnet"
export type BotChain = typeof botChain | typeof botChainTestnet

export const networks = {
  testnet: botChainTestnet,
  mainnet: botChain,
} as const satisfies Record<NetworkKey, BotChain>

/** New visitors start on testnet. Mainnet is a deliberate choice. */
export const defaultNetwork: NetworkKey = "testnet"

export function chainFor(network: NetworkKey): BotChain {
  return networks[network]
}

export function networkForChainId(chainId: number): NetworkKey | undefined {
  if (chainId === botChainTestnet.id) return "testnet"
  if (chainId === botChain.id) return "mainnet"
  return undefined
}

export function explorerUrl(chain: BotChain) {
  return chain.blockExplorers.default.url
}

export function explorerAddress(chain: BotChain, address: string) {
  return `${explorerUrl(chain)}/address/${address}`
}

export function explorerTx(chain: BotChain, hash: string) {
  return `${explorerUrl(chain)}/tx/${hash}`
}

export function chainById(chainId: number): BotChain | undefined {
  const network = networkForChainId(chainId)
  return network ? networks[network] : undefined
}

export function otherNetwork(network: NetworkKey): NetworkKey {
  return network === "testnet" ? "mainnet" : "testnet"
}

/**
 * The RPC URL the app talks to. End-to-end tests point testnet at a local Anvil fork through
 * NEXT_PUBLIC_TESTNET_RPC_URL. There is deliberately no mainnet override.
 */
export function rpcUrl(chain: BotChain): string {
  const override = process.env.NEXT_PUBLIC_TESTNET_RPC_URL
  if (chain.id === botChainTestnet.id && override) return override
  return chain.rpcUrls.default.http[0]
}
