/**
 * Consent state for anonymous spectral data collection.
 *
 * Opt-in model (GDPR-compliant): collection requires explicit user acceptance
 * via the DataConsentDialog shown on first audio start. The data is truly
 * anonymous: magnitude spectrum only, random session IDs, no PII.
 *
 * Users can toggle collection in Settings → Advanced at any time.
 * The consent state is persisted in localStorage and respected across sessions.
 *
 * State transitions:
 *   (new user) → NOT_ASKED → dialog shown on first audio start
 *   NOT_ASKED → ACCEPTED (user clicks "Share Data")
 *   NOT_ASKED → DECLINED (user clicks "No Thanks")
 *   ACCEPTED → DECLINED (user toggles off in Settings)
 *   DECLINED → ACCEPTED (user toggles back on in Settings)
 *
 * Privacy: consent state is stored locally only, never transmitted.
 */

import type { ConsentState, ConsentStatus } from '@/types/data'
import { CONSENT_VERSION } from '@/types/data'

const STORAGE_KEY = 'ktr-data-consent'

// ─── Read / Write ───────────────────────────────────────────────────────────

/** Load consent state from localStorage */
export function loadConsent(): ConsentState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()

    const stored: ConsentState = JSON.parse(raw)

    // Version bump → reset to default (accepted)
    if (stored.version < CONSENT_VERSION) {
      return defaultState()
    }

    return stored
  } catch {
    return defaultState()
  }
}

/** Persist consent state to localStorage */
function saveConsent(state: ConsentState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorage full or blocked — fail silently, collection still works
  }
}

function defaultState(): ConsentState {
  return {
    status: 'not_asked',
    version: CONSENT_VERSION,
    respondedAt: null,
  }
}

// ─── State transitions ──────────────────────────────────────────────────────

/** Mark that the consent prompt has been shown (kept for migration compat) */
export function markPrompted(): ConsentState {
  const state: ConsentState = {
    status: 'prompted',
    version: CONSENT_VERSION,
    respondedAt: null,
  }
  saveConsent(state)
  return state
}

/** Record acceptance of data collection */
export function acceptConsent(): ConsentState {
  const state: ConsentState = {
    status: 'accepted',
    version: CONSENT_VERSION,
    respondedAt: new Date().toISOString(),
  }
  saveConsent(state)
  return state
}

/** Record decline of data collection (kept for compat) */
export function declineConsent(): ConsentState {
  const state: ConsentState = {
    status: 'declined',
    version: CONSENT_VERSION,
    respondedAt: new Date().toISOString(),
  }
  saveConsent(state)
  return state
}

/** Opt out of collection (user toggled off in Settings) */
export function revokeConsent(): ConsentState {
  const state: ConsentState = {
    status: 'declined',
    version: CONSENT_VERSION,
    respondedAt: new Date().toISOString(),
  }
  saveConsent(state)
  return state
}

/** Check if collection is currently authorized */
export function isConsentGiven(): boolean {
  const state = loadConsent()
  // Opt-in model: collection requires explicit acceptance (GDPR-compliant)
  return state.status === 'accepted'
}

/** Check if user has been asked but hasn't responded yet */
export function isConsentPending(): boolean {
  const state = loadConsent()
  return state.status === 'not_asked' || state.status === 'prompted'
}

/** Get current consent status */
export function getConsentStatus(): ConsentStatus {
  return loadConsent().status
}
