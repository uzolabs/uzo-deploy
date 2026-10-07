import type { Metadata } from "next"
import Link from "next/link"
import { getAddress, isAddress } from "viem"
import { PageHeader } from "@/components/page-header"
import { TipForm } from "@/components/tip/tip-form"
import { Button } from "@/components/ui/button"
import { uzoTipJarAbi } from "@/lib/abi/generated"
import { explorerAddress, networks } from "@/lib/chains"
import { publicClient } from "@/lib/server/client"
import { findInstance, networkParam } from "@/lib/server/lookup"

export const metadata: Metadata = {
  title: "Send a tip",
  description: "Send a tip in BOT or USDT on BOT Chain. It goes straight to the recipient's wallet.",
}

export default async function TipPage({ params, searchParams }: PageProps<"/tip/[address]">) {
  const { address: raw } = await params
  const requested = networkParam((await searchParams).network)
  const address = isAddress(raw, { strict: false }) ? getAddress(raw) : undefined
  const found = address ? await findInstance(address, requested) : {}

  if (!address || !found.network || found.deployment.templateId !== "uzo.tipjar") {
    const chain = networks[requested ?? "testnet"]
    return (
      <PageHeader
        eyebrow="Tip"
        title="This is not a Uzo tip jar"
        lede="Check the link you were sent. Only tip jars created by the Uzo factory can take tips here."
      >
        <div className="flex flex-wrap gap-2">
          {address ? (
            <Button asChild variant="outline" className="rounded-full">
              <a href={explorerAddress(chain, address)} target="_blank" rel="noreferrer">
                Look it up on BOTScan
              </a>
            </Button>
          ) : null}
          <Button asChild variant="ghost" className="rounded-full">
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </PageHeader>
    )
  }

  const chain = networks[found.network]
  const client = publicClient(chain)
  const jar = { address, abi: uzoTipJarAbi } as const
  const [title, recipient, usdt, maxMessageBytes] = await Promise.all([
    client.readContract({ ...jar, functionName: "title" }),
    client.readContract({ ...jar, functionName: "recipient" }),
    client.readContract({ ...jar, functionName: "usdt" }),
    client.readContract({ ...jar, functionName: "MAX_MESSAGE_BYTES" }),
  ])

  return (
    <div className="mx-auto max-w-xl px-4 pt-10 pb-6 sm:px-6 sm:pt-16">
      <TipForm
        network={found.network}
        jar={address}
        title={title}
        recipient={recipient}
        usdt={usdt}
        maxMessageBytes={Math.min(140, Number(maxMessageBytes))}
      />
    </div>
  )
}
