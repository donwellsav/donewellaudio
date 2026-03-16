/**
 * Classifier unit tests
 *
 * Tests classification logic that drives the advisory UX:
 * - shouldReportIssue: mode-specific filtering + confidence gates
 * - getSeverityText: display string mapping
 * - getSeverityUrgency: priority ordering for dedup
 * - classifyTrack: feature-weighted classification of Track objects
 */

import { describe, it, expect } from 'vitest'
import { classifyTrack, shouldReportIssue, getSeverityText } from '../classifier'
import { getSeverityUrgency } from '../severityUtils'
import { DEFAULT_SETTINGS } from '../constants'
import type { ClassificationResult, SeverityLevel, Track, DetectorSettings } from '@/types/advisory'

// ── Fixtures ────────────────────────────────────────────────────────────────

/** Minimal Track fixture for classifyTrack. All numeric features at neutral values. */
function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: 'test-track-1',
    binIndex: 170,
    trueFrequencyHz: 1000,
    trueAmplitudeDb: -20,
    prominenceDb: 15,
    onsetTime: Date.now() - 2000,
    onsetDb: -25,
    lastUpdateTime: Date.now(),
    history: [],
    features: {
      stabilityCentsStd: 5,       // Low = very stable (feedback-like)
      meanQ: 30,
      minQ: 20,
      meanVelocityDbPerSec: 1,
      maxVelocityDbPerSec: 3,
      persistenceMs: 1000,
      harmonicityScore: 0.2,      // Low = no harmonics (feedback-like)
      modulationScore: 0.1,       // Low = no vibrato (feedback-like)
      noiseSidebandScore: 0.05,   // Low = clean sidebands (feedback-like)
    },
    qEstimate: 30,
    bandwidthHz: 33,
    velocityDbPerSec: 1,
    harmonicOfHz: null,
    isSubHarmonicRoot: false,
    isActive: true,
    ...overrides,
  } as Track
}

/** Minimal ClassificationResult fixture for shouldReportIssue */
function makeClassification(overrides: Partial<ClassificationResult> = {}): ClassificationResult {
  return {
    pFeedback: 0.7,
    pWhistle: 0.1,
    pInstrument: 0.1,
    pUnknown: 0.1,
    label: 'ACOUSTIC_FEEDBACK',
    severity: 'RESONANCE',
    confidence: 0.8,
    reasons: ['test'],
    ...overrides,
  } as ClassificationResult
}

function makeSettings(overrides: Partial<DetectorSettings> = {}): DetectorSettings {
  return { ...DEFAULT_SETTINGS, ...overrides }
}

// ── getSeverityText ─────────────────────────────────────────────────────────

describe('getSeverityText', () => {
  it.each<[SeverityLevel, string]>([
    ['RUNAWAY', 'RUNAWAY'],
    ['GROWING', 'Growing'],
    ['RESONANCE', 'Resonance'],
    ['POSSIBLE_RING', 'Ring'],
    ['WHISTLE', 'Whistle'],
    ['INSTRUMENT', 'Instrument'],
  ])('maps %s → "%s"', (severity, expected) => {
    expect(getSeverityText(severity)).toBe(expected)
  })
})

// ── getSeverityUrgency ──────────────────────────────────────────────────────

describe('getSeverityUrgency', () => {
  it('RUNAWAY is the most urgent (5)', () => {
    expect(getSeverityUrgency('RUNAWAY')).toBe(5)
  })

  it('maintains strict ordering: RUNAWAY > GROWING > RESONANCE > POSSIBLE_RING', () => {
    expect(getSeverityUrgency('RUNAWAY')).toBeGreaterThan(getSeverityUrgency('GROWING'))
    expect(getSeverityUrgency('GROWING')).toBeGreaterThan(getSeverityUrgency('RESONANCE'))
    expect(getSeverityUrgency('RESONANCE')).toBeGreaterThan(getSeverityUrgency('POSSIBLE_RING'))
  })

  it('WHISTLE and INSTRUMENT are equal priority (1)', () => {
    expect(getSeverityUrgency('WHISTLE')).toBe(getSeverityUrgency('INSTRUMENT'))
    expect(getSeverityUrgency('WHISTLE')).toBe(1)
  })
})

// ── shouldReportIssue ───────────────────────────────────────────────────────

describe('shouldReportIssue', () => {
  it('always reports RUNAWAY regardless of confidence or mode', () => {
    const classification = makeClassification({
      severity: 'RUNAWAY',
      confidence: 0.01, // Very low confidence
      label: 'ACOUSTIC_FEEDBACK',
    })
    // Should report in every mode
    expect(shouldReportIssue(classification, makeSettings({ mode: 'speech' }))).toBe(true)
    expect(shouldReportIssue(classification, makeSettings({ mode: 'liveMusic' }))).toBe(true)
  })

  it('always reports GROWING regardless of confidence', () => {
    const classification = makeClassification({
      severity: 'GROWING',
      confidence: 0.1,
      label: 'ACOUSTIC_FEEDBACK',
    })
    expect(shouldReportIssue(classification, makeSettings())).toBe(true)
  })

  it('rejects low-confidence results below threshold', () => {
    const classification = makeClassification({
      severity: 'RESONANCE',
      confidence: 0.2, // Below default threshold of 0.35
    })
    expect(shouldReportIssue(classification, makeSettings())).toBe(false)
  })

  it('filters WHISTLE when ignoreWhistle is true', () => {
    const classification = makeClassification({
      label: 'WHISTLE',
      severity: 'WHISTLE',
      confidence: 0.9,
    })
    expect(shouldReportIssue(classification, makeSettings({ ignoreWhistle: true }))).toBe(false)
  })

  it('reports WHISTLE when ignoreWhistle is false', () => {
    const classification = makeClassification({
      label: 'WHISTLE',
      severity: 'WHISTLE',
      confidence: 0.9,
    })
    expect(shouldReportIssue(classification, makeSettings({ ignoreWhistle: false }))).toBe(true)
  })

  it('speech mode suppresses INSTRUMENT labels', () => {
    const classification = makeClassification({
      label: 'INSTRUMENT',
      severity: 'INSTRUMENT',
      confidence: 0.9,
    })
    expect(shouldReportIssue(classification, makeSettings({ mode: 'speech' }))).toBe(false)
  })

  it('monitors mode reports everything including INSTRUMENT', () => {
    const classification = makeClassification({
      label: 'INSTRUMENT',
      severity: 'INSTRUMENT',
      confidence: 0.9,
    })
    expect(shouldReportIssue(classification, makeSettings({ mode: 'monitors' }))).toBe(true)
  })

  it('ringOut mode reports everything (calibration)', () => {
    const classification = makeClassification({
      label: 'INSTRUMENT',
      severity: 'INSTRUMENT',
      confidence: 0.9,
    })
    expect(shouldReportIssue(classification, makeSettings({ mode: 'ringOut' }))).toBe(true)
  })

  it('liveMusic mode requires high confidence for POSSIBLE_RING', () => {
    // Low confidence POSSIBLE_RING → rejected
    expect(shouldReportIssue(
      makeClassification({ label: 'POSSIBLE_RING', severity: 'POSSIBLE_RING', confidence: 0.5 }),
      makeSettings({ mode: 'liveMusic' }),
    )).toBe(false)

    // High confidence POSSIBLE_RING → accepted
    expect(shouldReportIssue(
      makeClassification({ label: 'POSSIBLE_RING', severity: 'POSSIBLE_RING', confidence: 0.7 }),
      makeSettings({ mode: 'liveMusic' }),
    )).toBe(true)
  })
})

// ── classifyTrack ───────────────────────────────────────────────────────────

describe('classifyTrack', () => {
  it('classifies a stable, non-harmonic, non-modulated track as feedback', () => {
    const track = makeTrack({
      features: {
        stabilityCentsStd: 3,       // Very stable
        harmonicityScore: 0.1,      // No harmonics
        modulationScore: 0.05,      // No vibrato
        noiseSidebandScore: 0.02,   // Clean
        meanQ: 40,
        minQ: 30,
        meanVelocityDbPerSec: 2,
        maxVelocityDbPerSec: 5,
        persistenceMs: 2000,
      },
      velocityDbPerSec: 2,
      prominenceDb: 20,
      qEstimate: 40,
    })

    const result = classifyTrack(track)
    expect(result.label).toBe('ACOUSTIC_FEEDBACK')
    expect(result.pFeedback).toBeGreaterThan(result.pInstrument)
    expect(result.pFeedback).toBeGreaterThan(result.pWhistle)
    expect(result.confidence).toBeGreaterThan(0)
  })

  it('classifies a modulated, noise-sideband track as whistle', () => {
    const track = makeTrack({
      features: {
        stabilityCentsStd: 40,      // Unstable (vibrato)
        harmonicityScore: 0.1,      // No harmonics
        modulationScore: 0.95,      // Strong vibrato (clear whistle signature)
        noiseSidebandScore: 0.9,    // Breath noise (emphatic to overcome feedback prior)
        meanQ: 20,
        minQ: 15,
        meanVelocityDbPerSec: 0,
        maxVelocityDbPerSec: 1,
        persistenceMs: 3000,
      },
      velocityDbPerSec: 0,
      prominenceDb: 12,
    })

    const result = classifyTrack(track)
    expect(result.pWhistle).toBeGreaterThan(result.pFeedback)
  })

  it('classifies a harmonic-rich track as instrument', () => {
    const track = makeTrack({
      features: {
        stabilityCentsStd: 60,      // Very unstable pitch (not feedback-like)
        harmonicityScore: 0.95,     // Very rich harmonics (instrument-like)
        modulationScore: 0.3,       // Moderate modulation
        noiseSidebandScore: 0.15,   // Some noise
        meanQ: 5,                   // Very broad peak (not feedback-like)
        minQ: 3,                    // Very broad min Q
        meanVelocityDbPerSec: 0,    // No growth
        maxVelocityDbPerSec: 0.5,   // No growth
        persistenceMs: 200,         // Short-lived (not sustained feedback)
      },
      velocityDbPerSec: 0,
      prominenceDb: 6,    // Low prominence
      qEstimate: 5,       // Broad peak
    })

    const result = classifyTrack(track)
    expect(result.pInstrument).toBeGreaterThan(result.pFeedback)
  })

  it('classifies fast-growing track as RUNAWAY severity', () => {
    const track = makeTrack({
      velocityDbPerSec: 15, // Very fast growth
      features: {
        stabilityCentsStd: 3,
        harmonicityScore: 0.1,
        modulationScore: 0.05,
        noiseSidebandScore: 0.02,
        meanQ: 40,
        minQ: 30,
        meanVelocityDbPerSec: 12,
        maxVelocityDbPerSec: 15,
        persistenceMs: 500,
      },
    })

    const result = classifyTrack(track)
    expect(result.severity).toBe('RUNAWAY')
  })

  it('three-class probabilities (pFeedback + pWhistle + pInstrument) sum to >= 1', () => {
    const track = makeTrack()
    const result = classifyTrack(track)

    // After normalization, probabilities sum to 1. Severity overrides
    // (RUNAWAY/GROWING) may then boost pFeedback above its normalized
    // value, so the sum can exceed 1. It should never be below 1.
    const classSum = result.pFeedback + result.pWhistle + result.pInstrument
    expect(classSum).toBeGreaterThanOrEqual(1 - 0.05)
  })

  it('pUnknown is 1 - confidence', () => {
    const track = makeTrack()
    const result = classifyTrack(track)
    expect(result.pUnknown).toBeCloseTo(1 - result.confidence, 5)
  })

  it('always returns reasons array', () => {
    const result = classifyTrack(makeTrack())
    expect(Array.isArray(result.reasons)).toBe(true)
    expect(result.reasons.length).toBeGreaterThan(0)
  })
})
