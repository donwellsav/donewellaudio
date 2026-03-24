/**
 * calculatePHPR unit tests
 *
 * Tests the Peak-to-Harmonic Power Ratio calculation, verifying that
 * harmonic powers are correctly averaged in the linear domain (not dB).
 *
 * Since calculatePHPR is a private method, we access it via type assertion
 * and inject a synthetic freqDb spectrum for deterministic testing.
 */

import { describe, it, expect } from 'vitest'
import { FeedbackDetector } from '../feedbackDetector'
import { PHPR_SETTINGS } from '../constants'

/** Helper: create a detector and inject a synthetic spectrum */
function setupDetector(
  spectrum: Float32Array,
  fftSize?: number,
): FeedbackDetector {
  const detector = new FeedbackDetector({ fftSize: fftSize ?? spectrum.length * 2 })
  // Inject spectrum into the private freqDb field
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(detector as any).freqDb = spectrum
  return detector
}

/** Helper: call the private calculatePHPR method */
function callCalculatePHPR(
  detector: FeedbackDetector,
  freqBin: number,
): number | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (detector as any).calculatePHPR(freqBin)
}

/**
 * Build a spectrum with a peak at `peakBin` and harmonics at 2×, 3×, 4× bins.
 * All other bins are set to `floorDb`.
 */
function buildSpectrum(opts: {
  length: number
  peakBin: number
  peakDb: number
  harmonicDbs: number[] // dB values for harmonics 2, 3, 4
  floorDb?: number
}): Float32Array {
  const { length, peakBin, peakDb, harmonicDbs, floorDb = -90 } = opts
  const spectrum = new Float32Array(length).fill(floorDb)
  spectrum[peakBin] = peakDb

  for (let i = 0; i < harmonicDbs.length; i++) {
    const harmonicBin = Math.round(peakBin * (i + 2))
    if (harmonicBin < length) {
      spectrum[harmonicBin] = harmonicDbs[i]
    }
  }

  return spectrum
}

describe('calculatePHPR', () => {
  // ── Equal harmonics: both formulas agree ──────────────────────────

  it('returns correct PHPR when all harmonics have equal power', () => {
    // When all harmonics are at the same dB, linear averaging equals dB averaging
    // Peak at -10 dB, three harmonics all at -30 dB → PHPR = -10 - (-30) = 20 dB
    const spectrum = buildSpectrum({
      length: 4096,
      peakBin: 100,
      peakDb: -10,
      harmonicDbs: [-30, -30, -30],
    })

    const detector = setupDetector(spectrum)
    const phpr = callCalculatePHPR(detector, 100)

    expect(phpr).toBeDefined()
    expect(phpr!).toBeCloseTo(20, 1)
  })

  // ── Unequal harmonics: the bug case ───────────────────────────────

  it('correctly averages in linear domain when harmonics have unequal power', () => {
    // Peak at -5 dB, harmonics at -10, -30, -50 dB
    // Old (wrong) dB average: (-10 + -30 + -50) / 3 = -30 dB → PHPR = -5 - (-30) = 25 dB
    // New (correct) linear average:
    //   linear powers: 10^(-10/10) = 0.1, 10^(-30/10) = 0.001, 10^(-50/10) = 0.00001
    //   mean = (0.1 + 0.001 + 0.00001) / 3 = 0.03367
    //   meanDb = 10 * log10(0.03367) ≈ -14.727 dB
    //   PHPR = -5 - (-14.727) ≈ 9.727 dB
    // The difference is ~15.3 dB — significant!
    const spectrum = buildSpectrum({
      length: 4096,
      peakBin: 100,
      peakDb: -5,
      harmonicDbs: [-10, -30, -50],
    })

    const detector = setupDetector(spectrum)
    const phpr = callCalculatePHPR(detector, 100)

    expect(phpr).toBeDefined()

    // Verify the new correct value (linear averaging)
    const expectedMeanLinear = (0.1 + 0.001 + 0.00001) / 3
    const expectedMeanDb = 10 * Math.log10(expectedMeanLinear)
    const expectedPhpr = -5 - expectedMeanDb

    // Allow 0.2 dB tolerance for EXP_LUT quantization (0.1 dB steps)
    expect(phpr!).toBeCloseTo(expectedPhpr, 0)

    // Verify it does NOT equal the old buggy dB-averaged result
    const buggyPhpr = -5 - (-10 + -30 + -50) / 3 // = 25 dB
    expect(Math.abs(phpr! - buggyPhpr)).toBeGreaterThan(5) // ~15 dB difference
  })

  it('linear averaging is dominated by the loudest harmonic', () => {
    // Peak at 0 dB, harmonics at -5 dB and -40 dB and -60 dB
    // Linear: 10^(-0.5) ≈ 0.3162, 10^(-4) = 0.0001, 10^(-6) = 0.000001
    // Mean ≈ 0.3163 / 3 ≈ 0.10544
    // MeanDb ≈ -9.77 dB (dominated by the -5 dB harmonic)
    // Old dB avg: (-5 + -40 + -60) / 3 = -35 dB (significantly pulled down by quiet ones)
    const spectrum = buildSpectrum({
      length: 4096,
      peakBin: 100,
      peakDb: 0,
      harmonicDbs: [-5, -40, -60],
    })

    const detector = setupDetector(spectrum)
    const phpr = callCalculatePHPR(detector, 100)

    expect(phpr).toBeDefined()
    // With linear averaging, result should be ~9.77 dB, not 35 dB
    expect(phpr!).toBeCloseTo(9.77, 0)
    expect(phpr!).toBeLessThan(15) // Not the buggy 35 dB
  })

  // ── Single harmonic found ─────────────────────────────────────────

  it('handles single harmonic (remaining harmonics past Nyquist)', () => {
    // Place peak near the top of the spectrum so only the 2nd harmonic fits
    // spectrum length = 512, peakBin = 200 → 2×200=400 (fits), 3×200=600 (out), 4×200=800 (out)
    const spectrum = new Float32Array(512).fill(-90)
    spectrum[200] = -10
    spectrum[400] = -25 // 2nd harmonic

    const detector = setupDetector(spectrum)
    const phpr = callCalculatePHPR(detector, 200)

    expect(phpr).toBeDefined()
    // Single harmonic: linear mean = linear power of -25 dB
    // 10^(-25/10) = 0.003162, mean = 0.003162, meanDb = -25 dB
    // PHPR = -10 - (-25) = 15 dB (same as dB method for single value)
    expect(phpr!).toBeCloseTo(15, 0)
  })

  // ── Out-of-range: all harmonics past Nyquist ──────────────────────

  it('returns undefined when all harmonics exceed Nyquist', () => {
    // spectrum length = 100, peakBin = 60 → 2×60=120 (out of range)
    const spectrum = new Float32Array(100).fill(-90)
    spectrum[60] = -10

    const detector = setupDetector(spectrum)
    const phpr = callCalculatePHPR(detector, 60)

    expect(phpr).toBeUndefined()
  })

  // ── No spectrum data ──────────────────────────────────────────────

  it('returns undefined when freqDb is null', () => {
    const detector = new FeedbackDetector()
    // freqDb is null by default (no audio analyzed yet)
    const phpr = callCalculatePHPR(detector, 100)
    expect(phpr).toBeUndefined()
  })

  // ── BIN_TOLERANCE picks the strongest nearby bin ──────────────────

  it('finds harmonics within BIN_TOLERANCE window', () => {
    // Place harmonic 1 bin off from exact position; it should still be found
    const spectrum = new Float32Array(4096).fill(-90)
    spectrum[100] = -10 // fundamental

    // Exact harmonic bins: 200, 300, 400
    // Place actual energy 1 bin off (within default BIN_TOLERANCE = 1)
    spectrum[201] = -20 // 2nd harmonic, off by +1
    spectrum[299] = -20 // 3rd harmonic, off by -1
    spectrum[400] = -20 // 4th harmonic, exact

    const detector = setupDetector(spectrum)
    const phpr = callCalculatePHPR(detector, 100)

    expect(phpr).toBeDefined()
    // All harmonics at -20 dB, peak at -10 dB → PHPR = 10 dB
    expect(phpr!).toBeCloseTo(10, 0)
  })

  // ── Verify PHPR_SETTINGS.NUM_HARMONICS is used ────────────────────

  it('checks exactly NUM_HARMONICS harmonics', () => {
    // With NUM_HARMONICS = 3, should check harmonics 2, 3, 4
    expect(PHPR_SETTINGS.NUM_HARMONICS).toBe(3)

    const spectrum = new Float32Array(4096).fill(-90)
    spectrum[50] = -10 // fundamental at bin 50

    // Harmonics 2-4 at moderate levels
    spectrum[100] = -20 // 2nd
    spectrum[150] = -20 // 3rd
    spectrum[200] = -20 // 4th

    // 5th harmonic at bin 250 — should NOT be included
    spectrum[250] = 0 // Very loud, would change result if included

    const detector = setupDetector(spectrum)
    const phpr = callCalculatePHPR(detector, 50)

    expect(phpr).toBeDefined()
    // Only harmonics 2-4 counted (all at -20 dB): PHPR = -10 - (-20) = 10 dB
    expect(phpr!).toBeCloseTo(10, 0)
  })
})
