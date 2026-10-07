import type { TemplateKey } from "@/config/templates"
import { groupWhole, shortAddress } from "@/lib/format"

export type FieldConfig = {
  name: string
  label: string
  help: string
  placeholder?: string
  inputMode?: "text" | "numeric" | "decimal" | "url"
  /** Addresses and links read better in a monospace font. */
  mono?: boolean
  /** Shown as "optional" next to the label. */
  optional?: boolean
}

export const fields: Record<TemplateKey, FieldConfig[]> = {
  token: [
    { name: "name", label: "Token name", help: "Shown in wallets and on BOTScan.", placeholder: "My Token" },
    {
      name: "symbol",
      label: "Symbol",
      help: "The short ticker, letters and numbers only. Up to 11 characters.",
      placeholder: "MYT",
    },
    {
      name: "supply",
      label: "Total supply",
      help: "In whole tokens. The whole supply is created now and nobody can create more later. 18 decimals are added for you.",
      inputMode: "numeric",
    },
    {
      name: "recipient",
      label: "Send the supply to",
      help: "Every token goes to this address. It starts as your connected wallet.",
      placeholder: "0x...",
      mono: true,
    },
  ],
  nft: [
    { name: "name", label: "Collection name", help: "Shown in wallets and on BOTScan.", placeholder: "My Collection" },
    {
      name: "symbol",
      label: "Symbol",
      help: "The short ticker, letters and numbers only. Up to 11 characters.",
      placeholder: "MYC",
    },
    {
      name: "baseURI",
      label: "Metadata link",
      help: "The folder that holds your metadata. Token 1 reads <link>1. You can leave it empty and set it later, until you freeze it.",
      placeholder: "ipfs://...",
      inputMode: "url",
      mono: true,
      optional: true,
    },
    {
      name: "maxSupply",
      label: "Maximum supply",
      help: "The most tokens that can ever exist. This cannot be raised later.",
      inputMode: "numeric",
    },
    {
      name: "owner",
      label: "Owner",
      help: "Can mint up to the maximum, change the metadata link and freeze it. It starts as your connected wallet.",
      placeholder: "0x...",
      mono: true,
    },
    {
      name: "royaltyPercent",
      label: "Royalty (%)",
      help: "Suggested royalty on resales, up to 10%. Marketplaces may ignore it. Use 0 for none.",
      inputMode: "decimal",
    },
    {
      name: "royaltyReceiver",
      label: "Royalty receiver",
      help: "Where royalties are paid. Ignored when the royalty is 0.",
      placeholder: "0x...",
      mono: true,
    },
  ],
  tipJar: [
    {
      name: "title",
      label: "Title",
      help: "Shown on your tip page, like \"Coffee for Ada\". Up to 64 bytes.",
      placeholder: "Coffee for Ada",
      optional: true,
    },
    {
      name: "recipient",
      label: "Recipient",
      help: "Every tip is forwarded here in the same transaction. This cannot be changed later.",
      placeholder: "0x...",
      mono: true,
    },
  ],
}

const addr = (v: string | undefined) => (v && /^0x[0-9a-fA-F]{40}$/.test(v.trim()) ? shortAddress(v.trim()) : "an address you choose")

/** One plain sentence describing what the current values will do. */
export function summary(key: TemplateKey, v: Record<string, string | undefined>) {
  switch (key) {
    case "token": {
      const supply = (v.supply ?? "").replace(/[,\s_]/g, "")
      const symbol = v.symbol?.trim() || "tokens"
      return `${groupWhole(supply || "0")} ${symbol} will be sent to ${addr(v.recipient)}.`
    }
    case "nft": {
      const max = (v.maxSupply ?? "").replace(/[,\s_]/g, "")
      const symbol = v.symbol?.trim() || "NFTs"
      const pct = Number(v.royaltyPercent || 0)
      const royalty = pct > 0 ? `${pct}% royalty to ${addr(v.royaltyReceiver)}.` : "No royalty."
      return `Up to ${groupWhole(max || "0")} ${symbol} can be minted by ${addr(v.owner)}. ${royalty}`
    }
    case "tipJar": {
      const title = v.title?.trim()
      return `Tips${title ? ` to "${title}"` : ""} go straight to ${addr(v.recipient)}.`
    }
  }
}
