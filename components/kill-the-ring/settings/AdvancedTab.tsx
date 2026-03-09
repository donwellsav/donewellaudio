'use client'

import { memo } from 'react'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Section, type TabSettingsProps } from './SettingsShared'
import type { ThresholdMode } from '@/types/advisory'

export const AdvancedTab = memo(function AdvancedTab({
  settings,
  onSettingsChange,
}: TabSettingsProps) {
  return (
    <div className="mt-4 space-y-4">

      {/* ── Noise Floor ── */}
      <Section
        title="Noise Floor"
        showTooltip={settings.showTooltips}
        tooltip="Controls how the adaptive noise floor estimates and tracks ambient noise levels."
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Decay Rate</span>
              <span className="text-xs font-mono">{settings.noiseFloorDecay.toFixed(3)}</span>
            </div>
            <Slider
              value={[settings.noiseFloorDecay]}
              onValueChange={([v]) => onSettingsChange({ noiseFloorDecay: v })}
              min={0.90} max={0.999} step={0.005}
            />
            <div className="flex justify-between text-[0.5625rem] text-muted-foreground">
              <span>Fast (dynamic)</span><span>Slow (stable)</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Attack Time</span>
              <span className="text-xs font-mono">{settings.noiseFloorAttackMs}ms</span>
            </div>
            <Slider
              value={[settings.noiseFloorAttackMs]}
              onValueChange={([v]) => onSettingsChange({ noiseFloorAttackMs: v })}
              min={50} max={1000} step={25}
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Release Time</span>
              <span className="text-xs font-mono">{settings.noiseFloorReleaseMs}ms</span>
            </div>
            <Slider
              value={[settings.noiseFloorReleaseMs]}
              onValueChange={([v]) => onSettingsChange({ noiseFloorReleaseMs: v })}
              min={200} max={5000} step={100}
            />
          </div>
        </div>
      </Section>

      {/* ── Peak Detection ── */}
      <Section
        title="Peak Detection"
        showTooltip={settings.showTooltips}
        tooltip="Fine-tune how peaks are detected, confirmed, and cleared. Controls sustain timing, threshold modes, and peak merging."
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Peak Merge Window</span>
              <span className="text-xs font-mono">{settings.peakMergeCents}¢</span>
            </div>
            <Slider
              value={[settings.peakMergeCents]}
              onValueChange={([v]) => onSettingsChange({ peakMergeCents: v })}
              min={10} max={150} step={5}
            />
            <div className="flex justify-between text-[0.5625rem] text-muted-foreground">
              <span>Narrow (precise)</span><span>Wide (merged)</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Sustain Time</span>
              <span className="text-xs font-mono">{settings.sustainMs}ms</span>
            </div>
            <Slider
              value={[settings.sustainMs]}
              onValueChange={([v]) => onSettingsChange({ sustainMs: v })}
              min={100} max={2000} step={50}
            />
            <div className="flex justify-between text-[0.5625rem] text-muted-foreground">
              <span>Fast confirm</span><span>Cautious</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Clear Time</span>
              <span className="text-xs font-mono">{settings.clearMs}ms</span>
            </div>
            <Slider
              value={[settings.clearMs]}
              onValueChange={([v]) => onSettingsChange({ clearMs: v })}
              min={100} max={2000} step={50}
            />
            <div className="flex justify-between text-[0.5625rem] text-muted-foreground">
              <span>Quick clear</span><span>Persistent</span>
            </div>
          </div>

          <Section
            title="Threshold Mode"
            showTooltip={settings.showTooltips}
            tooltip="Absolute: fixed dB threshold. Relative: above noise floor. Hybrid: uses both (recommended)."
          >
            <Select
              value={settings.thresholdMode}
              onValueChange={(v) => onSettingsChange({ thresholdMode: v as ThresholdMode })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="absolute">Absolute - Fixed dB</SelectItem>
                <SelectItem value="relative">Relative - Above Noise</SelectItem>
                <SelectItem value="hybrid">Hybrid - Both (Recommended)</SelectItem>
              </SelectContent>
            </Select>
          </Section>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Relative Threshold</span>
              <span className="text-xs font-mono">{settings.relativeThresholdDb}dB</span>
            </div>
            <Slider
              value={[settings.relativeThresholdDb]}
              onValueChange={([v]) => onSettingsChange({ relativeThresholdDb: v })}
              min={6} max={30} step={1}
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Prominence</span>
              <span className="text-xs font-mono">{settings.prominenceDb}dB</span>
            </div>
            <Slider
              value={[settings.prominenceDb]}
              onValueChange={([v]) => onSettingsChange({ prominenceDb: v })}
              min={4} max={30} step={1}
            />
            <div className="flex justify-between text-[0.5625rem] text-muted-foreground">
              <span>Sensitive</span><span>Only strong peaks</span>
            </div>
          </div>
        </div>
      </Section>

    </div>
  )
})
