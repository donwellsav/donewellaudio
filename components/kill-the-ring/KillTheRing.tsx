'use client'

import { useEffect, useState, useCallback, useRef, useMemo, memo } from 'react'
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer'
import { useAudioDevices } from '@/hooks/useAudioDevices'
import { useAdvisoryLogging } from '@/hooks/useAdvisoryLogging'
import { useFullscreen } from '@/hooks/useFullscreen'
import { HeaderBar } from './HeaderBar'
import { MobileLayout } from './MobileLayout'
import { DesktopLayout } from './DesktopLayout'
import { OnboardingOverlay } from './OnboardingOverlay'
import { PortalContainerProvider } from '@/contexts/PortalContainerContext'
import type { OperationMode } from '@/types/advisory'
import { OPERATION_MODES } from '@/lib/dsp/constants'
import type { ImperativePanelHandle } from 'react-resizable-panels'
import { AlertTriangle, RotateCcw, X } from 'lucide-react'

// ── Error guidance ──────────────────────────────────────────────────────────────

function getErrorGuidance(error: string): string {
  const lower = error.toLowerCase()
  if (lower.includes('permission') || lower.includes('not allowed'))
    return 'Check your browser address bar for a mic icon and click it to allow access.'
  if (lower.includes('not found') || lower.includes('no microphone'))
    return 'Connect a microphone to your device and try again.'
  if (lower.includes('in use') || lower.includes('not readable'))
    return 'Close the other app using your microphone, then try again.'
  if (lower.includes('overconstrained'))
    return 'Your mic may not support the requested audio format. Try a different device.'
  return 'Check your microphone connection and browser permissions.'
}

export const KillTheRing = memo(function KillTheRingComponent() {
  const {
    isRunning,
    error,
    noiseFloorDb,
    spectrumStatus,
    spectrumRef,
    advisories,
    earlyWarning,
    settings,
    start,
    stop,
    switchDevice,
    updateSettings,
    resetSettings,
  } = useAudioAnalyzer()

  const { devices, selectedDeviceId, setSelectedDeviceId } = useAudioDevices()

  const activeAdvisoryCount = useMemo(
    () => advisories.filter(a => !a.resolved).length,
    [advisories]
  )

  const [mobileTab, setMobileTab] = useState<'issues' | 'graph' | 'settings'>('issues')
  const [activeSidebarTab, setActiveSidebarTab] = useState<'issues' | 'controls'>('controls')
  const [layoutKey, setLayoutKey] = useState(0)
  const [issuesPanelOpen, setIssuesPanelOpen] = useState(true)
  const [isFrozen, setIsFrozen] = useState(false)
  const toggleFreeze = useCallback(() => setIsFrozen(prev => !prev), [])
  const issuesPanelRef = useRef<ImperativePanelHandle>(null)

  // Error dismiss state — resets whenever error value changes
  const [isErrorDismissed, setIsErrorDismissed] = useState(false)
  useEffect(() => { setIsErrorDismissed(false) }, [error])

  // Fullscreen
  const rootRef = useRef<HTMLDivElement>(null)
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(rootRef)

  // Wrap start to always pass the persisted device preference
  const startWithDevice = useCallback(() => {
    start({ deviceId: selectedDeviceId || undefined })
  }, [start, selectedDeviceId])

  const handleRetry = useCallback(() => {
    setIsErrorDismissed(false)
    startWithDevice()
  }, [startWithDevice])

  // Auto-unfreeze when stopping analysis
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: reset UI state on stop
    if (!isRunning) setIsFrozen(false)
  }, [isRunning])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      switch (e.key) {
        case ' ':
          e.preventDefault()
          if (isRunning) stop(); else startWithDevice()
          break
        case 'p': case 'P':
          if (!isRunning) return
          e.preventDefault()
          toggleFreeze()
          break
        case 'f': case 'F':
          e.preventDefault()
          toggleFullscreen()
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isRunning, toggleFreeze, startWithDevice, stop, toggleFullscreen])

  // Dismissed advisory IDs — hidden until the advisory disappears and a new one is detected
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  const handleDismiss = useCallback((id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id))
  }, [])

  const handleClearAllIssues = useCallback(() => {
    setDismissedIds(new Set(advisories.map(a => a.id)))
  }, [advisories])

  const handleClearResolvedIssues = useCallback(() => {
    setDismissedIds(prev => {
      const next = new Set(prev)
      advisories.forEach(a => { if (a.resolved) next.add(a.id) })
      return next
    })
  }, [advisories])

  // GEQ-specific cleared IDs — independent from issue card dismissals
  const [geqClearedIds, setGeqClearedIds] = useState<Set<string>>(new Set())

  const handleClearGEQ = useCallback(() => {
    setGeqClearedIds(new Set(advisories.map(a => a.id)))
  }, [advisories])

  // True when at least one advisory has a GEQ recommendation that hasn't been cleared
  const hasActiveGEQBars = useMemo(() =>
    advisories.some(a => !geqClearedIds.has(a.id) && a.advisory?.geq),
    [advisories, geqClearedIds]
  )

  // RTA-specific cleared IDs — independent from issue cards and GEQ
  const [rtaClearedIds, setRtaClearedIds] = useState<Set<string>>(new Set())

  const handleClearRTA = useCallback(() => {
    setRtaClearedIds(new Set(advisories.map(a => a.id)))
  }, [advisories])

  // True when at least one advisory hasn't been cleared from the RTA
  const hasActiveRTAMarkers = useMemo(() =>
    advisories.some(a => !rtaClearedIds.has(a.id)),
    [advisories, rtaClearedIds]
  )

  // Auto-expire dismissed/cleared IDs once the advisory is no longer in the live list
  useEffect(() => {
    if (dismissedIds.size === 0 && geqClearedIds.size === 0 && rtaClearedIds.size === 0) return
    const liveIds = new Set(advisories.map((a) => a.id))
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: prune stale IDs when advisories change
    setDismissedIds((prev) => {
      const next = new Set<string>()
      prev.forEach((id) => { if (liveIds.has(id)) next.add(id) })
      return next.size === prev.size ? prev : next
    })
    setGeqClearedIds((prev) => {
      const next = new Set<string>()
      prev.forEach((id) => { if (liveIds.has(id)) next.add(id) })
      return next.size === prev.size ? prev : next
    })
    setRtaClearedIds((prev) => {
      const next = new Set<string>()
      prev.forEach((id) => { if (liveIds.has(id)) next.add(id) })
      return next.size === prev.size ? prev : next
    })
  }, [advisories, dismissedIds.size, geqClearedIds.size, rtaClearedIds.size])


  // Auto music-aware: watch spectrumStatus.peak vs noise floor
  const autoMusicDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!settings.autoMusicAware || !isRunning) return
    const peak = spectrumStatus?.peak ?? -100
    const floor = noiseFloorDb ?? -80
    const hysteresis = settings.autoMusicAwareHysteresisDb ?? 15
    const shouldBeMusic = peak > floor + hysteresis
    const isCurrentlyMusic = settings.musicAware

    if (shouldBeMusic === isCurrentlyMusic) return
    if (autoMusicDebounceRef.current) clearTimeout(autoMusicDebounceRef.current)
    autoMusicDebounceRef.current = setTimeout(() => {
      updateSettings({ musicAware: shouldBeMusic })
    }, 1000) // 1s debounce to avoid flapping

    return () => {
      if (autoMusicDebounceRef.current) clearTimeout(autoMusicDebounceRef.current)
    }
  }, [spectrumStatus?.peak, noiseFloorDb, settings.autoMusicAware, settings.musicAware, settings.autoMusicAwareHysteresisDb, isRunning, updateSettings])

  useAdvisoryLogging(advisories)

  const resetLayout = useCallback(() => {
    try {
      localStorage.removeItem('react-resizable-panels:ktr-layout-main')
      localStorage.removeItem('react-resizable-panels:ktr-layout-main-v2')
      localStorage.removeItem('react-resizable-panels:ktr-layout-main-v3')
      localStorage.removeItem('react-resizable-panels:ktr-layout-main-v4')
      localStorage.removeItem('react-resizable-panels:ktr-layout-vertical')
      localStorage.removeItem('react-resizable-panels:ktr-layout-bottom')
    } catch {}
    setIssuesPanelOpen(true)
    setLayoutKey(k => k + 1)
  }, [])

  const openIssuesPanel = useCallback(() => {
    setIssuesPanelOpen(true)
    if (activeSidebarTab === 'issues') setActiveSidebarTab('controls')
    requestAnimationFrame(() => issuesPanelRef.current?.resize(25))
  }, [activeSidebarTab])

  const closeIssuesPanel = useCallback(() => {
    issuesPanelRef.current?.collapse()
  }, [])

  const handleModeChange = useCallback((mode: OperationMode) => {
    const preset = OPERATION_MODES[mode]
    if (!preset) return
    updateSettings({
      mode,
      feedbackThresholdDb: preset.feedbackThresholdDb,
      ringThresholdDb: preset.ringThresholdDb,
      growthRateThreshold: preset.growthRateThreshold,
      musicAware: preset.musicAware,
      autoMusicAware: preset.autoMusicAware,
      fftSize: preset.fftSize,
      minFrequency: preset.minFrequency,
      maxFrequency: preset.maxFrequency,
      sustainMs: preset.sustainMs,
      clearMs: preset.clearMs,
      holdTimeMs: preset.holdTimeMs,
      confidenceThreshold: preset.confidenceThreshold,
      prominenceDb: preset.prominenceDb,
      relativeThresholdDb: preset.relativeThresholdDb,
      eqPreset: preset.eqPreset,
      aWeightingEnabled: preset.aWeightingEnabled,
      inputGainDb: preset.inputGainDb,
      ignoreWhistle: preset.ignoreWhistle,
    })
  }, [updateSettings])

  const handleSettingsChange = useCallback((newSettings: Partial<typeof settings>) => {
    updateSettings(newSettings)
  }, [updateSettings])

  const handleFreqRangeChange = useCallback((min: number, max: number) => {
    updateSettings({ minFrequency: min, maxFrequency: max })
  }, [updateSettings])

  const handleDeviceChange = useCallback((deviceId: string) => {
    setSelectedDeviceId(deviceId)
    switchDevice(deviceId)
  }, [setSelectedDeviceId, switchDevice])

  const inputLevel = spectrumStatus?.peak ?? -60
  const autoGainDb = spectrumStatus?.autoGainDb
  const isAutoGain = spectrumStatus?.autoGainEnabled ?? settings.autoGainEnabled
  const isAutoGainLocked = spectrumStatus?.autoGainLocked ?? false

  return (
    <div ref={rootRef} className="flex flex-col h-screen bg-background">
      <PortalContainerProvider value={isFullscreen ? rootRef.current : null}>
      <HeaderBar
        isRunning={isRunning}
        start={startWithDevice}
        stop={stop}
        settings={settings}
        onSettingsChange={handleSettingsChange}
        onModeChange={handleModeChange}
        onReset={resetSettings}
        noiseFloorDb={noiseFloorDb}
        resetLayout={resetLayout}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
        isFrozen={isFrozen}
        toggleFreeze={toggleFreeze}
        devices={devices}
        selectedDeviceId={selectedDeviceId}
        onDeviceChange={handleDeviceChange}
      />

      {error && !isErrorDismissed && (
        <div className="px-3 py-2 sm:px-4 sm:py-2.5 bg-destructive/10 border-b border-destructive/20">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-xs font-medium text-destructive">{error}</p>
              <p className="text-[0.6875rem] text-muted-foreground leading-snug">
                {getErrorGuidance(error)}
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={handleRetry}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[0.6875rem] font-medium bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Try Again
              </button>
              <button
                onClick={() => setIsErrorDismissed(true)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label="Dismiss error"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <MobileLayout
        mobileTab={mobileTab}
        setMobileTab={setMobileTab}
        isRunning={isRunning}
        error={error}
        start={startWithDevice}
        isFrozen={isFrozen}
        toggleFreeze={toggleFreeze}
        advisories={advisories}
        activeAdvisoryCount={activeAdvisoryCount}
        settings={settings}
        onSettingsChange={handleSettingsChange}
        onModeChange={handleModeChange}
        onReset={resetSettings}
        dismissedIds={dismissedIds}
        onDismiss={handleDismiss}
        onClearAll={handleClearAllIssues}
        onClearResolved={handleClearResolvedIssues}
        spectrumRef={spectrumRef}
        earlyWarning={earlyWarning}
        inputLevel={inputLevel}
        isAutoGain={isAutoGain}
        autoGainDb={autoGainDb}
        autoGainLocked={isAutoGainLocked}
        rtaClearedIds={rtaClearedIds}
        geqClearedIds={geqClearedIds}
        hasActiveRTAMarkers={hasActiveRTAMarkers}
        hasActiveGEQBars={hasActiveGEQBars}
        onClearRTA={handleClearRTA}
        onClearGEQ={handleClearGEQ}
        onFreqRangeChange={handleFreqRangeChange}
      />

      <DesktopLayout
        layoutKey={layoutKey}
        isRunning={isRunning}
        error={error}
        start={startWithDevice}
        stop={stop}
        isFrozen={isFrozen}
        toggleFreeze={toggleFreeze}
        advisories={advisories}
        activeAdvisoryCount={activeAdvisoryCount}
        settings={settings}
        onSettingsChange={handleSettingsChange}
        onModeChange={handleModeChange}
        spectrumRef={spectrumRef}
        spectrumStatus={spectrumStatus}
        earlyWarning={earlyWarning}
        noiseFloorDb={noiseFloorDb}
        dismissedIds={dismissedIds}
        onDismiss={handleDismiss}
        onClearAll={handleClearAllIssues}
        issuesPanelOpen={issuesPanelOpen}
        issuesPanelRef={issuesPanelRef}
        activeSidebarTab={activeSidebarTab}
        setActiveSidebarTab={setActiveSidebarTab}
        openIssuesPanel={openIssuesPanel}
        closeIssuesPanel={closeIssuesPanel}
        setIssuesPanelOpen={setIssuesPanelOpen}
        rtaClearedIds={rtaClearedIds}
        geqClearedIds={geqClearedIds}
        hasActiveRTAMarkers={hasActiveRTAMarkers}
        hasActiveGEQBars={hasActiveGEQBars}
        onClearRTA={handleClearRTA}
        onClearGEQ={handleClearGEQ}
        onFreqRangeChange={handleFreqRangeChange}
        inputLevel={inputLevel}
        isAutoGain={isAutoGain}
        autoGainDb={autoGainDb}
        autoGainLocked={isAutoGainLocked}
      />

      <OnboardingOverlay />
      </PortalContainerProvider>
    </div>
  )
})
