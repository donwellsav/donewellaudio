/**
 * AFS cross-validation labeler for ML training.
 * Compares app detections against PA2 RTA peaks to generate ground truth labels.
 */

import type { Advisory } from '@/types/advisory'
import type { PA2LoopResponse } from '@/types/pa2'
import { PA2_GEQ_FREQUENCIES } from '@/types/pa2'

export interface AFSLabel {
  readonly type: 'confirmed_feedback' | 'potential_false_positive' | 'missed_detection' | 'effective_notch' | 'ineffective_notch'
  readonly frequencyHz: number
  readonly confidence: number
  readonly source: 'afs_cross_validation' | 'rta_verification'
  readonly timestamp: number
  readonly details: string
}

interface AFSSnapshot {
  readonly enabled: boolean
  readonly mode: string
  readonly timestamp: number
}

/**
 * Compare advisories against PA2 RTA peaks to generate ML labels.
 */
export function crossValidateAFS(
  advisories: readonly Advisory[],
  pa2Loop: PA2LoopResponse,
  _prevAfsSnapshot: AFSSnapshot | null,
  toleranceCents: number = 100,
): { labels: AFSLabel[]; snapshot: AFSSnapshot } {
  const labels: AFSLabel[] = []
  const now = Date.now()

  const snapshot: AFSSnapshot = {
    enabled: pa2Loop.afs.enabled,
    mode: pa2Loop.afs.mode,
    timestamp: now,
  }

  if (!pa2Loop.afs.enabled) return { labels, snapshot }

  const dwaFreqs = advisories
    .filter(a => !a.resolved && a.confidence > 0.5)
    .map(a => a.trueFrequencyHz)

  const rtaValues = Object.entries(pa2Loop.rta)
    .map(([freq, db]) => ({ freq: Number(freq), db }))
    .filter(({ db }) => db > -80)

  if (rtaValues.length === 0) return { labels, snapshot }

  const meanDb = rtaValues.reduce((s, v) => s + v.db, 0) / rtaValues.length
  const rtaPeaks = rtaValues.filter(v => v.db > meanDb + 10)

  for (const adv of advisories) {
    if (adv.resolved) continue
    const matchesPeak = rtaPeaks.some(peak =>
      Math.abs(1200 * Math.log2(adv.trueFrequencyHz / peak.freq)) < toleranceCents
    )
    if (matchesPeak) {
      labels.push({
        type: 'confirmed_feedback',
        frequencyHz: adv.trueFrequencyHz,
        confidence: adv.confidence,
        source: 'afs_cross_validation',
        timestamp: now,
        details: `${adv.severity} confirmed by PA2 RTA peak`,
      })
    } else if (adv.confidence > 0.7) {
      labels.push({
        type: 'potential_false_positive',
        frequencyHz: adv.trueFrequencyHz,
        confidence: adv.confidence,
        source: 'afs_cross_validation',
        timestamp: now,
        details: `${adv.severity} at ${Math.round(adv.trueFrequencyHz)}Hz — no matching RTA peak`,
      })
    }
  }

  for (const peak of rtaPeaks) {
    const detected = dwaFreqs.some(f =>
      Math.abs(1200 * Math.log2(f / peak.freq)) < toleranceCents
    )
    if (!detected) {
      labels.push({
        type: 'missed_detection',
        frequencyHz: peak.freq,
        confidence: 0,
        source: 'afs_cross_validation',
        timestamp: now,
        details: `RTA peak at ${peak.freq}Hz (${peak.db.toFixed(1)}dB) not detected`,
      })
    }
  }

  return { labels, snapshot }
}

/**
 * Verify a notch by checking RTA change at the notch frequency.
 */
export function verifyNotchEffectiveness(
  freqHz: number,
  preRTA: Readonly<Record<string, number>>,
  postRTA: Readonly<Record<string, number>>,
  minDropDb: number = 3,
): AFSLabel {
  let closestFreq: number = PA2_GEQ_FREQUENCIES[0]
  let closestDist = Infinity
  for (const f of PA2_GEQ_FREQUENCIES) {
    const dist = Math.abs(Math.log2(freqHz / f))
    if (dist < closestDist) {
      closestDist = dist
      closestFreq = f
    }
  }

  const freqKey = String(closestFreq)
  const pre = preRTA[freqKey] ?? -90
  const post = postRTA[freqKey] ?? -90
  const drop = pre - post

  return {
    type: drop >= minDropDb ? 'effective_notch' : 'ineffective_notch',
    frequencyHz: freqHz,
    confidence: drop >= minDropDb ? 0.9 : 0.3,
    source: 'rta_verification',
    timestamp: Date.now(),
    details: `Notch at ${Math.round(freqHz)}Hz: pre=${pre.toFixed(1)}dB, post=${post.toFixed(1)}dB, drop=${drop.toFixed(1)}dB`,
  }
}

/** Paired dual-mic training snapshot */
export interface DualMicSnapshot {
  readonly timestamp: number
  readonly browserSpectrum: readonly number[]
  readonly pa2RTA: Readonly<Record<string, number>>
  readonly advisories: readonly { freq: number; severity: string; confidence: number }[]
  readonly labels: readonly AFSLabel[]
}

export function captureDualMicSnapshot(
  browserSpectrum: readonly number[],
  pa2RTA: Readonly<Record<string, number>>,
  advisories: readonly Advisory[],
  labels: readonly AFSLabel[],
): DualMicSnapshot {
  return {
    timestamp: Date.now(),
    browserSpectrum: [...browserSpectrum],
    pa2RTA: { ...pa2RTA },
    advisories: advisories.map(a => ({
      freq: a.trueFrequencyHz,
      severity: a.severity,
      confidence: a.confidence,
    })),
    labels: [...labels],
  }
}
