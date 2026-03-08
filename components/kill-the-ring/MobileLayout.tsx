'use client'

import { memo } from 'react'
import { IssuesList } from './IssuesList'
import { SpectrumCanvas } from './SpectrumCanvas'
import { GEQBarView } from './GEQBarView'
import { DetectionControls } from './DetectionControls'
import { InputMeterSlider } from './InputMeterSlider'
import { ResetConfirmDialog } from './ResetConfirmDialog'
import { Button } from '@/components/ui/button'
import { RotateCcw, AlertTriangle, BarChart3, Settings2 } from 'lucide-react'
import type { Advisory, DetectorSettings, OperationMode, SpectrumData } from '@/types/advisory'
import type { EarlyWarning } from '@/hooks/useAudioAnalyzer'

interface MobileLayoutProps {
  mobileTab: 'issues' | 'graph' | 'settings'
  setMobileTab: (tab: 'issues' | 'graph' | 'settings') => void
  isRunning: boolean
  start: () => void
  isFrozen: boolean
  toggleFreeze: () => void
  advisories: Advisory[]
  activeAdvisoryCount: number
  settings: DetectorSettings
  onSettingsChange: (s: Partial<DetectorSettings>) => void
  onModeChange: (mode: OperationMode) => void
  onReset: () => void
  dismissedIds: Set<string>
  onDismiss: (id: string) => void
  onClearAll: () => void
  onClearResolved: () => void
  spectrumRef: React.RefObject<SpectrumData | null>
  earlyWarning: EarlyWarning | null
  inputLevel: number
  isAutoGain: boolean
  autoGainDb: number | undefined
  autoGainLocked: boolean
  rtaClearedIds: Set<string>
  geqClearedIds: Set<string>
  hasActiveRTAMarkers: boolean
  hasActiveGEQBars: boolean
  onClearRTA: () => void
  onClearGEQ: () => void
  onFreqRangeChange: (min: number, max: number) => void
}

export const MobileLayout = memo(function MobileLayout({
  mobileTab, setMobileTab,
  isRunning, start, isFrozen, toggleFreeze,
  advisories, activeAdvisoryCount,
  settings, onSettingsChange, onModeChange, onReset,
  dismissedIds, onDismiss, onClearAll, onClearResolved,
  spectrumRef, earlyWarning,
  inputLevel, isAutoGain, autoGainDb, autoGainLocked,
  rtaClearedIds, geqClearedIds,
  hasActiveRTAMarkers, hasActiveGEQBars,
  onClearRTA, onClearGEQ, onFreqRangeChange,
}: MobileLayoutProps) {
  return (
    <>
      {/* ── Mobile: 3-tab content area (portrait only) ────────── */}
      <div className="landscape:hidden flex-1 flex flex-col overflow-hidden">
        {/* Issues tab */}
        {mobileTab === 'issues' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-background">
            <div className="border-b border-border p-2 flex-shrink-0 bg-card/50">
              <InputMeterSlider
                value={settings.inputGainDb}
                onChange={(v) => onSettingsChange({ inputGainDb: v })}
                level={inputLevel}
                compact
                autoGainEnabled={isAutoGain}
                autoGainDb={autoGainDb}
                autoGainLocked={autoGainLocked}
                onAutoGainToggle={(enabled) => onSettingsChange({ autoGainEnabled: enabled })}
              />
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <h2 className="text-[0.625rem] text-muted-foreground uppercase tracking-wide mb-2 flex items-center justify-between">
                <span>Active Issues</span>
                <span className="text-primary font-mono">{activeAdvisoryCount}</span>
              </h2>
              <IssuesList
                advisories={advisories}
                maxIssues={settings.maxDisplayedIssues}
                dismissedIds={dismissedIds}
                onDismiss={onDismiss}
                onClearAll={onClearAll}
                onClearResolved={onClearResolved}
                touchFriendly
              />
            </div>
          </div>
        )}

        {/* Graph tab — RTA on top, GEQ on bottom (50/50 split) */}
        {mobileTab === 'graph' && (
          <div className="flex-1 flex flex-col gap-0.5 overflow-hidden p-0.5">
            {/* RTA — top half */}
            <div className="flex-1 min-h-0 bg-card/60 rounded-md border border-border overflow-hidden relative">
              <span className="absolute top-1 left-1.5 z-20 text-[0.5rem] text-muted-foreground/60 font-medium uppercase tracking-wide pointer-events-none">RTA</span>
              {isRunning && (
                <button
                  onClick={toggleFreeze}
                  className={`absolute top-1 z-20 px-2 py-0.5 rounded text-[0.5rem] font-medium border transition-colors ${
                    isFrozen
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      : 'bg-card/80 text-muted-foreground border-border hover:text-foreground'
                  }`}
                  style={{ right: hasActiveRTAMarkers ? '3.5rem' : '0.25rem' }}
                >
                  {isFrozen ? 'Live' : 'Freeze'}
                </button>
              )}
              {hasActiveRTAMarkers && (
                <button
                  onClick={onClearRTA}
                  className="absolute top-1 right-1 z-20 px-2 py-0.5 rounded text-[0.5rem] font-medium bg-card/80 text-muted-foreground border border-border hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              )}
              <SpectrumCanvas spectrumRef={spectrumRef} advisories={advisories} isRunning={isRunning} graphFontSize={settings.graphFontSize} onStart={!isRunning ? start : undefined} earlyWarning={earlyWarning} rtaDbMin={settings.rtaDbMin} rtaDbMax={settings.rtaDbMax} spectrumLineWidth={settings.spectrumLineWidth} clearedIds={rtaClearedIds} minFrequency={settings.minFrequency} maxFrequency={settings.maxFrequency} onFreqRangeChange={onFreqRangeChange} showThresholdLine={settings.showThresholdLine} feedbackThresholdDb={settings.feedbackThresholdDb} isFrozen={isFrozen} canvasTargetFps={settings.canvasTargetFps} />
            </div>
            {/* GEQ — bottom half */}
            <div className="flex-1 min-h-0 bg-card/60 rounded-md border border-border overflow-hidden relative">
              <span className="absolute top-1 left-1.5 z-20 text-[0.5rem] text-muted-foreground/60 font-medium uppercase tracking-wide pointer-events-none">GEQ</span>
              {hasActiveGEQBars && (
                <button
                  onClick={onClearGEQ}
                  className="absolute top-1 right-1 z-20 px-2 py-0.5 rounded text-[0.5rem] font-medium bg-card/80 text-muted-foreground border border-border hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              )}
              <GEQBarView advisories={advisories} graphFontSize={settings.graphFontSize} clearedIds={geqClearedIds} />
            </div>
          </div>
        )}

        {/* Settings tab */}
        {mobileTab === 'settings' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
            <section>
              <h3 className="text-[0.625rem] text-muted-foreground uppercase tracking-wide mb-2">Input Gain</h3>
              <InputMeterSlider
                value={settings.inputGainDb}
                onChange={(v) => onSettingsChange({ inputGainDb: v })}
                level={inputLevel}
                fullWidth
                autoGainEnabled={isAutoGain}
                autoGainDb={autoGainDb}
                autoGainLocked={autoGainLocked}
                onAutoGainToggle={(enabled) => onSettingsChange({ autoGainEnabled: enabled })}
              />
            </section>
            <div className="border-t border-border" />
            <section>
              <h3 className="text-[0.625rem] text-muted-foreground uppercase tracking-wide mb-2">Detection Controls</h3>
              <DetectionControls settings={settings} onModeChange={onModeChange} onSettingsChange={onSettingsChange} />
            </section>
            <div className="border-t border-border" />
            <ResetConfirmDialog
              onConfirm={onReset}
              trigger={
                <Button variant="outline" className="w-full h-11 text-sm font-medium">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Defaults
                </Button>
              }
            />
          </div>
        )}
      </div>

      {/* ── Mobile bottom tab bar (portrait only) ──────────────── */}
      <nav className="landscape:hidden flex-shrink-0 border-t border-border bg-card/80 backdrop-blur-sm" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-stretch">
          {([
            { id: 'issues' as const, label: 'Issues', Icon: AlertTriangle, badge: activeAdvisoryCount },
            { id: 'graph' as const, label: 'Graph', Icon: BarChart3, badge: 0 },
            { id: 'settings' as const, label: 'Settings', Icon: Settings2, badge: 0 },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMobileTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[50px] transition-colors ${
                mobileTab === tab.id
                  ? 'text-primary'
                  : 'text-muted-foreground active:text-foreground'
              }`}
              aria-label={tab.label}
              aria-current={mobileTab === tab.id ? 'page' : undefined}
            >
              <div className="relative">
                <tab.Icon className="w-5 h-5" />
                {tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-primary text-primary-foreground text-[0.5rem] rounded-full min-w-[16px] h-[16px] flex items-center justify-center font-bold leading-none px-0.5">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[0.5625rem] font-medium leading-none">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  )
})
