/**
 * Bitfocus Companion integration settings.
 *
 * Uses a cloud relay with pairing code — no URLs or IP addresses needed.
 * DoneWell posts to its own server, Companion polls from the user's network.
 */
export interface CompanionSettings {
  /** Whether the Companion bridge is enabled */
  enabled: boolean
  /** Pairing code shared between DoneWell and the Companion module */
  pairingCode: string
  /** Auto-send every advisory above threshold (vs. manual "Send to Mixer" button) */
  autoSend: boolean
  /** Minimum confidence to send (0-1) */
  minConfidence: number
  /** Auto-send during ring-out wizard steps */
  ringOutAutoSend: boolean
}

export const DEFAULT_COMPANION_SETTINGS: CompanionSettings = {
  enabled: false,
  pairingCode: '',
  autoSend: false,
  minConfidence: 0.7,
  ringOutAutoSend: false,
}
