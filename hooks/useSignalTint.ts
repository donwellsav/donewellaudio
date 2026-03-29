'use client'

/**
 * useSignalTint — drives the console-wide tint color based on detection severity.
 *
 * Sets CSS custom properties (--tint-r, --tint-g, --tint-b) on <html> so that
 * every amber-tinted element (headers, sidebars, accordions, glow lines, labels)
 * shifts color together — like a real analog console's master bus clip indicator.
 *
 * Color progression:
 *   Idle (not running) → slate gray
 *   Listening (no detections) → console blue
 *   Low severity (WHISTLE/INSTRUMENT/POSSIBLE_RING) → console amber
 *   Mid severity (RESONANCE/GROWING) → orange
 *   RUNAWAY → red
 */

import { useMemo, useEffect } from 'react'
import { useAdvisories } from '@/contexts/AdvisoryContext'
import { useEngine } from '@/contexts/EngineContext'
import { getSeverityUrgency } from '@/lib/dsp/severityUtils'

type RGB = [number, number, number]

const TINT_IDLE: RGB   = [100, 116, 139]  // slate gray
const TINT_LISTEN: RGB = [59, 130, 246]   // console blue
const TINT_AMBER: RGB  = [245, 158, 11]   // console amber (default)
const TINT_ORANGE: RGB = [249, 115, 22]   // warning
const TINT_RED: RGB    = [239, 68, 68]    // RUNAWAY

function tintForUrgency(urgency: number, running: boolean): RGB {
  if (!running) return TINT_IDLE
  if (urgency === 0) return TINT_LISTEN
  if (urgency <= 2) return TINT_AMBER
  if (urgency <= 4) return TINT_ORANGE
  return TINT_RED
}

/**
 * Must be called inside AdvisoryProvider + EngineContext.
 * Reads advisories and engine state from context directly.
 */
export function useSignalTint(): void {
  const { advisories, dismissedIds } = useAdvisories()
  const { isRunning } = useEngine()

  const worstUrgency = useMemo(() => {
    if (!isRunning) return 0
    let worst = 0
    for (const a of advisories) {
      if (!dismissedIds.has(a.id)) {
        worst = Math.max(worst, getSeverityUrgency(a.severity))
      }
    }
    return worst
  }, [isRunning, advisories, dismissedIds])

  const [r, g, b] = tintForUrgency(worstUrgency, isRunning)

  useEffect(() => {
    const root = document.documentElement.style
    root.setProperty('--tint-r', String(r))
    root.setProperty('--tint-g', String(g))
    root.setProperty('--tint-b', String(b))
    return () => {
      // Reset to amber on unmount
      root.setProperty('--tint-r', '245')
      root.setProperty('--tint-g', '158')
      root.setProperty('--tint-b', '11')
    }
  }, [r, g, b])
}
