/**
 * CompanionBridge — HTTP client for sending EQ advisories to Bitfocus Companion.
 *
 * DoneWell Audio detects feedback and calculates EQ recommendations.
 * This bridge sends those recommendations to a Companion module instance,
 * which exposes them as variables for wiring to any mixer module.
 *
 * All requests go through /api/companion/proxy to avoid CORS issues —
 * Companion's HTTP server doesn't return CORS headers, so direct browser
 * fetch() fails. The proxy runs server-side where CORS doesn't apply.
 *
 * @see companion-module/src/main.ts for the receiving end
 * @see app/api/companion/proxy/route.ts for the server-side proxy
 */
import type { Advisory } from '@/types/advisory'

/** Subset of advisory data sent to Companion (no raw audio, no internal state) */
interface CompanionAdvisoryPayload {
  id: string
  trueFrequencyHz: number
  severity: string
  confidence: number
  peq: { type: string; hz: number; q: number; gainDb: number }
  geq: { bandHz: number; bandIndex: number; suggestedDb: number }
  pitch: { note: string; octave: number; cents: number; midi: number }
}

interface CompanionStatusResponse {
  ok: boolean
  pendingCount: number
}

interface SendResult {
  accepted: boolean
  reason?: string
  pendingCount?: number
  error?: string
}

/** Extract the minimal payload Companion needs from a full Advisory */
function toPayload(advisory: Advisory): CompanionAdvisoryPayload {
  return {
    id: advisory.id,
    trueFrequencyHz: advisory.trueFrequencyHz,
    severity: advisory.severity,
    confidence: advisory.confidence,
    peq: {
      type: advisory.advisory.peq.type,
      hz: advisory.advisory.peq.hz,
      q: advisory.advisory.peq.q,
      gainDb: advisory.advisory.peq.gainDb,
    },
    geq: {
      bandHz: advisory.advisory.geq.bandHz,
      bandIndex: advisory.advisory.geq.bandIndex,
      suggestedDb: advisory.advisory.geq.suggestedDb,
    },
    pitch: {
      note: advisory.advisory.pitch.note,
      octave: advisory.advisory.pitch.octave,
      cents: advisory.advisory.pitch.cents,
      midi: advisory.advisory.pitch.midi,
    },
  }
}

/**
 * Send a request through our server-side proxy to avoid CORS.
 * The proxy at /api/companion/proxy fetches Companion server-side.
 */
async function proxyFetch(
  targetUrl: string,
  method: string,
  body?: unknown,
): Promise<Response> {
  return fetch('/api/companion/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: targetUrl, method, body }),
    signal: AbortSignal.timeout(4000),
  })
}

export class CompanionBridge {
  private baseUrl: string
  private instanceName: string
  private _connected = false
  private _lastError: string | null = null

  constructor(url: string, instanceName: string) {
    this.baseUrl = url.replace(/\/$/, '')
    this.instanceName = instanceName
  }

  get connected(): boolean {
    return this._connected
  }

  get lastError(): string | null {
    return this._lastError
  }

  /** Update connection parameters without creating a new instance */
  configure(url: string, instanceName: string): void {
    this.baseUrl = url.replace(/\/$/, '')
    this.instanceName = instanceName
    this._connected = false
    this._lastError = null
  }

  /** Build the Companion endpoint URL for this module instance */
  private endpoint(path: string): string {
    return `${this.baseUrl}/instance/${this.instanceName}${path}`
  }

  /** Send an advisory to Companion */
  async sendAdvisory(advisory: Advisory): Promise<SendResult> {
    const payload = toPayload(advisory)

    try {
      const response = await proxyFetch(
        this.endpoint('/advisory'),
        'POST',
        payload,
      )

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        this._connected = false
        this._lastError = `HTTP ${response.status}: ${(data as Record<string, string>).error ?? 'Unknown error'}`
        return { accepted: false, error: this._lastError }
      }

      this._connected = true
      this._lastError = null
      return (await response.json()) as SendResult
    } catch (err) {
      this._connected = false
      this._lastError =
        err instanceof Error ? err.message : 'Connection failed'
      return { accepted: false, error: this._lastError }
    }
  }

  /** Check if Companion module is reachable */
  async checkStatus(): Promise<CompanionStatusResponse | null> {
    try {
      const response = await proxyFetch(this.endpoint('/status'), 'GET')

      if (!response.ok) {
        this._connected = false
        this._lastError = `HTTP ${response.status}`
        return null
      }

      const data = (await response.json()) as CompanionStatusResponse
      this._connected = data.ok === true
      this._lastError = this._connected ? null : 'Module not responding'
      return data
    } catch {
      this._connected = false
      this._lastError = 'Companion not reachable'
      return null
    }
  }
}

/** Singleton bridge instance — configured via settings */
let bridgeInstance: CompanionBridge | null = null

export function getCompanionBridge(
  url = 'http://localhost:8000',
  instanceName = 'donewell-audio',
): CompanionBridge {
  if (!bridgeInstance) {
    bridgeInstance = new CompanionBridge(url, instanceName)
  } else {
    bridgeInstance.configure(url, instanceName)
  }
  return bridgeInstance
}
