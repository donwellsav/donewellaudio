#!/usr/bin/env node
/**
 * End-to-end self-test for the spectral snapshot ingest pipeline.
 *
 * Sends a realistic SnapshotBatch to the production /api/v1/ingest endpoint
 * and reports the response. Run after deployment to verify the full path:
 *
 *   Client → /api/v1/ingest (Next.js) → Supabase Edge Function → spectral_snapshots table
 *
 * Usage:
 *   node scripts/test-ingest.mjs                    # hits production (donewellaudio.com)
 *   node scripts/test-ingest.mjs http://localhost:3000  # hits local dev
 *
 * After a successful run, verify the row in Supabase:
 *   SELECT * FROM spectral_snapshots ORDER BY created_at DESC LIMIT 1;
 */

const BASE_URL = process.argv[2] || 'https://donewellaudio.com'
const INGEST_URL = `${BASE_URL}/api/v1/ingest`

// Generate a realistic but identifiable test session ID
const TEST_SESSION_ID = crypto.randomUUID()

// Generate fake base64 spectral data (512 bytes → 684 base64 chars)
function fakeSpectrumBase64() {
  const bytes = new Uint8Array(512)
  // Create a plausible spectrum: low freqs louder, roll off toward Nyquist
  for (let i = 0; i < 512; i++) {
    bytes[i] = Math.max(0, Math.min(255, Math.round(200 - (i / 512) * 180 + Math.random() * 20)))
  }
  // Node Buffer → base64
  return Buffer.from(bytes).toString('base64')
}

// Build a batch with 5 snapshots around a simulated 3150 Hz feedback event
const now = Date.now()
const snapshots = []
for (let i = -2; i <= 2; i++) {
  snapshots.push({
    t: now + i * 200, // 200ms apart
    s: fakeSpectrumBase64(),
  })
}

const batch = {
  version: '1.0',
  sessionId: TEST_SESSION_ID,
  capturedAt: new Date(now).toISOString(),
  fftSize: 8192,
  sampleRate: 48000,
  binsPerSnapshot: 512,
  event: {
    relativeMs: 0,
    frequencyHz: 3150,
    amplitudeDb: -12.5,
    severity: 'BUILDING',
    confidence: 0.82,
    contentType: 'feedback',
  },
  snapshots,
}

const payload = JSON.stringify(batch)

console.log('=== Spectral Ingest Self-Test ===')
console.log(`Target:     ${INGEST_URL}`)
console.log(`Session:    ${TEST_SESSION_ID}`)
console.log(`Snapshots:  ${snapshots.length}`)
console.log(`Payload:    ${(payload.length / 1024).toFixed(1)} KB`)
console.log(`Event:      3150 Hz BUILDING (confidence 0.82)`)
console.log('')

try {
  const res = await fetch(INGEST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  })

  const body = await res.json()

  console.log(`Status:     ${res.status}`)
  console.log(`Response:   ${JSON.stringify(body)}`)
  console.log('')

  if (res.status === 200 && body.ok) {
    if (body.stored === true) {
      console.log('PASS — batch accepted AND stored in Supabase')
      console.log('')
      console.log('Verify with:')
      console.log(`  SELECT * FROM spectral_snapshots WHERE session_id = '${TEST_SESSION_ID}';`)
    } else if (body.stored === false) {
      console.log('WARN — batch accepted but NOT stored (Supabase not configured on server)')
      console.log(`  Reason: ${body.reason || 'unknown'}`)
      process.exitCode = 1
    } else {
      // Edge function returns { ok: true } without stored field
      console.log('PASS — batch accepted by edge function')
      console.log('')
      console.log('Verify with:')
      console.log(`  SELECT * FROM spectral_snapshots WHERE session_id = '${TEST_SESSION_ID}';`)
    }
  } else {
    console.log(`FAIL — server returned ${res.status}: ${JSON.stringify(body)}`)
    process.exitCode = 1
  }
} catch (err) {
  console.log(`FAIL — request error: ${err.message}`)
  process.exitCode = 1
}
