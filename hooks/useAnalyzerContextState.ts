'use client'

import { useCallback, useEffect, type RefObject } from 'react'
import { useAudioAnalyzer, type UseAudioAnalyzerReturn } from '@/hooks/useAudioAnalyzer'
import { useAudioDevices, type AudioDevice } from '@/hooks/useAudioDevices'
import type { OperationMode } from '@/types/advisory'
import type { ModeId } from '@/types/settings'
import type { SnapshotBatch } from '@/types/data'
import type { DataCollectionHandle } from '@/hooks/useDataCollection'

export interface AnalyzerContextState extends UseAudioAnalyzerReturn {
  devices: AudioDevice[]
  selectedDeviceId: string
  startWithDevice: () => Promise<void>
  handleDeviceChange: (deviceId: string) => void
  inputLevel: number
  isAutoGain: boolean
  autoGainDb: number | undefined
  autoGainLocked: boolean
}

interface UseAnalyzerContextStateOptions {
  dataCollection: DataCollectionHandle
  frozenRef?: RefObject<boolean>
}

export function useAnalyzerContextState({
  dataCollection,
  frozenRef,
}: UseAnalyzerContextStateOptions): AnalyzerContextState {
  const analyzer = useAudioAnalyzer(
    {},
    {
      onSnapshotBatch: (batch: SnapshotBatch) => dataCollection.handleSnapshotBatch(batch),
    },
    frozenRef,
  )

  useEffect(() => {
    dataCollection.attachWorker(analyzer.dspWorker)
    return () => dataCollection.attachWorker(null)
  }, [analyzer.dspWorker, dataCollection])

  const { devices, selectedDeviceId, setSelectedDeviceId, refresh: refreshDevices } = useAudioDevices()

  useEffect(() => {
    if (analyzer.isRunning) {
      void refreshDevices()
    }
  }, [analyzer.isRunning, refreshDevices])

  const startWithDevice = useCallback(async () => {
    await analyzer.start({ deviceId: selectedDeviceId || undefined })
  }, [analyzer.start, selectedDeviceId])

  const handleDeviceChange = useCallback((deviceId: string) => {
    setSelectedDeviceId(deviceId)
    void analyzer.switchDevice(deviceId)
  }, [analyzer.switchDevice, setSelectedDeviceId])

  const inputLevel = analyzer.spectrumStatus?.peak ?? -60
  const autoGainDb = analyzer.spectrumStatus?.autoGainDb
  const isAutoGain = analyzer.spectrumStatus?.autoGainEnabled ?? analyzer.settings.autoGainEnabled
  const autoGainLocked = analyzer.spectrumStatus?.autoGainLocked ?? false

  return {
    ...analyzer,
    devices,
    selectedDeviceId,
    startWithDevice,
    handleDeviceChange,
    inputLevel,
    isAutoGain,
    autoGainDb,
    autoGainLocked,
  }
}
