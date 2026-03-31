# DoneWell Audio Developer Guide

> Deep-audit edition. Audited 2026-03-31 against live source files and `repomix-output.xml`.
> Version **0.50.0** | **242** tracked `.ts`/`.tsx` files | **1080** tests (1076 pass, 4 skip) | **52** suites

---

## 1. Setup Instructions

### Prerequisites

| Requirement | Details |
|---|---|
| Node.js | **22** (pinned in `.nvmrc`, matches CI) |
| Package manager | **pnpm 10.30.1** (enforced via `packageManager` field in `package.json`) |
| Browser | Modern Chromium or Firefox with microphone access |
| Origin | `localhost` or HTTPS — `getUserMedia` requires a secure origin |

### Install

```bash
nvm use 22
pnpm install
```

### Run locally

```bash
pnpm dev          # Dev server on :3000 (Turbopack, no service worker)
```

Open [http://localhost:3000](http://localhost:3000).

For production-parity testing:

```bash
pnpm build        # Production build (webpack, generates SW)
pnpm start        # Serve the production build
```

### Environment variables

Basic local development works **without** any environment variables. Create `.env.local` from `.env.example` only if you need to test Sentry or Supabase integration:

```bash
cp .env.example .env.local
```

| Variable | Purpose | Required locally? |
|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry error reporting DSN | No |
| `SENTRY_AUTH_TOKEN` | Source map upload token | No |
| `SENTRY_ORG` | Sentry org slug | No (needed with auth token) |
| `SENTRY_PROJECT` | Sentry project slug | No (needed with auth token) |
| `SUPABASE_INGEST_URL` | Spectral snapshot forwarding endpoint | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase RLS bypass key | No (needed with ingest URL) |

### Dev vs Production differences

This is important to understand — several subsystems behave differently:

| Concern | `pnpm dev` (Turbopack) | `pnpm build && pnpm start` (Webpack) |
|---|---|---|
| Bundler | Turbopack | Webpack (via `next build --webpack`) |
| Service Worker | Disabled (`@serwist/next` skips in dev) | Generated to `public/sw.js` |
| CSP | Relaxed (`unsafe-inline`, `unsafe-eval`) | Nonce-based per-request (`middleware.ts`) |
| Hot Reload | Full HMR | None |
| Source Maps | Inline | Hidden (uploaded to Sentry if token set) |
| Hash Function | Default | SHA-256 (Windows OpenSSL 3.x compat, see `next.config.mjs`) |
| ONNX Model | Dynamic import with `webpackIgnore` | Same, but Webpack resolves differently |

### Config wrapper chain

`next.config.mjs` applies two wrappers in order:

```
withSentryConfig( withSerwist( nextConfig ) )
```

- `withSerwist` — generates service worker from `app/sw.ts` (disabled in dev)
- `withSentryConfig` — source map upload, tunnel route at `/monitoring`, tree-shaking

The version number flows from `package.json` → `next.config.mjs` (via `readFileSync`) → `NEXT_PUBLIC_APP_VERSION` env → HeaderBar + HelpMenu.

---

## 2. Architecture Overview

### Audio pipeline

```
  Microphone
      |
  getUserMedia()
      |
  GainNode (auto-gain)
      |
  AnalyserNode (8192-point FFT)
      |
  ┌───────────────────── MAIN THREAD (50fps) ──────────────────────┐
  │ FeedbackDetector.analyze()                                      │
  │   ├─ getFloatFrequencyData() → power spectrum                   │
  │   ├─ Peak detection (local maxima, MSD, prominence, persistence)│
  │   └─ requestAnimationFrame loop                                 │
  └─────────────────────────────────────────────────────────────────┘
      │ postMessage (zero-copy transferable Float32Arrays)
      ▼
  ┌───────────────────── WEB WORKER ────────────────────────────────┐
  │ dspWorker.ts (thin orchestrator)                                │
  │   ├─ AlgorithmEngine: FFT, MSD, phase, amplitude               │
  │   ├─ fuseAlgorithmResults(): 7-algorithm weighted fusion        │
  │   ├─ classifyTrackWithAlgorithms(): 11-feature Bayesian         │
  │   ├─ Temporal smoothing: majority-vote label stabilization      │
  │   ├─ shouldReportIssue(): mode-specific reporting gate          │
  │   ├─ generateEQAdvisory(): GEQ/PEQ/shelf recommendations       │
  │   ├─ AdvisoryManager: 3-layer dedup, band cooldown, memory cap  │
  │   └─ SnapshotCollector: ML training data (if opted in)          │
  └─────────────────────────────────────────────────────────────────┘
      │ postMessage (advisory)
      ▼
  ┌───────────────────── REACT RENDER ──────────────────────────────┐
  │ useAudioAnalyzer → useAdvisoryMap → DetectionContext             │
  │   → IssuesList → IssueCard (advisory cards)                     │
  │   → SpectrumCanvas (RTA + GEQ at 30fps via Canvas 2D)           │
  └─────────────────────────────────────────────────────────────────┘
```

### Thread model

| Concern | Thread | Key file(s) |
|---|---|---|
| AudioContext, AnalyserNode | Main | `lib/audio/createAudioAnalyzer.ts` |
| Peak detection (hot path, 50fps) | Main | `lib/dsp/feedbackDetector.ts` |
| Canvas drawing (30fps) | Main | `lib/canvas/spectrumDrawing.ts` |
| React rendering | Main | `components/analyzer/*` |
| requestAnimationFrame loop | Main | `hooks/useAnimationFrame.ts` |
| Classification + fusion | Worker | `lib/dsp/dspWorker.ts`, `classifier.ts`, `fusionEngine.ts` |
| Track lifecycle | Worker | `lib/dsp/trackManager.ts` |
| EQ advisory generation | Worker | `lib/dsp/eqAdvisor.ts` |
| Advisory dedup + pruning | Worker | `lib/dsp/advisoryManager.ts` |
| ML inference (ONNX) | Worker | `lib/dsp/mlInference.ts` |

### Entry point chain

```
app/page.tsx
  → components/analyzer/AudioAnalyzerClient.tsx    (dynamic import, 'use client')
  → components/analyzer/AudioAnalyzer.tsx           (root orchestrator)
  → contexts/AudioAnalyzerContext.tsx               (compound provider)
  → hooks/useAudioAnalyzer.ts                       (master hook)
  → lib/audio/createAudioAnalyzer.ts                (Web Audio setup)
  → lib/dsp/feedbackDetector.ts                     (main-thread DSP)
  → hooks/useDSPWorker.ts                           (worker lifecycle)
  → lib/dsp/dspWorker.ts                            (worker orchestrator)
```

### Context provider nesting

The monolithic audio context was split into 5 independent sub-contexts to minimize re-renders. Each context updates at a different frequency:

```
AudioAnalyzerProvider (compound, nests all below)
  ├─ EngineContext         (rare: start/stop, device changes)
  ├─ SettingsContext        (medium: mode/threshold/preset changes)
  ├─ DetectionContext       (frequent: advisories at ~50fps)
  ├─ MeteringContext        (frequent: spectrum + levels at ~50fps)
  └─ PA2Context             (rare: PA2 device bridge)

AudioAnalyzer.tsx layers additional providers on top:
  ├─ AdvisoryProvider       (advisory state, dismiss/clear/FP)
  ├─ UIProvider             (mobile tab, freeze, fullscreen)
  └─ PortalContainerProvider (portal mount for mobile overlays)
```

Consumers opt into specific contexts via hooks: `useEngine()`, `useSettings()`, `useMetering()`, `useDetection()`, `usePA2()`.

### 7 detection algorithms

| # | Algorithm | What it measures | Weight (default) |
|---|---|---|---|
| 1 | MSD (Magnitude Slope Deviation) | Spectral stability — feedback ≈ 0, music >> 0 | 0.27 |
| 2 | Phase Coherence | Frame-to-frame phase stability | 0.23 |
| 3 | Spectral Flatness | Geometric/arithmetic mean + kurtosis + crest | 0.11 |
| 4 | Comb Pattern | Evenly-spaced peaks from acoustic loop | 0.07 |
| 5 | IHR (Inter-Harmonic Ratio) | Energy between harmonics | 0.12 |
| 6 | PTMR (Peak-to-Median Ratio) | Peak prominence vs. broadband | 0.10 |
| 7 | ML (ONNX MLP) | 11-feature bootstrap model (929 params, 4KB) | 0.10 |

Weights are mode-adaptive — `fusionEngine.ts` applies content-specific weight profiles for Speech, Music, and Compressed signals.

---

## 3. Key Concepts

These are the patterns a new developer must understand to work effectively in this codebase.

### 3.1 Compound provider pattern

**Problem:** A single monolithic AudioContext caused every consumer to re-render on every state change — including 50fps metering updates.

**Solution:** Split into 5 independent sub-contexts (`EngineContext`, `SettingsContext`, `DetectionContext`, `MeteringContext`, `PA2Context`). Each is wrapped in its own `useMemo` to prevent cross-context update pollution.

**Files:** `contexts/AudioAnalyzerContext.tsx` (compound provider), `contexts/EngineContext.tsx`, `contexts/SettingsContext.tsx`, `contexts/DetectionContext.tsx`, `contexts/MeteringContext.tsx`, `contexts/PA2Context.tsx`

**Rule:** When adding new state, put it in the sub-context that matches its update frequency. Don't add high-frequency data (spectrum, levels) to a low-frequency context (engine, settings).

### 3.2 Worker protocol and backpressure

**Protocol:** Main thread and worker communicate via typed discriminated union messages (`WorkerInboundMessage`, `WorkerOutboundMessage` in `dspWorker.ts`). The worker switch statement has an exhaustiveness check — adding a new message type without handling it is a compile error.

**Backpressure:** The worker processes one peak at a time. While busy (`busyRef.current === true`):
- New peaks overwrite `pendingPeakRef` (only the latest frame is kept)
- Dropped frames are counted in `droppedFramesRef`
- When the worker responds with `tracksUpdate` or `returnBuffers`, backpressure clears and the buffered peak is sent

**Crash recovery:** If the worker throws an error, `useDSPWorker` auto-restarts up to **3 times** with **500ms debounce**. After 3 failures, `crashedRef` is set and the UI shows a manual restart button.

**File:** `hooks/useDSPWorker.ts`

### 3.3 Zero-copy buffer transfer

**Problem:** Allocating new Float32Arrays every frame (50fps × 4096 floats) creates GC pressure.

**Solution:** Buffer pooling with transferable ownership:
1. Main thread acquires a Float32Array from `specPoolRef` (or allocates if pool empty)
2. Fills it with spectrum data
3. Transfers ownership to worker via `postMessage(msg, [buffer])`
4. Worker processes in-place
5. Worker returns the buffer via `returnBuffers` message
6. Main thread pushes it back into the pool

**Guard:** If `fftSize` changes mid-stream, in-flight buffers become the wrong size. The pool checks `buffer.length === poolFftSizeRef.current` before recycling — wrong-size buffers are dropped.

**Files:** `hooks/useDSPWorker.ts` (pool management), `lib/dsp/dspWorker.ts` (worker side)

### 3.4 Layered settings

Settings are composed from 6 layers, each representing a different source of truth:

```
Layer 1: Mode baseline         (frozen detector policy for the operation mode)
Layer 2: Environment offsets   (relative threshold adjustments for room type)
Layer 3: Live operator overrides (sensitivity, gain, focus range — user knobs)
Layer 4: Diagnostics overrides (expert-only field replacements)
Layer 5: Display preferences   (UI-only, no DSP impact)
Layer 6: Mic calibration       (mic profile corrections)
```

The `deriveDetectorSettings()` function in `lib/settings/deriveSettings.ts` is **pure** — no side effects, no state reads. It takes all 6 layers as arguments and returns a flat `DetectorSettings` object. This makes it testable and safe to call in React render (via `useMemo`).

**Persistence:** Four `dwa-v2-*` localStorage keys managed by `lib/storage/settingsStorageV2.ts`:

| Key | Contents |
|---|---|
| `dwa-v2-session` | Active layered state (mode + env + live + diagnostics + mic) |
| `dwa-v2-display` | Display preferences (separate lifecycle from rig state) |
| `dwa-v2-presets` | Structured rig presets (`RigPresetV1[]`) |
| `dwa-v2-startup` | Which preset to auto-load on launch |

**Files:** `hooks/useLayeredSettings.ts`, `lib/settings/deriveSettings.ts`, `lib/settings/defaults.ts`, `lib/settings/modeBaselines.ts`, `lib/settings/environmentTemplates.ts`, `lib/storage/settingsStorageV2.ts`

### 3.5 MSD pool

Magnitude Slope Deviation (DAFx-16, Aalto 2016) is the primary feedback detector. It needs per-bin frame history to compute slope stability — but allocating history for all 4096 bins would use ~1MB.

**Solution:** Sparse `MSDPool` — 256 slots × 64 frames = **64KB**. Only bins that are active peaks get slots. LRU eviction removes the oldest inactive slot when the pool is full. Emergency prune removes all inactive entries if the pool is full and all slots are active.

**Files:** `lib/dsp/msdPool.ts`, `lib/dsp/feedbackDetector.ts` (uses the pool)

### 3.6 Canvas rendering pattern

Canvas functions are **pure** — they take `ctx`, dimensions, and data as parameters. They have no React dependencies.

**Theme handling:** Canvas can't read CSS `var()` directly. Instead, a `canvasThemeRef` (React ref, not state) is updated when the theme changes. The `requestAnimationFrame` loop reads `canvasThemeRef.current` on every frame — no re-render needed to pick up theme changes.

**Performance:**
- 30fps default (sufficient for spectrum viz)
- Grid lines cached as `Path2D` objects
- Log-scale math hoisted outside drawing loops
- `EXP_LUT` (1301-entry precomputed dB-to-linear table) used instead of `Math.pow()` in hot loops

**Files:** `lib/canvas/spectrumDrawing.ts`, `components/analyzer/SpectrumCanvas.tsx`

---

## 4. Project Structure

### Core application

```
app/                              # Next.js App Router
  layout.tsx                      #   Root layout, Geist fonts, metadata
  page.tsx                        #   Entry → AudioAnalyzerClient
  global-error.tsx                #   Sentry error boundary
  sw.ts                           #   Serwist service worker source
  api/v1/ingest/route.ts          #   Spectral snapshot ingest (rate-limited, IP-stripped)
  api/geo/route.ts                #   GDPR geo check (returns { isEU: boolean })
  api/companion/proxy/route.ts    #   SSRF-protected fetch proxy for Companion
  api/companion/relay/[code]/route.ts  # Pairing-code relay for Companion

components/
  analyzer/ (28+ files)           # Domain UI components
    AudioAnalyzer.tsx             #   Root orchestrator (wires providers, callbacks)
    AudioAnalyzerClient.tsx       #   Dynamic import wrapper ('use client')
    HeaderBar.tsx                 #   Header (zero props, signal tint, Clear All)
    DesktopLayout.tsx             #   3-panel desktop layout
    MobileLayout.tsx              #   Mobile portrait/landscape layouts
    SpectrumCanvas.tsx            #   RTA canvas (room modes, notch overlays, markers)
    IssuesList.tsx                #   Advisory card list (orchestrator)
    IssueCard.tsx                 #   Individual advisory card (swipe gestures, 3s stability)
    RingOutWizard.tsx             #   Guided ring-out workflow
    settings/ (8 files)           #   4-tab settings: Live, Setup, Display, Advanced, etc.
    help/ (6 files)               #   Help tab components (accordion pattern)
  ui/ (24 files)                  # shadcn/ui primitives (New York style)

contexts/ (9 files)               # React context providers (see Section 3.1)

hooks/ (18 files)                 # Custom hooks
  useAudioAnalyzer.ts             #   Master orchestrator hook
  useDSPWorker.ts                 #   Worker lifecycle + backpressure
  useLayeredSettings.ts           #   6-layer settings composition
  useAdvisoryMap.ts               #   Advisory stream → card props
  useDataCollection.ts            #   Consent + ML snapshot upload
  useSignalTint.ts                #   Signal-responsive CSS tinting
  useSwipeGesture.ts              #   Mobile swipe detection
  useCalibrationSession.ts        #   Room response measurement + export
  usePA2Bridge.ts                 #   PA2 device integration (MIDI/serial)
```

### DSP engine

All 22 modules in `lib/dsp/`:

| Module | Role |
|---|---|
| `feedbackDetector.ts` (1527 lines) | Main-thread hot path: peak detection, MSD, auto-gain, persistence |
| `dspWorker.ts` (~745 lines) | Worker orchestrator: message dispatch, temporal smoothing |
| `workerFft.ts` (~389 lines) | Radix-2 FFT, AlgorithmEngine, phase extraction |
| `classifier.ts` (~850 lines) | 11-feature Bayesian classification + multiplicative gates |
| `fusionEngine.ts` (~500 lines) | Core fusion, MINDS calibration, agreement persistence tracking |
| `trackManager.ts` (~466 lines) | Track lifecycle, cents-based association (100-cent tolerance) |
| `eqAdvisor.ts` (~402 lines) | GEQ/PEQ/shelf recommendations, ERB scaling |
| `advisoryManager.ts` (~292 lines) | 3-layer dedup, band cooldown, memory bounds (max 200) |
| `msdPool.ts` (~267 lines) | Sparse MSD pool (256 slots, 64 frames, LRU eviction) |
| `combPattern.ts` (~300 lines) | Comb filter detection, CombHistoryCache, CombStabilityTracker |
| `acousticUtils.ts` (~1085 lines) | Room modes, Schroeder, RT60, vibrato, cumulative growth |
| `feedbackHistory.ts` (~467 lines) | Session history, repeat offenders, hotspot tracking |
| `phaseCoherence.ts` (~129 lines) | Phase coherence via circular statistics |
| `compressionDetection.ts` (~161 lines) | Spectral flatness, crest factor, kurtosis |
| `spectralAlgorithms.ts` (~250 lines) | IHR, PTMR, content type detection |
| `mlInference.ts` (~180 lines) | ONNX Runtime Web inference, `predictCached()`, lazy loading |
| `decayAnalyzer.ts` (~86 lines) | RT60 decay comparison for room mode suppression |
| `severityUtils.ts` (~18 lines) | Severity urgency mapping |
| `advancedDetection.ts` (~16 lines) | Barrel re-export |
| `msdAnalysis.ts` (~170 lines) | [DEPRECATED] Worker-side MSD |
| `constants/` (6 files) | All tuning constants split by domain |

### Constants architecture

Constants live in `lib/dsp/constants/` and are split by domain:

| File | Contents |
|---|---|
| `musicConstants.ts` | ISO bands, pitch reference, `EXP_LUT` |
| `acousticConstants.ts` | Schroeder frequency, room estimation, frequency bands |
| `calibrationConstants.ts` | A-weighting, mic profiles (ECM8000, RTA-M, MEMS) |
| `detectionConstants.ts` | MSD, persistence, severity, gates, algorithm settings |
| `presetConstants.ts` | 8 operation modes, `DEFAULT_SETTINGS`, room presets |
| `uiConstants.ts` | Canvas colors, EQ presets, ERB, mobile settings |

Imported via barrel: `import { DEFAULT_SETTINGS, MSD_SETTINGS } from './constants'`

### Types

| File | Contents |
|---|---|
| `types/advisory.ts` | Core DSP interfaces: `Advisory`, `DetectorSettings`, `Track`, `DetectedPeak`, etc. |
| `types/settings.ts` | Layered settings: `ModeBaseline`, `LiveOverrides`, `DisplayPrefs`, `DwaSessionState` |
| `types/calibration.ts` | Room profile, calibration export types |
| `types/data.ts` | Consent, snapshot, worker message types, `MarkerAlgorithmScores` |

### Adjacent (non-core) areas

| Directory | Purpose | When to touch |
|---|---|---|
| `companion-module/` | Bitfocus Companion integration module | Only for Companion feature work |
| `companion-module-dbx-driverack-pa2/` | DBX PA2 hardware integration | Only for PA2 feature work |
| `autoresearch/` | Research tooling scripts | Only for ML/research work |
| `docs/` | Project documentation | When documenting changes |
| `.claude/` | AI assistant hooks and settings | Only for CI/hook changes |
| `scripts/ml/` | ML training pipeline | Only for model retraining |

---

## 5. Development Workflow

### Source of truth by change type

Before editing, know which layer owns the behavior:

| Change type | Start here | Then check |
|---|---|---|
| UI/layout | `components/analyzer/AudioAnalyzer.tsx` | `DesktopLayout.tsx`, `MobileLayout.tsx`, `SpectrumCanvas.tsx` |
| Settings | `hooks/useLayeredSettings.ts` | `lib/settings/deriveSettings.ts`, `lib/storage/settingsStorageV2.ts` |
| DSP (main thread) | `lib/dsp/feedbackDetector.ts` | `lib/audio/createAudioAnalyzer.ts` |
| DSP (worker) | `lib/dsp/dspWorker.ts` | `classifier.ts`, `fusionEngine.ts`, `eqAdvisor.ts`, `trackManager.ts` |
| Canvas drawing | `lib/canvas/spectrumDrawing.ts` | `components/analyzer/SpectrumCanvas.tsx` |
| API | `app/api/**/route.ts` | `middleware.ts` for CSP/headers |
| State/context | `contexts/*.tsx` | `hooks/useAudioAnalyzer.ts` |
| Storage | `lib/storage/settingsStorageV2.ts` | `lib/storage/dwaStorage.ts` |

### Hot path rules

`FeedbackDetector.analyze()` runs every **20ms** (50fps). Every microsecond matters:

- **No allocations** — use pre-allocated `Float32Array` buffers, MSD pool slots, and module-level caches
- **No `console.log`** — even guarded logging adds measurable overhead at 50fps
- **Use `EXP_LUT`** — 1301-entry precomputed dB-to-linear table instead of `Math.pow()` in hot loops
- **Skip early** — bins 12dB below threshold skip the LUT entirely
- **Prefix sum for O(1) prominence** — `Float64Array` prefix sum for neighborhood averaging

### Core invariant

> **DoneWell Audio analyzes audio only. It never modifies or outputs audio.**

Every feature proposal must pass this test. If it would alter the audio signal, it doesn't belong.

### Code conventions

| Convention | Rule |
|---|---|
| Imports | Always `@/*` path alias |
| Components | PascalCase, `memo()`, `'use client'` directive |
| Hooks | `use` prefix, camelCase |
| Constants | `SCREAMING_SNAKE_CASE` in `lib/dsp/constants/` |
| Types | PascalCase interfaces in `types/*.ts` |
| Private members | `_prefixed` |
| TypeScript | Strict mode, zero `any` (enforced by ESLint `@typescript-eslint/no-explicit-any: error`) |
| JSDoc | Required on all DSP functions, include academic references |
| Styling | Tailwind utilities + `cn()` from `lib/utils.ts` |
| Canvas functions | Pure (no React deps), take ctx + dimensions + data as params |

### Verification gate

After every change, run:

```bash
npx tsc --noEmit && pnpm test
```

Full pre-commit pass (what CI runs):

```bash
npx tsc --noEmit
pnpm lint
pnpm test
pnpm build
```

### Change Impact Audit (CIA)

Every non-trivial change requires a Change Impact Audit before committing. This is enforced by:
- **CI:** `ci.yml` warns if commit/PR body is missing `CHANGE:`/`CLASSIFICATION:`/`Verdict:` markers
- **Local hooks:** `.claude/hooks/pre-commit-gate.js` blocks `git commit` without a CIA audit file

The audit covers 16 systems (DSP, Audio Pipeline, Worker, React State, UI, Canvas, Settings, PWA, Security, API, Testing, Build/CI, Accessibility, Performance, ML, Data/Privacy).

For trivial changes (typo, comment), a one-liner suffices:
```
CHANGE: Fixed typo | CLASSIFICATION: NEUTRAL | Verdict: Text-only, no logic impact.
```

---

## 6. Testing Approach

### Runner and configuration

- **Runner:** Vitest
- **Config:** `vitest.config.ts`
- **Default environment:** `node` (not jsdom)
- **Coverage provider:** V8
- **Thresholds:** lines 80%, functions 80%, branches 70%

### Test locations

| Location | What it tests |
|---|---|
| `lib/dsp/__tests__/` (22 files) | DSP unit tests (detector, fusion, classifier, comb, MSD, etc.) |
| `lib/canvas/__tests__/` | Canvas drawing functions |
| `lib/storage/__tests__/` | `dwaStorage` abstraction |
| `lib/data/__tests__/` | Data collection, snapshot collector |
| `lib/export/__tests__/` | Export modules (txt, pdf, downloadFile) |
| `lib/settings/__tests__/` | Settings derivation and defaults |
| `hooks/__tests__/` (7 files) | Hook unit tests (advisoryMap, fpsMonitor, layeredSettings, etc.) |
| `contexts/__tests__/` (2 files) | Context unit tests (AdvisoryContext, UIContext) |
| `tests/dsp/` (7 files) | Integration/scenario tests (~135 tests) |
| `app/api/v1/ingest/__tests__/` | API route tests |

### Test types

| Type | Example | What it does |
|---|---|---|
| **Unit** | `lib/dsp/__tests__/classifier.test.ts` | Tests a single module with mock inputs |
| **Behavioral/runtime** | `lib/dsp/__tests__/feedbackDetector.hotpath.test.ts` | Tests real execution paths with timing |
| **Source-audit** | `hooks/__tests__/useDSPWorker.test.ts` | Reads source code and asserts guardrails exist |
| **Scenario/regression** | `tests/dsp/algorithmFusion.test.ts` | Synthetic audio scenarios testing classification outcomes |
| **API route** | `app/api/v1/ingest/__tests__/route.test.ts` | Tests HTTP endpoints with mock requests |

### Coverage exclusions

| Excluded file | Reason |
|---|---|
| `lib/dsp/dspWorker.ts` | Worker message dispatch is hard to isolate in unit tests — tested via integration |
| `contexts/PortalContainerContext.tsx` | Trivial provider (just creates a context with a ref) |

### Running tests

```bash
pnpm test                    # Run all tests
pnpm test:watch              # Watch mode
pnpm test:coverage           # With V8 coverage report

# Target a specific file:
pnpm test -- lib/dsp/__tests__/feedbackDetector.test.ts
```

### Writing new tests

- For tests needing browser APIs (DOM, localStorage, etc.), add the file pragma:
  ```ts
  // @vitest-environment jsdom
  ```
- Mock builders live in `tests/helpers/` — use `makeTrack()`, `makePeak()`, `makeClassification()`, `makeSettings()` instead of constructing test data by hand
- DSP regression tests go in `tests/dsp/` — useful when changing fusion/classification heuristics
- Source-audit tests go alongside the module in `__tests__/` — they read file content and assert patterns (e.g., "backpressure guard exists")

### Known skipped tests

`tests/dsp/algorithmFusion.test.ts` contains `describe.skip('Proposed V2 Weights - Regression Tests', ...)` — these are intentionally skipped pending weight finalization.

---

## 7. Common Troubleshooting

### Microphone will not start

**Check:**
1. Are you on `http://localhost` or HTTPS? (`getUserMedia` requires secure origin)
2. Has the browser denied microphone permission?
3. Is another app already using the microphone?

**Code:** `components/analyzer/AudioAnalyzer.tsx` has `getErrorGuidance()` which maps common mic failure messages to user-facing hints.

### Works in dev but fails in production

**Reproduce:**
```bash
pnpm build && pnpm start
```

**Common causes:**
- Serwist service worker is disabled in dev but active in production
- CSP is relaxed in dev (`unsafe-inline`) but nonce-based in production (`middleware.ts`)
- Turbopack (dev) and Webpack (prod) resolve imports differently

**Check:** `next.config.mjs`, `middleware.ts`, `app/sw.ts`

### Worker errors, stale advisories, or dropped updates

**Start here:** `hooks/useDSPWorker.ts`

**What to check:**
- `busyRef` backpressure — is the worker stuck processing?
- `pendingPeakRef` buffer — is the latest peak being sent after backpressure clears?
- Crash detection — `crashedRef` set after 3 failed auto-restarts
- Worker soft errors surface as non-fatal amber warnings in the UI

**Monitoring:** `hooks/useFpsMonitor.ts` tracks canvas frame rate + dropped frames.

### Worker crash loop (stuck analysis)

**Symptoms:** Analysis starts but immediately stops. UI shows worker error badge repeatedly.

**Cause:** The worker threw an unrecoverable error (e.g., invalid settings, FFT size mismatch). `useDSPWorker` retries 3 times with 500ms debounce, then sets `crashedRef = true`.

**Fix:**
1. Check browser console for the worker error message
2. Clear localStorage (settings may be corrupted — see below)
3. Reload the page
4. If persistent, check `dspWorker.ts` `onmessage` switch for missing message type handling

### Settings feel corrupted or layout is stuck

**Storage keys (all in localStorage):**
- `dwa-v2-session` — layered settings state
- `dwa-v2-display` — display preferences
- `dwa-v2-presets` — rig presets
- `dwa-v2-startup` — startup preference
- `react-resizable-panels:*` — panel layout

**Recovery — paste in browser console:**
```js
Object.keys(localStorage).filter(k => k.startsWith('dwa-v2-') || k.startsWith('react-resizable-panels')).forEach(k => localStorage.removeItem(k));
location.reload();
```

### Snapshot ingest or consent flow failing

**Check:**
- `app/api/v1/ingest/route.ts` — accepts payload but does not store without `SUPABASE_INGEST_URL`
- `app/api/geo/route.ts` — reads Vercel `x-vercel-ip-country` header (only works on Vercel)
- `hooks/useDataCollection.ts` — consent state and upload logic

**Note:** If `SUPABASE_INGEST_URL` is unset, the ingest endpoint accepts requests but discards them silently. This is intentional for local development.

### ONNX / ML model loading issues

**Check:** `lib/dsp/mlInference.ts`, `next.config.mjs`

The ONNX import uses a `webpackIgnore` comment (string-concatenated dynamic import) to avoid Turbopack static analysis warnings. If model loading breaks:
1. Test both `pnpm dev` and `pnpm build && pnpm start` — behavior differs
2. Clear `.next/` before re-testing: `rm -rf .next`
3. Check `public/models/manifest.json` — model path and version must match

### Tests fail because DOM APIs are missing

The default Vitest environment is `node`. If a test needs `window`, `document`, `localStorage`, etc., add the file pragma:

```ts
// @vitest-environment jsdom
```

Examples already using it: `hooks/__tests__/useDSPWorker.test.ts`, `contexts/__tests__/UIContext.test.ts`, `lib/storage/__tests__/dwaStorage.test.ts`

### Windows build crash (md4 / WASM)

**Symptom:** `pnpm build` fails with OpenSSL / md4 / WASM errors on Windows.

**Fix:** Already handled in `next.config.mjs`:
```js
config.output.hashFunction = 'sha256'
```

If you still hit it, ensure you're on Node 22 (not 18) and that `next.config.mjs` hasn't been modified.

### Stale service worker serving old content

**Symptom:** After deploying, users see old UI or behavior even after refresh.

**Cause:** Serwist generates a precache manifest. The service worker may serve stale assets until it updates.

**Fix in development:** Service worker is disabled in dev (`@serwist/next` `disable: true` when `NODE_ENV === 'development'`). If you accidentally built with `pnpm build` and a SW was registered:
1. Open DevTools → Application → Service Workers → Unregister
2. Clear cache storage
3. Hard refresh

### CSP blocking scripts in production

**Symptom:** Console shows `Refused to execute inline script` errors only in production.

**Cause:** `middleware.ts` generates a per-request nonce for `script-src`. If a script doesn't have the nonce attribute, it's blocked.

**Check:**
- `app/layout.tsx` — uses `suppressHydrationWarning` on `<html>` and `<body>` to prevent nonce mismatch (browsers strip nonce from DOM)
- `middleware.ts` — verify the nonce is being set correctly
- Third-party scripts must be loaded via `next/script` with the nonce

### Doc version numbers disagree

This is currently expected. When counts or versions disagree, trust this order:

1. Live code and test output
2. `package.json`
3. `.github/workflows/ci.yml`
4. `vitest.config.ts`
5. `repomix-output.xml`
6. Older docs in `docs/`

---

## 8. Contributing

### CI pipeline

Every push and PR runs this pipeline (`.github/workflows/ci.yml`):

```
pnpm audit --prod      # Security audit (high severity)
npx tsc --noEmit       # Type check
pnpm lint              # ESLint (flat config)
pnpm test              # Vitest (1080 tests)
pnpm build             # Production build (webpack + Serwist + Sentry)
du -sh .next/static/chunks/   # Bundle size report
```

CI also checks for Change Impact Audit markers in the commit message or PR body.

### Versioning

Format: `0.{PR_NUMBER}.0` on PR merge, patch increment on direct push. Both auto-versioned with `[skip ci]`.

The version flows: `package.json` → `next.config.mjs` → `NEXT_PUBLIC_APP_VERSION` → UI.

### Git workflow

- Commit locally — always safe
- Push feature branches and open PRs — Claude can do this when asked
- **Never merge on GitHub** — Don merges PRs manually
- **Never force-push main** — branch rulesets prevent it
- Always `git fetch origin` before reporting version/branch status

### Code review expectations

- Every non-trivial PR includes a Change Impact Audit in the PR body
- All CI checks must pass (audit, tsc, lint, test, build)
- Canvas changes require visual verification in the browser
- DSP changes should include regression test scenarios if heuristics changed

---

## Further Reading

| Document | Purpose |
|---|---|
| `CLAUDE.md` | Project intelligence — authoritative rules, architecture, conventions |
| `docs/API_DOCUMENTATION.md` | HTTP API reference for all 5 route handlers |
| `docs/TECHNICAL_REFERENCE.md` | Deep technical reference |
| `docs/BEGINNER-GUIDE.md` | Non-technical introduction |
| `docs/INTEGRATIONS.md` | Companion module and PA2 integration |
| `docs/KNOWN_ISSUES.md` | Current known issues tracker |
| `docs/BUG_BIBLE.md` | Historical bug tracking and lessons learned |

If you need a single-file audit artifact for external review or AI analysis, use `repomix-output.xml`. For code changes, work against the real repository tree.
