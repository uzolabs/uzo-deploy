import { formatUnits, parseUnits } from "viem"

/** 0x1234...abcd */
export function shortAddress(address: string, chars = 4) {
  if (address.length <= 2 + chars * 2) return address
  return `${address.slice(0, 2 + chars)}...${address.slice(-chars)}`
}

const grouped = new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 })

/** Groups the whole part with commas and keeps up to `maxDecimals` of the fraction, trimmed. */
export function formatAmount(value: bigint, decimals: number, maxDecimals = 4) {
  const negative = value < 0n
  const [whole, fraction = ""] = formatUnits(negative ? -value : value, decimals).split(".")
  const trimmed = fraction.slice(0, maxDecimals).replace(/0+$/, "")
  const wholeText = grouped.format(BigInt(whole))
  const text = trimmed ? `${wholeText}.${trimmed}` : wholeText
  if (value !== 0n && text === "0") return `${negative ? "-" : ""}<0.${"0".repeat(maxDecimals - 1)}1`
  return negative ? `-${text}` : text
}

/** Native BOT (or tBOT) amount with its symbol, from wei. */
export function formatBot(wei: bigint, symbol: string, maxDecimals = 6) {
  return `${formatAmount(wei, 18, maxDecimals)} ${symbol}`
}

/** Groups a plain whole number string for display: "1000000" becomes "1,000,000". */
export function groupWhole(value: string) {
  return /^\d+$/.test(value) ? grouped.format(BigInt(value)) : value
}

/** Whole tokens typed by a person, converted to base units at 18 decimals. */
export function wholeTokensToUnits(value: string, decimals = 18) {
  return parseUnits(value.replace(/[,\s_]/g, ""), decimals)
}

/** Royalty percent ("5" or "2.5") to basis points (500, 250). */
export function percentToBps(value: string) {
  const n = Number(value)
  return Math.round(n * 100)
}

export function formatGas(gas: bigint) {
  return grouped.format(gas)
}
