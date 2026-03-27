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

// GET — Companion polls for advisories
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
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
  const { code } = await params
  prune()

  let advisory: unknown
  try {
    advisory = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
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
