"use client"

import "@rainbow-me/rainbowkit/styles.css"
import { darkTheme, getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { isAddress } from "viem"
import { createConfig, http, mock, WagmiProvider } from "wagmi"
import { useNetwork } from "@/components/network/network-provider"
import { botChain, botChainTestnet, rpcUrl } from "@/lib/chains"
import { site } from "@/lib/site"

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? ""

/**
 * End-to-end tests only: an address Anvil has unlocked. The app then connects a mock wallet
 * that sends transactions to the testnet RPC override (a local fork), never to a real network.
 * Mainnet is left out entirely.
 */
const e2eAccount = process.env.NEXT_PUBLIC_E2E_ACCOUNT
const e2eRpc = process.env.NEXT_PUBLIC_TESTNET_RPC_URL

function e2eConfig(account: `0x${string}`, rpc: string) {
  // The mock wallet sends to the chain's default RPC, so point that at the fork.
  const fork = { ...botChainTestnet, rpcUrls: { default: { http: [rpc] } } }
  return createConfig({
    chains: [fork],
    connectors: [mock({ accounts: [account], features: { defaultConnected: true, reconnect: true } })],
    transports: { [fork.id]: http(rpc) },
    ssr: true,
  })
}

const config =
  e2eAccount && e2eRpc && isAddress(e2eAccount)
    ? e2eConfig(e2eAccount, e2eRpc)
    : getDefaultConfig({
        appName: site.name,
        appUrl: site.url,
        appDescription: site.description,
        projectId,
        // Mainnet first, so a fresh connection lands there.
        chains: [botChain, botChainTestnet],
        transports: {
          [botChainTestnet.id]: http(rpcUrl(botChainTestnet)),
          [botChain.id]: http(rpcUrl(botChain)),
        },
        ssr: true,
      })

const theme = darkTheme({
  accentColor: "#d9a441",
  accentColorForeground: "#0b0a09",
  borderRadius: "large",
  fontStack: "system",
  overlayBlur: "small",
})
// Match the site's warm dark glass surfaces.
theme.colors.modalBackground = "#12100e"
theme.colors.modalBorder = "rgba(245, 241, 234, 0.09)"
theme.colors.generalBorder = "rgba(245, 241, 234, 0.09)"
theme.colors.connectButtonBackground = "#12100e"
theme.colors.modalText = "#f5f1ea"
theme.colors.modalTextSecondary = "#a8a095"

function RainbowKitWithNetwork({ children }: { children: ReactNode }) {
  const { chain } = useNetwork()
  return (
    <RainbowKitProvider theme={theme} initialChain={chain} modalSize="compact">
      {children}
    </RainbowKitProvider>
  )
}

// One client for every wallet island, so they share cached reads.
const queryClient = new QueryClient()

/** Wallet providers. Loaded on demand through WalletIsland; NetworkProvider sits above them in the layout. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitWithNetwork>{children}</RainbowKitWithNetwork>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
