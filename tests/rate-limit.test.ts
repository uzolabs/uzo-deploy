import { describe, expect, it } from "vitest"
import { clientIp, createRateLimiter } from "@/lib/rate-limit"

describe("rate limiter", () => {
  it("allows up to the limit in a window, then asks the caller to wait", () => {
    let t = 0
    const limit = createRateLimiter({ limit: 2, windowMs: 60_000, now: () => t })
    expect(limit("a").ok).toBe(true)
    expect(limit("a").ok).toBe(true)
    t = 15_000
    expect(limit("a")).toEqual({ ok: false, retryAfter: 45 })
  })

  it("keeps callers apart", () => {
    const limit = createRateLimiter({ limit: 1, windowMs: 60_000, now: () => 0 })
    expect(limit("a").ok).toBe(true)
    expect(limit("b").ok).toBe(true)
    expect(limit("a").ok).toBe(false)
  })

  it("starts a fresh window once the old one ends", () => {
    let t = 0
    const limit = createRateLimiter({ limit: 1, windowMs: 1_000, now: () => t })
    expect(limit("a").ok).toBe(true)
    expect(limit("a").ok).toBe(false)
    t = 1_000
    expect(limit("a").ok).toBe(true)
  })
})

describe("client ip", () => {
  it("takes the first forwarded address", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4")
  })

  it("falls back to x-real-ip, then one shared bucket", () => {
    expect(clientIp(new Headers({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8")
    expect(clientIp(new Headers())).toBe("unknown")
  })
})
