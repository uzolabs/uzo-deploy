import { describe, expect, it } from "vitest"
import { formatAmount, formatBot, groupWhole, percentToBps, shortAddress, wholeTokensToUnits } from "@/lib/format"

describe("format", () => {
  it("shortens addresses", () => {
    expect(shortAddress("0xff08064bC2764216dE386CCdC4412f3727A8B246")).toBe("0xff08...B246")
    expect(shortAddress("0x1234")).toBe("0x1234")
  })

  it("groups and trims amounts", () => {
    expect(formatAmount(1_234_567n * 10n ** 18n, 18)).toBe("1,234,567")
    expect(formatAmount(15n * 10n ** 17n, 18)).toBe("1.5")
    expect(formatAmount(1n, 18)).toBe("<0.0001")
    expect(formatAmount(0n, 18)).toBe("0")
    expect(formatAmount(-15n * 10n ** 17n, 18)).toBe("-1.5")
  })

  it("formats native gas cost with its symbol", () => {
    // 914,765 gas at 20 gwei is 0.0182953 BOT, shown to 6 decimals.
    expect(formatBot(914_765n * 20_000_000_000n, "tBOT")).toBe("0.018295 tBOT")
  })

  it("converts whole tokens to base units", () => {
    expect(wholeTokensToUnits("1,000,000")).toBe(10n ** 24n)
    expect(wholeTokensToUnits("1 000_000")).toBe(10n ** 24n)
  })

  it("converts royalty percent to basis points", () => {
    expect(percentToBps("5")).toBe(500)
    expect(percentToBps("2.5")).toBe(250)
    expect(percentToBps("0.01")).toBe(1)
  })

  it("groups whole numbers for display", () => {
    expect(groupWhole("1000000")).toBe("1,000,000")
    expect(groupWhole("abc")).toBe("abc")
  })
})
