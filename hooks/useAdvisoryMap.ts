/**
 * useAdvisoryMap — owns the advisory Map, sorting, dedup, and cache
 *
 * Extracted from useAudioAnalyzer (Batch 5A) to isolate advisory state management.
 * Provides identity-stable callbacks safe for the DSP worker stableCallbacks object.
 *
 * Data flow:
 *   Worker → onAdvisory/onAdvisoryCleared → Map update → sort → setAdvisories → React
 *
 * Key design choices:
 *   - O(1) Map lookup (vs findIndex scans) for per-advisory updates
 *   - Sorted cache with dirty flag: only full re-sort on structural changes (new/removed),
 *     in-place .map() patch for updates to existing advisories
 *   - Frequency-proximity dedup: prevents duplicate cards when a peak is cleared then
 *     re-detected with a new track ID at the same frequency (100 cents = 1 semitone)
 */

import { useState, useCallback, useRef } from 'react'
import { getSeverityUrgency } from '@/lib/dsp/classifier'
import type { Advisory, DetectorSettings } from '@/types/advisory'

// ── Public interface ─────────────────────────────────────────────────────────

export interface UseAdvisoryMapReturn {
  /** Sorted, display-limited advisory list for React consumers */
  advisories: Advisory[]
  /** Identity-stable: handle new/updated advisory from worker */
  onAdvisory: (advisory: Advisory) => void
  /** Identity-stable: handle advisory resolved from worker */
  onAdvisoryCleared: (advisoryId: string) => void
  /** Clear all map state — call when starting fresh analysis */
  clearMap: () => void
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAdvisoryMap(
  settingsRef: React.RefObject<DetectorSettings>
): UseAdvisoryMapReturn {
  const [advisories, setAdvisories] = useState<Advisory[]>([])

  // O(1) advisory lookup + sorted cache
  const mapRef = useRef<Map<string, Advisory>>(new Map())
  const sortedCacheRef = useRef<Advisory[]>([])
  const dirtyRef = useRef(false)

  // Sort: active above resolved → severity urgency → amplitude (descending)
  const buildSorted = useCallback(() => {
    const maxIssues = settingsRef.current?.maxDisplayedIssues ?? 50
    const sorted = Array.from(mapRef.current.values())
      .sort((a, b) => {
        // Active cards always above resolved
        if (a.resolved !== b.resolved) return a.resolved ? 1 : -1
        const urgencyA = getSeverityUrgency(a.severity)
        const urgencyB = getSeverityUrgency(b.severity)
        if (urgencyA !== urgencyB) return urgencyB - urgencyA
        return b.trueAmplitudeDb - a.trueAmplitudeDb
      })
      .slice(0, maxIssues)
    sortedCacheRef.current = sorted
    dirtyRef.current = false
    return sorted
  }, [settingsRef])

  // ── Ref indirection for onAdvisory ──────────────────────────────────────
  // Reassigned every render so the stable callback below always has fresh closures.
  // (In practice all accesses are to refs/stable-identity values, but this pattern
  // is defensive and consistent with the original code.)

  const onAdvisoryImplRef = useRef<(a: Advisory) => void>(() => {})

  onAdvisoryImplRef.current = (advisory: Advisory) => {
    const map = mapRef.current

    if (map.has(advisory.id)) {
      // O(1) — same track updating
      map.set(advisory.id, advisory)
    } else {
      // Frequency-proximity dedup (100 cents = 1 semitone, matches worker)
      // Prevents duplicate cards when a peak is cleared then re-detected
      // with a new track/advisory ID at the same frequency.
      let replacedKey: string | null = null
      for (const [key, existing] of map) {
        const cents = Math.abs(1200 * Math.log2(advisory.trueFrequencyHz / existing.trueFrequencyHz))
        if (cents <= 100) {
          replacedKey = key
          break
        }
      }
      if (replacedKey) map.delete(replacedKey)
      map.set(advisory.id, advisory)
      dirtyRef.current = true // New entry — needs re-sort
    }

    // Only rebuild sorted array when structure changed; for updates, patch cache in-place
    if (dirtyRef.current) {
      const sorted = buildSorted()
      setAdvisories(sorted)
    } else {
      // Check if the advisory actually changed before creating a new array
      const prev = sortedCacheRef.current.find(a => a.id === advisory.id)
      if (prev && prev.severity === advisory.severity && prev.confidence === advisory.confidence && prev.trueAmplitudeDb === advisory.trueAmplitudeDb) {
        return // No meaningful change — skip re-render
      }
      const sorted = sortedCacheRef.current.map(a => a.id === advisory.id ? advisory : a)
      sortedCacheRef.current = sorted
      setAdvisories(sorted)
    }
  }

  // ── Identity-stable callbacks — created once, delegate through refs ─────

  const stableCallbacks = useRef({
    onAdvisory: (advisory: Advisory) => onAdvisoryImplRef.current(advisory),

    onAdvisoryCleared: (advisoryId: string) => {
      const map = mapRef.current
      const existing = map.get(advisoryId)
      if (!existing || existing.resolved) return
      const resolved = { ...existing, resolved: true, resolvedAt: Date.now() }
      map.set(advisoryId, resolved)
      dirtyRef.current = true // resolved status changes sort order
      const sorted = buildSorted()
      setAdvisories(sorted)
    },
  }).current

  // ── clearMap — reset everything for fresh analysis ─────────────────────

  const clearMap = useCallback(() => {
    mapRef.current.clear()
    sortedCacheRef.current = []
    dirtyRef.current = false
    setAdvisories([])
  }, [])

  return {
    advisories,
    onAdvisory: stableCallbacks.onAdvisory,
    onAdvisoryCleared: stableCallbacks.onAdvisoryCleared,
    clearMap,
  }
}
