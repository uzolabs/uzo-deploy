"use client"

import Link from "next/link"
import { BadgeCheck, ExternalLink, Loader2, Plus, RotateCcw, Wallet } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import type { Address, Hash } from "viem"
import { useWatchAsset } from "wagmi"
import { CopyButton } from "@/components/copy-button"
import { useNetwork } from "@/components/network/network-provider"
import { Button } from "@/components/ui/button"
import type { Template } from "@/config/templates"
import { explorerAddress, explorerTx } from "@/lib/chains"
import type { DeployInput } from "@/lib/deploy-call"
import { site } from "@/lib/site"
import { manualVerifyCommand } from "@/lib/verify"

type Status = "verifying" | "verified" | "failed"

// BOTScan sometimes needs a while to index a new contract; keep asking for about a minute.
const MAX_PENDING_TRIES = 4

type Props = {
  template: Template
  input: DeployInput
  instance: Address
  txHash: Hash
}

export function VerifyStep({ template, input, instance, txHash }: Props) {
  const { chain, network } = useNetwork()
  const [status, setStatus] = useState<Status>("verifying")
  const [message, setMessage] = useState<string>()
  const started = useRef(false)

  const verify = useCallback(async () => {
    setStatus("verifying")
    setMessage(undefined)
    for (let i = 0; i < MAX_PENDING_TRIES; i++) {
      try {
        const res = await fetch("/api/verify", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ chainId: chain.id, address: instance, txHash }),
        })
        const body = (await res.json().catch(() => ({}))) as { status?: string; error?: string }
        if (res.ok && (body.status === "verified" || body.status === "already verified")) {
          setStatus("verified")
          return
        }
        if (res.status !== 202 && res.status !== 409) {
          setMessage(body.error ?? `BOTScan returned ${res.status}.`)
          setStatus("failed")
          return
        }
      } catch {
        setMessage("Could not reach the verification service.")
        setStatus("failed")
        return
      }
      await new Promise((r) => setTimeout(r, 5000))
    }
    setMessage("BOTScan is still processing. Try again in a minute.")
    setStatus("failed")
  }, [chain.id, instance, txHash])

  useEffect(() => {
    if (started.current) return
    started.current = true
    void verify()
  }, [verify])

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <section className="glass grid gap-4 rounded-3xl p-6 sm:p-8" aria-live="polite">
        <h2 className="font-display text-2xl">Your {template.name.toLowerCase()} is live</h2>
        <div className="flex flex-wrap items-center gap-1">
          <a href={explorerAddress(chain, instance)} target="_blank" rel="noreferrer" className="font-mono text-sm break-all underline-offset-4 hover:underline">
            {instance}
          </a>
          <CopyButton value={instance} label="address" />
        </div>
        <p className="flex items-center gap-2">
          {status === "verifying" ? (
            <>
              <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" /> Verifying on BOTScan
            </>
          ) : status === "verified" ? (
            <>
              <BadgeCheck className="size-5 text-primary" aria-hidden="true" /> Verified on BOTScan
            </>
          ) : (
            "Not verified yet"
          )}
        </p>

        {status === "failed" ? (
          <div role="alert" className="grid gap-3 rounded-2xl border border-destructive/60 bg-destructive/10 p-4 text-sm">
            <p>{message}</p>
            <Button size="sm" className="w-fit rounded-full" onClick={() => void verify()}>
              <RotateCcw aria-hidden="true" /> Try again
            </Button>
            <p>
              Or run this from the <code className="font-mono">contracts</code> folder of the{" "}
              <a href={site.links.github} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                uzo-deploy repo
              </a>
              :
            </p>
            <div className="flex items-start gap-1">
              <code className="block min-w-0 flex-1 overflow-x-auto rounded-lg bg-background/60 p-3 font-mono text-xs">
                {manualVerifyCommand(network, instance, txHash)}
              </code>
              <CopyButton value={manualVerifyCommand(network, instance, txHash)} label="command" />
            </div>
          </div>
        ) : null}
      </section>

      <section className="glass grid gap-4 rounded-3xl p-6 sm:p-8" aria-labelledby="next-steps">
        <h2 id="next-steps" className="text-sm font-medium tracking-[0.14em] text-primary uppercase">
          Next steps
        </h2>
        <div className="flex flex-wrap gap-2">
          {input.key === "token" ? <AddToken address={instance} symbol={input.params.symbol} /> : null}
          <Button asChild variant="outline" className="rounded-full">
            <a href={explorerAddress(chain, instance)} target="_blank" rel="noreferrer">
              <ExternalLink aria-hidden="true" /> Open on BOTScan
            </a>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <a href={explorerTx(chain, txHash)} target="_blank" rel="noreferrer">
              <ExternalLink aria-hidden="true" /> View transaction
            </a>
          </Button>
          <Button asChild variant="ghost" className="rounded-full">
            <Link href="/deploy">
              <Plus aria-hidden="true" /> Deploy another
            </Link>
          </Button>
        </div>
        {input.key === "nft" ? (
          <p className="text-sm text-muted-foreground">
            Your collection starts empty. As the owner you can mint from BOTScan&apos;s write tab until the management page
            is ready.
          </p>
        ) : null}
        {input.key === "tipJar" ? (
          <p className="text-sm text-muted-foreground">
            Tips sent to this address go straight to the recipient. Uzo never holds them.
          </p>
        ) : null}
      </section>
    </div>
  )
}

// Wallets never add a token silently. The best we can do is open their "add token" prompt
// as soon as the deploy lands, once, and keep the button for anyone who dismissed it.
function AddToken({ address, symbol }: { address: Address; symbol: string }) {
  const watch = useWatchAsset()
  const { watchAsset } = watch
  const asked = useRef(false)
  const add = useCallback(
    () => watchAsset({ type: "ERC20", options: { address, symbol, decimals: 18 } }),
    [watchAsset, address, symbol],
  )

  useEffect(() => {
    if (asked.current) return
    asked.current = true
    add()
  }, [add])

  return (
    <>
      <Button className="rounded-full" disabled={watch.isPending || watch.isSuccess} onClick={add}>
        <Wallet aria-hidden="true" />
        {watch.isSuccess ? "Added to wallet" : watch.isPending ? "Check your wallet" : "Add to wallet"}
      </Button>
      {watch.isError ? (
        <p className="w-full text-sm text-muted-foreground">
          Your wallet did not add it. Try the button again, or import it by hand: address {address}, symbol {symbol},
          18 decimals.
        </p>
      ) : null}
    </>
  )
}
