"use client"

import { CheckCircle2, Loader2 } from "lucide-react"
import type { Tx } from "@/components/tx/use-tx"
import { explorerTx } from "@/lib/chains"
import { reason } from "@/lib/wallet-errors"

/** The state of one transaction in a sentence, with a BOTScan link once it has a hash. */
export function TxFeedback({ tx, done = "Confirmed." }: { tx: Tx; done?: string }) {
  const link = tx.hash ? (
    <a href={explorerTx(tx.chain, tx.hash)} target="_blank" rel="noreferrer" className="underline underline-offset-4">
      View transaction
    </a>
  ) : null

  let body: React.ReactNode = null
  if (tx.write.isPending) {
    body = (
      <p className="flex items-center gap-2">
        <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" /> Check your wallet.
      </p>
    )
  } else if (tx.write.isError) {
    body = <p className="text-destructive">{reason(tx.write.error)}</p>
  } else if (tx.reverted) {
    body = <p className="text-destructive">The transaction reverted and nothing changed. {link}</p>
  } else if (tx.success) {
    body = (
      <p className="flex flex-wrap items-center gap-2">
        <CheckCircle2 className="size-4 text-primary" aria-hidden="true" /> {done} {link}
      </p>
    )
  } else if (tx.hash) {
    body = (
      <p className="flex flex-wrap items-center gap-2">
        <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" /> Waiting for the network. {link}
      </p>
    )
  }
  return (
    <div aria-live="polite" className="text-sm">
      {body}
    </div>
  )
}
