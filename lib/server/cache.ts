import "server-only"

type Entry = { value: Promise<unknown>; created: number; expires: number }

const store = new Map<string, Entry>()

/**
 * Keeps a result in memory for `ttlMs`. Callers that arrive while the first one is still
 * working share its promise, so a burst of requests makes one upstream call. Failures are
 * not kept. The cache is per server instance; responses also carry CDN cache headers.
 */
export function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const hit = store.get(key)
  if (hit && hit.expires > now) return hit.value as Promise<T>
  const value = load()
  store.set(key, { value, created: now, expires: now + ttlMs })
  value.catch(() => {
    if (store.get(key)?.value === value) store.delete(key)
  })
  if (store.size > 500) {
    for (const [k, e] of store) if (e.expires <= now) store.delete(k)
  }
  return value
}

/**
 * Drops an entry once it is at least `minAgeMs` old, so the next read loads it again.
 * Returns whether it did. The minimum age stops a stream of requests forcing reloads.
 */
export function expire(key: string, minAgeMs: number): boolean {
  const hit = store.get(key)
  if (!hit || Date.now() - hit.created < minAgeMs) return false
  store.delete(key)
  return true
}

/** Round-trips a value through the cache, for /api/health. */
export async function cacheWorks() {
  const token = Math.random()
  const read = await cached(`health:${token}`, 1000, async () => token)
  return read === token
}
