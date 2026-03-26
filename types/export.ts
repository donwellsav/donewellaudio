/**
 * Export types for DoneWell Audio session reports.
 *
 * ExportMetadata carries optional human-entered context (venue, engineer)
 * that the system cannot infer. Mode, room dimensions, and EQ style are
 * already available in SessionSummary / DetectorSettings — don't duplicate them here.
 */

// ── Export Metadata ─────────────────────────────────────────────────────────

export interface ExportMetadata {
  /** Venue or room name (e.g. "Main Sanctuary", "Stage B") */
  venueName?: string
  /** Engineer or operator name */
  engineerName?: string
  /** Free-form notes (e.g. "Second service, new monitors") */
  notes?: string
}

// ── Session Archive ─────────────────────────────────────────────────────────

/** Max archived sessions stored in localStorage */
export const MAX_ARCHIVED_SESSIONS = 15

/**
 * Pruned hotspot for archive storage.
 * Strips the events[] array from FrequencyHotspot to save ~10KB per hotspot.
 */
export interface ArchivedHotspot {
  centerFrequencyHz: number
  occurrences: number
  maxAmplitudeDb: number
  avgAmplitudeDb: number
  avgConfidence: number
  suggestedCutDb: number
  isRepeatOffender: boolean
}

/**
 * Frozen snapshot of a completed session.
 * Stored in localStorage as part of the session history index.
 * Typically 2-3KB per session (no raw event arrays).
 */
export interface ArchivedSession {
  /** Unique ID: session_<timestamp>_<random4> */
  id: string
  startTime: number
  endTime: number
  durationMs: number
  /** Operation mode active at session end */
  mode: string
  totalEvents: number
  totalHotspots: number
  repeatOffenderCount: number
  frequencyBandBreakdown: { LOW: number; MID: number; HIGH: number }
  /** Top 10 hotspots by occurrence, pruned (no event arrays) */
  topHotspots: ArchivedHotspot[]
  /** Optional venue/engineer metadata from P3 export fields */
  metadata?: ExportMetadata
}
