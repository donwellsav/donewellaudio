/**
 * PA2 integration module — connects DoneWellAudio to the dbx DriveRack PA2
 * via the Bitfocus Companion HTTP bridge.
 *
 * @module lib/pa2
 */

export { createPA2Client, PA2ClientError } from './pa2Client'
export type { PA2Client } from './pa2Client'

export {
  findNearestGEQBandIndex,
  severityToGEQCut,
  advisoriesToGEQCorrections,
  mergeGEQCorrections,
  advisoriesToDetectPayload,
  advisoriesToHybridActions,
} from './advisoryBridge'
export type { HybridAction } from './advisoryBridge'

export { pa2Storage } from './pa2Storage'

export { verifyGEQCorrections, runClosedLoopCycle } from './closedLoopEQ'
export type { VerifyResult } from './closedLoopEQ'

export { syncModeToPA2, MODE_PA2_CONFIG } from './modeSync'

export { crossValidateAFS, verifyNotchEffectiveness, captureDualMicSnapshot } from './afsLabeler'
export type { AFSLabel, DualMicSnapshot } from './afsLabeler'

export { startSession, logAction, getSessionLog, exportVenueProfile, clearSession } from './sessionLog'
export type { PA2SessionAction, PA2VenueProfile } from './sessionLog'
