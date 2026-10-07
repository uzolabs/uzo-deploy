"use client"

import type { Address } from "viem"
import { NftPanel } from "@/components/manage/nft-panel"
import { TipJarPanel } from "@/components/manage/tipjar-panel"
import { TokenPanel } from "@/components/manage/token-panel"
import { useNetworkFromUrl } from "@/components/network/use-network-from-url"
import { networks, type NetworkKey } from "@/lib/chains"

export function ManagePanel({ network, address, templateId }: { network: NetworkKey; address: Address; templateId: string }) {
  useNetworkFromUrl(network)
  const chain = networks[network]
  if (templateId === "uzo.token") return <TokenPanel chain={chain} address={address} />
  if (templateId === "uzo.nft") return <NftPanel chain={chain} address={address} />
  if (templateId === "uzo.tipjar") return <TipJarPanel chain={chain} address={address} />
  return <p>This template has no management page yet.</p>
}
