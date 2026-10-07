// A fixed-window limiter keyed by caller. Pure, so it runs in tests with a fake clock.
// It lives in one server instance's memory: enough to stop one client hammering BOTScan
// through us, not a global quota.

export type RateLimiter = (key: string) => { ok: boolean; retryAfter: number }

export function createRateLimiter({
  limit,
  windowMs,
  now = Date.now,
}: {
  limit: number
  windowMs: number
  now?: () => number
}): RateLimiter {
  const windows = new Map<string, { start: number; count: number }>()
  return (key) => {
    const t = now()
    let w = windows.get(key)
    if (!w || t - w.start >= windowMs) {
      w = { start: t, count: 0 }
      windows.set(key, w)
      if (windows.size > 10_000) {
        for (const [k, v] of windows) if (t - v.start >= windowMs) windows.delete(k)
      }
    }
    w.count++
    const ok = w.count <= limit
    return { ok, retryAfter: ok ? 0 : Math.ceil((w.start + windowMs - t) / 1000) }
  }
}

/** The caller's IP as the host reports it. Unknown callers share one bucket. */
export function clientIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown"
}
