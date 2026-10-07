"use client"

import { useQuery } from "@tanstack/react-query"
import { ExternalLink, Share2 } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { useSyncExternalStore } from "react"
import type { Address } from "viem"
import { useReadContracts } from "wagmi"
import { CopyButton } from "@/components/copy-button"
import { Addr, Card, Row, Rows } from "@/components/manage/parts"
import { useTipUrl } from "@/components/tip/use-tip-url"
import { Button } from "@/components/ui/button"
import { uzoTipJarAbi } from "@/lib/abi/generated"
import { explorerTx, networkForChainId, type BotChain } from "@/lib/chains"
import { shortAddress } from "@/lib/format"
import type { TipSummary } from "@/lib/stats"
import { formatTip } from "@/lib/tokens"

export function TipJarPanel({ chain, address }: { chain: BotChain; address: Address }) {
  const jar = { address, abi: uzoTipJarAbi, chainId: chain.id } as const
  const reads = useReadContracts({
    contracts: [
      { ...jar, functionName: "title" },
      { ...jar, functionName: "recipient" },
    ],
  })
  const [title, recipient] = (reads.data?.map((r) => r.result) ?? []) as [string?, Address?]
  const tips = useQuery({
    queryKey: ["tips", chain.id, address],
    queryFn: async (): Promise<TipSummary> => {
      const res = await fetch(`/api/tips?chainId=${chain.id}&jar=${address}`)
      if (!res.ok) throw new Error(`Tips returned ${res.status}`)
      return res.json()
    },
    refetchInterval: 30_000,
  })
  const url = useTipUrl(address, networkForChainId(chain.id) ?? "testnet")

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Tip jar">
        <Rows>
          <Row label="Title">{title ?? "..."}</Row>
          <Row label="Recipient">{recipient ? <Addr chain={chain} value={recipient} /> : "..."}</Row>
          <Row label="Contract">
            <Addr chain={chain} value={address} />
          </Row>
        </Rows>
        <p className="text-sm text-muted-foreground">
          This jar has no owner. Tips go straight to the recipient in the same transaction. Uzo never holds them, and
          nobody can change the title or recipient.
        </p>
      </Card>

      <Card title="Share">
        <div className="flex flex-wrap items-start gap-6">
          <div className="rounded-2xl bg-white p-3">
            <QRCodeSVG value={url} size={160} marginSize={0} title={`QR code for ${url}`} />
          </div>
          <div className="grid min-w-0 flex-1 gap-3">
            <p className="text-sm text-muted-foreground">Anyone with this link can send a tip from their own wallet.</p>
            <div className="flex items-center gap-1">
              <code className="min-w-0 flex-1 rounded-lg bg-background/60 p-3 font-mono text-xs break-all">{url}</code>
              <CopyButton value={url} label="tip link" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="w-fit rounded-full">
                <a href={url} target="_blank" rel="noreferrer">
                  <ExternalLink aria-hidden="true" /> Open tip page
                </a>
              </Button>
              <ShareButton url={url} title={title} />
            </div>
          </div>
        </div>
      </Card>

      <Card title="Tips received" className="lg:col-span-2">
        {tips.isPending ? (
          <p>Reading tips from the chain...</p>
        ) : tips.isError ? (
          <p>Could not load tips right now. Try again shortly.</p>
        ) : tips.data.count === 0 ? (
          <p>No tips yet. Share the link above to get the first one.</p>
        ) : (
          <>
            <Rows>
              <Row label="Total received">
                {tips.data.totals.map((t) => (
                  <span key={t.token} className="block">
                    {formatTip(chain, t.token, t.amount)}
                  </span>
                ))}
              </Row>
              <Row label="Tips">
                {tips.data.count.toLocaleString("en-US")} from {tips.data.tippers.toLocaleString("en-US")}{" "}
                {tips.data.tippers === 1 ? "address" : "addresses"}
              </Row>
            </Rows>
            <h3 className="font-medium">Recent tips</h3>
            <ul className="grid gap-3">
              {tips.data.recent.map((t) => (
                <li key={`${t.txHash}-${t.from}`} className="grid gap-1 rounded-2xl bg-foreground/5 p-4">
                  <p className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{formatTip(chain, t.token, t.amount)}</span>
                    <a
                      href={explorerTx(chain, t.txHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                    >
                      {new Date(t.timestamp * 1000).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                    </a>
                  </p>
                  <p className="text-sm text-muted-foreground">From {shortAddress(t.from)}</p>
                  {t.message ? <p className="break-words">{t.message}</p> : null}
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground">Updated every 30 seconds. New tips can take a minute to appear.</p>
          </>
        )}
      </Card>
    </div>
  )
}

const noop = () => () => {}

function ShareButton({ url, title }: { url: string; title?: string }) {
  // The share sheet exists on most phones only. Read after hydration so server and client agree.
  const canShare = useSyncExternalStore(noop, () => "share" in navigator, () => false)
  if (!canShare) return null
  return (
    <Button
      variant="ghost"
      className="w-fit rounded-full"
      onClick={() => navigator.share({ url, title: title ?? "Tip jar" }).catch(() => {})}
    >
      <Share2 aria-hidden="true" /> Share
    </Button>
  )
}
