"use client"

import { AlertTriangle, ArrowLeftRight } from "lucide-react"
import { useAccount, useSwitchChain } from "wagmi"
import { useNetwork } from "@/components/network/network-provider"
import { Button } from "@/components/ui/button"

/** The mainnet warning, and a one-click switch when the wallet is on another chain. */
export function NetworkBanner() {
  const { network, chain } = useNetwork()
  const { isConnected, chainId } = useAccount()
  const { switchChain, isPending } = useSwitchChain()
  const wrongChain = isConnected && chainId !== chain.id

  if (network !== "mainnet" && !wrongChain) return null

  return (
    <div className="mx-auto mt-3 grid max-w-6xl gap-2 px-4 sm:px-6">
      {network === "mainnet" ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-2xl border border-accent/60 bg-accent/15 px-4 py-3 text-sm"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-accent-foreground" aria-hidden="true" />
          <span>Mainnet. Real BOT is spent on gas. Templates are tested, not audited.</span>
        </p>
      ) : null}
      {wrongChain ? (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-2xl border border-primary/50 bg-primary/10 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <span>Your wallet is on a different network. Switch it to {chain.name} to continue.</span>
          <Button
            size="sm"
            className="rounded-full"
            disabled={isPending}
            onClick={() => switchChain({ chainId: chain.id })}
          >
            <ArrowLeftRight aria-hidden="true" />
            {isPending ? "Check your wallet" : `Switch to ${chain.name}`}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
