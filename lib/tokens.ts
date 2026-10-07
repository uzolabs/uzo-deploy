import { TOKENS } from "@uzolabs/sdk"
import { isAddressEqual, type Address } from "viem"
import { addresses, type BotChain } from "@/lib/chains"
import { formatAmount } from "@/lib/format"
import { NATIVE } from "@/lib/stats"

export function usdtFor(chain: BotChain): Address | undefined {
  return (addresses as Record<number, { usdt?: Address }>)[chain.id]?.usdt
}

/** Symbol and decimals for a token a tip jar reports: address(0) is the native coin. */
export function tipToken(chain: BotChain, token: Address) {
  if (isAddressEqual(token, NATIVE)) return { symbol: chain.nativeCurrency.symbol, decimals: TOKENS.BOT.decimals }
  const usdt = usdtFor(chain)
  if (usdt && isAddressEqual(token, usdt)) return { symbol: "USDT", decimals: TOKENS.USDT.decimals }
  return undefined
}

export function formatTip(chain: BotChain, token: Address, amount: string | bigint) {
  const t = tipToken(chain, token)
  return t ? `${formatAmount(BigInt(amount), t.decimals)} ${t.symbol}` : `${amount.toString()} units of ${token}`
}
