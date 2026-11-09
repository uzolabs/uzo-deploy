import { beforeEach, describe, expect, it, vi } from "vitest"
import { numberToHex, type Address, type Hex } from "viem"

// A fake chain: every log it holds, the current head, and the getLogs filters it was asked.
const chainLogs: { address: Address; block: number; index: number }[] = []
const asked: { address?: Address[]; from: number; to: number }[] = []
let head = 0n

vi.mock("server-only", () => ({}))
vi.mock("@/lib/server/client", () => ({
  publicClient: () => ({
    getBlockNumber: async () => head,
    request: async ({ params: [q] }: { params: [{ address?: Address[]; fromBlock: Hex; toBlock: Hex }] }) => {
      const from = Number(q.fromBlock)
      const to = Number(q.toBlock)
      asked.push({ address: q.address, from, to })
      return chainLogs
        .filter((l) => l.block >= from && l.block <= to)
        .filter((l) => !q.address || q.address.some((a) => a.toLowerCase() === l.address.toLowerCase()))
        .map((l) => ({
          address: l.address,
          topics: [TOPIC],
          data: "0x",
          blockNumber: numberToHex(l.block),
          transactionHash: `0x${l.block.toString(16).padStart(64, "0")}`,
          logIndex: numberToHex(l.index),
        }))
    },
  }),
}))

const { scanLogs } = await import("@/lib/server/logs")

const TOPIC = `0x${"ab".repeat(32)}` as Hex
const JAR_A = "0x000000000000000000000000000000000000000A" as Address
const JAR_B = "0x000000000000000000000000000000000000000b" as Address
const FAKE = "0x00000000000000000000000000000000000000Fe" as Address
const chain = { id: 968, name: "test" } as never

let key = 0
beforeEach(() => {
  chainLogs.length = 0
  asked.length = 0
  key++
})

describe("scanLogs", () => {
  it("asks only for the listed contracts, so a copycat's logs are never read", async () => {
    head = 1_000n
    chainLogs.push({ address: JAR_A, block: 100, index: 0 }, { address: FAKE, block: 200, index: 0 })
    const logs = await scanLogs(chain, `t${key}`, { address: [JAR_A], topics: [TOPIC], fromBlock: 0n })
    expect(logs.map((l) => l.address)).toEqual([JAR_A])
    expect(asked.every((q) => q.address?.length === 1)).toBe(true)
  })

  it("reads earlier blocks again for a contract added after the first scan", async () => {
    head = 1_000n
    chainLogs.push({ address: JAR_A, block: 100, index: 0 }, { address: JAR_B, block: 500, index: 0 })
    const first = await scanLogs(chain, `t${key}`, { address: [JAR_A], topics: [TOPIC], fromBlock: 0n })
    expect(first).toHaveLength(1)

    // JAR_B was created at block 450 and tipped at 500, both before the stored scan ends.
    asked.length = 0
    const startOf = (a: Address) => (a.toLowerCase() === JAR_B.toLowerCase() ? 450n : 0n)
    const second = await scanLogs(chain, `t${key}`, { address: [JAR_A, JAR_B], topics: [TOPIC], fromBlock: 0n }, startOf)
    expect(second.map((l) => l.blockNumber)).toEqual([100n, 500n])
    // The catch-up covers only the new jar, from its creation block.
    expect(asked[0]).toEqual({ address: [JAR_B], from: 450, to: 980 })
  })
})
