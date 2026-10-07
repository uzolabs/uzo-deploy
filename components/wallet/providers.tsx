"use client"

import "@rainbow-me/rainbowkit/styles.css"
import { darkTheme, getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, type ReactNode } from "react"
import { http, WagmiProvider } from "wagmi"
import { NetworkProvider, useNetwork } from "@/components/network/network-provider"
import { botChain, botChainTestnet } from "@/lib/chains"
import { site } from "@/lib/site"

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? ""

const config = getDefaultConfig({
  appName: site.name,
  appUrl: site.url,
  appDescription: site.description,
  projectId,
  // Testnet first, so a fresh connection lands there.
  chains: [botChainTestnet, botChain],
  transports: {
    [botChainTestnet.id]: http(),
    [botChain.id]: http(),
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
