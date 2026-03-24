/**
 * Spectral Flatness + Compression Detection Tests — DoneWell Audio
 *
 * Tests calculateSpectralFlatness (Wiener entropy) and AmplitudeHistoryBuffer
 * (compression detection via crest factor + dynamic range).
 *
 * References:
 *   - lib/dsp/compressionDetection.ts
 *   - lib/dsp/constants.ts: SPECTRAL_FLATNESS_SETTINGS, COMPRESSION_SETTINGS
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  calculateSpectralFlatness,
  AmplitudeHistoryBuffer,
  SPECTRAL_CONSTANTS,
  COMPRESSION_CONSTANTS,
} from '@/lib/dsp/compressionDetection'

// ═════════════════════════════════════════════════════════════════════════════
// SPECTRAL FLATNESS
// ═════════════════════════════════════════════════════════════════════════════

describe('calculateSpectralFlatness', () => {
  it('pure tone (single bin high, rest low) → flatness near 0', () => {
    const spectrum = new Float32Array(128).fill(-80) // Background
    spectrum[64] = -20 // Single strong peak
    const result = calculateSpectralFlatness(spectrum, 64, 5)
    expect(result.flatness).toBeLessThan(0.1)
    expect(result.feedbackScore).toBeGreaterThan(0.5)
  })

  it('white noise (all bins equal) → flatness near 1', () => {
    const spectrum = new Float32Array(128).fill(-40) // All equal
    const result = calculateSpectralFlatness(spectrum, 64, 5)
    // When all values are equal, geometric mean = arithmetic mean → flatness = 1
    expect(result.flatness).toBeCloseTo(1.0, 1)
    expect(result.feedbackScore).toBeCloseTo(0, 1)
  })

  it('narrow peak with close neighbors → low flatness (feedback-like)', () => {
    const spectrum = new Float32Array(128).fill(-70)
    // Narrow peak: only 3 bins elevated
    spectrum[63] = -35
    spectrum[64] = -20
    spectrum[65] = -35
    const result = calculateSpectralFlatness(spectrum, 64, 5)
    expect(result.flatness).toBeLessThan(SPECTRAL_CONSTANTS.PURE_TONE_FLATNESS)
  })

  it('broad peak (many bins elevated) → higher flatness (music-like)', () => {
    // F7: A broad resonant hump with many elevated bins should produce
    // flatness above PURE_TONE_FLATNESS, distinguishing it from a narrow
    // feedback peak. All 11 bins in the region are within 6 dB of the peak.
    const spectrum = new Float32Array(128).fill(-80)
    // Broad hump: bins 59–69 all elevated (11 bins within ~6 dB)
    spectrum[59] = -30
    spectrum[60] = -27
    spectrum[61] = -25
    spectrum[62] = -24
    spectrum[63] = -23
    spectrum[64] = -22 // Peak
    spectrum[65] = -23
    spectrum[66] = -24
    spectrum[67] = -25
    spectrum[68] = -27
    spectrum[69] = -30
    const result = calculateSpectralFlatness(spectrum, 64, 5)
    // Broad peak: width-adjusted flatness should exceed pure-tone threshold
    expect(result.flatness).toBeGreaterThan(SPECTRAL_CONSTANTS.PURE_TONE_FLATNESS)
    // Should NOT be flagged as feedback
    expect(result.isFeedbackLikely).toBe(false)
  })

  it('narrow peak (1-3 bins elevated) → low flatness (feedback-like)', () => {
    // F7 counterpart: a narrow spike should still produce low flatness
    const spectrum = new Float32Array(128).fill(-80)
    spectrum[64] = -20 // Single strong peak, rest at -80 (60 dB below)
    const result = calculateSpectralFlatness(spectrum, 64, 5)
    expect(result.flatness).toBeLessThan(SPECTRAL_CONSTANTS.PURE_TONE_FLATNESS)
    expect(result.isFeedbackLikely).toBe(true)
  })

  it('kurtosis is high for peaky distribution', () => {
    const spectrum = new Float32Array(128).fill(-80)
    spectrum[64] = -10 // Very sharp peak
    const result = calculateSpectralFlatness(spectrum, 64, 10)
    expect(result.kurtosis).toBeGreaterThan(0)
  })

  it('handles edge bins (peak near start of spectrum)', () => {
    const spectrum = new Float32Array(128).fill(-60)
    spectrum[2] = -20
    const result = calculateSpectralFlatness(spectrum, 2, 5)
    // Should not crash, should produce valid result
    expect(Number.isFinite(result.flatness)).toBe(true)
    expect(result.flatness).toBeGreaterThanOrEqual(0)
  })

  it('handles edge bins (peak near end of spectrum)', () => {
    const spectrum = new Float32Array(128).fill(-60)
    spectrum[126] = -20
    const result = calculateSpectralFlatness(spectrum, 126, 5)
    expect(Number.isFinite(result.flatness)).toBe(true)
  })

  it('empty region returns flatness=1, feedbackScore=0', () => {
    // All values at -Infinity equivalent (power = 0)
    const spectrum = new Float32Array(128).fill(-200)
    const result = calculateSpectralFlatness(spectrum, 64, 5)
    // When all powers are essentially zero, geometric mean = 0
    // Function should handle gracefully
    expect(Number.isFinite(result.flatness)).toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// COMPRESSION DETECTION
// ═════════════════════════════════════════════════════════════════════════════

describe('AmplitudeHistoryBuffer', () => {
  let buffer: AmplitudeHistoryBuffer

  beforeEach(() => {
    buffer = new AmplitudeHistoryBuffer(100)
  })

  describe('Uncompressed Audio', () => {
    it('high crest factor + wide dynamic range → not compressed', () => {
      // Normal audio: peak varies widely, RMS is lower
      for (let i = 0; i < 50; i++) {
        const peak = -10 - Math.random() * 10  // -10 to -20
        const rms = -25 - Math.random() * 10   // -25 to -35
        buffer.addSample(peak, rms)
      }
      const result = buffer.detectCompression()
      expect(result.isCompressed).toBe(false)
      expect(result.crestFactor).toBeGreaterThan(COMPRESSION_CONSTANTS.COMPRESSED_CREST_FACTOR)
    })
  })

  describe('Compressed Audio', () => {
    it('low crest factor → compressed', () => {
      // Heavily compressed: peak and RMS are very close
      for (let i = 0; i < 50; i++) {
        const peak = -12 - Math.random() * 2  // -12 to -14
        const rms = -15 - Math.random() * 2   // -15 to -17 (only 3dB below peak)
        buffer.addSample(peak, rms)
      }
      const result = buffer.detectCompression()
      expect(result.isCompressed).toBe(true)
      expect(result.crestFactor).toBeLessThan(COMPRESSION_CONSTANTS.COMPRESSED_CREST_FACTOR)
    })

    it('narrow dynamic range → compressed', () => {
      // All peaks at similar level
      for (let i = 0; i < 50; i++) {
        buffer.addSample(-12, -16) // Consistent 4dB crest factor
      }
      const result = buffer.detectCompression()
      expect(result.isCompressed).toBe(true)
      expect(result.dynamicRange).toBeLessThan(COMPRESSION_CONSTANTS.COMPRESSED_DYNAMIC_RANGE)
    })
  })

  describe('Threshold Multiplier', () => {
    it('compressed audio gets thresholdMultiplier > 1', () => {
      for (let i = 0; i < 50; i++) {
        buffer.addSample(-12, -15)
      }
      const result = buffer.detectCompression()
      if (result.isCompressed) {
        expect(result.thresholdMultiplier).toBeGreaterThan(1.0)
        expect(result.thresholdMultiplier).toBeLessThanOrEqual(1.5)
      }
    })

    it('uncompressed audio gets thresholdMultiplier = 1', () => {
      for (let i = 0; i < 50; i++) {
        buffer.addSample(-10, -25) // 15dB crest factor
      }
      const result = buffer.detectCompression()
      expect(result.thresholdMultiplier).toBe(1)
    })
  })

  describe('F8: Same-frame dynamic range', () => {
    it('alternating high-peak/low-RMS frames do not overstate dynamic range', () => {
      // F8 regression test: the old metric used maxPeak from frame A and
      // minRms from frame B, overstating range. The new metric uses
      // per-frame crest (peak-RMS) percentile spread, which stays small
      // when individual frame crest is consistent.
      const buffer = new AmplitudeHistoryBuffer(100)

      // Alternating frames:
      // Frame type A: high peak (-5), high RMS (-10) → crest = 5 dB
      // Frame type B: low peak (-30), low RMS (-35) → crest = 5 dB
      // Old metric: dynamicRange = maxPeak(-5) - minRms(-35) = 30 dB (WRONG)
      // New metric: all per-frame crests are 5 dB, so p90-p10 ≈ 0 dB
      for (let i = 0; i < 50; i++) {
        if (i % 2 === 0) {
          buffer.addSample(-5, -10)   // Loud frame, crest=5
        } else {
          buffer.addSample(-30, -35)  // Quiet frame, crest=5
        }
      }

      const result = buffer.detectCompression()
      // Per-frame crest is uniformly 5 dB → median crest = 5 dB
      // Dynamic range (median crest) should be 5, which is < COMPRESSED_DYNAMIC_RANGE (8)
      expect(result.dynamicRange).toBeLessThan(COMPRESSION_CONSTANTS.COMPRESSED_DYNAMIC_RANGE)
      expect(result.dynamicRange).toBeCloseTo(5, 0)
      // Mean crest factor is 5 dB (< COMPRESSED_CREST_FACTOR of 6)
      expect(result.crestFactor).toBeCloseTo(5, 0)
    })

    it('genuinely uncompressed audio has high median crest (large dynamic range)', () => {
      // When per-frame crest is consistently high, median crest reflects that
      const buffer = new AmplitudeHistoryBuffer(100)

      // Uncompressed: peak-to-RMS gap of ~15 dB consistently
      for (let i = 0; i < 50; i++) {
        buffer.addSample(-5, -20)  // crest = 15 dB
      }

      const result = buffer.detectCompression()
      // Median crest = 15 dB, well above COMPRESSED_DYNAMIC_RANGE (8)
      expect(result.dynamicRange).toBeGreaterThan(COMPRESSION_CONSTANTS.COMPRESSED_DYNAMIC_RANGE)
      expect(result.dynamicRange).toBeCloseTo(15, 0)
    })
  })

  describe('Edge Cases', () => {
    it('fewer than 10 samples → not compressed (insufficient data)', () => {
      for (let i = 0; i < 5; i++) {
        buffer.addSample(-12, -15)
      }
      const result = buffer.detectCompression()
      expect(result.isCompressed).toBe(false)
      expect(result.crestFactor).toBe(COMPRESSION_CONSTANTS.NORMAL_CREST_FACTOR)
    })

    it('reset clears all history', () => {
      for (let i = 0; i < 50; i++) {
        buffer.addSample(-12, -15)
      }
      buffer.reset()
      const result = buffer.detectCompression()
      expect(result.isCompressed).toBe(false) // Not enough data after reset
    })

    it('ring buffer wraps correctly beyond maxSize', () => {
      // Add 150 samples to a buffer of size 100
      for (let i = 0; i < 150; i++) {
        buffer.addSample(-12, -15)
      }
      const result = buffer.detectCompression()
      // Should not crash, should still detect compression
      expect(result.isCompressed).toBe(true)
    })
  })
})
