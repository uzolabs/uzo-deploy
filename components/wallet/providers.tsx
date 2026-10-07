"use client"

import "@rainbow-me/rainbowkit/styles.css"
import { darkTheme, getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, type ReactNode } from "react"
import { isAddress } from "viem"
import { createConfig, http, WagmiProvider } from "wagmi"
import { mock } from "wagmi/connectors"
import { NetworkProvider, useNetwork } from "@/components/network/network-provider"
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
        // Testnet first, so a fresh connection lands there.
        chains: [botChainTestnet, botChain],
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

function RainbowKitWithNetwork({ children }: { children: ReactNode }) {
  const { chain } = useNetwork()
  return (
    <RainbowKitProvider theme={theme} initialChain={chain} modalSize="compact">
      {children}
    </RainbowKitProvider>
  )
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <NetworkProvider>
          <RainbowKitWithNetwork>{children}</RainbowKitWithNetwork>
        </NetworkProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
