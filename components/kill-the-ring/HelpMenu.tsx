'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { HelpCircle, BookOpen, Layout, Calculator, MessageCircleQuestion, Wrench } from 'lucide-react'

// =============================================================================
// KILL THE RING — COMPREHENSIVE OPERATOR'S MANUAL
// For Live Sound Engineers
// =============================================================================

type HelpTab = 'gui' | 'tutorial' | 'math' | 'faq' | 'troubleshoot'

export function HelpMenu() {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<HelpTab>('gui')

  const tabs: { id: HelpTab; label: string; icon: React.ReactNode }[] = [
    { id: 'gui', label: 'Interface', icon: <Layout className="w-3.5 h-3.5" /> },
    { id: 'tutorial', label: 'Tutorial', icon: <Wrench className="w-3.5 h-3.5" /> },
    { id: 'math', label: 'Algorithms', icon: <Calculator className="w-3.5 h-3.5" /> },
    { id: 'faq', label: 'FAQ', icon: <MessageCircleQuestion className="w-3.5 h-3.5" /> },
    { id: 'troubleshoot', label: 'Fix It', icon: <HelpCircle className="w-3.5 h-3.5" /> },
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
          aria-label="Help"
        >
          <HelpCircle className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">Help</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden" aria-describedby={undefined}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border bg-card/50 flex-shrink-0">
          <DialogTitle className="text-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="block">Kill The Ring</span>
              <span className="text-xs font-normal text-muted-foreground">Operator&apos;s Manual v3.0</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Tab Bar */}
        <div className="px-4 pt-2 border-b border-border bg-card/30 flex-shrink-0">
          <div className="flex gap-1">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-t-lg transition-colors ${
                  activeTab === t.id
                    ? 'bg-background border border-b-0 border-border text-foreground font-medium -mb-px'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {t.icon}
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6">

            {/* ============================================================
                TAB 1: INTERFACE GUIDE
                ============================================================ */}
            {activeTab === 'gui' && (
              <div className="space-y-8">
                <section>
                  <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <Layout className="w-5 h-5 text-primary" />
                    Interface Overview
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Kill The Ring uses a simple three-area layout. Everything you need is visible at once — 
                    no hunting through menus during a show.
                  </p>

                  {/* Large Interactive Diagram */}
                  <div className="relative bg-background rounded-xl border-2 border-border overflow-hidden shadow-lg">
                    
                    {/* Header Bar */}
                    <div className="bg-card border-b-2 border-border p-3">
                      <div className="flex items-center gap-4">
                        {/* Start Button */}
                        <div className="relative group">
                          <div className="w-14 h-14 rounded-full border-3 border-primary bg-primary/10 flex items-center justify-center cursor-help transition-transform hover:scale-105">
                            <svg className="w-7 h-7 text-primary" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.31-2.5-4.06v8.12c1.48-.75 2.5-2.29 2.5-4.06z"/>
                            </svg>
                          </div>
                          <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-500 text-white text-sm font-bold flex items-center justify-center shadow-lg">1</div>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity bg-popover border border-border rounded-lg p-3 shadow-xl z-50 w-48 text-xs pointer-events-none">
                            <div className="font-bold text-foreground mb-1">START / STOP</div>
                            <div className="text-muted-foreground">Click to begin or end audio analysis. Ring pulses when active.</div>
                          </div>
                        </div>

                        {/* Logo */}
                        <div className="flex flex-col">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-lg font-black">KILL THE</span>
                            <span className="text-xl font-black text-primary">RING</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Don Wells AV</span>
                        </div>

                        {/* Input Meter */}
                        <div className="flex-1 mx-4 relative group">
                          <div className="h-8 bg-muted rounded-lg overflow-hidden border border-border">
                            <div className="h-full bg-gradient-to-r from-green-500/70 via-yellow-500/70 to-green-500/70" style={{ width: '45%' }} />
                          </div>
                          <div className="absolute top-1/2 left-[45%] -translate-y-1/2 w-1 h-6 bg-foreground rounded" />
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-blue-500 text-white text-sm font-bold flex items-center justify-center shadow-lg">2</div>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity bg-popover border border-border rounded-lg p-3 shadow-xl z-50 w-56 text-xs pointer-events-none">
                            <div className="font-bold text-foreground mb-1">INPUT GAIN METER</div>
                            <div className="text-muted-foreground">Drag to adjust sensitivity (-40 to +40 dB). Aim for peaks in the yellow zone. Green = good, Red = too hot.</div>
                          </div>
                        </div>

                        {/* Header Buttons */}
                        <div className="flex items-center gap-2 relative group">
                          <div className="flex gap-1.5">
                            {['History', 'Help', 'Settings'].map(btn => (
                              <div key={btn} className="px-3 py-2 bg-muted rounded-lg text-xs text-muted-foreground border border-border">
                                {btn}
                              </div>
                            ))}
                          </div>
                          <div className="absolute -top-2 right-0 w-7 h-7 rounded-full bg-purple-500 text-white text-sm font-bold flex items-center justify-center shadow-lg">3</div>
                          <div className="absolute top-full right-0 mt-2 opacity-0 group-hover:opacity-100 transition-opacity bg-popover border border-border rounded-lg p-3 shadow-xl z-50 w-48 text-xs pointer-events-none">
                            <div className="font-bold text-foreground mb-1">HEADER TOOLS</div>
                            <div className="text-muted-foreground">History: past sessions. Help: this manual. Settings: all options.</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex min-h-[320px]">
                      
                      {/* Left Sidebar */}
                      <div className="w-56 border-r-2 border-border bg-card/50 flex flex-col relative">
                        <div className="absolute -top-2 right-2 w-7 h-7 rounded-full bg-orange-500 text-white text-sm font-bold flex items-center justify-center shadow-lg z-10">4</div>
                        
                        {/* Algorithm Status */}
                        <div className="p-3 border-b border-border bg-primary/5">
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">Algorithm Status</div>
                          <div className="flex flex-wrap gap-1">
                            <span className="px-2 py-1 bg-green-500/20 text-green-500 rounded text-[10px] font-mono">MSD: 0.87</span>
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-500 rounded text-[10px] font-mono">PHASE: 0.92</span>
                          </div>
                          <div className="mt-2 text-[10px] text-muted-foreground">
                            Mode: <span className="text-foreground">Combined</span> | Content: <span className="text-green-500">Speech</span>
                          </div>
                        </div>

                        {/* Active Issues */}
                        <div className="flex-1 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Active Issues</span>
                            <span className="text-xs font-mono text-primary">3</span>
                          </div>
                          <div className="space-y-2">
                            <div className="p-2 rounded-lg border-2 border-red-500/50 bg-red-500/10 animate-pulse">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-mono text-red-500 font-bold">2.5 kHz</span>
                                <span className="px-1.5 py-0.5 bg-red-500 text-white text-[9px] rounded font-bold">RUNAWAY</span>
                              </div>
                              <div className="text-[10px] text-red-400 mt-1">+8.2 dB/s growth</div>
                            </div>
                            <div className="p-2 rounded-lg border border-yellow-500/50 bg-yellow-500/10">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-mono text-yellow-500">800 Hz</span>
                                <span className="px-1.5 py-0.5 bg-yellow-500/80 text-yellow-950 text-[9px] rounded font-bold">RESONANCE</span>
                              </div>
                              <div className="text-[10px] text-yellow-400 mt-1">Q: 45, persistent</div>
                            </div>
                            <div className="p-2 rounded-lg border border-border bg-muted/30">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-mono text-muted-foreground">6.3 kHz</span>
                                <span className="px-1.5 py-0.5 bg-muted text-muted-foreground text-[9px] rounded">RING</span>
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 flex gap-1">
                            <button className="flex-1 px-2 py-1.5 bg-primary/10 text-primary text-[10px] rounded border border-primary/30 hover:bg-primary/20">Apply</button>
                            <button className="flex-1 px-2 py-1.5 bg-muted text-muted-foreground text-[10px] rounded border border-border hover:bg-muted/80">Dismiss</button>
                          </div>
                        </div>
                      </div>

                      {/* Main Graph Area */}
                      <div className="flex-1 flex flex-col">
                        
                        {/* Tab Chips */}
                        <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/30 relative">
                          <div className="absolute -top-2 right-2 w-7 h-7 rounded-full bg-green-500 text-white text-sm font-bold flex items-center justify-center shadow-lg z-10">5</div>
                          <button className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg">RTA</button>
                          <button className="px-4 py-1.5 bg-muted text-muted-foreground text-xs rounded-lg border border-border hover:bg-muted/80">GEQ</button>
                          <button className="px-4 py-1.5 bg-muted text-muted-foreground text-xs rounded-lg border border-border hover:bg-muted/80">Controls</button>
                        </div>

                        {/* Main Graph */}
                        <div className="flex-1 bg-[#0a0a0c] relative p-4">
                          <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-cyan-500 text-white text-sm font-bold flex items-center justify-center shadow-lg z-10">6</div>
                          
                          {/* Y-axis labels */}
                          <div className="absolute left-1 top-4 bottom-20 flex flex-col justify-between text-[9px] font-mono text-muted-foreground/50">
                            <span>0dB</span>
                            <span>-20</span>
                            <span>-40</span>
                            <span>-60</span>
                          </div>

                          {/* Spectrum visualization */}
                          <div className="ml-6 h-full relative">
                            <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
                              <defs>
                                <linearGradient id="specGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
                                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
                                </linearGradient>
                              </defs>
                              {/* Spectrum area */}
                              <path
                                d="M0,120 C20,115 40,110 60,100 S100,85 120,90 S160,70 180,65 S220,30 240,25 S280,60 300,70 S340,75 360,80 S400,85 420,90 S460,95 480,100 L500,105 L500,150 L0,150 Z"
                                fill="url(#specGrad)"
                              />
                              <path
                                d="M0,120 C20,115 40,110 60,100 S100,85 120,90 S160,70 180,65 S220,30 240,25 S280,60 300,70 S340,75 360,80 S400,85 420,90 S460,95 480,100 L500,105"
                                fill="none"
                                stroke="hsl(var(--primary))"
                                strokeWidth="2"
                              />
                              {/* Feedback spike at 2.5kHz */}
                              <line x1="240" y1="25" x2="240" y2="150" stroke="hsl(var(--destructive))" strokeWidth="3" strokeDasharray="6,3" />
                              <circle cx="240" cy="25" r="6" fill="hsl(var(--destructive))" className="animate-pulse" />
                              {/* Resonance at 800Hz */}
                              <circle cx="180" cy="65" r="5" fill="hsl(45, 93%, 47%)" />
                            </svg>
                            
                            {/* Frequency labels */}
                            <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[9px] font-mono text-muted-foreground/50 px-2">
                              <span>20Hz</span>
                              <span>100</span>
                              <span>500</span>
                              <span>2k</span>
                              <span>10k</span>
                              <span>20kHz</span>
                            </div>

                            {/* Feedback callout */}
                            <div className="absolute top-2 left-[45%] bg-red-500 text-white px-2 py-1 rounded text-[10px] font-bold shadow-lg">
                              2.5 kHz FEEDBACK
                            </div>
                          </div>
                        </div>

                        {/* Bottom Panels */}
                        <div className="grid grid-cols-2 border-t-2 border-border relative">
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-pink-500 text-white text-sm font-bold flex items-center justify-center shadow-lg z-10">7</div>
                          
                          <div className="border-r border-border p-3 bg-card/30">
                            <div className="flex items-center gap-1 mb-2">
                              <span className="px-2 py-0.5 bg-muted text-[10px] rounded">GEQ</span>
                            </div>
                            <div className="flex items-end justify-between h-16 gap-0.5">
                              {[35, 50, 65, 80, 45, 30, 55, 70, 40, 25, 45, 60, 35, 50, 40].map((h, i) => (
                                <div key={i} className="flex-1 bg-primary/60 rounded-t" style={{ height: `${h}%` }} />
                              ))}
                            </div>
                          </div>
                          
                          <div className="p-3 bg-card/30">
                            <div className="flex items-center gap-1 mb-2">
                              <span className="px-2 py-0.5 bg-primary/20 text-primary text-[10px] rounded font-medium">Controls</span>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-muted-foreground">Mode</span>
                                <span className="text-[10px] font-medium">Feedback Hunt</span>
                              </div>
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: '60%' }} />
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-muted-foreground">Threshold: 8 dB</span>
                                <span className="text-[10px] text-muted-foreground">Growth: 2 dB/s</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                    {[
                      { num: '1', color: 'bg-red-500', label: 'Start/Stop', desc: 'Begin or end analysis' },
                      { num: '2', color: 'bg-blue-500', label: 'Input Meter', desc: 'Adjust gain, watch level' },
                      { num: '3', color: 'bg-purple-500', label: 'Header Tools', desc: 'History, Help, Settings' },
                      { num: '4', color: 'bg-orange-500', label: 'Sidebar', desc: 'Status & Issues list' },
                      { num: '5', color: 'bg-green-500', label: 'View Tabs', desc: 'RTA, GEQ, or Controls' },
                      { num: '6', color: 'bg-cyan-500', label: 'Main Graph', desc: 'Large spectrum display' },
                      { num: '7', color: 'bg-pink-500', label: 'Bottom Panels', desc: 'Two extra views' },
                    ].map(item => (
                      <div key={item.num} className="flex items-start gap-2 p-3 rounded-lg border border-border bg-card/30">
                        <div className={`w-6 h-6 rounded-full ${item.color} text-white text-xs font-bold flex items-center justify-center flex-shrink-0`}>
                          {item.num}
                        </div>
                        <div>
                          <div className="text-xs font-medium">{item.label}</div>
                          <div className="text-[10px] text-muted-foreground">{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Controls Deep Dive */}
                <section className="pt-6 border-t border-border">
                  <h3 className="text-base font-semibold mb-4">Controls Panel Explained</h3>
                  <div className="space-y-4">
                    <ControlExplainer
                      name="Operation Mode"
                      what="Presets that adjust all detection settings at once."
                      options={[
                        { name: 'Feedback Hunt', when: 'Default. Good for most PA work.' },
                        { name: 'Vocal Ring', when: 'Speech systems. More sensitive to voice frequencies.' },
                        { name: 'Music-Aware', when: 'During live performance. Ignores musical content.' },
                        { name: 'Aggressive', when: 'Corporate/conference. Zero tolerance for feedback.' },
                        { name: 'Calibration', when: 'Initial ring-out. Maximum sensitivity.' },
                      ]}
                    />
                    <ControlExplainer
                      name="Threshold Slider"
                      what="How prominent a peak must be (above surrounding frequencies) to be flagged."
                      options={[
                        { name: '4-8 dB', when: 'Aggressive. Catches everything including minor resonances.' },
                        { name: '10-14 dB', when: 'Balanced. Good for most situations.' },
                        { name: '16+ dB', when: 'Conservative. Only flags obvious problems.' },
                      ]}
                    />
                    <ControlExplainer
                      name="Growth Slider"
                      what="How fast a peak must be growing (dB per second) to trigger detection."
                      options={[
                        { name: '0.5-1 dB/s', when: 'Catches slow-building feedback early.' },
                        { name: '2-3 dB/s', when: 'Normal operation. Good balance.' },
                        { name: '4+ dB/s', when: 'Only triggers on runaway feedback.' },
                      ]}
                    />
                  </div>
                </section>
              </div>
            )}

            {/* ============================================================
                TAB 2: TUTORIAL
                ============================================================ */}
            {activeTab === 'tutorial' && (
              <div className="space-y-8">
                <section>
                  <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-primary" />
                    How to Ring Out a PA System
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Follow these steps to find and eliminate feedback frequencies before your show. 
                    This process takes 10-15 minutes and should be done during soundcheck.
                  </p>

                  <div className="space-y-6">
                    <TutorialStep
                      number={1}
                      title="Setup Your Device"
                      time="2 min"
                      steps={[
                        'Open Kill The Ring in Chrome, Edge, or Safari',
                        'Position your device at FOH (front of house) or near the listening position',
                        'Click the big microphone button and allow browser access to your mic',
                        'Check that the input meter moves when you speak into the PA',
                      ]}
                      tip="The built-in mic works fine for most uses. For precision, use a measurement mic via USB."
                    />

                    <TutorialStep
                      number={2}
                      title="Configure Detection"
                      time="1 min"
                      steps={[
                        'Click the Controls tab or view the Controls panel',
                        'Select "Calibration" mode for maximum sensitivity',
                        'Set frequency range to "Vocal (200-8k)" for speech systems',
                        'Adjust input gain so peaks hit the yellow zone (not red)',
                      ]}
                      tip="Calibration mode will flag even subtle resonances. That is what you want during ring-out."
                    />

                    <TutorialStep
                      number={3}
                      title="Establish Baseline"
                      time="1 min"
                      steps={[
                        'Mute all channels on your mixing console',
                        'Let the system idle for 30 seconds',
                        'Watch the spectrum settle to show the room noise floor',
                        'Note any existing peaks (HVAC rumble, lighting buzz, etc.)',
                      ]}
                      tip="These baseline noises are automatically excluded from feedback detection."
                    />

                    <TutorialStep
                      number={4}
                      title="Ring Out Vocals"
                      time="5-8 min"
                      steps={[
                        'Unmute your vocal channel with the fader at unity',
                        'Slowly raise the fader until you hear the first ring or squeal',
                        'Watch the Issues list — it will show you the exact frequency',
                        'Click APPLY to save that frequency to your EQ Notepad',
                        'On your console, make a narrow cut (-3 to -6 dB) at that frequency',
                        'Continue raising the fader until the next ring appears',
                        'Repeat until you can achieve full gain without feedback',
                      ]}
                      tip="Stop after 3-5 cuts per channel. More than that usually means a mic placement problem."
                    />

                    <TutorialStep
                      number={5}
                      title="Verify During Soundcheck"
                      time="2 min"
                      steps={[
                        'Switch to "Feedback Hunt" mode for balanced detection',
                        'Have talent speak or perform at show levels',
                        'Watch for any new issues that appear during real use',
                        'Fine-tune your EQ cuts based on actual performance',
                      ]}
                      tip="If running a show with music, switch to Music-Aware mode during performance."
                    />
                  </div>
                </section>

                {/* Common Scenarios */}
                <section className="pt-6 border-t border-border">
                  <h3 className="text-base font-semibold mb-4">Quick Settings by Venue Type</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <ScenarioCard
                      title="Corporate Presentation"
                      mode="Aggressive"
                      range="Speech (300-4k)"
                      tip="Zero tolerance. Lavaliers near monitors are common culprits."
                    />
                    <ScenarioCard
                      title="Live Band"
                      mode="Music-Aware"
                      range="Full (20-20k)"
                      tip="Music has harmonics that look like feedback. Trust sustained tones only."
                    />
                    <ScenarioCard
                      title="House of Worship"
                      mode="Vocal Ring"
                      range="Vocal (200-8k)"
                      tip="Mix of speech and singing. Vocal Ring handles both well."
                    />
                    <ScenarioCard
                      title="Theater / Drama"
                      mode="Aggressive"
                      range="Vocal (200-8k)"
                      tip="Quiet passages make feedback very noticeable. Be conservative."
                    />
                  </div>
                </section>
              </div>
            )}

            {/* ============================================================
                TAB 3: ALGORITHMS
                ============================================================ */}
            {activeTab === 'math' && (
              <div className="space-y-8">
                <section>
                  <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-primary" />
                    Detection Algorithms
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Kill The Ring uses four independent algorithms running in parallel. Each detects a 
                    different acoustic signature of feedback. Results are combined using content-aware fusion.
                  </p>

                  <div className="space-y-6">
                    <AlgorithmCard
                      name="Mean Square Derivative (MSD)"
                      source="DAFx-16 Paper, Pepe et al."
                      whatItDoes="Measures how stable a frequency is over time. Feedback stays constant; music fluctuates."
                      formula="MSD = (1/N) * sum[(x[n] - 2*x[n-1] + x[n-2])^2]"
                      formulaPlain="Calculate the second derivative of amplitude across N frames, then average the squares."
                      howToRead="MSD near 0 = rock-solid tone = feedback. MSD > 1 = fluctuating = music."
                      scoring="feedbackScore = exp(-MSD / 0.1)"
                      threshold="MSD < 0.1 triggers feedback classification"
                      realWorld="A singer&apos;s vibrato has some MSD variation. Pure electronic feedback has zero."
                    />

                    <AlgorithmCard
                      name="Phase Coherence"
                      source="KU Leuven 2025, Nyquist Stability"
                      whatItDoes="Checks if phase is locked frame-to-frame. Feedback has constant phase; music drifts randomly."
                      formula="coherence = |mean(exp(j * delta_phi))|"
                      formulaPlain="Convert frame-to-frame phase differences to unit vectors, average them, measure the magnitude."
                      howToRead="Coherence near 1 = all vectors point same way = feedback. Near 0 = random = music."
                      scoring="feedbackScore = coherence (direct)"
                      threshold="Coherence >= 0.85 indicates phase-locked feedback"
                      realWorld="Even a perfectly tuned piano has micro-variations. Feedback is mathematically locked to the loop."
                    />

                    <AlgorithmCard
                      name="Spectral Flatness"
                      source="Psychoacoustic Research"
                      whatItDoes="Measures how peaked vs. flat the spectrum is around a candidate frequency."
                      formula="flatness = geometricMean(spectrum) / arithmeticMean(spectrum)"
                      formulaPlain="Ratio of geometric to arithmetic mean. Approaches 1 for noise, approaches 0 for pure tones."
                      howToRead="Low flatness + high kurtosis = sharp peak = likely feedback."
                      scoring="score = (1 - flatness)*0.6 + kurtosisScore*0.4"
                      threshold="Flatness < 0.1 with kurtosis > 5"
                      realWorld="A bass guitar has harmonics spreading energy. Feedback concentrates all energy at one frequency."
                    />

                    <AlgorithmCard
                      name="Comb Filter Pattern"
                      source="DBX AFS Research"
                      whatItDoes="Detects multiple evenly-spaced peaks indicating a feedback loop with a specific path length."
                      formula="d = c / delta_f"
                      formulaPlain="Path length (meters) = speed of sound (343 m/s) / peak spacing (Hz)."
                      howToRead="Regular spacing between peaks suggests a physical feedback path."
                      scoring="confidence = matchingPeaks / totalPeaks"
                      threshold="3+ peaks with consistent spacing"
                      realWorld="Peaks at 500, 1000, 1500, 2000 Hz suggest a ~0.7m mic-to-speaker feedback path."
                    />
                  </div>
                </section>

                {/* Fusion Weights */}
                <section className="pt-6 border-t border-border">
                  <h3 className="text-base font-semibold mb-4">Content-Aware Fusion Weights</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    The four algorithm scores are combined with different weights depending on detected content type. 
                    This reduces false positives by emphasizing the most reliable algorithm for each situation.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3 font-medium">Content Type</th>
                          <th className="text-center p-3 font-medium">MSD</th>
                          <th className="text-center p-3 font-medium">Phase</th>
                          <th className="text-center p-3 font-medium">Spectral</th>
                          <th className="text-center p-3 font-medium">Comb</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono text-xs">
                        <tr className="border-t border-border">
                          <td className="p-3">Speech</td>
                          <td className="text-center p-3 text-primary font-bold">0.35</td>
                          <td className="text-center p-3">0.30</td>
                          <td className="text-center p-3">0.20</td>
                          <td className="text-center p-3">0.15</td>
                        </tr>
                        <tr className="border-t border-border bg-muted/30">
                          <td className="p-3">Music</td>
                          <td className="text-center p-3">0.25</td>
                          <td className="text-center p-3 text-primary font-bold">0.35</td>
                          <td className="text-center p-3">0.15</td>
                          <td className="text-center p-3">0.25</td>
                        </tr>
                        <tr className="border-t border-border">
                          <td className="p-3">Mixed</td>
                          <td className="text-center p-3">0.30</td>
                          <td className="text-center p-3">0.30</td>
                          <td className="text-center p-3">0.20</td>
                          <td className="text-center p-3">0.20</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Speech emphasizes MSD (sustained notes are rare in speech). Music emphasizes Phase and Comb (harmonics are expected).
                  </p>
                </section>

                {/* Room Acoustics */}
                <section className="pt-6 border-t border-border">
                  <h3 className="text-base font-semibold mb-4">Room Acoustic Formulas</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormulaCard
                      name="Schroeder Frequency"
                      formula="f_s = 2000 * sqrt(RT60 / V)"
                      explanation="Below this frequency, room modes dominate and detection thresholds are relaxed."
                      example="RT60=1.2s, V=500m³ → f_s = 98 Hz"
                    />
                    <FormulaCard
                      name="Modal Overlap"
                      formula="M = 1 / Q"
                      explanation="M < 0.03 (Q > 33) = isolated peak = high risk. M > 0.33 (Q < 3) = broad = low risk."
                      example="Q=45 → M=0.022 → high feedback risk"
                    />
                    <FormulaCard
                      name="Reverberation Q"
                      formula="Q = pi * f * RT60"
                      explanation="Higher Q means longer ringing at that frequency, increasing feedback risk."
                      example="f=1kHz, RT60=0.8s → Q=2513"
                    />
                    <FormulaCard
                      name="A-Weighting"
                      formula="A(f) = [IEC 61672-1 curve]"
                      explanation="Matches human hearing sensitivity. Attenuates lows where we are less sensitive."
                      example="1kHz: 0dB, 100Hz: -19dB, 50Hz: -30dB"
                    />
                  </div>
                </section>
              </div>
            )}

            {/* ============================================================
                TAB 4: FAQ
                ============================================================ */}
            {activeTab === 'faq' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MessageCircleQuestion className="w-5 h-5 text-primary" />
                  Frequently Asked Questions
                </h2>

                <FAQItem
                  q="What is the difference between FEEDBACK, RESONANCE, and RING?"
                  a="FEEDBACK (red) means the system detected a self-sustaining loop that will keep growing — act immediately. RESONANCE (yellow) means a frequency is being amplified by room acoustics but has not become runaway feedback yet — it is a warning. RING (gray) is a brief tonal event that may or may not be problematic."
                />
                <FAQItem
                  q="Why am I getting so many false positives?"
                  a="Try: 1) Switch to Music-Aware mode during performance. 2) Raise the Threshold slider to 12-16 dB. 3) Narrow the frequency range to focus on your problem area. 4) Check that input gain is not too hot (clipping causes false detection)."
                />
                <FAQItem
                  q="Why is it not detecting feedback I can clearly hear?"
                  a="Possible causes: 1) Input gain too low — raise it until peaks hit yellow. 2) Feedback is outside your frequency range. 3) Threshold is too high — try Aggressive or Calibration mode. 4) The feedback is very brief and not meeting the sustain requirement."
                />
                <FAQItem
                  q="Should I use the built-in microphone or a measurement mic?"
                  a="For soundcheck and general use, the built-in mic is fine. For precision calibration, use a flat-response measurement mic via USB interface. Built-in mics have their own frequency response that colors the analysis."
                />
                <FAQItem
                  q="How many EQ cuts should I make?"
                  a="Typically 3-5 cuts per channel is reasonable. If you need more than 6-8 cuts, you probably have a positioning problem (mic too close to speaker, monitor angle wrong). Excessive EQ degrades sound quality."
                />
                <FAQItem
                  q="What do the algorithm scores (MSD, Phase) mean?"
                  a="Enable Show Algorithm Scores in Settings to see per-algorithm results. MSD measures amplitude stability. Phase measures phase coherence. Spectral measures tonal purity. Comb detects harmonic patterns. All four are fused into the final detection."
                />
                <FAQItem
                  q="Can I use this for monitor mixing?"
                  a="Yes. Position your device near the performer position, not FOH. Use Calibration mode during soundcheck to find all problem frequencies for each monitor mix."
                />
                <FAQItem
                  q="What is the EQ Notepad for?"
                  a="When you click APPLY on a detected issue, it saves that frequency as a reference. You can then manually apply cuts to your console EQ. The notepad persists until you clear it."
                />
                <FAQItem
                  q="Does this work on phones and tablets?"
                  a="Yes, on modern browsers (Chrome, Safari). The interface adapts to any screen size. Some older devices may have audio processing limitations."
                />
              </div>
            )}

            {/* ============================================================
                TAB 5: TROUBLESHOOTING
                ============================================================ */}
            {activeTab === 'troubleshoot' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-primary" />
                  Troubleshooting Guide
                </h2>

                <TroubleshootCard
                  problem="No audio input — meter stays flat"
                  solutions={[
                    'Click the URL bar lock icon and ensure microphone is set to Allow',
                    'Check your browser settings for the correct input device',
                    'Make sure the browser tab is not muted',
                    'Increase input gain slider to +10 to +20 dB range',
                  ]}
                />

                <TroubleshootCard
                  problem="Constant red alerts even with no feedback"
                  solutions={[
                    'Lower input gain until peaks are in yellow, not red (clipping)',
                    'Raise Threshold slider to 12-16 dB',
                    'Narrow frequency range to exclude HVAC rumble (try Vocal 200-8k)',
                    'Move device away from computer fans or other noise sources',
                  ]}
                />

                <TroubleshootCard
                  problem="Feedback not detected until it is screaming"
                  solutions={[
                    'Switch to Aggressive or Calibration mode',
                    'Lower Growth slider to 1-2 dB/s',
                    'Expand frequency range to Full (20-20k)',
                    'Increase input gain until meter shows healthy signal',
                  ]}
                />

                <TroubleshootCard
                  problem="Works in soundcheck but not during show"
                  solutions={[
                    'Music-Aware mode may be suppressing legitimate feedback — try Feedback Hunt',
                    'Noise floor is higher during show — lower Threshold slightly',
                    'Adjust input gain for show volume levels',
                  ]}
                />

                <TroubleshootCard
                  problem="App is slow or laggy"
                  solutions={[
                    'Close other browser tabs, especially video/audio',
                    'Reduce FFT size to 4096 in Settings',
                    'Use a laptop instead of phone for intensive work',
                  ]}
                />

                {/* Quick Fixes */}
                <div className="pt-4 border-t border-border">
                  <h3 className="text-sm font-semibold mb-3">Quick Fixes</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      { fix: 'Reset everything', how: 'Settings → Reset to Defaults' },
                      { fix: 'Clear stuck alerts', how: 'Stop and restart analysis' },
                      { fix: 'Refresh microphone', how: 'Reload page, re-grant permission' },
                      { fix: 'Clear EQ notepad', how: 'Click trash icon in notepad' },
                    ].map(item => (
                      <div key={item.fix} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                        <span className="text-sm">{item.fix}</span>
                        <code className="text-xs bg-background px-2 py-1 rounded">{item.how}</code>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function ControlExplainer({ name, what, options }: { 
  name: string
  what: string
  options: { name: string; when: string }[] 
}) {
  return (
    <div className="p-4 rounded-lg border border-border bg-card/50">
      <h4 className="font-semibold text-sm mb-1">{name}</h4>
      <p className="text-xs text-muted-foreground mb-3">{what}</p>
      <div className="space-y-1.5">
        {options.map(opt => (
          <div key={opt.name} className="flex gap-2 text-xs">
            <span className="font-mono text-primary whitespace-nowrap">{opt.name}</span>
            <span className="text-muted-foreground">— {opt.when}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TutorialStep({ number, title, time, steps, tip }: {
  number: number
  title: string
  time: string
  steps: string[]
  tip: string
}) {
  return (
    <div className="relative pl-14">
      <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-lg">
        {number}
      </div>
      <div className="flex items-baseline gap-3 mb-2">
        <h4 className="font-semibold">{title}</h4>
        <span className="text-xs text-muted-foreground">~{time}</span>
      </div>
      <ol className="space-y-1.5 mb-3">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-2 text-sm">
            <span className="text-muted-foreground font-mono text-xs">{i + 1}.</span>
            <span className="text-muted-foreground">{step}</span>
          </li>
        ))}
      </ol>
      <div className="text-xs text-primary bg-primary/10 p-2 rounded-lg border border-primary/20">
        <strong>Pro tip:</strong> {tip}
      </div>
    </div>
  )
}

function ScenarioCard({ title, mode, range, tip }: { title: string; mode: string; range: string; tip: string }) {
  return (
    <div className="p-4 rounded-lg border border-border bg-card/50">
      <h4 className="font-semibold text-sm mb-2">{title}</h4>
      <div className="flex gap-2 mb-2">
        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">{mode}</span>
        <span className="px-2 py-0.5 bg-muted rounded text-xs">{range}</span>
      </div>
      <p className="text-xs text-muted-foreground">{tip}</p>
    </div>
  )
}

function AlgorithmCard({ name, source, whatItDoes, formula, formulaPlain, howToRead, scoring, threshold, realWorld }: {
  name: string
  source: string
  whatItDoes: string
  formula: string
  formulaPlain: string
  howToRead: string
  scoring: string
  threshold: string
  realWorld: string
}) {
  return (
    <div className="p-5 rounded-lg border border-border bg-card/50">
      <div className="flex items-baseline gap-2 mb-2">
        <h4 className="font-semibold">{name}</h4>
        <span className="text-xs text-muted-foreground">({source})</span>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{whatItDoes}</p>
      
      <div className="space-y-3 text-sm">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Formula</div>
          <code className="block bg-muted px-3 py-2 rounded font-mono text-xs">{formula}</code>
          <p className="text-xs text-muted-foreground mt-1">{formulaPlain}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Scoring</div>
            <code className="block bg-muted px-2 py-1 rounded font-mono text-[10px]">{scoring}</code>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Threshold</div>
            <p className="text-xs">{threshold}</p>
          </div>
        </div>
        
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">How to Interpret</div>
          <p className="text-xs">{howToRead}</p>
        </div>
        
        <div className="pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Real-World Example</div>
          <p className="text-xs text-muted-foreground italic">{realWorld}</p>
        </div>
      </div>
    </div>
  )
}

function FormulaCard({ name, formula, explanation, example }: {
  name: string
  formula: string
  explanation: string
  example: string
}) {
  return (
    <div className="p-4 rounded-lg border border-border bg-muted/30">
      <h4 className="font-medium text-sm mb-2">{name}</h4>
      <code className="block bg-background px-3 py-2 rounded font-mono text-xs mb-2">{formula}</code>
      <p className="text-xs text-muted-foreground mb-2">{explanation}</p>
      <p className="text-xs font-mono text-primary">{example}</p>
    </div>
  )
}

function FAQItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="p-4 rounded-lg border border-border bg-card/50">
      <h4 className="font-medium text-sm mb-2">{q}</h4>
      <p className="text-sm text-muted-foreground">{a}</p>
    </div>
  )
}

function TroubleshootCard({ problem, solutions }: { problem: string; solutions: string[] }) {
  return (
    <div className="p-4 rounded-lg border border-border bg-card/50">
      <h4 className="font-semibold text-sm text-red-500 mb-3">{problem}</h4>
      <ul className="space-y-2">
        {solutions.map((sol, i) => (
          <li key={i} className="flex gap-2 text-sm">
            <span className="text-primary">→</span>
            <span className="text-muted-foreground">{sol}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
