import "server-only"
import { getAddress, hexToBigInt, hexToNumber, numberToHex, type Address, type Hash, type Hex } from "viem"
import { explorerUrl, type BotChain } from "@/lib/chains"
import { publicClient } from "@/lib/server/client"

// Phase 0: the RPC answers address-filtered eth_getLogs over 100k-block ranges in seconds, so
// it is the primary source. BOTScan's logs API is the fallback. Both sit behind LogSource so
// Uzo Index can replace them later without changing the routes.

export type RawLog = {
  address: Address
  topics: Hex[]
  data: Hex
  blockNumber: bigint
  transactionHash: Hash
  logIndex: number
  /** Unix seconds, when the source includes it. */
  timestamp?: number
}

export type LogQuery = {
  /** One or more contracts. Omit to match any contract (RPC only). */
  address?: Address | Address[]
  /** topic0 is required. */
  topics: [Hex, ...(Hex | null)[]]
  fromBlock: bigint
  toBlock: bigint
}

export interface LogSource {
  name: string
  getLogs(chain: BotChain, query: LogQuery): Promise<RawLog[]>
}

const CHUNK = 100_000n
const MIN_CHUNK = 2_000n
const PARALLEL = 4

type RpcLog = {
  address: Address
  topics: Hex[]
  data: Hex
  blockNumber: Hex
  transactionHash: Hash
  logIndex: Hex
  blockTimestamp?: Hex
}

async function rpcRange(chain: BotChain, q: LogQuery, from: bigint, to: bigint): Promise<RawLog[]> {
  try {
    const logs = (await publicClient(chain).request({
      method: "eth_getLogs",
      params: [{ address: q.address, topics: q.topics, fromBlock: numberToHex(from), toBlock: numberToHex(to) }],
    } as never)) as RpcLog[]
    return logs.map((l) => ({
      address: getAddress(l.address),
      topics: l.topics,
      data: l.data,
      blockNumber: hexToBigInt(l.blockNumber),
      transactionHash: l.transactionHash,
      logIndex: hexToNumber(l.logIndex),
      timestamp: l.blockTimestamp ? hexToNumber(l.blockTimestamp) : undefined,
    }))
  } catch (error) {
    // Too many results or a timeout: split the range and try each half.
    if (to - from + 1n <= MIN_CHUNK) throw error
    const mid = from + (to - from) / 2n
    return [...(await rpcRange(chain, q, from, mid)), ...(await rpcRange(chain, q, mid + 1n, to))]
  }
}

export const rpcLogs: LogSource = {
  name: "rpc",
  async getLogs(chain, q) {
    const ranges: [bigint, bigint][] = []
    for (let from = q.fromBlock; from <= q.toBlock; from += CHUNK) {
      ranges.push([from, from + CHUNK - 1n < q.toBlock ? from + CHUNK - 1n : q.toBlock])
    }
    const out: RawLog[][] = []
    for (let i = 0; i < ranges.length; i += PARALLEL) {
      out.push(...(await Promise.all(ranges.slice(i, i + PARALLEL).map(([f, t]) => rpcRange(chain, q, f, t)))))
    }
    return out.flat()
  },
}

type ScanLog = {
  address: string
  topics: (string | null)[]
  data: string
  blockNumber: string
  transactionHash: string
  logIndex: string
  timeStamp: string
}

const parseHexOrDec = (v: string) => (v.startsWith("0x") ? hexToBigInt(v as Hex) : BigInt(v || "0"))

/** BOTScan's Etherscan-style logs API. One address per call and at most 1,000 results per page. */
export const botscanLogs: LogSource = {
  name: "botscan",
  async getLogs(chain, q) {
    if (!q.address) throw new Error("BOTScan needs an address to read logs")
    const out: RawLog[] = []
    for (const address of Array.isArray(q.address) ? q.address : [q.address]) {
      let from = q.fromBlock
      for (let page = 0; page < 50; page++) {
        const url = new URL(`${explorerUrl(chain)}/api`)
        url.search = new URLSearchParams({
          module: "logs",
          action: "getLogs",
          fromBlock: from.toString(),
          toBlock: q.toBlock.toString(),
          address,
        }).toString()
        q.topics.forEach((t, i) => {
          if (t) url.searchParams.set(`topic${i}`, t)
          if (t && i > 0) url.searchParams.set(`topic0_${i}_opr`, "and")
        })
        const res = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" })
        if (!res.ok) throw new Error(`BOTScan logs returned ${res.status}`)
        const body = (await res.json()) as { status: string; message: string; result: ScanLog[] | null }
        const rows = body.result ?? []
        for (const l of rows) {
          out.push({
            address: getAddress(l.address),
            topics: l.topics.filter((t): t is string => Boolean(t)) as Hex[],
            data: l.data as Hex,
            blockNumber: parseHexOrDec(l.blockNumber),
            transactionHash: l.transactionHash as Hash,
            logIndex: Number(parseHexOrDec(l.logIndex)),
            timestamp: Number(parseHexOrDec(l.timeStamp)),
          })
        }
        if (rows.length < 1000) break
        // Start the next page at the last block seen; duplicates are removed below.
        from = parseHexOrDec(rows[rows.length - 1].blockNumber)
      }
    }
    return dedupe(out)
  },
}

function dedupe(logs: RawLog[]) {
  const seen = new Set<string>()
  return logs
    .filter((l) => {
      const key = `${l.transactionHash}:${l.logIndex}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => (a.blockNumber === b.blockNumber ? a.logIndex - b.logIndex : a.blockNumber < b.blockNumber ? -1 : 1))
}

/** RPC first; BOTScan if the RPC fails and the query names its contracts. */
async function fetchLogs(chain: BotChain, q: LogQuery): Promise<RawLog[]> {
  try {
    return await rpcLogs.getLogs(chain, q)
  } catch (error) {
    if (!q.address) throw error
    console.warn(`RPC logs failed on ${chain.name}, using BOTScan`, error)
    return botscanLogs.getLogs(chain, q)
  }
}

// Logs older than this many blocks are kept, so later calls only read new blocks. The most
// recent blocks are read fresh each time in case they are reorganised.
const CONFIRMATIONS = 20n

const scans = new Map<string, { logs: RawLog[]; scannedTo: bigint }>()

/**
 * Every log matching `query` from `fromBlock` to the chain head, read incrementally.
 * The key must identify the query; the same key always means the same filter.
 */
export async function scanLogs(chain: BotChain, key: string, query: Omit<LogQuery, "toBlock">): Promise<RawLog[]> {
  // viem caches the block number for a few seconds; a deploy from a moment ago must count.
  const head = await publicClient(chain).getBlockNumber({ cacheTime: 0 })
  const safe = head > CONFIRMATIONS ? head - CONFIRMATIONS : 0n
  const storeKey = `${chain.id}:${key}`
  const stored = scans.get(storeKey) ?? { logs: [], scannedTo: query.fromBlock - 1n }

  if (stored.scannedTo < safe) {
    const fresh = await fetchLogs(chain, { ...query, fromBlock: stored.scannedTo + 1n, toBlock: safe })
    scans.set(storeKey, { logs: dedupe([...stored.logs, ...fresh]), scannedTo: safe })
  }
  const settled = scans.get(storeKey) ?? stored
  const tail =
    settled.scannedTo < head ? await fetchLogs(chain, { ...query, fromBlock: settled.scannedTo + 1n, toBlock: head }) : []
  return dedupe([...settled.logs, ...tail])
}

const blockTimes = new Map<string, number>()

/** Fills in block timestamps the source left out. Block times never change, so they are kept. */
export async function withTimestamps(chain: BotChain, logs: RawLog[]): Promise<(RawLog & { timestamp: number })[]> {
  for (const l of logs) if (l.timestamp !== undefined) blockTimes.set(`${chain.id}:${l.blockNumber}`, l.timestamp)
  const missing = [...new Set(logs.filter((l) => !blockTimes.has(`${chain.id}:${l.blockNumber}`)).map((l) => l.blockNumber))]
  const client = publicClient(chain)
  for (let i = 0; i < missing.length; i += 8) {
    await Promise.all(
      missing.slice(i, i + 8).map(async (n) => {
        const block = await client.getBlock({ blockNumber: n })
        blockTimes.set(`${chain.id}:${n}`, Number(block.timestamp))
      }),
    )
  }
  return logs.map((l) => ({ ...l, timestamp: blockTimes.get(`${chain.id}:${l.blockNumber}`)! }))
}
