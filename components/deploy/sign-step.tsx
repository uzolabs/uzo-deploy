"use client"

import { ArrowLeft, CheckCircle2, Loader2, RotateCcw } from "lucide-react"
import { useEffect, useRef } from "react"
import { BaseError, isAddressEqual, parseEventLogs, type Address, type Hash, type Hex } from "viem"
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi"
import { useNetwork } from "@/components/network/network-provider"
import { Button } from "@/components/ui/button"
import { explorerTx } from "@/lib/chains"
import { uzoTokenFactoryAbi } from "@/lib/abi/generated"
import { deployCall, type DeployInput } from "@/lib/deploy-call"

type Props = {
  factory: Address
  input: DeployInput
  salt: Hex
  predicted: Address
  onBack: () => void
  onDeployed: (result: { instance: Address; txHash: Hash }) => void
}

function reason(error: unknown) {
  if (error instanceof BaseError) {
    if (error.walk((e) => (e as { code?: number }).code === 4001)) return "You rejected the request in your wallet."
    return error.shortMessage
  }
  return "Something went wrong. Try again."
}

/** One transaction: ask the wallet, show the hash, wait for the receipt, read the Deployed event. */
export function SignStep({ factory, input, salt, predicted, onBack, onDeployed }: Props) {
  const { chain } = useNetwork()
  const write = useWriteContract()
  const receipt = useWaitForTransactionReceipt({ hash: write.data, chainId: chain.id, pollingInterval: 1000 })
  const asked = useRef(false)
  const reported = useRef(false)

  const send = () => write.writeContract({ ...deployCall(factory, input, salt), chainId: chain.id })

  // Open the wallet as soon as this step appears. The ref keeps React's dev double-run from asking twice.
  useEffect(() => {
    if (asked.current) return
    asked.current = true
    send()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const deployed = receipt.data
    ? // All three factories emit the same Deployed event.
      parseEventLogs({ abi: uzoTokenFactoryAbi, eventName: "Deployed", logs: receipt.data.logs }).find(
        (log) => isAddressEqual(log.address, factory),
      )
    : undefined
  const instance = deployed?.args.instance
  const matches = instance ? isAddressEqual(instance, predicted) : false

  useEffect(() => {
    if (!instance || !write.data || reported.current) return
    reported.current = true
    onDeployed({ instance, txHash: write.data })
  }, [instance, write.data, onDeployed])

  return (
    <div className="glass mx-auto grid max-w-2xl gap-6 rounded-3xl p-6 sm:p-8">
      <ol className="grid gap-4" aria-live="polite">
        <Stage done={Boolean(write.data)} active={write.isPending} label="Confirm in your wallet">
          {write.isPending ? "Check your wallet and approve the transaction." : null}
        </Stage>
        <Stage done={Boolean(receipt.data)} active={Boolean(write.data) && receipt.isPending} label="Waiting for the network">
          {write.data ? (
            <a href={explorerTx(chain, write.data)} target="_blank" rel="noreferrer" className="font-mono text-sm break-all underline underline-offset-4">
              {write.data}
            </a>
          ) : null}
        </Stage>
        <Stage done={Boolean(instance)} active={false} label="Deployed">
          {instance ? (
            <>
              <span className="font-mono text-sm break-all">{instance}</span>
              <span className="block text-sm text-muted-foreground">
                {matches ? "Matches the address shown on review." : "This differs from the predicted address. Check it on BOTScan."}
              </span>
            </>
          ) : null}
        </Stage>
      </ol>

      {write.isError ? (
        <div role="alert" className="grid gap-3 rounded-2xl border border-destructive/60 bg-destructive/10 p-4 text-sm">
          <p>{reason(write.error)}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="rounded-full" onClick={send}>
              <RotateCcw aria-hidden="true" /> Try again
            </Button>
            <Button size="sm" variant="ghost" className="rounded-full" onClick={onBack}>
              <ArrowLeft aria-hidden="true" /> Back to review
            </Button>
          </div>
        </div>
      ) : null}

      {receipt.data?.status === "reverted" || receipt.isError ? (
        <div role="alert" className="rounded-2xl border border-destructive/60 bg-destructive/10 p-4 text-sm">
          {receipt.data?.status === "reverted"
            ? "The transaction was included but reverted. Nothing was deployed. Open it on BOTScan for the reason."
            : "Lost track of the transaction. Open the hash above on BOTScan to see whether it went through."}
        </div>
      ) : null}
    </div>
  )
}

function Stage({ done, active, label, children }: { done: boolean; active: boolean; label: string; children?: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      {done ? (
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
      ) : active ? (
        <Loader2 className="mt-0.5 size-5 shrink-0 animate-spin text-primary" aria-hidden="true" />
      ) : (
        <span className="mt-1 size-4 shrink-0 rounded-full border border-glass-border" aria-hidden="true" />
      )}
      <div className="grid min-w-0 gap-1">
        <span className={done || active ? "font-medium" : "text-muted-foreground"}>
          {label}
          <span className="sr-only">{done ? " (done)" : active ? " (in progress)" : ""}</span>
        </span>
        {children}
      </div>
    </li>
  )
}
