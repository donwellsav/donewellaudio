// @vitest-environment jsdom
/**
 * Tests for consent.ts — data collection consent state machine.
 *
 * Key behaviors:
 *   - Opt-in model: isConsentGiven() returns false for 'not_asked'
 *   - Version bump resets consent to 'not_asked'
 *   - State transitions: not_asked → accepted/declined, accepted ↔ declined
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadConsent,
  acceptConsent,
  declineConsent,
  revokeConsent,
  markPrompted,
  isConsentGiven,
  isConsentPending,
  getConsentStatus,
} from '../consent'
import { CONSENT_VERSION } from '@/types/data'

const STORAGE_KEY = 'dwa-data-consent'

beforeEach(() => {
  localStorage.clear()
})

describe('consent state machine', () => {
  it('defaults to not_asked for new users', () => {
    const state = loadConsent()
    expect(state.status).toBe('not_asked')
    expect(state.version).toBe(CONSENT_VERSION)
    expect(state.respondedAt).toBeNull()
  })

  it('isConsentGiven returns false for not_asked (opt-in model)', () => {
    expect(isConsentGiven()).toBe(false)
  })

  it('isConsentGiven returns false for prompted', () => {
    markPrompted()
    expect(isConsentGiven()).toBe(false)
  })

  it('isConsentGiven returns true only after explicit acceptance', () => {
    acceptConsent()
    expect(isConsentGiven()).toBe(true)
  })

  it('isConsentGiven returns false after decline', () => {
    declineConsent()
    expect(isConsentGiven()).toBe(false)
  })

  it('isConsentGiven returns false after revoke', () => {
    acceptConsent()
    expect(isConsentGiven()).toBe(true)
    revokeConsent()
    expect(isConsentGiven()).toBe(false)
  })

  it('isConsentPending returns true for not_asked and prompted', () => {
    expect(isConsentPending()).toBe(true)
    markPrompted()
    expect(isConsentPending()).toBe(true)
    acceptConsent()
    expect(isConsentPending()).toBe(false)
  })

  it('getConsentStatus returns current status', () => {
    expect(getConsentStatus()).toBe('not_asked')
    acceptConsent()
    expect(getConsentStatus()).toBe('accepted')
    revokeConsent()
    expect(getConsentStatus()).toBe('declined')
  })

  it('acceptConsent sets respondedAt timestamp', () => {
    const before = Date.now()
    const state = acceptConsent()
    const after = Date.now()
    expect(state.respondedAt).toBeTruthy()
    const ts = new Date(state.respondedAt!).getTime()
    expect(ts).toBeGreaterThanOrEqual(before)
    expect(ts).toBeLessThanOrEqual(after)
  })
})

describe('version migration', () => {
  it('resets consent to not_asked when stored version is older', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      status: 'accepted',
      version: 0, // Older than current CONSENT_VERSION
      respondedAt: '2025-01-01T00:00:00Z',
    }))
    const state = loadConsent()
    expect(state.status).toBe('not_asked')
    expect(state.version).toBe(CONSENT_VERSION)
  })

  it('preserves consent when version matches', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      status: 'accepted',
      version: CONSENT_VERSION,
      respondedAt: '2025-01-01T00:00:00Z',
    }))
    const state = loadConsent()
    expect(state.status).toBe('accepted')
  })

  it('resets on invalid JSON in localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json')
    const state = loadConsent()
    expect(state.status).toBe('not_asked')
  })
})
