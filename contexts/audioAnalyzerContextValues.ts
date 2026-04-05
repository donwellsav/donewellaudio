'use client'

import type { EngineContextValue } from '@/contexts/EngineContext'
import type { SettingsContextValue } from '@/contexts/SettingsContext'
import type { MeteringContextValue } from '@/contexts/MeteringContext'
import type { DetectionContextValue } from '@/contexts/DetectionContext'
import type { AnalyzerContextState } from '@/hooks/useAnalyzerContextState'
import type { ModeId } from '@/types/settings'

export function createEngineContextValue(state: AnalyzerContextState): EngineContextValue {
  return {
    isRunning: state.isRunning,
    isStarting: state.isStarting,
    error: state.error,
    workerError: state.workerError,
    start: state.startWithDevice,
    stop: state.stop,
    switchDevice: state.switchDevice,
    devices: state.devices,
    selectedDeviceId: state.selectedDeviceId,
    handleDeviceChange: state.handleDeviceChange,
    dspWorker: state.dspWorker,
    roomEstimate: state.roomEstimate,
    roomMeasuring: state.roomMeasuring,
    roomProgress: state.roomProgress,
    startRoomMeasurement: state.startRoomMeasurement,
    stopRoomMeasurement: state.stopRoomMeasurement,
    clearRoomEstimate: state.clearRoomEstimate,
  }
}

export function createSettingsContextValue(state: AnalyzerContextState): SettingsContextValue {
  return {
    settings: state.settings,
    resetSettings: state.resetSettings,
    handleModeChange: (mode) => state.layered.setMode(mode as ModeId),
    handleFreqRangeChange: (min, max) => state.layered.setFocusRange({ kind: 'custom', minHz: min, maxHz: max }),
    session: state.layeredSession,
    displayPrefs: state.layeredDisplay,
    setMode: state.layered.setMode,
    setEnvironment: state.layered.setEnvironment,
    setSensitivityOffset: state.layered.setSensitivityOffset,
    setInputGain: state.layered.setInputGain,
    setAutoGain: state.layered.setAutoGain,
    setFocusRange: state.layered.setFocusRange,
    setEqStyle: state.layered.setEqStyle,
    setMicProfile: state.layered.setMicProfile,
    updateDisplay: state.layered.updateDisplay,
    updateDiagnostics: state.layered.updateDiagnostics,
    updateLiveOverrides: state.layered.updateLiveOverrides,
  }
}

export function createMeteringContextValue(state: AnalyzerContextState): MeteringContextValue {
  return {
    spectrumRef: state.spectrumRef,
    tracksRef: state.tracksRef,
    spectrumStatus: state.spectrumStatus,
    noiseFloorDb: state.noiseFloorDb,
    sampleRate: state.sampleRate,
    fftSize: state.fftSize,
    inputLevel: state.inputLevel,
    isAutoGain: state.isAutoGain,
    autoGainDb: state.autoGainDb,
    autoGainLocked: state.autoGainLocked,
  }
}

export function createDetectionContextValue(state: AnalyzerContextState): DetectionContextValue {
  return {
    advisories: state.advisories,
    earlyWarning: state.earlyWarning,
  }
}
