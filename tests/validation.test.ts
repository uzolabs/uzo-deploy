import { describe, expect, it } from "vitest"
import { summary } from "@/components/deploy/fields"
import { defaultValues, nftParams, nftSchema, tipJarParams, tipJarSchema, tokenParams, tokenSchema } from "@/lib/validation"

const me = "0xff08064bc2764216de386ccdc4412f3727a8b246"
const zero = "0x0000000000000000000000000000000000000000"

describe("token form", () => {
  const ok = { name: "My Token", symbol: "MYT", supply: "1,000,000", recipient: me }

  it("accepts a normal token and converts the supply at 18 decimals", () => {
    const p = tokenParams(ok)
    expect(p.initialSupply).toBe(10n ** 24n)
    expect(p.recipient).toBe("0xff08064bC2764216dE386CCdC4412f3727A8B246")
  })

  it("rejects bad input", () => {
    const bad = (patch: Partial<typeof ok>) => tokenSchema.safeParse({ ...ok, ...patch }).success
    expect(bad({ name: "" })).toBe(false)
    expect(bad({ symbol: "MY-T" })).toBe(false)
    expect(bad({ symbol: "TWELVECHARS1" })).toBe(false)
    expect(bad({ supply: "0" })).toBe(false)
    expect(bad({ supply: "1.5" })).toBe(false)
    expect(bad({ recipient: zero })).toBe(false)
    expect(bad({ recipient: "0x123" })).toBe(false)
  })

  it("rejects a supply that would overflow uint256", () => {
    const tooBig = (2n ** 256n / 10n ** 18n + 1n).toString()
    expect(tokenSchema.safeParse({ ...ok, supply: tooBig }).success).toBe(false)
  })
})

describe("nft form", () => {
  const base = { name: "C", symbol: "C", baseURI: "", maxSupply: "1000", owner: me, royaltyPercent: "0", royaltyReceiver: "" }

  it("sends the zero receiver when there is no royalty", () => {
    const p = nftParams(base)
    expect(p.royaltyBps).toBe(0n)
    expect(p.royaltyReceiver).toBe(zero)
  })

  it("needs a receiver when the royalty is above 0", () => {
    expect(nftSchema.safeParse({ ...base, royaltyPercent: "5" }).success).toBe(false)
    expect(nftParams({ ...base, royaltyPercent: "2.5", royaltyReceiver: me }).royaltyBps).toBe(250n)
  })

  it("caps the royalty at 10%, the contract limit", () => {
    expect(nftSchema.safeParse({ ...base, royaltyPercent: "10.01", royaltyReceiver: me }).success).toBe(false)
    expect(nftParams({ ...base, royaltyPercent: "10", royaltyReceiver: me }).royaltyBps).toBe(1000n)
  })

  it("checks links and supply", () => {
    expect(nftSchema.safeParse({ ...base, baseURI: "ipfs://bafy/" }).success).toBe(true)
    expect(nftSchema.safeParse({ ...base, baseURI: "http://insecure/" }).success).toBe(false)
    expect(nftSchema.safeParse({ ...base, maxSupply: "0" }).success).toBe(false)
    expect(nftSchema.safeParse({ ...base, maxSupply: "1000001" }).success).toBe(false)
  })
})

describe("tip jar form", () => {
  it("allows an empty title and limits it to 64 bytes", () => {
    expect(tipJarParams({ recipient: me, title: "" }).title).toBe("")
    expect(tipJarSchema.safeParse({ recipient: me, title: "a".repeat(64) }).success).toBe(true)
    expect(tipJarSchema.safeParse({ recipient: me, title: "a".repeat(65) }).success).toBe(false)
    // 22 three-byte characters is 66 bytes.
    expect(tipJarSchema.safeParse({ recipient: me, title: "€".repeat(22) }).success).toBe(false)
  })
})

describe("defaults and summary", () => {
  it("fills addresses with the connected wallet", () => {
    expect(defaultValues("token", me).recipient).toBe(me)
    expect(defaultValues("nft").owner).toBe("")
  })

  it("describes the result in one sentence", () => {
    expect(summary("token", { supply: "1000000", symbol: "MYT", recipient: me })).toBe(
      "1,000,000 MYT will be sent to 0xff08...b246.",
    )
    expect(summary("nft", { maxSupply: "1000", symbol: "C", owner: me, royaltyPercent: "0" })).toBe(
      "Up to 1,000 C can be minted by 0xff08...b246. No royalty.",
    )
    expect(summary("tipJar", { title: "Coffee", recipient: "" })).toBe(
      'Tips to "Coffee" go straight to an address you choose.',
    )
  })
})
