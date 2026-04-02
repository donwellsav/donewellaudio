import { NextRequest, NextResponse } from 'next/server'
import { createRateLimiter } from '@/lib/api/rateLimit'

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

/**
 * In-memory relay store. Each code maps to a queue of advisories.
 *
 * Intentionally ephemeral — data is lost on cold start or redeploy.
 * This suits the relay use case (short-lived advisory forwarding between
 * paired sessions). Active relay sessions may lose queued advisories
 * during Vercel serverless function cold starts.
 */
const relays = new Map<string, { advisories: unknown[]; lastActivity: number }>()

/** Max advisories per relay to prevent memory bloat */
const MAX_QUEUE = 20
/** Max POST body size in bytes (50 KB — advisories are typically <2 KB) */
const MAX_PAYLOAD_BYTES = 50_000
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

const isRateLimited = createRateLimiter({ windowMs: 60_000, maxRequests: 30, maxEntries: 10_000 })

// ─── Payload validation ───────────────────────────────────────────────────────

/** Valid control message types that Companion recognizes */
const VALID_CONTROL_TYPES = new Set(['resolve', 'dismiss', 'mode_change'])

/** Max string field length to prevent oversized payloads */
const MAX_FIELD_LENGTH = 100

/**
 * Validates a relay POST payload.
 * Accepts advisory objects (id + severity + confidence) and control
 * messages (resolve, dismiss, mode_change) which carry a `type` field.
 */
function validatePayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return 'Expected object'
  const p = payload as Record<string, unknown>

  // Control messages — must be a known type
  if (typeof p.type === 'string') {
    if (!VALID_CONTROL_TYPES.has(p.type)) return `Unknown control type: ${p.type.slice(0, 30)}`
    return null
  }

  // Advisory payload
  if (typeof p.id !== 'string' || p.id.length === 0 || p.id.length > MAX_FIELD_LENGTH) {
    return 'Invalid id'
  }
  if (typeof p.severity !== 'string' || p.severity.length === 0 || p.severity.length > MAX_FIELD_LENGTH) {
    return 'Invalid severity'
  }
  if (typeof p.confidence !== 'number' || !Number.isFinite(p.confidence) || p.confidence < 0 || p.confidence > 1) {
    return 'Invalid confidence'
  }

  return null
}

// ─── Code format validation ──────────────────────────────────────────────────

/** Codes are "DWA-XXXXXX" — 6 alphanumeric chars after prefix. Reject anything else. */
const VALID_CODE = /^DWA-[A-Z0-9]{6}$/

// ─── Route handlers ───────────────────────────────────────────────────────────

// GET — Companion polls for advisories
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  if (isRateLimited(request)) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429, headers: { 'Retry-After': '60' } })
  }

  const { code } = await params
  if (!VALID_CODE.test(code)) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
  }
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
    return NextResponse.json({ error: 'Rate limited' }, { status: 429, headers: { 'Retry-After': '60' } })
  }

  const { code } = await params
  if (!VALID_CODE.test(code)) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
  }
  prune()

  let advisory: unknown
  try {
    const text = await request.text()
    if (text.length > MAX_PAYLOAD_BYTES) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }
    advisory = JSON.parse(text)
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
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  if (isRateLimited(request)) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429, headers: { 'Retry-After': '60' } })
  }

  const { code } = await params
  if (!VALID_CODE.test(code)) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
  }
  relays.delete(code)
  return NextResponse.json({ ok: true })
}
