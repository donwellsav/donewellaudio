/**
 * PA2 session log — records every action sent to the PA2 during a show.
 * Export as JSON venue profile, import to replay all notches/GEQ corrections.
 */

export interface PA2SessionAction {
  readonly type: 'notch_placed' | 'notch_cleared' | 'geq_correction' | 'geq_flat' | 'mode_sync' | 'panic_mute' | 'panic_unmute'
  readonly frequencyHz?: number
  readonly gainDb?: number
  readonly q?: number
  readonly band?: number
  readonly output?: string
  readonly mode?: string
  readonly timestamp: number
}

export interface PA2VenueProfile {
  readonly version: 1
  readonly exportedAt: string
  readonly venueName: string
  readonly sessionDurationMs: number
  readonly actions: readonly PA2SessionAction[]
  readonly summary: {
    readonly totalNotches: number
    readonly totalGEQCorrections: number
    readonly panicEvents: number
    readonly frequenciesNotched: readonly number[]
  }
}

/** In-memory session log */
const _log: PA2SessionAction[] = []
let _sessionStartMs = 0

export function startSession(): void {
  _log.length = 0
  _sessionStartMs = Date.now()
}

export function logAction(action: PA2SessionAction): void {
  if (_sessionStartMs === 0) _sessionStartMs = Date.now()
  _log.push(action)
}

export function getSessionLog(): readonly PA2SessionAction[] {
  return _log
}

export function exportVenueProfile(venueName: string): PA2VenueProfile {
  const notches = _log.filter(a => a.type === 'notch_placed')
  const geqCorrections = _log.filter(a => a.type === 'geq_correction')
  const panics = _log.filter(a => a.type === 'panic_mute')
  const uniqueFreqs = [...new Set(notches.map(a => a.frequencyHz).filter((f): f is number => f !== undefined))]

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    venueName,
    sessionDurationMs: _sessionStartMs > 0 ? Date.now() - _sessionStartMs : 0,
    actions: [..._log],
    summary: {
      totalNotches: notches.length,
      totalGEQCorrections: geqCorrections.length,
      panicEvents: panics.length,
      frequenciesNotched: uniqueFreqs.sort((a, b) => a - b),
    },
  }
}

export function clearSession(): void {
  _log.length = 0
  _sessionStartMs = 0
}
