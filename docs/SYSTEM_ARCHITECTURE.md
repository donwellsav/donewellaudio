# DoneWell Audio System Architecture

> Deep-audit edition. Audited 2026-03-31 against live source files and `repomix-output.xml`.
> Version **0.50.0** | **242** TypeScript files | **1080** tests | **52** suites

---

## 1. High-Level Overview

### What is DoneWell Audio?

DoneWell Audio is a browser-based real-time acoustic feedback detection PWA for live sound engineers. It captures microphone input via the Web Audio API, identifies feedback frequencies using seven fused detection algorithms (six classical + ML), and delivers EQ recommendations with pitch translation.

### Core Invariant

> **DoneWell Audio analyzes audio only. It never modifies or outputs audio.**

The system is purely advisory. It listens, detects, classifies, and recommends — but the audio signal path is read-only. No GainNode output, no audio processing output, no modification of the source stream.

### Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router, Turbopack dev, Webpack prod) | 16.2.1 |
| Language | TypeScript (strict mode, zero `any`) | 5.7 |
| UI | shadcn/ui (New York) + Tailwind CSS + Radix | v4 |
| Audio | Web Audio API (AnalyserNode, 8192-point FFT) | Browser native |
| DSP Offload | Web Worker (`dspWorker.ts`) | Browser native |
| Visualization | HTML5 Canvas 2D at 25-30fps | Browser native |
| State | React 19 hooks + 8 context providers | 19.2.4 |
| Testing | Vitest (1080 tests, 52 suites, <10s) | 4.x |
| Error Reporting | Sentry (browser + server + worker) | 10.x |
| PWA | Serwist (service worker, offline, installable) | 9.x |
| ML Inference | ONNX Runtime Web (MLP 11-32-16-1, 929 params) | 1.24.x |
| Package Manager | pnpm | 10.30.1 |

### System Boundary Diagram

```
 ┌─────────────────────────────── BROWSER TAB ────────────────────────────────┐
 │                                                                             │
 │  Microphone                                                                 │
 │      │                                                                      │
 │  getUserMedia() ─── echoCancellation: false                                 │
 │      │               noiseSuppression: false                                │
 │      │               autoGainControl: false                                 │
 │      ▼                                                                      │
 │  ┌─────────────────── WEB AUDIO GRAPH (main thread) ──────────────────┐    │
 │  │ MediaStreamSource → GainNode (auto-gain) → AnalyserNode (8192 FFT) │    │
 │  │                                              (PASSIVE — no output)  │    │
 │  └─────────────────────────────────────────────────────────────────────┘    │
 │      │                           │                                          │
 │      │ getFloatFrequencyData()   │ requestAnimationFrame                    │
 │      ▼                           ▼                                          │
 │  FeedbackDetector            SpectrumCanvas                                 │
 │  (peak detection, 50fps)     (RTA + GEQ, 25fps)                            │
 │      │                                                                      │
 │      │ postMessage (transferable Float32Arrays)                             │
 │      ▼                                                                      │
 │  ┌──────────── WEB WORKER ─────────────┐     ┌────── REACT ──────────┐    │
 │  │ Classification + Fusion + EQ Advisory │────▶│ Contexts → Components │    │
 │  │ Track Management + ML Inference       │     │ Advisory Cards + UI   │    │
 │  └──────────────────────────────────────┘     └───────────────────────┘    │
 │      │                                              │                      │
 │      ▼                                              ▼                      │
 │  SnapshotCollector                             localStorage                │
 │  (opt-in ML training data)                     (settings, presets)         │
 │                                                                             │
 └─────────────────────────────────────────────────────────────────────────────┘
        │                                                │
        ▼ POST /api/v1/ingest                            │
 ┌──────────────┐     ┌──────────┐              ┌───────────────┐
 │ Next.js API   │────▶│ Supabase │              │ Vercel (host) │
 │ (rate-limited) │     │ (storage)│              │ auto-deploy   │
 └───────────────┘     └──────────┘              └───────────────┘
```

### Deployment

- **Hosting:** Vercel auto-deploys on push to `main`
- **PWA:** Serwist generates a precache manifest; app is installable and works offline
- **CDN:** Vercel Edge Network serves static assets with automatic compression
- **CI:** GitHub Actions runs `audit → tsc → lint → test → build` on every push/PR

---

## 2. Component Interactions

### 2.1 Thread Model

The system runs on two threads with a strict responsibility split:

| Concern | Thread | Key File(s) | Why This Thread |
|---|---|---|---|
| AudioContext + AnalyserNode | Main | `lib/audio/createAudioAnalyzer.ts` | Web Audio API requires main thread |
| Peak detection (50fps hot path) | Main | `lib/dsp/feedbackDetector.ts` | Reads AnalyserNode data directly |
| Canvas drawing (25fps) | Main | `lib/canvas/spectrumDrawing.ts` | Canvas 2D API requires main thread |
| React rendering | Main | `components/analyzer/*` | DOM access |
| requestAnimationFrame loop | Main | `hooks/useAnimationFrame.ts` | Browser API |
| Classification + fusion | Worker | `lib/dsp/dspWorker.ts`, `classifier.ts` | CPU-heavy per-peak (~2-5ms) |
| Track lifecycle | Worker | `lib/dsp/trackManager.ts` | Stateful, benefits from isolation |
| EQ advisory generation | Worker | `lib/dsp/eqAdvisor.ts` | Depends on classification output |
| Advisory dedup + pruning | Worker | `lib/dsp/advisoryManager.ts` | Stateful dedup logic |
| ML inference (ONNX) | Worker | `lib/dsp/mlInference.ts` | Async model loading + inference |

**Why not AudioWorklet?** AudioWorklet processes raw audio samples at the sample level. DoneWell uses the browser's built-in AnalyserNode FFT — we need the frequency-domain output, not raw samples. AudioWorklet would add complexity without benefit.

**Why not SharedArrayBuffer?** SharedArrayBuffer requires Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy headers, which are incompatible with some CDNs and embedding scenarios. Simple `postMessage` with transferable buffers achieves zero-copy transfer without header requirements.

### 2.2 Provider Architecture

The monolithic audio context was split into 5 independent sub-contexts to prevent 50fps metering updates from re-rendering settings consumers.

```
AudioAnalyzerProvider (compound wrapper — contexts/AudioAnalyzerContext.tsx)
  │
  ├─ EngineContext         Update: rare (start/stop, device changes)
  │   └─ useEngine()       Provides: isRunning, error, start(), stop(), switchDevice()
  │
  ├─ SettingsContext        Update: medium (mode/threshold/preset changes)
  │   └─ useSettings()     Provides: settings, setMode(), setSensitivityOffset(), etc.
  │
  ├─ DetectionContext       Update: frequent (~50fps advisory stream)
  │   └─ useDetection()    Provides: advisories[], earlyWarning
  │
  ├─ MeteringContext        Update: frequent (~50fps spectrum + levels)
  │   └─ useMetering()     Provides: spectrumRef, inputLevel, autoGainDb, noiseFloor
  │
  └─ PA2Context             Update: rare (PA2 device bridge)
      └─ usePA2()          Provides: RTA data, GEQ state, slot usage

Additional providers layered by AudioAnalyzer.tsx:
  ├─ AdvisoryProvider       Advisory state, dismiss/clear/false-positive
  ├─ UIProvider             Mobile tab, freeze, fullscreen, layout reset
  └─ PortalContainerProvider  Portal mount for mobile overlays
```

Each context is wrapped in its own `useMemo` to prevent cross-context update pollution. Consumers opt into only the context they need.

### 2.3 Component Hierarchy

**Entry point chain:**
```
app/page.tsx
  → AudioAnalyzerClient.tsx     (dynamic import, 'use client')
  → AudioAnalyzer.tsx            (root orchestrator — 3-tier nesting)
      ├─ Tier 1: Shell           (static refs + provider setup)
      │   └─ frozenRef, snapshotBatchRef, rootCallbackRef
      ├─ Tier 2: AudioAnalyzerInner  (consumes 9 sub-contexts)
      │   └─ Nests UIProvider + AdvisoryProvider
      └─ Tier 3: FrozenSync bridge   (syncs UIContext.isFrozen → frozenRef)
```

**Desktop layout:** 3-panel resizable grid
- Left sidebar (240-400px): Issues list or Controls tabs
- Center: SpectrumCanvas + EarlyWarningPanel (stacked)
- Right sidebar (280-380px): SettingsPanel with 4 tabs

**Mobile layout:** Single-screen tab switcher
- Tab 1 (issues): IssuesList + inline SpectrumCanvas
- Tab 2 (settings): Full-screen SettingsPanel or LandscapeSettingsSheet
- Max 5 displayed issues (`MOBILE_MAX_DISPLAYED_ISSUES`)

### 2.4 Worker Protocol

**Message types:** Typed discriminated unions with exhaustiveness check.

```
WorkerInboundMessage (main → worker):
  init, updateSettings, processPeak, clearPeak, reset,
  spectrumUpdate, userFeedback, startRoomMeasurement,
  stopRoomMeasurement, enableCollection, disableCollection,
  getSnapshotBatch

WorkerOutboundMessage (worker → main):
  ready, advisory, advisoryCleared, tracksUpdate, returnBuffers,
  contentTypeUpdate, error, roomEstimate, roomMeasurementProgress,
  snapshotBatch, collectionStats
```

**Backpressure protocol:**

```
Main Thread                          Worker
     │                                  │
     │── processPeak ──────────────────▶│
     │   busyRef = true                 │ processing...
     │                                  │
     │── processPeak (new) ────X        │ (overwrite pendingPeakRef)
     │   droppedFramesRef++             │
     │                                  │
     │◀─────────── tracksUpdate ────────│
     │   busyRef = false                │
     │── send pendingPeakRef ──────────▶│
     │   busyRef = true                 │
```

**Crash recovery:** 3 auto-restarts with 500ms debounce. After 3 failures, `crashedRef = true` and the UI shows a manual restart button. On successful restart, `restartCountRef` resets to 0.

**Buffer pooling:** `specPoolRef` and `tdPoolRef` hold reusable Float32Arrays. After worker processes, it returns buffers via `returnBuffers` message. Pool checks `buffer.length === poolFftSizeRef.current` before recycling — wrong-size buffers from in-flight FFT changes are dropped.

---

## 3. Data Flow Diagrams

### 3.1 Audio Pipeline (End-to-End)

```
  Microphone
      │
  getUserMedia({ echoCancellation: false, noiseSuppression: false })
      │
  MediaStreamAudioSourceNode
      │
  GainNode (auto-gain: EMA-smoothed, target -18 dBFS, locks after 3s)
      │
  AnalyserNode (fftSize: 8192, no audio output — PASSIVE tap)
      │
  ┌──────────── MAIN THREAD ────────────┐
  │                                      │
  │  requestAnimationFrame loop          │
  │      │                               │
  │      ├─ Every 33ms (30fps):          │
  │      │  getFloatFrequencyData()      │
  │      │  → SpectrumCanvas draw        │
  │      │  → onSpectrum callback        │
  │      │                               │
  │      ├─ Every 20ms (50fps):          │
  │      │  FeedbackDetector.analyze()   │
  │      │  → Peak detection             │
  │      │  → MSD computation            │
  │      │  → onPeakDetected callback    │
  │      │                               │
  │      └─ Every 500ms (2fps):          │
  │         Spectrum snapshot             │
  │         → onSpectrumUpdate callback  │
  │         → Worker content-type detect │
  │                                      │
  └──────────────────────────────────────┘
      │ postMessage (zero-copy transferable)
      ▼
  ┌──────────── WEB WORKER ──────────────┐
  │                                       │
  │  1. AlgorithmEngine.computeScores()   │
  │  2. fuseAlgorithmResults()            │
  │  3. classifyTrackWithAlgorithms()     │
  │  4. Temporal smoothing (majority vote)│
  │  5. shouldReportIssue()               │
  │  6. generateEQAdvisory()              │
  │  7. AdvisoryManager.createOrUpdate()  │
  │                                       │
  └───────────────────────────────────────┘
      │ postMessage (advisory)
      ▼
  ┌──────────── REACT RENDER ────────────┐
  │                                       │
  │  useAdvisoryMap (O(1) Map + cache)    │
  │  → DetectionContext                   │
  │  → IssuesList → IssueCard            │
  │  → SpectrumCanvas markers + notches   │
  │                                       │
  └───────────────────────────────────────┘
```

### 3.2 DSP Processing Pipeline

```
Peak Detection (main thread — feedbackDetector.ts)
  │
  ├─ Stage 1: _measureSignalAndApplyGain()
  │   Auto-gain EMA, raw peak scan
  │
  ├─ Stage 2: _buildPowerSpectrum()
  │   Apply inputGain + A-weighting + mic calibration
  │   Build Float64Array prefix sums for O(1) prominence
  │
  ├─ Stage 3: Update noise floor
  │   EMA with attack tau ~150ms, release tau ~600ms
  │
  └─ Stage 4: _scanAndProcessPeaks()
      MSD pool lookup (256 slots, 64 frames, 64KB)
      Persistence check (min 5 frames = 100ms)
      → onPeakDetected(peak, spectrum, timeDomain)
          │
          ▼ postMessage to worker
          │
  Algorithm Scoring (worker — workerFft.ts)
  │
  ├─ MSD feedbackScore (stability)     weight: 0.27
  ├─ Phase coherence (circular stats)  weight: 0.23
  ├─ Spectral flatness (kurtosis)      weight: 0.11
  ├─ Comb pattern (DBX algorithm)      weight: 0.07
  ├─ IHR (inter-harmonic ratio)        weight: 0.12
  ├─ PTMR (peak-to-median ratio)       weight: 0.10
  └─ ML (ONNX MLP, 929 params)         weight: 0.10
      │
      ▼
  Fusion (fusionEngine.ts)
  │
  ├─ Content-adaptive weight selection (speech/music/compressed)
  ├─ Weighted sum → raw fused probability
  └─ Multiplicative gates (post-fusion):
      ├─ IHR gate: harmonics≥3 AND IHR>0.35 → ×0.65
      ├─ PTMR gate: PTMR score<0.2 → ×0.80
      ├─ Comb stability gate: spacing CV>0.05 → ×0.25
      └─ AgreementPersistenceTracker: ewma>0.6 for 4+ frames → +5% boost
          │
          ▼
  Classification (classifier.ts)
  │
  ├─ 11-feature vector → Bayesian classifier
  ├─ Additional gates:
  │   ├─ Formant gate: 2+ formant bands + Q 3-20 → ×0.65
  │   ├─ Chromatic gate: ±5 cents of 12-TET + phase>0.80 → phase ×0.60
  │   └─ Mains hum gate: 50n/60n Hz + 2 corroborating peaks → ×0.40
  ├─ Room physics adjustment (capped ±0.30)
  └─ Temporal smoothing: majority-vote over label history ring buffer
      │
      ▼
  Advisory Generation (eqAdvisor.ts + advisoryManager.ts)
  │
  ├─ shouldReportIssue() — mode-specific reporting gate
  ├─ generateEQAdvisory() — PEQ + GEQ + shelf recommendations
  └─ AdvisoryManager.createOrUpdate() — 3-layer dedup
      ├─ Layer 1: Rate limit (200ms, RUNAWAY/GROWING exempt)
      ├─ Layer 2: Band cooldown (500ms after explicit clear)
      └─ Layer 3: Frequency proximity (100 cents merge tolerance)
```

### 3.3 Settings Data Flow

```
  ┌─────────── STORAGE (localStorage) ───────────┐
  │ dwa-v2-session  (mode + env + live + diag)    │
  │ dwa-v2-display  (display preferences)         │
  │ dwa-v2-presets  (rig presets array)            │
  │ dwa-v2-startup  (auto-load preference)        │
  └───────────────────────────────────────────────┘
          │ load on mount
          ▼
  ┌─────── useLayeredSettings hook ────────┐
  │                                         │
  │  DwaSessionState {                      │
  │    modeId: 'speech' | 'worship' | ...   │
  │    environment: { templateId, offsets }  │
  │    liveOverrides: { sensitivity, gain }  │
  │    diagnostics: { gate overrides }       │
  │  }                                      │
  │                                         │
  │  + DisplayPrefs (separate lifecycle)    │
  │  + MicCalibrationProfile                │
  │                                         │
  └─────────────────────────────────────────┘
          │ deriveDetectorSettings() — PURE function
          ▼
  ┌─────── Composition Order ──────────────┐
  │                                         │
  │  1. Mode baseline (frozen policy)       │
  │  2. + Environment offsets               │
  │  3. + Live operator overrides           │
  │  4. + Diagnostics overrides             │
  │  5. + Display preferences (UI-only)     │
  │  6. + Mic calibration profile           │
  │                                         │
  └─────────────────────────────────────────┘
          │ flat DetectorSettings object
          ▼
  FeedbackDetector + dspWorker (unchanged consumers)
```

### 3.4 Advisory Lifecycle

```
  Worker creates advisory
      │
      ▼
  AdvisoryManager.createOrUpdate()
      │
      ├─ Rate limit check (200ms since last, RUNAWAY/GROWING exempt)
      ├─ Band cooldown check (500ms after explicit clear)
      ├─ Frequency proximity dedup (100 cents = 1 semitone)
      │   ├─ Within tolerance of existing → merge or replace
      │   └─ New frequency → create new advisory
      └─ Memory bound check (max 200 advisories, prune oldest)
          │
          ▼ postMessage to main thread
          │
  useAdvisoryMap hook
      │
      ├─ Map<advisoryId, Advisory> — O(1) insert/update/delete
      ├─ dirtyRef: boolean — true on structural change
      ├─ sortedCacheRef — rebuilt only when dirty
      │   Sort: active before resolved → severity urgency → amplitude
      └─ frozenBufferRef — queue updates while UI frozen
          ├─ RUNAWAY breaks through freeze (always applied)
          └─ Flush on unfreeze → full re-sort
              │
              ▼
  IssuesList → IssueCard (per advisory)
      │
      ├─ Swipe left: dismiss
      ├─ Swipe right: confirm (CONFIRM label for ML)
      ├─ Long-press: false positive (FALSE+ label for ML)
      └─ Copy: EQ recommendation to clipboard
          │
          ▼ User feedback flows back to worker
          │
  dspWorker.sendUserFeedback()
      → snapshotCollector.applyUserFeedback()
      → Labels pending batch events for ML training
```

### 3.5 ML Data Pipeline

```
  Audio analysis running (opt-in users only)
      │
      ▼
  SnapshotCollector (lib/data/snapshotCollector.ts)
      │
      ├─ Captures spectrum every 5th frame (~4 Hz)
      ├─ Quantizes: Float32 dB → Uint8 (0-255 maps -100 to 0 dB)
      │   Resolution: ~0.4 dB per step
      ├─ Downsamples: source FFT bins → 512 target bins (peak-hold)
      └─ Ring buffer: 240 snapshots (~60 seconds)
          │
          │ Feedback event detected
          ▼
      Event window: ±30 snapshots (60 total)
          │
          ├─ Enriched with MarkerAlgorithmScores
          ├─ User feedback labels: correct | false_positive | confirmed_feedback
          └─ Label balance tracking (prevents training bias)
              │
              ▼ Batch ready (max 10 pending events)
              │
  POST /api/v1/ingest
      │
      ├─ Schema validation (v1.0/1.1/1.2)
      ├─ Dual rate limit: IP 30/60s + session 6/60s
      ├─ IP stripped before forwarding
      └─ Forward to Supabase Edge Function
          │
          ▼
  Supabase spectral_snapshots table
      │
      ▼ Weekly/manual GitHub Actions workflow
      │
  scripts/ml/train_fp_filter.py → Export ONNX → Update manifest
```

### 3.6 Canvas Rendering Pipeline

**14-step draw order per frame** (`spectrumDrawing.ts`, 1309 lines):

| Step | Function | What It Draws | Performance Notes |
|---|---|---|---|
| 1 | `drawGrid()` | Background + vignette + glow | Path2D cached, rebuilt on dim/range change |
| 2 | `drawFreqZones()` | 5 frequency bands | Theme-aware opacity (0.20 dark / 0.08 light) |
| 3 | `drawRoomModeLines()` | Axial room mode indicators | Thin vertical lines at resonances |
| 4 | `drawFreqRangeOverlay()` | Focus range rectangle | Draggable edges |
| 5 | `drawNotchOverlays()` | Advisory EQ regions | Merge bars within 3% plot width |
| 6 | `drawSpectrum()` | Real-time spectrum trace | Line from Float32Array |
| 7 | (inline) | Peak hold decay | 12.5 dB/sec, max delta 0.25s |
| 8 | `drawMarkers()` | Peak markers + labels | Max 7 visible, priority-sorted |
| 9 | (inline) | Early warning predictions | Dashed amber lines + triangles |
| 10 | `drawIndicatorLines()` | Threshold line (draggable) | Horizontal dashed line |
| 11 | `drawPA2RTATrace()` | PA2 RTA overlay | ISO 31-band, cyan dashed |
| 12 | `drawPA2GEQOverlay()` | PA2 GEQ bars | Height proportional to dB |
| 13 | `drawAxisLabels()` | Frequency + dB labels | Text measurement cached (~100 entries) |
| 14 | `drawPlaceholder()` | Idle curve (no signal) | Smooth placeholder shape |

**Signal tint system** (`useSignalTint.ts`):

| Severity | Color | RGB |
|---|---|---|
| Not running | Slate gray | `[100, 116, 139]` |
| Listening (no detections) | Console blue | `[59, 130, 246]` |
| Low severity | Console amber | `[245, 158, 11]` |
| Mid severity (GROWING) | Warning orange | `[249, 115, 22]` |
| Critical (RUNAWAY) | Red | `[239, 68, 68]` |

Upgrades are instant. Downgrades are delayed by 1000ms (hysteresis). CSS variables `--tint-r/g/b` set on `<html>`, consumed by all tinted surfaces.

---

## 4. Design Decisions and Rationale

### 4.1 Why Web Workers (not SharedArrayBuffer, not AudioWorklet)

| Option | Rejected Because |
|---|---|
| AudioWorklet | Processes raw samples — we use AnalyserNode's built-in FFT |
| SharedArrayBuffer | Requires COOP/COEP headers incompatible with some CDNs |
| Main thread only | Classification ~2-5ms per peak leaves <15ms budget at 50fps |
| **postMessage + transferable** | **Zero-copy, no special headers, simple error isolation** |

### 4.2 Why Compound Providers (not Zustand, not Redux)

| Option | Rejected Because |
|---|---|
| Zustand/Jotai | External dependency for a problem solvable with React 19 primitives |
| Redux | Action/reducer ceremony doesn't fit streaming audio data |
| Single context | Every consumer re-renders on 50fps metering updates |
| **Split contexts + useMemo** | **Update frequency isolation, zero external deps** |

### 4.3 Why Sparse MSD Pool (not dense array)

| Approach | Memory | Notes |
|---|---|---|
| Dense (all 4096 bins) | **1 MB** | 4096 x 64 frames x 4 bytes |
| **Sparse (256 slots)** | **64 KB** | Only active peaks get slots; LRU eviction; 16x reduction |

Emergency prune fires when all 256 slots are active (broadband transients).

### 4.4 Why 7 Algorithms (not just MSD)

MSD alone: ~95% accuracy on feedback, ~20% false positive rate on music. Each algorithm targets specific FP sources:

| Algorithm | Targets |
|---|---|
| MSD | Core feedback detector (spectral stability) |
| Phase Coherence | Feedback has locked phase; music doesn't |
| Spectral Flatness | Feedback is spectrally narrow; noise/music is broad |
| Comb Pattern | Feedback creates evenly-spaced harmonics from acoustic loop |
| IHR | Instruments have rich inter-harmonic energy; feedback doesn't |
| PTMR | Feedback peaks are sharp; broadband content is diffuse |
| ML (ONNX) | Learned gate logic; improves via retraining |

Content-adaptive weights shift per mode. Speech: MSD 0.30, PTMR 0.16. Music: Phase 0.32, IHR 0.22, MSD 0.07.

### 4.5 Why Layered Settings (not flat config)

A live operator needs to adjust sensitivity without understanding 47 `DetectorSettings` fields.

| Layer | Purpose | Example |
|---|---|---|
| Mode baseline | Expert-encoded policy | `speech = 27dB threshold` |
| Environment offset | Room adjustment | `outdoor = +5dB` |
| Live override | Operator knob | `sensitivity +2dB` |
| Diagnostics | Expert-only gates | `formantGateOverride: 0.50` |
| Display | UI-only prefs | `graphFontSize: 14` |
| Mic calibration | Hardware correction | `MEMS mic profile` |

`deriveDetectorSettings()` is pure — no side effects, safe in React render via `useMemo`.

### 4.6 Why Canvas 2D (not SVG, not WebGL)

| Option | Rejected Because |
|---|---|
| SVG | DOM manipulation at 25-50fps is prohibitively expensive |
| WebGL | Overkill for 2D spectrum; adds shader complexity |
| **Canvas 2D** | **Pure drawing functions, ref-based rendering, Path2D caching** |

### 4.7 Why Nonce-based CSP (not hash-based)

| Option | Rejected Because |
|---|---|
| Hash-based | Requires pre-computing hashes for all dynamic chunks Next.js generates |
| `unsafe-inline` in prod | Allows XSS via inline script injection |
| **Nonce + strict-dynamic** | **One nonce per request trusts entry script → lazy chunks** |

---

## 5. System Constraints and Limitations

### 5.1 Browser Constraints

| Constraint | Impact | Mitigation |
|---|---|---|
| `getUserMedia` requires secure origin | Won't work on plain HTTP | Vercel HTTPS; localhost exempt |
| Single AudioContext per tab | One analysis session at a time | Single-session by design |
| Workers cannot access DOM | Worker can't read canvas or trigger UI | Typed postMessage protocol |
| AnalyserNode FFT: powers of 2 | Limited to 256...32768 | Default 8192 is sufficient |
| Service Worker stale caching | Users may see old UI after deploy | Serwist precache with version hashing |

### 5.2 Performance Budgets

| Budget | Value | Overrun Consequence |
|---|---|---|
| `FeedbackDetector.analyze()` | 20ms (50fps) | Dropped peaks, delayed detection |
| Canvas draw frame | ~33ms (target 25fps) | Visible jank in spectrum display |
| Worker classification | ~2-5ms per peak | Backpressure drops frames |
| MSD pool capacity | 256 concurrent bins | LRU eviction on broadband transients |
| Advisory memory cap | 200 active | Oldest pruned in long sessions |
| Concurrent tracks | 64 maximum | Excess tracks evicted |
| Snapshot ring buffer | 240 entries (~60s) | Oldest overwritten |

### 5.3 Detection Constraints

| Constraint | Value | Rationale |
|---|---|---|
| Minimum persistence | 100ms (5 frames) | Prevents reporting transients as feedback |
| High persistence | 300ms (15 frames) | Confidence boost for sustained peaks |
| Merge tolerance | 100 cents (1 semitone) | Prevents duplicate advisories |
| Content-type latency | ~5 seconds | Majority vote over 10 frames at 2fps |
| ML model | Bootstrap (929 params) | Encodes gate logic; not yet trained on production data |
| Auto-gain lock | 3 seconds (30+ frames) | Calibration window before locking |
| Noise floor release | ~600ms tau | Slow recovery prevents chasing transients |
| Room physics cap | ±0.30 | Prevents over-suppression from correlated cues |

### 5.4 Infrastructure Constraints

| Constraint | Impact | Mitigation |
|---|---|---|
| In-memory rate limiting | Resets on cold start | Acceptable for edge functions |
| Relay queues in-memory | Lost on redeploy | Ephemeral pairing by design |
| Proxy SSRF guard | Blocks LAN targets | Known gap for Companion use case |
| No API authentication | Schema validation + rate limits only | Sufficient for anonymous data |
| Rate limit map cap | 10,000 entries | Amortized pruning prevents exhaustion |

### 5.5 Privacy Constraints

| Principle | Implementation |
|---|---|
| All processing is local | No audio data leaves the browser |
| Spectral snapshots opt-in | Explicit consent required |
| Magnitude-only collection | No phase data (prevents reconstruction) |
| No device identifiers | Random UUID session IDs |
| IP stripped | `x-forwarded-for` NOT forwarded to Supabase |
| GDPR compliance | EU/EEA/UK enhanced consent (Art. 6(1)(a), 24-month retention) |
| Geo detection fail-open | Missing header defaults to non-EU |

---

## Appendix A: Pre-Allocated Buffer Inventory

Allocated once in `FeedbackDetector.allocateBuffers()`, reused every frame:

| Buffer | Type | Size | Purpose |
|---|---|---|---|
| `freqDb` | `Float32Array` | n bins | Frequency magnitudes (dB) |
| `timeDomain` | `Float32Array` | fftSize | Raw waveform for phase coherence |
| `power` | `Float32Array` | n bins | Linear power for prominence |
| `prefix` | `Float64Array` | n+1 | Prefix sums for O(1) neighborhood averaging |
| `holdMs` | `Float32Array` | n bins | Peak sustain timer per bin |
| `deadMs` | `Float32Array` | n bins | Peak clearing timer per bin |
| `active` | `Uint8Array` | n bins | Active peak flag (0/1) |
| `activeHz` | `Float32Array` | n bins | Estimated true frequency per bin |
| `activeBins` | `Uint32Array` | n bins | Index list of active bins |
| `activeBinPos` | `Int32Array` | n bins | Position for O(1) removal |
| `aWeightingTable` | `Float32Array` | n bins | A-weighting correction (dB) |
| `micCalibrationTable` | `Float32Array` | n bins | Mic calibration correction (dB) |

Where `n = fftSize / 2` (typically 4096 for fftSize 8192).

## Appendix B: Operation Modes

| Mode | Threshold (dB) | Silence (dBFS) | MSD Weight | Use Case |
|---|---|---|---|---|
| speech | 27 | -65 | 0.33 | Conferences, lectures |
| worship | 35 | -58 | 0.33 | Churches (reverberant) |
| liveMusic | 42 | -45 | 0.08 | Concerts (dense harmonics) |
| theater | 28 | -58 | 0.33 | Drama, musicals |
| monitors | 15 | -45 | 0.33 | Stage wedges (fastest) |
| ringOut | 2 | -70 | 0.33 | Calibration (most sensitive) |
| broadcast | 22 | -70 | 0.33 | Studios, podcasts |
| outdoor | 38 | -45 | 0.33 | Festivals (wind-resistant) |

## Appendix C: Service Worker Caching

| Resource | Strategy | Cache Name | Max Entries | TTL |
|---|---|---|---|---|
| App shell | Precache (manifest) | Serwist default | All | Until next deploy |
| Static assets | CacheFirst | `static-assets-v1` | 80 | 7 days |
| Navigation | NetworkFirst | Default | N/A | N/A |
| Offline fallback | Cache | N/A | 1 | N/A |

`skipWaiting: false` — user approves new SW. `clientsClaim: true` — takes control on activation. `navigationPreload: true` — faster page loads.
