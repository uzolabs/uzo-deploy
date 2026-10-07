"use client"

import { Lock, Send, Sparkles, UserCheck, X } from "lucide-react"
import { useState } from "react"
import { getAddress, isAddress, isAddressEqual, zeroAddress, type Address } from "viem"
import { useAccount, useReadContracts } from "wagmi"
import { Addr, Card, Field, Row, Rows } from "@/components/manage/parts"
import { TxFeedback } from "@/components/tx/tx-feedback"
import { useTx } from "@/components/tx/use-tx"
import { Button } from "@/components/ui/button"
import { uzoNftAbi } from "@/lib/abi/generated"
import type { BotChain } from "@/lib/chains"

/** Batch mints above this risk running past the block gas limit, so the form stops here. */
export const MAX_BATCH = 100

type Props = { chain: BotChain; address: Address }

export function NftPanel({ chain, address }: Props) {
  const { address: account } = useAccount()
  const nft = { address, abi: uzoNftAbi, chainId: chain.id } as const
  const reads = useReadContracts({
    contracts: [
      { ...nft, functionName: "name" },
      { ...nft, functionName: "symbol" },
      { ...nft, functionName: "totalMinted" },
      { ...nft, functionName: "maxSupply" },
      { ...nft, functionName: "baseURI" },
      { ...nft, functionName: "metadataFrozen" },
      { ...nft, functionName: "owner" },
      { ...nft, functionName: "pendingOwner" },
      { ...nft, functionName: "royaltyInfo", args: [0n, 10_000n] },
    ],
  })
  const r = reads.data?.map((x) => x.result)
  if (!r) {
    return <Card title="Collection">{reads.isError ? <p>Could not read this collection. Try again shortly.</p> : <p>Loading...</p>}</Card>
  }
  const [name, symbol, minted, max, baseURI, frozen, owner, pending, royalty] = r as [
    string,
    string,
    bigint,
    bigint,
    string,
    boolean,
    Address,
    Address,
    readonly [Address, bigint] | undefined,
  ]
  const isOwner = Boolean(account && owner && isAddressEqual(account, owner))
  const isPending = Boolean(account && pending && pending !== zeroAddress && isAddressEqual(account, pending))
  const remaining = max - minted
  const royaltyBps = royalty ? Number(royalty[1]) : 0

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Collection">
        <Rows>
          <Row label="Name">{name}</Row>
          <Row label="Symbol">{symbol}</Row>
          <Row label="Minted">
            {minted.toLocaleString("en-US")} of {max.toLocaleString("en-US")}
          </Row>
          <Row label="Royalty">
            {royaltyBps === 0 ? "None" : `${royaltyBps / 100}% to `}
            {royaltyBps > 0 && royalty ? <Addr chain={chain} value={royalty[0]} /> : null}
          </Row>
          <Row label="Owner">
            <Addr chain={chain} value={owner} />
          </Row>
          <Row label="Contract">
            <Addr chain={chain} value={address} />
          </Row>
          <Row label="Metadata link">
            <span className="font-mono text-sm break-all">{baseURI || "Not set"}</span>
          </Row>
          <Row label="Metadata">{frozen ? "Frozen for good" : "Can still be changed by the owner"}</Row>
        </Rows>
        {pending && pending !== zeroAddress ? (
          <p className="text-sm">
            Ownership is being handed to <Addr chain={chain} value={pending} />. It moves when that address accepts.
          </p>
        ) : null}
        {!account ? <p className="text-sm text-muted-foreground">Connect the owner wallet to mint or change settings.</p> : null}
        {account && !isOwner && !isPending ? (
          <p className="text-sm text-muted-foreground">Only the owner can mint or change settings. Your wallet is not the owner.</p>
        ) : null}
      </Card>

      {isPending ? <AcceptOwnership chain={chain} address={address} /> : null}
      {isOwner ? (
        <>
          <Mint chain={chain} address={address} owner={owner} remaining={remaining} />
          {frozen ? null : <BaseUri chain={chain} address={address} current={baseURI} />}
          {frozen ? null : <Freeze chain={chain} address={address} symbol={symbol} />}
          <TransferOwnership chain={chain} address={address} pending={pending} />
        </>
      ) : null}
    </div>
  )
}

function Mint({ chain, address, owner, remaining }: Props & { owner: Address; remaining: bigint }) {
  const [to, setTo] = useState<string>(owner)
  const [quantity, setQuantity] = useState("1")
  const tx = useTx(chain)
  const cap = remaining < BigInt(MAX_BATCH) ? Number(remaining) : MAX_BATCH
  const toError = to && !isAddress(to, { strict: false }) ? "Enter a 0x address." : to === "" ? "Enter an address." : undefined
  const n = /^\d+$/.test(quantity) ? Number(quantity) : NaN
  const qtyError =
    remaining === 0n
      ? "Every token in this collection has been minted."
      : !Number.isInteger(n) || n < 1
        ? "Enter a whole number, 1 or more."
        : n > cap
          ? `At most ${cap} in one transaction.`
          : undefined

  return (
    <Card title="Mint">
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (toError || qtyError) return
          const recipient = getAddress(to)
          if (n === 1) {
            tx.write.writeContract({ address, abi: uzoNftAbi, functionName: "mint", args: [recipient], chainId: chain.id })
          } else {
            tx.write.writeContract({
              address,
              abi: uzoNftAbi,
              functionName: "mintBatch",
              args: [recipient, BigInt(n)],
              chainId: chain.id,
            })
          }
        }}
      >
        <Field label="Send to" mono value={to} onChange={(e) => setTo(e.target.value.trim())} error={toError} />
        <Field
          label="How many"
          inputMode="numeric"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value.trim())}
          error={qtyError}
          help={`${remaining.toLocaleString("en-US")} left to mint. Up to ${MAX_BATCH} per transaction.`}
        />
        <Button type="submit" className="w-fit rounded-full" disabled={Boolean(toError || qtyError) || tx.busy}>
          <Sparkles aria-hidden="true" /> Mint
        </Button>
        <TxFeedback tx={tx} done="Minted." />
      </form>
    </Card>
  )
}

function BaseUri({ chain, address, current }: Props & { current: string }) {
  const [uri, setUri] = useState(current)
  const tx = useTx(chain)
  const error = uri && !/^(ipfs|ar|https):\/\//.test(uri) ? "Use an ipfs://, ar:// or https:// link." : undefined
  return (
    <Card title="Metadata link">
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (error || uri === current) return
          tx.write.writeContract({ address, abi: uzoNftAbi, functionName: "setBaseURI", args: [uri], chainId: chain.id })
        }}
      >
        <Field
          label="Base link"
          mono
          value={uri}
          onChange={(e) => setUri(e.target.value.trim())}
          error={error}
          help="Token 1 reads its metadata from this link followed by 1. End it with a slash."
        />
        <Button type="submit" variant="outline" className="w-fit rounded-full" disabled={Boolean(error) || uri === current || tx.busy}>
          Save link
        </Button>
        <TxFeedback tx={tx} done="Saved." />
      </form>
    </Card>
  )
}

function Freeze({ chain, address, symbol }: Props & { symbol: string }) {
  const [typed, setTyped] = useState("")
  const tx = useTx(chain)
  const ready = typed === symbol
  return (
    <Card title="Freeze metadata" className="border-destructive/40">
      <p className="text-sm">
        Freezing locks the metadata link forever. Nobody, including you, can change it again. Make sure every file is
        in place first.
      </p>
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!ready) return
          tx.write.writeContract({ address, abi: uzoNftAbi, functionName: "freezeMetadata", chainId: chain.id })
        }}
      >
        <Field
          label={`Type ${symbol} to confirm`}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          help="This is the collection symbol, as shown above."
        />
        <Button type="submit" variant="destructive" className="w-fit rounded-full" disabled={!ready || tx.busy}>
          <Lock aria-hidden="true" /> Freeze for good
        </Button>
        <TxFeedback tx={tx} done="Metadata frozen." />
      </form>
    </Card>
  )
}

function TransferOwnership({ chain, address, pending }: Props & { pending: Address }) {
  const [to, setTo] = useState("")
  const tx = useTx(chain, () => setTo(""))
  const error = to && !isAddress(to, { strict: false }) ? "Enter a 0x address." : undefined
  const hasPending = pending && pending !== zeroAddress
  return (
    <Card title="Transfer ownership">
      <p className="text-sm text-muted-foreground">
        Two steps: you name the new owner here, then they accept from their own wallet on this page. Until they
        accept, you stay the owner and can cancel.
      </p>
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!to || error) return
          tx.write.writeContract({
            address,
            abi: uzoNftAbi,
            functionName: "transferOwnership",
            args: [getAddress(to)],
            chainId: chain.id,
          })
        }}
      >
        <Field label="New owner" mono value={to} onChange={(e) => setTo(e.target.value.trim())} error={error} />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="outline" className="rounded-full" disabled={!to || Boolean(error) || tx.busy}>
            <Send aria-hidden="true" /> Start transfer
          </Button>
          {hasPending ? (
            <Button
              type="button"
              variant="ghost"
              className="rounded-full"
              disabled={tx.busy}
              onClick={() =>
                tx.write.writeContract({
                  address,
                  abi: uzoNftAbi,
                  functionName: "transferOwnership",
                  args: [zeroAddress],
                  chainId: chain.id,
                })
              }
            >
              <X aria-hidden="true" /> Cancel pending transfer
            </Button>
          ) : null}
        </div>
        <TxFeedback tx={tx} />
      </form>
    </Card>
  )
}

function AcceptOwnership({ chain, address }: Props) {
  const tx = useTx(chain)
  return (
    <Card title="Accept ownership">
      <p className="text-sm">The current owner has offered you this collection. Accepting makes your wallet the owner.</p>
      <Button
        className="w-fit rounded-full"
        disabled={tx.busy}
        onClick={() => tx.write.writeContract({ address, abi: uzoNftAbi, functionName: "acceptOwnership", chainId: chain.id })}
      >
        <UserCheck aria-hidden="true" /> Accept ownership
      </Button>
      <TxFeedback tx={tx} done="You are now the owner." />
    </Card>
  )
}
