import { NextRequest, NextResponse } from 'next/server'

/**
 * Cloud relay for Companion integration.
 *
 * DoneWell PWA posts advisories here (same origin — no CORS).
 * Companion module polls here from the user's local network.
 * Paired via a short code. No IP addresses or port numbers needed.
 *
 * GET  /api/companion/relay/[code] — Companion polls for pending advisories
 * POST /api/companion/relay/[code] — DoneWell pushes a new advisory
 * DELETE /api/companion/relay/[code] — Clear the relay (disconnect)
 */

// ─── Relay store ─────────────────────────────────────────────────────────────

/** In-memory relay store. Each code maps to a queue of advisories. */
const relays = new Map<string, { advisories: unknown[]; lastActivity: number }>()

/** Max advisories per relay to prevent memory bloat */
const MAX_QUEUE = 20
/** Relay expires after 2 hours of inactivity */
const EXPIRY_MS = 2 * 60 * 60 * 1000

/** Prune expired relays */
function prune() {
  const now = Date.now()
  for (const [code, relay] of relays) {
    if (now - relay.lastActivity > EXPIRY_MS) {
      relays.delete(code)
    }
  }
}

// ─── Rate limiting ────────────────────────────────────────────────────────────

const RATE_WINDOW_MS = 60_000
const RATE_MAX_REQUESTS = 30
const MAX_RATE_LIMIT_ENTRIES = 10_000
const relayRateMap = new Map<string, { count: number; windowStart: number }>()
let _rateLimitCallCount = 0

function getClientIp(request: NextRequest): string {
  return (request as NextRequest & { ip?: string }).ip
    ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'unknown'
}

function isRateLimited(request: NextRequest): boolean {
  const ip = getClientIp(request)
  const now = Date.now()
  const entry = relayRateMap.get(ip)

  _rateLimitCallCount++
  if (_rateLimitCallCount % 100 === 0 || relayRateMap.size > MAX_RATE_LIMIT_ENTRIES) {
    for (const [k, v] of relayRateMap) {
      if (now - v.windowStart > RATE_WINDOW_MS) relayRateMap.delete(k)
    }
    if (relayRateMap.size > MAX_RATE_LIMIT_ENTRIES) {
      const excess = relayRateMap.size - MAX_RATE_LIMIT_ENTRIES
      const iter = relayRateMap.keys()
      for (let i = 0; i < excess; i++) {
        const k = iter.next().value
        if (k !== undefined) relayRateMap.delete(k)
      }
    }
  }

  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    relayRateMap.set(ip, { count: 1, windowStart: now })
    return false
  }

  entry.count++
  return entry.count > RATE_MAX_REQUESTS
}

// ─── Payload validation ───────────────────────────────────────────────────────

/**
 * Validates a relay POST payload.
 * Accepts advisory objects (id + severity + confidence) and control
 * messages (resolve, dismiss, mode_change) which carry a `type` field.
 */
function validatePayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return 'Expected object'
  const p = payload as Record<string, unknown>

  // Control messages (resolve / dismiss / mode_change) only need a type string
  if (typeof p.type === 'string') return null

  // Advisory payload
  if (typeof p.id !== 'string' || p.id.length === 0) return 'Missing id'
  if (typeof p.severity !== 'string' || p.severity.length === 0) return 'Missing severity'
  if (typeof p.confidence !== 'number' || p.confidence < 0 || p.confidence > 1) {
    return 'Invalid confidence'
  }

  return null
}

// ─── Route handlers ───────────────────────────────────────────────────────────

// GET — Companion polls for advisories
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  if (isRateLimited(request)) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
  }

  const { code } = await params
  prune()

  const relay = relays.get(code)
  if (!relay) {
    return NextResponse.json({ ok: true, advisories: [], pendingCount: 0 })
  }

  // Drain the queue — Companion gets all pending advisories
  const advisories = [...relay.advisories]
  relay.advisories = []
  relay.lastActivity = Date.now()

  return NextResponse.json({
    ok: true,
    advisories,
    pendingCount: advisories.length,
  })
}

// POST — DoneWell pushes an advisory
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  if (isRateLimited(request)) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
  }

  const { code } = await params
  prune()

  let advisory: unknown
  try {
    advisory = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const validationError = validatePayload(advisory)
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
  }

  let relay = relays.get(code)
  if (!relay) {
    relay = { advisories: [], lastActivity: Date.now() }
    relays.set(code, relay)
  }

  relay.advisories.push(advisory)
  relay.lastActivity = Date.now()

  // Cap queue size
  if (relay.advisories.length > MAX_QUEUE) {
    relay.advisories = relay.advisories.slice(-MAX_QUEUE)
  }

  return NextResponse.json({
    accepted: true,
    pendingCount: relay.advisories.length,
  })
}

// DELETE — Clear relay
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params
  relays.delete(code)
  return NextResponse.json({ ok: true })
}
