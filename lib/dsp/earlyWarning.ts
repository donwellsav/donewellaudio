import { EARLY_WARNING } from './constants'

export type EarlyWarningLevel = 'BUILDING' | 'GROWING' | null

export interface DpdtState {
  previousProbability: number
  smoothedDpdt: number
  earlyWarning: EarlyWarningLevel
  clearFrameCount: number
}

/** Create a fresh dP/dt state for a new track. */
export function createDpdtState(): DpdtState {
  return { previousProbability: 0, smoothedDpdt: 0, earlyWarning: null, clearFrameCount: 0 }
}

/**
 * Compute early-warning level from a probability trajectory.
 * Uses EMA-smoothed first derivative (dP/dt) of fused feedback probability.
 * Returns a new state object (pure function, no mutation).
 *
 * @param state   Current dP/dt state for this track
 * @param currentProbability  Fused feedback probability [0,1]
 * @param dtSeconds  Time delta since last call, in seconds (must be > 0)
 */
export function computeEarlyWarning(state: DpdtState, currentProbability: number, dtSeconds: number): DpdtState {
  if (dtSeconds <= 0) return { ...state, previousProbability: currentProbability }

  const dpdt = (currentProbability - state.previousProbability) / dtSeconds
  const alpha = EARLY_WARNING.DPDT_EMA_ALPHA
  const smoothed = alpha * dpdt + (1 - alpha) * state.smoothedDpdt

  let warning: EarlyWarningLevel = null
  let clearCount = 0

  if (smoothed >= EARLY_WARNING.GROWING_DPDT_THRESHOLD && currentProbability >= EARLY_WARNING.GROWING_PROBABILITY_THRESHOLD) {
    warning = 'GROWING'
  } else if (smoothed >= EARLY_WARNING.BUILDING_DPDT_THRESHOLD && currentProbability >= EARLY_WARNING.BUILDING_PROBABILITY_THRESHOLD) {
    warning = 'BUILDING'
  } else if (state.earlyWarning !== null) {
    if (smoothed < EARLY_WARNING.CLEAR_DPDT_THRESHOLD) {
      clearCount = state.clearFrameCount + 1
      if (clearCount >= EARLY_WARNING.CLEAR_FRAME_COUNT) {
        warning = null
        clearCount = 0
      } else {
        warning = state.earlyWarning // hold until enough clear frames
      }
    } else {
      warning = state.earlyWarning
      clearCount = 0
    }
  }

  return { previousProbability: currentProbability, smoothedDpdt: smoothed, earlyWarning: warning, clearFrameCount: clearCount }
}
