"use client"

import { ConnectButton } from "@rainbow-me/rainbowkit"
import { ArrowLeftRight, CheckCircle2, ExternalLink, Heart, RotateCcw } from "lucide-react"
import { useState } from "react"
import { erc20Abi, parseUnits, type Address } from "viem"
import { useAccount, useBalance, useReadContracts, useSwitchChain } from "wagmi"
import { Addr, Field } from "@/components/manage/parts"
import { useNetworkFromUrl } from "@/components/network/use-network-from-url"
import { TxFeedback } from "@/components/tx/tx-feedback"
import { useTx } from "@/components/tx/use-tx"
import { Button } from "@/components/ui/button"
import { uzoTipJarAbi } from "@/lib/abi/generated"
import { explorerTx, networks, type NetworkKey } from "@/lib/chains"
import { formatAmount } from "@/lib/format"
import { cn } from "@/lib/utils"

const PRESETS = ["1", "5", "10"] as const
const NATIVE_DECIMALS = 18
const encoder = new TextEncoder()

type Coin = "native" | "usdt"

type Props = {
  network: NetworkKey
  jar: Address
  title: string
  recipient: Address
  usdt: Address
  /** The contract's byte limit, capped at 140. */
  maxMessageBytes: number
}

export function TipForm({ network, jar, title, recipient, usdt, maxMessageBytes }: Props) {
  useNetworkFromUrl(network)
  const chain = networks[network]
  const nativeSymbol = chain.nativeCurrency.symbol
  const { address: account, chainId } = useAccount()
  const { switchChain, isPending: switching } = useSwitchChain()

  const [coin, setCoin] = useState<Coin>("usdt")
  const [amount, setAmount] = useState<string>("5")
  const [message, setMessage] = useState("")
  const [sent, setSent] = useState<{ hash: string; label: string }>()

  const native = useBalance({ address: account, chainId: chain.id, query: { enabled: Boolean(account) } })
  const token = { address: usdt, abi: erc20Abi, chainId: chain.id } as const
  const usdtReads = useReadContracts({
    contracts: [
      { ...token, functionName: "decimals" },
      { ...token, functionName: "balanceOf", args: [account ?? jar] },
      { ...token, functionName: "allowance", args: [account ?? jar, jar] },
    ],
    query: { enabled: coin === "usdt" },
  })
  const [usdtDecimals, usdtBalance, allowance] = (usdtReads.data?.map((r) => r.result) ?? []) as [
    number?,
    bigint?,
    bigint?,
  ]

  const decimals = coin === "native" ? NATIVE_DECIMALS : usdtDecimals
  const symbol = coin === "native" ? nativeSymbol : "USDT"
  const balance = coin === "native" ? native.data?.value : account ? usdtBalance : undefined

  let units: bigint | undefined
  let amountError: string | undefined
  if (decimals !== undefined && amount) {
    try {
      units = parseUnits(amount.replace(/[,\s_]/g, ""), decimals)
      if (units <= 0n) amountError = "Enter an amount above 0."
      else if (balance !== undefined && units > balance) amountError = `That is more than your ${symbol} balance.`
    } catch {
      amountError = "Enter a number, like 5 or 2.5."
    }
  }
  const messageBytes = encoder.encode(message).length
  const messageError = messageBytes > maxMessageBytes ? "That message is too long." : undefined

  const approveTx = useTx(chain)
  const tipTx = useTx(chain, () => {
    if (tipTx.hash) setSent({ hash: tipTx.hash, label: `${amount} ${symbol}` })
  })

  const needsApproval = coin === "usdt" && units !== undefined && (allowance ?? 0n) < units
  const onChain = chainId === chain.id
  const ready = Boolean(account && onChain && units && !amountError && !messageError) && !approveTx.busy && !tipTx.busy

  function submit() {
    if (!ready || !units) return
    if (coin === "native") {
      tipTx.write.writeContract({
        address: jar,
        abi: uzoTipJarAbi,
        functionName: "tipNative",
        args: [message],
        value: units,
        chainId: chain.id,
      })
    } else if (needsApproval) {
      // Exactly this amount, never an open-ended approval.
      approveTx.write.writeContract({ ...token, functionName: "approve", args: [jar, units] })
    } else {
      tipTx.write.writeContract({
        address: jar,
        abi: uzoTipJarAbi,
        functionName: "tipToken",
        args: [units, message],
        chainId: chain.id,
      })
    }
  }

  function again() {
    setSent(undefined)
    setMessage("")
    approveTx.reset()
    tipTx.reset()
  }

  return (
    <div className="grid gap-6">
      <header className="grid gap-3">
        <p className="text-sm font-medium tracking-[0.14em] text-primary uppercase">Send a tip</p>
        <h1 className="font-display text-[2rem] leading-tight text-balance break-words sm:text-[2.5rem]">{title}</h1>
        <p className="flex flex-wrap items-center gap-2 text-muted-foreground">
          Goes to <Addr chain={chain} value={recipient} />
        </p>
        {network === "testnet" ? (
          <p className="text-sm text-muted-foreground">This jar is on BOT Chain Testnet. Test coins have no value.</p>
        ) : null}
      </header>

      {sent ? (
        <section className="glass grid gap-4 rounded-3xl p-6" aria-live="polite">
          <p className="flex items-center gap-2 font-display text-2xl">
            <CheckCircle2 className="size-6 text-primary" aria-hidden="true" /> Tip sent
          </p>
          <p>
            {sent.label} went to the recipient&apos;s wallet.{" "}
            <a href={explorerTx(chain, sent.hash)} target="_blank" rel="noreferrer" className="underline underline-offset-4">
              View transaction
              <ExternalLink className="ml-1 inline size-3" aria-hidden="true" />
            </a>
          </p>
          <Button className="h-12 w-fit rounded-full" onClick={again}>
            <RotateCcw aria-hidden="true" /> Tip again
          </Button>
        </section>
      ) : (
        <form
          className="glass grid gap-6 rounded-3xl p-6"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <fieldset className="grid gap-3">
            <legend className="mb-3 font-medium">Pay with</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["usdt", "native"] as const).map((c) => (
                <Choice
                  key={c}
                  name="coin"
                  checked={coin === c}
                  onChange={() => {
                    setCoin(c)
                    approveTx.reset()
                    tipTx.reset()
                  }}
                >
                  {c === "usdt" ? "USDT" : nativeSymbol}
                </Choice>
              ))}
            </div>
          </fieldset>

          <fieldset className="grid gap-3">
            <legend className="mb-3 font-medium">Amount in {symbol}</legend>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((p) => (
                <Choice key={p} name="preset" checked={amount === p} onChange={() => setAmount(p)}>
                  {p}
                </Choice>
              ))}
            </div>
            <Field
              label="Or enter an amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              error={amountError}
              help={
                account && balance !== undefined && decimals !== undefined
                  ? `You have ${formatAmount(balance, decimals)} ${symbol}.`
                  : undefined
              }
            />
          </fieldset>

          <div className="grid gap-2">
            <label htmlFor="tip-message" className="font-medium">
              Message <span className="font-normal text-muted-foreground">(optional, public)</span>
            </label>
            <textarea
              id="tip-message"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              aria-invalid={messageError ? true : undefined}
              aria-describedby="tip-message-note"
              className="min-h-24 w-full rounded-xl border border-glass-border bg-foreground/5 px-4 py-3 text-base outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 aria-[invalid=true]:border-destructive"
            />
            <p id="tip-message-note" className={cn("text-sm", messageError ? "text-destructive" : "text-muted-foreground")}>
              {messageError ?? `${maxMessageBytes - messageBytes} of ${maxMessageBytes} characters left. Messages are stored on chain for anyone to read.`}
            </p>
          </div>

          {coin === "usdt" ? (
            <p className="text-sm text-muted-foreground">
              USDT takes two signatures: one lets the jar move exactly this amount, the next sends the tip.
            </p>
          ) : null}

          {!account ? (
            <div className="grid gap-3">
              <p>Connect a wallet to send a tip.</p>
              <ConnectButton showBalance={false} chainStatus="none" />
            </div>
          ) : !onChain ? (
            <Button
              type="button"
              className="h-12 rounded-full text-base"
              disabled={switching}
              onClick={() => switchChain({ chainId: chain.id })}
            >
              <ArrowLeftRight aria-hidden="true" /> Switch to {chain.name}
            </Button>
          ) : (
            <Button type="submit" className="h-12 rounded-full text-base" disabled={!ready}>
              <Heart aria-hidden="true" />
              {needsApproval ? `Step 1 of 2: allow ${amount || "0"} USDT` : coin === "usdt" ? `Step 2 of 2: send ${amount} USDT` : `Send ${amount || "0"} ${symbol}`}
            </Button>
          )}

          <TxFeedback tx={approveTx} done="Allowed. Now send the tip." />
          <TxFeedback tx={tipTx} />
        </form>
      )}

      <p className="text-sm text-muted-foreground">Tips go directly to the recipient&apos;s wallet. Uzo never holds them.</p>
    </div>
  )
}

function Choice({
  name,
  checked,
  onChange,
  children,
}: {
  name: string
  checked: boolean
  onChange: () => void
  children: React.ReactNode
}) {
  return (
    <label
      className={cn(
        "flex min-h-12 cursor-pointer items-center justify-center rounded-xl border px-3 font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40",
        checked ? "border-primary bg-primary/15 text-foreground" : "border-glass-border bg-foreground/5 hover:border-primary/60",
      )}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="sr-only" />
      {children}
    </label>
  )
}
