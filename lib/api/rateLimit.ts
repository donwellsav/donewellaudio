import type { NextRequest } from 'next/server'

/**
 * Extracts the client IP from a Next.js request.
 *
 * Tries Vercel's `request.ip` first (trusted on Vercel), then falls back
 * to the first entry in `x-forwarded-for`.
 */
export function getClientIp(request: NextRequest): string {
  return (request as NextRequest & { ip?: string }).ip
    ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'unknown'
}

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  maxEntries: number
}

/**
 * Creates a rate limiter backed by an in-memory Map.
 *
 * Each call site gets its own limiter instance (own Map, own counters).
 * Periodically prunes expired entries and caps total Map size.
 */
export function createRateLimiter(config: RateLimitConfig) {
  const { windowMs, maxRequests, maxEntries } = config
  const rateMap = new Map<string, { count: number; windowStart: number }>()
  let callCount = 0

  return function isRateLimited(request: NextRequest): boolean {
    const ip = getClientIp(request)
    const now = Date.now()
    const entry = rateMap.get(ip)

    callCount++
    if (callCount % 100 === 0 || rateMap.size > maxEntries) {
      for (const [k, v] of rateMap) {
        if (now - v.windowStart > windowMs) rateMap.delete(k)
      }
      if (rateMap.size > maxEntries) {
        const excess = rateMap.size - maxEntries
        const iter = rateMap.keys()
        for (let i = 0; i < excess; i++) {
          const k = iter.next().value
          if (k !== undefined) rateMap.delete(k)
        }
      }
    }

    if (!entry || now - entry.windowStart > windowMs) {
      rateMap.set(ip, { count: 1, windowStart: now })
      return false
    }

    entry.count++
    return entry.count > maxRequests
  }
}
