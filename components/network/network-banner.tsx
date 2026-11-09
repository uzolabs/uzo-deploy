"use client"

import { lazy } from "react"
import { AlertTriangle } from "lucide-react"
import { useNetwork } from "@/components/network/network-provider"
import { WalletIsland } from "@/components/wallet/wallet-gate"

const WrongChainNotice = lazy(() => import("@/components/network/wrong-chain-notice"))

/** The mainnet warning, and a one-click switch when the wallet is on another chain. */
export function NetworkBanner() {
  const { network } = useNetwork()

  return (
    // Each notice carries its own top margin, and RainbowKit's wrapper div is display: contents,
    // so the empty banner takes no space and nothing jumps when the wallet code arrives.
    <div className="mx-auto grid max-w-6xl px-4 sm:px-6 [&_[data-rk]]:contents">
      {network === "mainnet" ? (
        <p
          role="status"
          className="mt-3 flex items-start gap-2 rounded-2xl border border-accent/60 bg-accent/15 px-4 py-3 text-sm"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-accent-foreground" aria-hidden="true" />
          <span>Mainnet. Real BOT is spent on gas. Templates are tested, not audited.</span>
        </p>
      ) : null}
      {/* Only loads once the wallet code is wanted; before that no wallet is connected. */}
      <WalletIsland>
        <WrongChainNotice />
      </WalletIsland>
    </div>
  )
}
