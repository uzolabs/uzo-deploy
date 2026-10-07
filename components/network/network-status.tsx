"use client"

import { useBlockNumber } from "wagmi"
import { useNetwork } from "@/components/network/network-provider"
import { factoriesFor } from "@/lib/deployments"

/** Live block height from the selected network's RPC, and how many templates can deploy there. */
export function NetworkStatus() {
  const { chain } = useNetwork()
  const { data: block, isError, isPending } = useBlockNumber({ chainId: chain.id, watch: true })
  const count = Object.keys(factoriesFor(chain.id)).length

  return (
    <dl className="glass grid gap-4 rounded-3xl p-6 sm:grid-cols-3">
      <div>
        <dt className="text-sm text-muted-foreground">Network</dt>
        <dd className="mt-1 font-medium">
          {chain.name} <span className="font-mono text-sm text-muted-foreground">({chain.id})</span>
        </dd>
      </div>
      <div>
        <dt className="text-sm text-muted-foreground">Latest block</dt>
        <dd className="mt-1 font-mono" aria-live="polite">
          {isError ? "RPC not reachable" : isPending ? "Loading" : block?.toLocaleString("en-US")}
        </dd>
      </div>
      <div>
        <dt className="text-sm text-muted-foreground">Templates available</dt>
        <dd className="mt-1 font-medium">{count} of 3</dd>
      </div>
    </dl>
  )
}
