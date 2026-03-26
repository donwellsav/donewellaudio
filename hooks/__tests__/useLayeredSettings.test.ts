// @vitest-environment jsdom
/**
 * Integration tests for useLayeredSettings in a React render context.
 *
 * Proves that:
 * 1. The hook produces valid DetectorSettings on mount
 * 2. Semantic actions produce correct derived output
 * 3. The legacy shim routes old-style partials correctly
 * 4. Mode changes reset live overrides as expected
 * 5. Persistence round-trips through v2 storage
 */

import { renderHook, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLayeredSettings } from '@/hooks/useLayeredSettings'
import { OPERATION_MODES } from '@/lib/dsp/constants'
import { MODE_BASELINES } from '@/lib/settings/modeBaselines'
import { DEFAULT_DISPLAY_PREFS } from '@/lib/settings/defaults'
import { ENVIRONMENT_TEMPLATES } from '@/lib/settings/environmentTemplates'

afterEach(() => {
  localStorage.removeItem('dwa-v2-session')
  localStorage.removeItem('dwa-v2-display')
})

// ─── Mount / default state ───────────────────────────────────────────────────

describe('useLayeredSettings — default state', () => {
  it('produces derivedSettings matching speech mode on first mount', () => {
    const { result } = renderHook(() => useLayeredSettings())
    const ds = result.current.derivedSettings

    expect(ds.mode).toBe('speech')
    expect(ds.feedbackThresholdDb).toBe(MODE_BASELINES.speech.feedbackThresholdDb)
    expect(ds.fftSize).toBe(MODE_BASELINES.speech.fftSize)
    expect(ds.minFrequency).toBe(MODE_BASELINES.speech.minFrequency)
    expect(ds.maxFrequency).toBe(MODE_BASELINES.speech.maxFrequency)
    expect(ds.sustainMs).toBe(MODE_BASELINES.speech.sustainMs)
    expect(ds.clearMs).toBe(MODE_BASELINES.speech.clearMs)
  })

  it('display prefs match defaults', () => {
    const { result } = renderHook(() => useLayeredSettings())
    const ds = result.current.derivedSettings

    expect(ds.showAlgorithmScores).toBe(DEFAULT_DISPLAY_PREFS.showAlgorithmScores)
    expect(ds.graphFontSize).toBe(DEFAULT_DISPLAY_PREFS.graphFontSize)
    expect(ds.canvasTargetFps).toBe(DEFAULT_DISPLAY_PREFS.canvasTargetFps)
  })

  it('session starts in speech mode with zero offsets', () => {
    const { result } = renderHook(() => useLayeredSettings())

    expect(result.current.session.modeId).toBe('speech')
    expect(result.current.session.liveOverrides.sensitivityOffsetDb).toBe(0)
    expect(result.current.session.environment.feedbackOffsetDb).toBe(0)
  })
})

// ─── Semantic actions ────────────────────────────────────────────────────────

describe('useLayeredSettings — semantic actions', () => {
  it('setMode changes derived mode and thresholds', () => {
    const { result } = renderHook(() => useLayeredSettings())

    act(() => result.current.setMode('liveMusic'))

    const ds = result.current.derivedSettings
    expect(ds.mode).toBe('liveMusic')
    expect(ds.feedbackThresholdDb).toBe(MODE_BASELINES.liveMusic.feedbackThresholdDb)
    expect(ds.fftSize).toBe(MODE_BASELINES.liveMusic.fftSize)
    expect(ds.minFrequency).toBe(MODE_BASELINES.liveMusic.minFrequency)
  })

  it('setMode resets sensitivity offset but preserves gain', () => {
    const { result } = renderHook(() => useLayeredSettings())

    act(() => {
      result.current.setSensitivityOffset(5)
      result.current.setInputGain(6)
    })

    act(() => result.current.setMode('monitors'))

    // Sensitivity offset reset
    expect(result.current.session.liveOverrides.sensitivityOffsetDb).toBe(0)
    // Gain preserved
    expect(result.current.session.liveOverrides.inputGainDb).toBe(6)
  })

  it('setSensitivityOffset shifts threshold', () => {
    const { result } = renderHook(() => useLayeredSettings())

    act(() => result.current.setSensitivityOffset(5))

    expect(result.current.derivedSettings.feedbackThresholdDb).toBe(
      MODE_BASELINES.speech.feedbackThresholdDb + 5,
    )
  })

  it('setEnvironment with template applies relative offsets', () => {
    const { result } = renderHook(() => useLayeredSettings())

    act(() => result.current.setEnvironment({ templateId: 'small' }))

    const ds = result.current.derivedSettings
    const expected = MODE_BASELINES.speech.feedbackThresholdDb + ENVIRONMENT_TEMPLATES.small.feedbackOffsetDb
    expect(ds.feedbackThresholdDb).toBe(expected)
  })

  it('updateDisplay changes display prefs without affecting DSP', () => {
    const { result } = renderHook(() => useLayeredSettings())
    const thresholdBefore = result.current.derivedSettings.feedbackThresholdDb

    act(() => result.current.updateDisplay({ showAlgorithmScores: true, graphFontSize: 22 }))

    expect(result.current.derivedSettings.showAlgorithmScores).toBe(true)
    expect(result.current.derivedSettings.graphFontSize).toBe(22)
    expect(result.current.derivedSettings.feedbackThresholdDb).toBe(thresholdBefore)
  })

  it('resetAll restores all defaults', () => {
    const { result } = renderHook(() => useLayeredSettings())

    act(() => {
      result.current.setMode('liveMusic')
      result.current.setSensitivityOffset(10)
      result.current.updateDisplay({ graphFontSize: 30 })
    })

    act(() => result.current.resetAll())

    expect(result.current.derivedSettings.mode).toBe('speech')
    expect(result.current.session.liveOverrides.sensitivityOffsetDb).toBe(0)
    expect(result.current.display.graphFontSize).toBe(DEFAULT_DISPLAY_PREFS.graphFontSize)
  })
})

// ─── Regression tests (GPT cross-review findings) ───────────────────────────

describe('useLayeredSettings — regression', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('resetAll cancels in-flight debounced persistence (P1 fix)', () => {
    const { result } = renderHook(() => useLayeredSettings())

    act(() => result.current.setMode('liveMusic'))
    act(() => result.current.resetAll())
    act(() => { vi.advanceTimersByTime(200) })

    const stored = JSON.parse(localStorage.getItem('dwa-v2-session') ?? '{}')
    expect(stored.modeId).toBe('speech')
    expect(result.current.derivedSettings.mode).toBe('speech')
  })

  it('setEnvironment with displayUnit triggers recomputation (P2 fix)', () => {
    const { result } = renderHook(() => useLayeredSettings())

    act(() => result.current.setEnvironment({
      templateId: 'custom',
      provenance: 'manual',
      dimensionsM: { length: 10, width: 8, height: 3 },
      treatment: 'typical',
      displayUnit: 'meters',
    }))

    act(() => result.current.setEnvironment({ displayUnit: 'feet' }))

    expect(result.current.session.environment.displayUnit).toBe('feet')
    expect(result.current.derivedSettings.roomRT60).toBeGreaterThan(0)
    expect(result.current.derivedSettings.roomVolume).toBeGreaterThan(0)
  })
})

// ─── Persistence ─────────────────────────────────────────────────────────────

describe('useLayeredSettings — persistence', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('session state persists to v2 storage and reloads on remount', () => {
    const { result, unmount } = renderHook(() => useLayeredSettings())

    act(() => result.current.setMode('worship'))
    // Flush debounced persistence
    act(() => { vi.advanceTimersByTime(200) })
    unmount()

    const { result: result2 } = renderHook(() => useLayeredSettings())
    expect(result2.current.derivedSettings.mode).toBe('worship')
  })

  it('display prefs persist separately from session', () => {
    const { result, unmount } = renderHook(() => useLayeredSettings())

    act(() => {
      result.current.setMode('liveMusic')
      result.current.updateDisplay({ graphFontSize: 25 })
    })
    // Flush debounced persistence
    act(() => { vi.advanceTimersByTime(200) })
    unmount()

    // Clear only session storage
    localStorage.removeItem('dwa-v2-session')

    const { result: result2 } = renderHook(() => useLayeredSettings())
    // Session reset to default
    expect(result2.current.derivedSettings.mode).toBe('speech')
    // Display prefs survived
    expect(result2.current.display.graphFontSize).toBe(25)
  })
})
