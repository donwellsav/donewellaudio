import { useMemo } from 'react'
import { calculateRoomModes, calculateSchroederFrequency } from '@/lib/dsp/acousticUtils'
import type { RoomMode } from '@/lib/dsp/acousticUtils'
import type { DetectorSettings } from '@/types/advisory'

/**
 * Computes axial room modes for RTA overlay, memoized on room dimensions.
 *
 * Extracted from DesktopLayout/MobileLayout to eliminate duplication.
 * Returns null when room preset is 'none' or dimensions are missing.
 */
export function useRoomModes(settings: DetectorSettings): RoomMode[] | null {
  return useMemo(() => {
    if (settings.roomPreset === 'none' || !settings.roomLengthM || !settings.roomWidthM || !settings.roomHeightM) return null
    const toM = settings.roomDimensionsUnit === 'feet' ? 0.3048 : 1
    const lM = settings.roomLengthM * toM
    const wM = settings.roomWidthM * toM
    const hM = settings.roomHeightM * toM
    const schroeder = calculateSchroederFrequency(settings.roomRT60, lM * wM * hM)
    const maxHz = Math.min(schroeder, 300)
    return calculateRoomModes(lM, wM, hM, maxHz).axial
  }, [settings.roomPreset, settings.roomLengthM, settings.roomWidthM, settings.roomHeightM, settings.roomDimensionsUnit, settings.roomRT60])
}
