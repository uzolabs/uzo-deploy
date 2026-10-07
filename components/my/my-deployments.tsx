"use client"

import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useQuery } from "@tanstack/react-query"
import { ArrowRight, ExternalLink, Plus } from "lucide-react"
import Link from "next/link"
import type { Address } from "viem"
import { useAccount, useReadContracts } from "wagmi"
import { useNetwork } from "@/components/network/network-provider"
import { Button } from "@/components/ui/button"
import { templateById } from "@/config/templates"
import { explorerAddress, explorerTx } from "@/lib/chains"
import { uzoNftAbi, uzoTipJarAbi, uzoTokenAbi } from "@/lib/abi/generated"
import { formatAmount, shortAddress } from "@/lib/format"
import type { Deployment } from "@/lib/stats"

export function MyDeployments() {
  const { chain } = useNetwork()
  const { address } = useAccount()
  const query = useQuery({
    queryKey: ["deployments", chain.id, address],
    enabled: Boolean(address),
    queryFn: async (): Promise<Deployment[]> => {
      const res = await fetch(`/api/deployments?chainId=${chain.id}&deployer=${address}`)
      if (!res.ok) throw new Error(`Deployments returned ${res.status}`)
      return (await res.json()).deployments
    },
  })

  if (!address) {
    return (
      <div className="glass grid max-w-xl gap-4 rounded-3xl p-6 sm:p-8">
        <p>Connect the wallet you deployed from to see its contracts.</p>
        <ConnectButton showBalance={false} chainStatus="none" />
      </div>
    )
  }

  if (query.isPending) {
    return (
      <p className="glass rounded-3xl p-6" aria-live="polite">
        Reading {chain.name}. The first look can take up to half a minute.
      </p>
    )
  }

  if (query.isError) {
    return (
      <div role="alert" className="glass grid max-w-xl gap-4 rounded-3xl p-6">
        <p>Could not read your contracts right now.</p>
        <Button className="w-fit rounded-full" onClick={() => void query.refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  if (query.data.length === 0) {
    return (
      <div className="glass grid max-w-xl gap-4 rounded-3xl p-6 sm:p-8">
        <p>
          {shortAddress(address)} has not deployed anything on {chain.name} yet. Contracts from the last minute may not
          show yet.
        </p>
        <Button asChild className="w-fit rounded-full">
          <Link href="/deploy">
            <Plus aria-hidden="true" /> Deploy a contract
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {query.data.map((d) => (
        <ContractCard key={d.instance} deployment={d} />
      ))}
    </ul>
  )
}

const zero = "0x0000000000000000000000000000000000000000" as const

/** Reads what each template needs to describe itself in one sentence. */
function useDetails(d: Deployment) {
  const { chain } = useNetwork()
  const key = templateById(d.templateId)?.key
  const at = { address: d.instance, chainId: chain.id } as const
  const reads = useReadContracts({
    allowFailure: false,
    query: { enabled: Boolean(key), staleTime: 60_000 },
    contracts:
      key === "token"
        ? [
            { ...at, abi: uzoTokenAbi, functionName: "name" },
            { ...at, abi: uzoTokenAbi, functionName: "symbol" },
            { ...at, abi: uzoTokenAbi, functionName: "totalSupply" },
            { ...at, abi: uzoTokenAbi, functionName: "decimals" },
          ]
        : key === "nft"
          ? [
              { ...at, abi: uzoNftAbi, functionName: "name" },
              { ...at, abi: uzoNftAbi, functionName: "symbol" },
              { ...at, abi: uzoNftAbi, functionName: "totalMinted" },
              { ...at, abi: uzoNftAbi, functionName: "maxSupply" },
            ]
          : [
              { ...at, abi: uzoTipJarAbi, functionName: "title" },
              { ...at, abi: uzoTipJarAbi, functionName: "recipient" },
            ],
  })
  const r = reads.data as readonly unknown[] | undefined
  if (!r) return { title: undefined, detail: undefined }
  if (key === "token") {
    const [name, symbol, supply, decimals] = r as [string, string, bigint, number]
    return { title: `${name} (${symbol})`, detail: `Total supply: ${formatAmount(supply, decimals)} ${symbol}.` }
  }
  if (key === "nft") {
    const [name, symbol, minted, max] = r as [string, string, bigint, bigint]
    return { title: `${name} (${symbol})`, detail: `${minted.toLocaleString("en-US")} of ${max.toLocaleString("en-US")} minted.` }
  }
  const [title, recipient] = r as [string, Address]
  return { title, detail: `Tips go to ${recipient === zero ? "nobody" : shortAddress(recipient)}.` }
}

const article = (name: string) => (/^[aeiou]/i.test(name) ? "an" : "a")

function ContractCard({ deployment: d }: { deployment: Deployment }) {
  const { network, chain } = useNetwork()
  const template = templateById(d.templateId)
  const kind = template?.name ?? d.templateId
  const { title, detail } = useDetails(d)
  const date = new Date(d.timestamp * 1000).toLocaleDateString("en-GB", { dateStyle: "medium" })

  return (
    // The title link covers the whole card; the BOTScan links sit above it.
    <li className="glass relative grid content-start gap-3 rounded-3xl p-6 transition-colors focus-within:ring-2 focus-within:ring-primary/40 hover:border-primary/60">
      <p className="text-sm font-medium tracking-[0.14em] text-primary uppercase">{kind}</p>
      <h2 className="font-display text-2xl break-words">
        <Link href={`/manage/${d.instance}?network=${network}`} className="outline-none after:absolute after:inset-0 after:rounded-3xl">
          {title ?? shortAddress(d.instance)}
        </Link>
      </h2>
      <p>
        You deployed {article(kind)} {kind.toLowerCase()} to {chain.name}.{" "}
        {detail ? <span className="text-muted-foreground">{detail}</span> : null}
      </p>
      <p className="relative z-10 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <a
          href={explorerAddress(chain, d.instance)}
          target="_blank"
          rel="noreferrer"
          aria-label={`${d.instance} on BOTScan`}
          className="inline-flex items-center gap-1 font-mono underline-offset-4 hover:underline"
        >
          {shortAddress(d.instance)}
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
        <a href={explorerTx(chain, d.txHash)} target="_blank" rel="noreferrer" className="underline underline-offset-4">
          Deployed {date}
        </a>
      </p>
      <span className="inline-flex items-center gap-1 text-sm font-medium text-primary" aria-hidden="true">
        Manage <ArrowRight className="size-4" />
      </span>
    </li>
  )
}
