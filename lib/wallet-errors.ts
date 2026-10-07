import { BaseError } from "viem"

/** A short, plain reason for a failed wallet or contract call. */
export function reason(error: unknown) {
  if (error instanceof BaseError) {
    if (error.walk((e) => (e as { code?: number }).code === 4001)) return "You rejected the request in your wallet."
    return error.shortMessage
  }
  return "Something went wrong. Try again."
}
