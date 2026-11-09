"use client"

import { ArrowLeftRight } from "lucide-react"
import { useAccount, useSwitchChain } from "wagmi"
import { useNetwork } from "@/components/network/network-provider"
import { Button } from "@/components/ui/button"

/** Shown when the connected wallet is on a different chain from the selected network. */
export default function WrongChainNotice() {
  const { chain } = useNetwork()
  const { isConnected, chainId } = useAccount()
  const { switchChain, isPending } = useSwitchChain()
  if (!isConnected || chainId === chain.id) return null

  return (
    <div
      role="status"
      className="mt-3 flex flex-col gap-3 rounded-2xl border border-primary/50 bg-primary/10 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <span>Your wallet is on a different network. Switch it to {chain.name} to continue.</span>
      <Button size="sm" className="rounded-full" disabled={isPending} onClick={() => switchChain({ chainId: chain.id })}>
        <ArrowLeftRight aria-hidden="true" />
        {isPending ? "Check your wallet" : `Switch to ${chain.name}`}
      </Button>
    </div>
  )
}
