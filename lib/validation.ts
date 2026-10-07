// Form schemas for each template. Values are strings straight from the inputs; each
// template's `toParams` turns valid values into the factory's arguments. The limits mirror
// the checks in contracts/src/templates so a form that passes here will not revert there.
import { getAddress, isAddress, maxUint256, type Address } from "viem"
import { z } from "zod"
import type { TemplateKey } from "@/config/templates"
import { percentToBps, wholeTokensToUnits } from "@/lib/format"

export const MAX_TITLE_BYTES = 64
export const MAX_ROYALTY_PERCENT = 10

const utf8Bytes = (s: string) => new TextEncoder().encode(s).length

const address = (label: string) =>
  z
    .string()
    .trim()
    .refine((v) => isAddress(v, { strict: false }), `Enter a valid ${label} address (0x followed by 40 characters).`)
    .refine((v) => !isAddress(v, { strict: false }) || BigInt(v) !== 0n, `The ${label} cannot be the zero address.`)

const name = z
  .string()
  .trim()
  .min(1, "Enter a name.")
  .max(64, "Keep the name to 64 characters or fewer.")

const symbol = z
  .string()
  .trim()
  .min(1, "Enter a symbol.")
  .max(11, "Keep the symbol to 11 characters or fewer.")
  .regex(/^[A-Za-z0-9]+$/, "Use letters and numbers only.")

// Whole tokens at 18 decimals must fit in uint256.
const MAX_WHOLE_TOKENS = maxUint256 / 10n ** 18n

export const tokenSchema = z.object({
  name,
  symbol,
  supply: z
    .string()
    .trim()
    .transform((v) => v.replace(/[,\s_]/g, ""))
    .refine((v) => /^\d+$/.test(v), "Enter a whole number of tokens, like 1000000.")
    .refine((v) => !/^\d+$/.test(v) || BigInt(v) > 0n, "The supply must be at least 1.")
    .refine((v) => !/^\d+$/.test(v) || BigInt(v) <= MAX_WHOLE_TOKENS, "That supply is too large."),
  recipient: address("recipient"),
})

export const nftSchema = z
  .object({
    name,
    symbol,
    baseURI: z
      .string()
      .trim()
      .max(256, "Keep the link to 256 characters or fewer.")
      .refine(
        (v) => v === "" || /^(ipfs|ar|https):\/\/\S+$/.test(v),
        "Use an ipfs://, ar:// or https:// link, or leave it empty for now.",
      ),
    maxSupply: z
      .string()
      .trim()
      .transform((v) => v.replace(/[,\s_]/g, ""))
      .refine((v) => /^\d+$/.test(v), "Enter a whole number, like 1000.")
      .refine((v) => !/^\d+$/.test(v) || (BigInt(v) >= 1n && BigInt(v) <= 1_000_000n), "Choose between 1 and 1,000,000."),
    owner: address("owner"),
    royaltyPercent: z
      .string()
      .trim()
      .refine((v) => v === "" || /^\d{1,2}(\.\d{1,2})?$/.test(v), "Enter a percentage like 5 or 2.5.")
      .refine((v) => v === "" || Number(v) <= MAX_ROYALTY_PERCENT, `Royalties are capped at ${MAX_ROYALTY_PERCENT}%.`),
    royaltyReceiver: z.string().trim(),
  })
  .superRefine((v, ctx) => {
    const pct = v.royaltyPercent === "" ? 0 : Number(v.royaltyPercent)
    if (pct === 0) return
    if (!isAddress(v.royaltyReceiver, { strict: false }) || BigInt(v.royaltyReceiver) === 0n) {
      ctx.addIssue({
        code: "custom",
        path: ["royaltyReceiver"],
        message: "Enter the address that receives royalties, or set the royalty to 0.",
      })
    }
  })

export const tipJarSchema = z.object({
  recipient: address("recipient"),
  title: z
    .string()
    .trim()
    .refine((v) => utf8Bytes(v) <= MAX_TITLE_BYTES, `Keep the title to ${MAX_TITLE_BYTES} bytes (about 64 letters).`),
})

export type TokenValues = z.input<typeof tokenSchema>
export type NftValues = z.input<typeof nftSchema>
export type TipJarValues = z.input<typeof tipJarSchema>

export type TokenParams = { name: string; symbol: string; initialSupply: bigint; recipient: Address }
export type NftParams = {
  name: string
  symbol: string
  baseURI: string
  maxSupply: bigint
  owner: Address
  royaltyReceiver: Address
  royaltyBps: bigint
}
export type TipJarParams = { recipient: Address; title: string }

const ZERO: Address = "0x0000000000000000000000000000000000000000"

export function tokenParams(values: TokenValues): TokenParams {
  const v = tokenSchema.parse(values)
  return {
    name: v.name,
    symbol: v.symbol,
    initialSupply: wholeTokensToUnits(v.supply),
    recipient: getAddress(v.recipient),
  }
}

export function nftParams(values: NftValues): NftParams {
  const v = nftSchema.parse(values)
  const bps = v.royaltyPercent === "" ? 0 : percentToBps(v.royaltyPercent)
  return {
    name: v.name,
    symbol: v.symbol,
    baseURI: v.baseURI,
    maxSupply: BigInt(v.maxSupply),
    owner: getAddress(v.owner),
    royaltyReceiver: bps === 0 ? ZERO : getAddress(v.royaltyReceiver),
    royaltyBps: BigInt(bps),
  }
}

export function tipJarParams(values: TipJarValues): TipJarParams {
  const v = tipJarSchema.parse(values)
  return { recipient: getAddress(v.recipient), title: v.title }
}

export const schemas = {
  token: tokenSchema,
  nft: nftSchema,
  tipJar: tipJarSchema,
} as const satisfies Record<TemplateKey, z.ZodType>

/** Form defaults. Addresses start as the connected wallet, which most people want. */
export function defaultValues(key: TemplateKey, account?: string): Record<string, string> {
  const me = account ?? ""
  switch (key) {
    case "token":
      return { name: "", symbol: "", supply: "1000000", recipient: me } satisfies TokenValues
    case "nft":
      return {
        name: "",
        symbol: "",
        baseURI: "",
        maxSupply: "1000",
        owner: me,
        royaltyPercent: "0",
        royaltyReceiver: me,
      } satisfies NftValues
    case "tipJar":
      return { recipient: me, title: "" } satisfies TipJarValues
  }
}
