"use client"

import { Flame, Wallet } from "lucide-react"
import { useState } from "react"
import { parseUnits, type Address } from "viem"
import { useAccount, useReadContracts, useWatchAsset } from "wagmi"
import { Addr, Card, Field, Row, Rows } from "@/components/manage/parts"
import { TxFeedback } from "@/components/tx/tx-feedback"
import { useTx } from "@/components/tx/use-tx"
import { Button } from "@/components/ui/button"
import { uzoTokenAbi } from "@/lib/abi/generated"
import type { BotChain } from "@/lib/chains"
import { formatAmount } from "@/lib/format"

const DECIMALS = 18

export function TokenPanel({ chain, address }: { chain: BotChain; address: Address }) {
  const { address: account } = useAccount()
  const token = { address, abi: uzoTokenAbi, chainId: chain.id } as const
  const reads = useReadContracts({
    contracts: [
      { ...token, functionName: "name" },
      { ...token, functionName: "symbol" },
      { ...token, functionName: "totalSupply" },
      { ...token, functionName: "balanceOf", args: [account ?? "0x0000000000000000000000000000000000000000"] },
    ],
  })
  const [name, symbol, supply, balance] = reads.data?.map((r) => r.result) ?? []
  const watch = useWatchAsset()

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Token">
        <Rows>
          <Row label="Name">{(name as string) ?? "..."}</Row>
          <Row label="Symbol">{(symbol as string) ?? "..."}</Row>
          <Row label="Total supply">
            {supply !== undefined ? `${formatAmount(supply as bigint, DECIMALS)} ${symbol ?? ""}` : "..."}
          </Row>
          <Row label="Your balance">
            {!account ? "Connect a wallet to see it" : balance !== undefined ? `${formatAmount(balance as bigint, DECIMALS)} ${symbol ?? ""}` : "..."}
          </Row>
          <Row label="Contract">
            <Addr chain={chain} value={address} />
          </Row>
          <Row label="Decimals">{DECIMALS}</Row>
        </Rows>
        <p className="text-sm text-muted-foreground">
          This token has no owner. Nobody can mint more, pause it or change it.
        </p>
        {symbol ? (
          <Button
            variant="outline"
            className="w-fit rounded-full"
            disabled={watch.isPending}
            onClick={() => watch.watchAsset({ type: "ERC20", options: { address, symbol: symbol as string, decimals: DECIMALS } })}
          >
            <Wallet aria-hidden="true" />
            {watch.isSuccess ? "Added to wallet" : watch.isPending ? "Check your wallet" : "Add to wallet"}
          </Button>
        ) : null}
      </Card>
      {account ? (
        <Burn chain={chain} address={address} symbol={(symbol as string) ?? ""} balance={(balance as bigint) ?? 0n} />
      ) : null}
    </div>
  )
}

function Burn({ chain, address, symbol, balance }: { chain: BotChain; address: Address; symbol: string; balance: bigint }) {
  const [amount, setAmount] = useState("")
  const tx = useTx(chain, () => setAmount(""))
  let units: bigint | undefined
  let error: string | undefined
  if (amount) {
    try {
      units = parseUnits(amount.replace(/[,\s_]/g, ""), DECIMALS)
      if (units <= 0n) error = "Enter an amount above 0."
      else if (units > balance) error = "That is more than your balance."
    } catch {
      error = "Enter a number, like 100 or 2.5."
    }
  }

  return (
    <Card title="Burn">
      <p className="text-sm text-muted-foreground">
        Burning destroys tokens from your own balance and lowers the total supply. It cannot be undone.
      </p>
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!units || error) return
          tx.write.writeContract({ address, abi: uzoTokenAbi, functionName: "burn", args: [units], chainId: chain.id })
        }}
      >
        <Field
          label={`Amount of ${symbol || "tokens"}`}
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={error}
          help={`You hold ${formatAmount(balance, DECIMALS)} ${symbol}.`}
        />
        <Button type="submit" variant="destructive" className="w-fit rounded-full" disabled={!units || Boolean(error) || tx.busy}>
          <Flame aria-hidden="true" /> Burn
        </Button>
        <TxFeedback tx={tx} done="Burned." />
      </form>
    </Card>
  )
}
