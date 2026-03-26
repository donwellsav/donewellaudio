'use client'

import React, { memo, useCallback, useState } from 'react'
import { BarChart3, Monitor, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ResetConfirmDialog } from '../ResetConfirmDialog'
import { SoundTab } from './SoundTab'
import { DisplayTab } from './DisplayTab'
import { useSettings } from '@/contexts/SettingsContext'
import { useRigPresets } from '@/hooks/useRigPresets'
import type { DetectorSettings, OperationMode } from '@/types/advisory'
import type { CalibrationTabProps } from './CalibrationTab'
import type { AdvancedTabProps } from './AdvancedTab'
// customDefaultsStorage removed in Phase 6c — v2 auto-persistence replaces it

// ── Types ────────────────────────────────────────────────────────────────────

/** Data collection props forwarded to SoundTab > Advanced section */
export type DataCollectionTabProps = Pick<AdvancedTabProps, 'consentStatus' | 'isCollecting' | 'onEnableCollection' | 'onDisableCollection'>

type SettingsTab = 'sound' | 'display'

export interface SettingsPanelProps {
  settings: DetectorSettings
  onModeChange: (mode: OperationMode) => void
  onReset: () => void
  calibration?: Omit<CalibrationTabProps, 'settings' | 'onSettingsChange'>
  dataCollection?: DataCollectionTabProps
}

// ── Constants ────────────────────────────────────────────────────────────────

const TABS: { id: SettingsTab; label: string; Icon: typeof BarChart3 }[] = [
  { id: 'sound', label: 'Sound', Icon: BarChart3 },
  { id: 'display', label: 'Display', Icon: Monitor },
]

// ── SettingsPanel ────────────────────────────────────────────────────────────

export const SettingsPanel = memo(function SettingsPanel({
  settings,
  onModeChange,
  onReset,
  calibration,
  dataCollection,
}: SettingsPanelProps) {
  // Pull semantic actions from context
  const ctx = useSettings()

  const [activeTab, setActiveTab] = useState<SettingsTab>('sound')

  // ── Rig preset state (structured, semantic recall) ─────────────────
  const rigPresets = useRigPresets(
    ctx.session ?? { modeId: 'speech', environment: {} as never, liveOverrides: {} as never, diagnostics: {} as never, micCalibrationProfile: 'none' },
    {
      setMode: ctx.setMode ?? (() => {}),
      setEnvironment: ctx.setEnvironment ?? (() => {}),
      updateLiveOverrides: ctx.updateLiveOverrides ?? (() => {}),
      updateDiagnostics: ctx.updateDiagnostics ?? (() => {}),
    },
  )

  // Adapter: SoundTab expects old-format { name, settings } array
  const customPresets = rigPresets.presets.map(p => ({
    name: p.name,
    settings: {} as Partial<DetectorSettings>, // Placeholder — load uses semantic recall
    _rigId: p.id,
  }))

  const [presetName, setPresetName] = useState('')
  const [showSaveInput, setShowSaveInput] = useState(false)

  const handleSavePreset = useCallback(() => {
    const name = presetName.trim()
    if (!name) return
    rigPresets.savePreset(name)
    setPresetName('')
    setShowSaveInput(false)
  }, [presetName, rigPresets])

  const handleDeletePreset = useCallback((name: string) => {
    const match = rigPresets.presets.find(p => p.name === name)
    if (match) rigPresets.deletePreset(match.id)
  }, [rigPresets])

  const handleLoadPreset = useCallback((preset: { name: string; settings: Partial<DetectorSettings>; _rigId?: string }) => {
    if (preset._rigId) {
      // Semantic recall — calls setMode → setEnvironment → updateLiveOverrides
      rigPresets.loadPreset(preset._rigId)
    }
    // Old-format presets without _rigId are no longer supported after Phase 6c
  }, [rigPresets])

  // Save/Load Defaults removed in Phase 6c — v2 session auto-persistence replaces this feature.
  // "Reset to Defaults" (onReset) is preserved.

  return (
    <TooltipProvider delayDuration={400}>
      <div className="@container space-y-1.5">

        {/* ── 2-tab strip ────────────────────────────────────────── */}
        <div className="flex justify-center gap-0 border-b border-border -mx-1">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              aria-label={label}
              className={`flex-1 min-h-12 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.08em] transition-all duration-200 border-b-2 cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
                activeTab === id
                  ? 'text-[var(--console-amber)] border-[var(--console-amber)] bg-[var(--console-amber)]/5'
                  : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Content ─────────────────────────────────────────────── */}

        {activeTab === 'sound' && (
          <SoundTab
            settings={settings}
            onSettingsChange={() => {}} // legacy prop — all controls use semantic actions via context
            onModeChange={onModeChange}
            calibration={calibration}
            dataCollection={dataCollection}
            customPresets={customPresets}
            showSaveInput={showSaveInput}
            setShowSaveInput={setShowSaveInput}
            presetName={presetName}
            setPresetName={setPresetName}
            handleSavePreset={handleSavePreset}
            handleDeletePreset={handleDeletePreset}
            handleLoadPreset={handleLoadPreset}
          />
        )}

        {activeTab === 'display' && (
          <DisplayTab settings={settings} updateDisplay={ctx.updateDisplay} />
        )}

        {/* ── Footer: Reset ─────────────────────────── */}
        <div className="border-t border-border/40 pt-2 mt-2">
          <ResetConfirmDialog
            onConfirm={onReset}
            trigger={
              <Button variant="outline" size="sm" className="w-full h-8">
                <RotateCcw className="h-3 w-3 mr-1.5" />
                Reset Defaults
              </Button>
            }
          />
        </div>
      </div>
    </TooltipProvider>
  )
})

// Re-export for backward compatibility
export { type DataCollectionTabProps as UnifiedControlsDataCollectionTabProps }
