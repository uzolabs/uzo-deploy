import type { Metadata } from "next"
import Link from "next/link"
import { getAddress, isAddress } from "viem"
import { ManagePanel } from "@/components/manage/manage-panel"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { templateById } from "@/config/templates"
import { explorerAddress, networks, otherNetwork } from "@/lib/chains"
import { shortAddress } from "@/lib/format"
import { findInstance, networkParam } from "@/lib/server/lookup"

export const metadata: Metadata = {
  title: "Manage",
  robots: { index: false },
}

export default async function ManagePage({ params, searchParams }: PageProps<"/manage/[address]">) {
  const { address: raw } = await params
  const requested = networkParam((await searchParams).network)

  if (!isAddress(raw, { strict: false })) {
    return (
      <PageHeader eyebrow="Manage" title="That is not an address" lede="Contract addresses start with 0x and have 40 more characters.">
        <Button asChild className="rounded-full">
          <Link href="/my">Go to my contracts</Link>
        </Button>
      </PageHeader>
    )
  }

  const address = getAddress(raw)
  const found = await findInstance(address, requested)

  if (!found.network) {
    const network = requested ?? "testnet"
    return (
      <PageHeader
        eyebrow="Manage"
        title="Not a Uzo template"
        lede={`${shortAddress(address)} was not deployed by a Uzo factory on ${requested ? networks[network].name : "either network"}, so this page cannot manage it.`}
      >
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="rounded-full">
            <a href={explorerAddress(networks[network], address)} target="_blank" rel="noreferrer">
              Look it up on BOTScan
            </a>
          </Button>
          {requested ? (
            <Button asChild variant="ghost" className="rounded-full">
              <Link href={`/manage/${address}?network=${otherNetwork(requested)}`}>
                Check {networks[otherNetwork(requested)].name}
              </Link>
            </Button>
          ) : null}
        </div>
      </PageHeader>
    )
  }

  const template = templateById(found.deployment.templateId)
  return (
    <>
      <PageHeader
        eyebrow={`Manage ${template?.name.toLowerCase() ?? "contract"}`}
        title={template?.name ?? "Contract"}
        lede={`Deployed on ${networks[found.network].name}. Reads are live from the chain. Anything you change is signed by your own wallet.`}
      />
      <div className="mx-auto max-w-6xl px-4 pt-14 sm:px-6">
        <ManagePanel network={found.network} address={address} templateId={found.deployment.templateId} />
      </div>
    </>
  )
}
