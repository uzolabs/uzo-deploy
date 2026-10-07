"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef } from "react"
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi"
import type { BotChain } from "@/lib/chains"

/**
 * One contract write and its receipt. When it confirms, every cached chain read is refreshed
 * so balances and counts on the page catch up.
 */
export function useTx(chain: BotChain, onConfirmed?: () => void) {
  const write = useWriteContract()
  const receipt = useWaitForTransactionReceipt({ hash: write.data, chainId: chain.id, pollingInterval: 1000 })
  const queryClient = useQueryClient()
  const seen = useRef<string | undefined>(undefined)

  const success = receipt.data?.status === "success"
  useEffect(() => {
    if (!success || seen.current === write.data) return
    seen.current = write.data
    void queryClient.invalidateQueries()
    onConfirmed?.()
  }, [success, write.data, queryClient, onConfirmed])

  return {
    write,
    receipt,
    chain,
    hash: write.data,
    busy: write.isPending || (Boolean(write.data) && receipt.isPending),
    success,
    reverted: receipt.data?.status === "reverted",
    reset: write.reset,
  }
}

export type Tx = ReturnType<typeof useTx>
