# Kill The Ring — Pre-Release Audit & Strategic Roadmap

> **Version:** 1.0 | **Date:** 2026-03-14 | **App Version:** 0.95.0
> **Auditor:** Claude Opus 4.6 (Claude Code) | **Scope:** Full codebase, DSP engine, architecture, market, strategy

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Codebase Audit](#2-codebase-audit)
3. [DSP & Detection Engine Analysis](#3-dsp--detection-engine-analysis)
4. [Feature Gap Analysis](#4-feature-gap-analysis)
5. [Feature Roadmap](#5-feature-roadmap)
6. [Market Analysis & Competitive Landscape](#6-market-analysis--competitive-landscape)
7. [Strategic Recommendations](#7-strategic-recommendations)
8. [Risk Assessment](#8-risk-assessment)
9. [Appendix: File-by-File Audit Notes](#9-appendix-file-by-file-audit-notes)

---

## 1. Executive Summary

Kill The Ring is a **genuinely impressive** pre-release project. For an early-development PWA, it has:

- **326 passing tests** across 14 test files with strong coverage metrics
- **7-algorithm fusion engine** grounded in peer-reviewed academic research (DAFx-16, KU Leuven 2025, Carl Hopkins 2007)
- **Multi-AI validation** — fusion weights stress-tested by Gemini Ultra, ChatGPT 5.4, and Claude
- **Production-grade infrastructure** — Sentry error reporting, PWA with offline support, automated CI/CD with semantic versioning
- **Clean architecture** — well-separated concerns (3 React contexts, Web Worker for DSP, barrel exports, typed localStorage)

### What's Working Well

| Area | Grade | Notes |
|------|-------|-------|
| DSP algorithm quality | **A** | Academic-grade, 7-algorithm fusion, content-adaptive |
| Test infrastructure | **A-** | 326 tests, V8 coverage, multi-model consensus scenarios |
| Architecture | **A-** | Clean separation, Web Worker offloading, typed contexts |
| Build/CI pipeline | **A** | tsc + lint + test + build gate, auto-versioning |
| Security | **B+** | CSP headers, Sentry, no PII in data collection |
| Code quality | **B+** | Strict TypeScript, centralized constants, zero FIXME/HACK |
| Performance | **B** | LUT optimization, preallocated buffers, some room for improvement |
| Mobile experience | **B-** | Functional but opportunities for polish |
| Test coverage depth | **B-** | Core algorithms at 86-100%, but feedbackDetector at 12.7% |
| Documentation | **B** | CLAUDE.md is excellent, but no user-facing docs |

### What Needs Work Before Public Launch

1. **Test coverage gaps** in core integration points (feedbackDetector, classifier, dspWorker)
2. **One pre-existing algorithm bug** (broad peak spectral flatness calculation)
3. **No onboarding flow** for new users
4. **No session recording** — analysis is ephemeral
5. **No user accounts** — needed for cloud features and monetization
6. **Missing i18n** — limits addressable market
7. **No real-audio test fixtures** — all tests use synthetic data

---

## 2. Codebase Audit

### 2.1 Bugs & Defects

#### BUG-001: Spectral Flatness Calculation for Broad Peaks
- **File:** `lib/dsp/compressionDetection.ts`
- **Test:** `tests/dsp/compressionDetection.test.ts:51`
- **Issue:** Broad peak flatness calculation returns 0.035 when expected >0.2
- **Impact:** Could cause false negatives for compression detection on wide-band feedback
- **Status:** Marked as `it.todo()` — known but unfixed
- **Recommendation:** Investigate the Wiener entropy formula for wide spectral peaks vs narrow peaks. The current formula may over-penalize broad energy distributions.

#### BUG-002: FUTURE-002 Incomplete Implementation
- **Files:** `lib/dsp/feedbackDetector.ts` (lines 54, 103, 281, 567, 1722), `lib/dsp/constants.ts:782`
- **Issue:** Frame-rate-independent persistence scoring is partially implemented. Thresholds are computed from ms constants but the conversion path has unfinished sections.
- **Impact:** Persistence scoring may behave differently at different analysis intervals (e.g., 20ms vs 40ms on mobile)
- **Recommendation:** Complete the ms-to-frames conversion in `recomputePersistenceThresholds()` and add parameterized tests at 20ms, 33ms, and 40ms intervals.

### 2.2 Test Coverage Analysis

| File | Tests | Coverage | Assessment |
|------|-------|----------|------------|
| `algorithmFusion.test.ts` (unit) | 48 | 86.6% | **Good** — comprehensive fusion scenarios |
| `algorithmFusion.test.ts` (integration) | 46 | N/A | **Good** — multi-model vulnerability scenarios |
| `algorithmFusion.gpt.test.ts` | 12 | N/A | **Good** — GPT-4 edge cases |
| `algorithmFusion.chatgpt.test.ts` | 13 | N/A | **Good** — ChatGPT consensus |
| `algorithmFusion.chatgpt-context.test.ts` | 21 | N/A | **Good** — context-aware scenarios |
| `eqAdvisor.test.ts` | 51 | 87.2% | **Good** — ERB, snapping, recommendations |
| `feedbackDetector.test.ts` | 19 | 12.7% | **Needs work** — only bin/freq conversion + config tested |
| `classifier.test.ts` | 25 | 43.7% | **Needs work** — main paths tested, edge cases missing |
| `compressionDetection.test.ts` (unit) | 16 | 100% | **Excellent** |
| `compressionDetection.test.ts` (integration) | 16 | N/A | **Good** — 1 known failure |
| `phaseCoherence.test.ts` (unit) | 12 | 100% | **Excellent** |
| `phaseCoherence.test.ts` (integration) | 13 | N/A | **Good** |
| `msdConsistency.test.ts` | 24 | 100% | **Excellent** |
| `msdAnalysis.test.ts` | 15 | N/A | **Good** |

**Coverage gaps requiring attention:**

1. **`feedbackDetector.ts`** — The core class (`FeedbackDetector`) has `start()`, `stop()`, `analyze()`, noise floor tracking, auto-gain control, and peak detection — none of which are unit tested. The 12.7% coverage comes from testing helper functions (bin↔frequency conversion, constructor defaults). **Recommendation:** Create mock `AudioContext`, `AnalyserNode`, and `MediaStream` objects to test the analyze loop without browser APIs.

2. **`classifier.ts`** — At 43.7%, the classification logic (Bayesian prior, feature weighting, acoustic corrections) has significant untested paths. **Recommendation:** Add tests for edge cases: very low frequencies near room modes, very high frequencies with air absorption, tracks near Schroeder frequency boundary, modal overlap classification transitions.

3. **`dspWorker.ts`** — Excluded from coverage entirely. The orchestrator handles message dispatch, classification temporal smoothing (ring-buffer majority vote), and fusion config management. **Recommendation:** Test the worker's message handling logic in isolation (extract pure functions from the `onmessage` handler).

4. **No E2E tests** — The full pipeline from microphone input through FFT, worker processing, advisory generation, and UI rendering is untested. **Recommendation:** Add Playwright tests with mock audio using `AudioContext.createOscillator()` to simulate feedback tones.

5. **No real audio fixtures** — All 326 tests use synthetically generated data. Real-world feedback has characteristics (room reflections, multiple simultaneous frequencies, varying amplitude) that synthetic tests don't capture. **Recommendation:** Record WAV files of known feedback, music, and speech. Create a test harness that feeds these through the detection pipeline and validates classification.

### 2.3 Security Audit

| # | Finding | Severity | File | Status |
|---|---------|----------|------|--------|
| 1 | CSP uses `'unsafe-inline'` in production | Low-Medium | `next.config.mjs` | Next.js requires this for styled-jsx; mitigated by other headers |
| 2 | In-memory rate limiting resets on cold start | Low | `app/api/v1/ingest/route.ts` | Acceptable for serverless; session-scoped (6 req/60s) |
| 3 | No CORS restriction on ingest endpoint | Low | `app/api/v1/ingest/route.ts` | Next.js API routes default to same-origin; add explicit CORS headers |
| 4 | Supabase service key in env (not hardcoded) | Info | `app/api/v1/ingest/route.ts` | Correct pattern — key in env, not in code |
| 5 | Worker `postMessage` — verify transferable usage | Low | `lib/dsp/dspWorker.ts` | `returnBuffers` message suggests partial implementation |
| 6 | `eval()` not used anywhere | Pass | Project-wide | Confirmed clean |
| 7 | No SQL/NoSQL injection vectors | Pass | Project-wide | Client-side app, localStorage only |
| 8 | No external script loading | Pass | CSP headers | `script-src 'self'` enforced |
| 9 | Microphone-only permissions policy | Pass | `next.config.mjs` | `Permissions-Policy: microphone=self` |
| 10 | No PII in data collection | Pass | `lib/data/`, `types/data.ts` | Session IDs are random UUIDs, IP stripped |

**Overall security posture: Good for a pre-release client-side app.** The main risk vectors are minimal since the app processes audio locally and only optionally sends anonymized spectral data.

### 2.4 Performance Audit

#### Strengths
- **EXP_LUT** — Precomputed dB→power lookup table (4KB, L1 cache fit) replaces `Math.exp()` in the hot loop
- **Preallocated `Float32Array` buffers** — No GC pressure in the analysis loop
- **Web Worker offloading** — DSP runs off main thread, UI stays at 60fps
- **Mobile performance preset** — `MOBILE_ANALYSIS_INTERVAL_MS = 40` (25fps) halves CPU cost
- **Dynamic import for jsPDF** — Heavy PDF library loaded only when exporting
- **Pooled memory for MSD** — 64KB vs 1MB without pooling

#### Improvement Opportunities

| # | Optimization | Impact | Effort |
|---|-------------|--------|--------|
| 1 | **Verify transferable `Float32Array`** in all `postMessage` calls | Medium — avoids expensive copies | Low |
| 2 | **`OffscreenCanvas` in worker** for spectrum rendering | Medium — frees main thread entirely | Medium |
| 3 | **`React.lazy()` for settings tabs** — already used for dialogs | Low — reduces initial bundle | Low |
| 4 | **Add `@next/bundle-analyzer`** to identify large chunks | Diagnostic | Low |
| 5 | **SharedArrayBuffer** for spectrum data (avoid any copy) | High — zero-copy worker↔main | High (COOP/COEP headers) |
| 6 | **WASM-compiled FFT** (e.g., KissFFT via Emscripten) | Medium — faster than JS FFT | High |
| 7 | **Temporal batching** — send multiple peaks per `postMessage` | Low — reduces message overhead | Low |

### 2.5 Code Quality Notes

#### Strengths
- **Zero `FIXME`/`HACK`/`XXX`/`TEMP` comments** in the entire codebase
- **Only 1 `TODO`** (the known spectral flatness bug)
- **6 `FUTURE-002` markers** — well-tracked enhancement
- **Consistent coding style** — PascalCase components, camelCase functions, SCREAMING_SNAKE constants
- **Academic references** in test files — DAFx-16, KU Leuven 2025, Carl Hopkins 2007
- **No `@ts-ignore` or `@ts-expect-error`** suppressions found
- **`@typescript-eslint/no-explicit-any` set to error** — enforced project-wide

#### Minor Issues
- **No `pnpm typecheck` convenience script** — CI runs `npx tsc --noEmit` but there's no local equivalent in `package.json`
- **Image optimization disabled** (`unoptimized: true` in `next.config.mjs`) — acceptable if no raster images are used, but worth re-evaluating
- **React 19 experimental rules downgraded to warn** — `set-state-in-effect`, `refs`, `purity` rules could catch subtle bugs but may also false-positive on legitimate patterns

### 2.6 Architecture Audit

#### Component Structure (29 components)

```
components/kill-the-ring/
  KillTheRing.tsx              — Root orchestrator
  KillTheRingClient.tsx        — Client-side wrapper (use client)
  SpectrumCanvas.tsx           — Main spectrum visualization (canvas)
  GEQBarView.tsx               — Graphic EQ bar overlay
  IssuesList.tsx               — Active advisory list
  EarlyWarningPanel.tsx        — Pre-feedback warnings
  FeedbackHistoryPanel.tsx     — Historical feedback events
  AlgorithmStatusBar.tsx       — Fusion algorithm status display
  DetectionControls.tsx        — Start/stop, mode selection
  HeaderBar.tsx                — App header with controls
  HelpMenu.tsx                 — Help/about dropdown
  InputMeterSlider.tsx         — Audio input level meter
  VerticalGainFader.tsx        — Gain control fader
  MissedFeedbackButton.tsx     — Manual feedback annotation
  OnboardingOverlay.tsx        — First-run tutorial overlay
  DataConsentDialog.tsx        — Data collection consent
  ResetConfirmDialog.tsx       — Settings reset confirmation
  FullscreenOverlay.tsx        — Fullscreen mode overlay
  ErrorBoundary.tsx            — Error boundary (Sentry)
  DesktopLayout.tsx            — Desktop layout (landscape:flex)
  MobileLayout.tsx             — Mobile layout (WAI-ARIA tabs)
  settings/
    DetectionTab.tsx           — Detection settings
    DisplayTab.tsx             — Display/visual settings
    RoomTab.tsx                — Room acoustics settings
    CalibrationTab.tsx         — Mic calibration settings
    AlgorithmsTab.tsx          — Algorithm tuning
    AdvancedTab.tsx            — Advanced/debug settings
    SettingsShared.tsx         — Shared settings utilities
  SettingsPanel.tsx            — Settings panel container
```

**Assessment:** Well-organized with appropriate granularity. The settings tabs are properly separated. The barrel export via `index.ts` keeps imports clean. All components use `memo()` wrapper per conventions. The mobile/desktop layout split is clean.

#### Context Architecture (4 contexts)

```
AudioAnalyzerContext   — Engine state, settings, spectrum data, device management
AdvisoryContext        — Advisory state, dismiss/clear/false-positive actions
UIContext              — Mobile tab, freeze, fullscreen, layout reset
PortalContainerContext — Portal mount point for mobile overlays
```

**Assessment:** Well-designed separation of concerns. No context does too much. The `AudioAnalyzerContext` is the most complex but appropriately so — it wraps the `useAudioAnalyzer` and `useAudioDevices` hooks. No prop drilling observed.

#### Hook Architecture (11 hooks)

```
useAudioAnalyzer.ts     — Core: manages FeedbackDetector lifecycle, settings, spectrum data
useAudioDevices.ts      — Device enumeration, selection, change handling
useDSPWorker.ts         — Web Worker lifecycle, message passing
useAdvisoryMap.ts       — Advisory state management (Map-based)
useAdvisoryLogging.ts   — Advisory event logging
useAnimationFrame.ts    — requestAnimationFrame loop manager
useCalibrationSession.ts — Calibration session data collection
useDataCollection.ts    — Anonymous spectral data collection
useFullscreen.ts        — Fullscreen API wrapper
useFpsMonitor.ts        — Frame rate monitoring
use-mobile.ts           — Mobile device detection
```

**Assessment:** Clean hook separation. Each hook has a single responsibility. The naming convention is consistent (`use` prefix, camelCase). The `useAudioAnalyzer` hook is the most complex — it coordinates the `FeedbackDetector` instance, settings synchronization, and spectrum data flow.

#### Worker Architecture

```
Main Thread                          Web Worker (dspWorker.ts)
───────────                          ─────────────────────────
FeedbackDetector                     ┌─ AlgorithmEngine (workerFft.ts)
  ↓ FFT data                        │    MSD, Phase, Amplitude analysis
  ↓ Detected peaks                  │
  → postMessage ──────────────────→  ├─ AdvisoryManager (advisoryManager.ts)
                                     │    Advisory lifecycle, dedup, pruning
  ← postMessage ←─────────────────  ├─ DecayAnalyzer (decayAnalyzer.ts)
  ↓                                  │    Room-mode decay analysis
React state update                   ├─ TrackManager (trackManager.ts)
  ↓                                  │    Track lifecycle management
Canvas render                        └─ Classifier + EQ Advisor
```

**Assessment:** Excellent architecture. The worker is a thin orchestrator (~430 lines post-refactor from 935 lines) that delegates to focused modules. Message types are fully typed with discriminated unions. The `returnBuffers` message enables transferable object reuse.

---

## 3. DSP & Detection Engine Analysis

### 3.1 Algorithm Stack

Kill The Ring uses a **7-algorithm weighted fusion** approach, which is significantly more sophisticated than any competitor:

| Algorithm | Source | What It Detects | Weight |
|-----------|--------|-----------------|--------|
| **MSD (Magnitude Slope Deviation)** | DAFx-16 paper | Temporal stability of spectral peaks — feedback has flat/rising MSD, music varies | Primary |
| **Phase Coherence** | KU Leuven 2025 | Constant phase relationship between frames — feedback is phase-locked | Primary |
| **Spectral Flatness** (Wiener entropy) | Standard DSP | Low flatness = tonal (feedback), high flatness = noise-like (music) | Secondary |
| **Comb Pattern Detection** | DBX paper | Evenly-spaced harmonic peaks from acoustic path length — feedback signature | Contextual |
| **Inter-Harmonic Ratio (IHR)** | Custom | Energy between harmonics vs at harmonics — feedback is clean, music is messy | Secondary |
| **Peak-to-Median Ratio (PTMR)** | Custom | Narrow spectral peak prominence — feedback creates sharp PTMR spikes | Secondary |
| **Compression Detection** | Custom | Spectral flatness + crest factor — detects compressed audio (adjusts thresholds) | Adaptive |

**Verdict system:** `FEEDBACK` | `POSSIBLE_FEEDBACK` | `NOT_FEEDBACK` | `UNCERTAIN`

### 3.2 Detection Strengths

1. **Content-adaptive thresholds** — The system detects whether input is speech, music, or compressed content and adjusts all algorithm parameters accordingly. This is critical for reducing false positives in music-heavy environments.

2. **Multi-algorithm consensus** — No single algorithm can reliably distinguish feedback from tonal music. The 7-algorithm fusion with weighted voting is the correct approach.

3. **Acoustic modeling** — The classifier uses Schroeder frequency calculation, modal overlap analysis, cumulative growth tracking, vibrato detection, reverberation Q adjustment, air absorption correction, and room mode proximity penalty. This level of acoustic modeling is absent from all competitors.

4. **ERB-aware EQ recommendations** — The EQ advisor uses Glasberg & Moore (1990) psychoacoustic bandwidth to scale notch depth by frequency — shallower at low frequencies (protect warmth), deeper at high frequencies (more transparent). No competitor does this.

5. **MINDS adaptive notch depth** — From the DAFx-16 paper, adapts notch filter depth based on MSD stability score rather than using fixed depths.

### 3.3 Detection Weaknesses & Gaps

#### GAP-001: No Temporal Envelope Analysis
- **Issue:** Feedback has a characteristic constant-amplitude or monotonically growing envelope. Music and speech have attack-decay-sustain-release patterns. The current system doesn't analyze the temporal amplitude envelope.
- **Impact:** Higher false positive rate on sustained tonal instruments (organ, synthesizer pads, brass)
- **Recommendation:** Add envelope follower with onset slope classification. Feedback onset is typically >10dB/s growth rate sustained over >200ms.

#### GAP-002: No Autocorrelation/Pitch Stability
- **Issue:** Feedback has extremely stable pitch (sub-cent variation). Vocal pitch varies by tens of cents. Instruments have vibrato. The current vibrato detection (4-8Hz, 20-100 cents) helps but doesn't fully exploit pitch stability.
- **Recommendation:** Implement YIN or pYIN autocorrelation-based pitch detection as a supplementary algorithm. Track pitch stability over sliding windows. Feedback should show <1 cent standard deviation over 500ms.

#### GAP-003: No Multi-Channel Correlation
- **Issue:** If multiple microphone inputs are available, feedback from the same PA system will appear at the same frequency across all channels simultaneously. Program audio (different instruments on different mics) will differ.
- **Impact:** Can't exploit the strongest feedback discriminator in multi-mic setups
- **Recommendation:** Add cross-channel spectral correlation analysis. Requires multi-input support (see Feature Roadmap).

#### GAP-004: No Harmonic Decay Rate Analysis
- **Issue:** Musical harmonics naturally decay in amplitude (~6dB/octave for most instruments). Feedback harmonics are flat or rising across the series.
- **Impact:** Harmonic instruments with strong fundamental may trigger false positives
- **Recommendation:** When harmonics are detected (already done via IHR), analyze the amplitude slope across the harmonic series. Flat/rising = feedback, decaying = music.

#### GAP-005: Onset Detection Not Used for Classification
- **Issue:** The system detects peak onset (tracked in `onsetDb`, `onsetTime`) but doesn't use onset characteristics for classification. Feedback ramps up gradually; transients and instruments have fast onsets.
- **Impact:** Missed discrimination signal
- **Recommendation:** Add onset slope classification: `velocityDbPerSec` already exists but isn't weighted in the fusion. Add it as a supplementary score.

#### GAP-006: No Room Impulse Response Estimation
- **Issue:** The comb pattern detector already estimates acoustic path length (`d = c / Δf`). This could be used to predict which frequencies are most likely to feed back based on room geometry.
- **Impact:** Can't proactively warn about potential feedback frequencies before they occur
- **Recommendation:** Build a room mode predictor from the comb pattern data. Display "at-risk frequencies" based on estimated room dimensions.

#### GAP-007: No Machine Learning Integration
- **Issue:** Rule-based algorithms have inherent limitations. A small ML model trained on labeled data could learn subtle patterns that rule-based systems miss.
- **Impact:** Detection accuracy ceiling
- **Recommendation:** Long-term: train a small CNN or random forest on the anonymized spectral data being collected (with consent). Run inference via ONNX.js in the Web Worker. Use as an additional fusion algorithm, not a replacement.

### 3.4 False Positive / False Negative Analysis

| Scenario | Current Behavior | Root Cause | Fix |
|----------|-----------------|------------|-----|
| **Solo organ note** | Possible false positive | Very stable pitch, high PTMR, low spectral flatness — looks like feedback | Temporal envelope analysis (GAP-001) |
| **Brass instrument sustain** | Possible false positive | High harmonicity, steady amplitude | Harmonic decay rate (GAP-004) |
| **Compressed pop music** | Generally handled well | Compression detection adapts thresholds | Continue tuning |
| **Multiple simultaneous feedback freqs** | Detected individually | Comb pattern may not trigger if frequencies aren't evenly spaced | Multi-peak correlation analysis |
| **Slowly building feedback** | Should detect well | Persistence scoring tracks growth | Verify onset detection (GAP-005) |
| **Feedback in reverberant room** | Good — reverberation Q adjustment applied | Acoustic utils handle this | No change needed |
| **Feedback near room modes** | Good — modal overlap classification | Room mode proximity penalty applied | No change needed |
| **Vocal vibrato** | Should reject — vibrato detection active | 4-8Hz modulation detection | Continue tuning depth thresholds |

### 3.5 Algorithm Parameter Tuning Recommendations

| Parameter | Current Value | Recommendation | Rationale |
|-----------|--------------|----------------|-----------|
| `LOW.prominenceMultiplier` | 1.15 | Consider 1.2 | Still getting some low-freq false positives |
| `HIGH.sustainMultiplier` | 0.8 | Good as-is | High-freq feedback builds fast |
| `PRIOR_PROBABILITY` | 0.33 | Consider venue-adaptive | Church vs concert venue vs conference have different base rates |
| `MODE_PRESENCE_BONUS` | 0.12 | Good as-is | Modal analysis contribution is well-calibrated |
| `MOBILE_ANALYSIS_INTERVAL_MS` | 40ms | Consider 33ms for modern phones | 30fps is smooth enough, 33ms is only 7ms more than 40ms |

---

## 4. Feature Gap Analysis

### 4.1 What Users Expect That's Missing

Based on competitor analysis and pro audio community forums:

| Expected Feature | Status | Priority |
|-----------------|--------|----------|
| Real-time feedback detection | **Present** | — |
| EQ recommendations | **Present** | — |
| Frequency identification | **Present** | — |
| Pitch translation (note names) | **Present** | — |
| Session history/recording | **Missing** | High |
| Multi-channel support | **Missing** | High |
| Mixer integration | **Missing** | Medium |
| Onboarding/tutorial | **Exists** (OnboardingOverlay.tsx) | Enhance |
| Export reports | **Present** (PDF, TXT, CSV, JSON) | — |
| Room profiles | **Partial** (calibration exists) | Enhance |
| Offline mode | **Present** (PWA/Serwist) | — |
| Dark/light theme | **Missing** | Medium |
| Spectral waterfall | **Missing** | Medium |
| User accounts | **Missing** | High (for monetization) |
| i18n (multi-language) | **Missing** | Medium |

### 4.2 What Competitors Have That Kill The Ring Doesn't

| Feature | Waves Feedback Hunter | Waves X-FDBK | dbx AFS2 | Kill The Ring |
|---------|----------------------|--------------|----------|---------------|
| Real-time detection | Setup only | Yes | Yes | **Yes** |
| Auto-EQ application | Yes | Yes | Yes | **No** (analysis only) |
| Plugin format (VST/AU) | Yes | Yes | N/A | **No** (PWA) |
| Hardware dedicated | No | No | Yes | **No** (any device) |
| Mobile support | No | No | No | **Yes** |
| Educational display | No | No | No | **Yes** |
| Multi-algorithm fusion | No | No | No | **Yes** |
| Academic DSP | Unknown | Unknown | Proprietary | **Yes** |
| Session recording | No | No | No | **No** |
| Price | $99-149 | $79-149 | $300+ | **Free (PWA)** |

### 4.3 Kill The Ring's Unique Advantages

1. **Zero-install PWA** — Works on any device with a browser, no plugin host needed
2. **Analysis-only approach** — Non-destructive, educational, shows the "why"
3. **Academic transparency** — Every algorithm cites its source paper
4. **7-algorithm fusion** — More sophisticated than any competitor
5. **Content-adaptive** — Detects music/speech/compressed and adjusts
6. **Cross-platform** — Phone, tablet, laptop, desktop
7. **Free tier** — No barrier to entry

---

## 5. Feature Roadmap

### Phase 1: Pre-Launch Essentials (v1.0)

| # | Feature | Effort | Impact | Dependencies |
|---|---------|--------|--------|-------------|
| 1.1 | **Complete FUTURE-002** — frame-rate-independent persistence | 2-3 days | Medium | None |
| 1.2 | **Fix BUG-001** — spectral flatness for broad peaks | 1-2 days | Medium | None |
| 1.3 | **Increase test coverage** — feedbackDetector, classifier, dspWorker | 3-5 days | High | None |
| 1.4 | **Add `pnpm typecheck` script** | 5 min | Low | None |
| 1.5 | **Enhance onboarding** — step-by-step tutorial with animations | 3-5 days | High | None |
| 1.6 | **Session recording** — save/replay detection events + spectra | 5-7 days | High | localStorage/IndexedDB |
| 1.7 | **Dark/light theme toggle** | 2-3 days | Medium | Tailwind dark mode |
| 1.8 | **Spectral waterfall display** | 3-5 days | Medium | Canvas rendering |

### Phase 2: Growth Features (v1.x)

| # | Feature | Effort | Impact | Dependencies |
|---|---------|--------|--------|-------------|
| 2.1 | **User accounts** (Supabase Auth) | 5-7 days | Critical | Supabase setup |
| 2.2 | **Cloud session storage** | 3-5 days | High | 2.1 |
| 2.3 | **Multi-language support** (next-intl) | 5-7 days | High | Translation services |
| 2.4 | **Room profile database** | 3-5 days | Medium | 2.1 |
| 2.5 | **Historical analytics** — cross-session frequency analysis | 5-7 days | High | 2.1, 2.2 |
| 2.6 | **Temporal envelope analysis** (GAP-001) | 3-5 days | High | None |
| 2.7 | **Pitch stability analysis** (GAP-002) | 3-5 days | High | None |
| 2.8 | **Onset slope classification** (GAP-005) | 2-3 days | Medium | None |

### Phase 3: Platform (v2.0)

| # | Feature | Effort | Impact | Dependencies |
|---|---------|--------|--------|-------------|
| 3.1 | **Multi-channel analysis** | 10-15 days | Very High | Web Audio multi-input |
| 3.2 | **Cross-channel correlation** (GAP-003) | 5-7 days | High | 3.1 |
| 3.3 | **Bitfocus Companion module** | 7-10 days | High | WebSocket API |
| 3.4 | **Digital mixer integration** (Behringer first) | 10-15 days | Very High | Desktop bridge |
| 3.5 | **Dante Via integration guide** | 2-3 days | Medium | Documentation only |
| 3.6 | **Desktop app** (Electron/Tauri) | 10-15 days | High | None |
| 3.7 | **Collaborative mode** | 7-10 days | Medium | WebSocket/WebRTC |
| 3.8 | **Training/simulation mode** | 5-7 days | Medium | Audio fixtures |

### Phase 4: Differentiation (v3.0)

| # | Feature | Effort | Impact | Dependencies |
|---|---------|--------|--------|-------------|
| 4.1 | **Room impulse response estimation** (GAP-006) | 10-15 days | High | Comb pattern data |
| 4.2 | **ML classifier** (GAP-007) | 20-30 days | Very High | Training data, ONNX.js |
| 4.3 | **Auto-EQ via mixer control** | 5-7 days | Very High | 3.4 |
| 4.4 | **Plugin version** (VST3/AU) | 20-30 days | High | Native audio SDK |
| 4.5 | **API for third-party integration** | 5-7 days | Medium | REST/WebSocket |
| 4.6 | **Harmonic decay analysis** (GAP-004) | 3-5 days | Medium | IHR data |

---

## 6. Market Analysis & Competitive Landscape

### 6.1 Market Size

The pro audio market intersects several segments:

- **Live sound equipment market**: Growing, driven by events industry recovery
- **Pro audio software market**: Consolidating (Waves, iZotope/Native Instruments, Plugin Alliance)
- **Sound sensor market**: Projected $2.86B by 2035 (SNS Insider)
- **Audio measurement software**: Growing but fragmented

**Kill The Ring's addressable market** sits at the intersection of live sound + software + mobile + SaaS — a niche with no dominant player.

### 6.2 Target Segments (Ranked by Size & Accessibility)

| Segment | Size | Pain Point | KTR Fit | Price Sensitivity |
|---------|------|-----------|---------|-------------------|
| **Church/worship volunteers** | Very Large | Untrained; need guidance | Perfect (educational) | High — Free/Pro |
| **Freelance live sound engineers** | Large | Need portable tools | Strong (PWA) | Moderate — Pro |
| **Small venue operators** | Large | No in-house expertise | Strong (analysis + recs) | Moderate — Pro |
| **Corporate AV teams** | Medium | Conferences, presentations | Good (quick setup) | Low — Enterprise |
| **Touring sound engineers** | Medium | Multi-channel, speed | Good (with mixer integration) | Low — Enterprise |
| **System integrators** | Small | API access, multi-channel | Good (with Dante) | Very Low — Enterprise |
| **Audio education** | Small | Training tools | Perfect (simulation mode) | Variable — Custom |

### 6.3 Competitor Deep Dive

#### Waves Feedback Hunter ($99-149)
- **How it works:** Uses white noise injection to analyze the mic-speaker-room relationship during setup. Creates a corrective EQ curve.
- **Strengths:** Fast setup (30 seconds), integrates with Waves ecosystem (LV1, SuperRack), trusted brand
- **Weaknesses:** Setup-time only (not real-time during show), requires plugin host, no mobile, no educational display, no analysis transparency
- **KTR advantage:** Real-time during performance, works on any device, shows the "why"

#### Waves X-FDBK ($79-149)
- **How it works:** Real-time automatic notch filter — detects feedback frequencies and applies narrow notches during live performance.
- **Strengths:** Truly real-time, automatic, integrates with Waves chains
- **Weaknesses:** Plugin-only (needs host), no mobile, limited analysis display, black-box approach
- **KTR advantage:** Cross-platform PWA, educational transparency, academic-grade analysis

#### AlphaLabs De-Feedback (~$99)
- **How it works:** VST3 plugin for real-time feedback elimination with zero latency.
- **Strengths:** Zero latency, real-time elimination
- **Weaknesses:** Requires dedicated hardware (NUC recommended), no mobile, limited to VST3 hosts
- **KTR advantage:** Runs on any device, no special hardware, analysis-focused approach

#### dbx AFS2 ($300+)
- **How it works:** Hardware unit with 24 feedback filters per channel using AFS (Advanced Feedback Suppression) algorithm.
- **Strengths:** Dedicated hardware (reliable), 24 filters/channel, industry standard
- **Weaknesses:** Separate purchase, fixed hardware, no analysis/history, no mobile companion
- **KTR advantage:** Software-based (always with you), educational display, session history, free tier

#### Built-in Mixer DSP (Yamaha, QSC, etc.)
- **How it works:** Automatic feedback suppression built into digital mixer firmware.
- **Strengths:** No additional cost, integrated into workflow
- **Weaknesses:** Black box, no analysis, no recommendations, no history, can't learn from
- **KTR advantage:** Transparency, education, cross-mixer compatibility, historical analytics

### 6.4 Competitive Positioning Matrix

```
                    Analysis Depth
                         ▲
                         │
        Kill The Ring    │    (No competitor)
        ●────────────────┼───────────────────
                         │
                         │
     ◐ X-FDBK           │    ◐ Feedback Hunter
     ◐ De-Feedback       │
                         │
     ◐ dbx AFS2          │    ◐ Built-in mixer DSP
     ─────────────────────┼──────────────────→
                         │         Automation Level
```

Kill The Ring occupies a unique position: **high analysis depth, moderate automation** (recommendations but not auto-application). The roadmap moves it toward high automation (mixer control) while maintaining its analysis depth advantage.

---

## 7. Strategic Recommendations

### 7.1 Immediate (Before Public Launch)

1. **Fix BUG-001 and complete FUTURE-002** — ship with no known bugs
2. **Increase test coverage to 80%+ across all modules** — demonstrates reliability
3. **Enhance onboarding** — critical for the church/volunteer segment
4. **Add session recording** — transforms from "monitor" to "tool"
5. **Add dark mode** — essential for live venue use (dark environments)

### 7.2 Short-Term (First 3 Months Post-Launch)

1. **Launch free tier** — maximize adoption, build user base
2. **Add user accounts** — required for Pro tier monetization
3. **Add multi-language support** — Spanish, Portuguese, Japanese, Korean
4. **Add temporal envelope + pitch stability analysis** — biggest detection accuracy gains
5. **Start collecting labeled training data** — foundation for future ML

### 7.3 Medium-Term (3-12 Months)

1. **Launch Pro tier** ($9.99/month) — session recording, full EQ recommendations, exports
2. **Build Companion module** — creates ecosystem stickiness
3. **Implement mixer integration** (Behringer X32 first) — killer differentiator
4. **Document Dante Via workflow** — zero-code integration with professional infrastructure
5. **Build desktop app** (Tauri recommended over Electron for smaller binary size)

### 7.4 Long-Term (12+ Months)

1. **Launch Enterprise tier** — multi-channel, API access, team collaboration
2. **Train and deploy ML classifier** — continuous accuracy improvement
3. **Build room impulse response estimation** — predictive feedback prevention
4. **Plugin version** (VST3/AU) — reach engineers in their existing workflows
5. **Hardware partnerships** — bundle with affordable measurement mics

### 7.5 Things NOT To Do

1. **Don't add audio output/modification** — stay analysis-only. The moment you modify audio, you compete with dbx/Waves on their turf. Analysis-only is the moat.
2. **Don't build a DAW** — stay focused on feedback detection. Don't add recording, mixing, or mastering features.
3. **Don't target home studios** — home recording doesn't have feedback problems. Stay focused on live sound.
4. **Don't go hardware** — hardware has manufacturing costs, inventory, returns. Stay software-only with hardware partnerships.
5. **Don't price too low** — $9.99/month for Pro is reasonable for professionals. Don't race to the bottom.

---

## 8. Risk Assessment

### 8.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Browser audio API changes/deprecation | Low | High | PWA is standards-based; monitor Web Audio API spec |
| False positive rate too high for trust | Medium | High | Multi-algorithm fusion; continuous threshold tuning; user feedback loop |
| Performance on low-end mobile devices | Medium | Medium | `MOBILE_ANALYSIS_INTERVAL_MS` already helps; test on budget Android |
| Web Worker limitations in some browsers | Low | Medium | Graceful fallback to main thread (already supported via `AnalyserNode`) |
| `SharedArrayBuffer` COOP/COEP breaks third-party embeds | Medium | Low | Only needed for future optimization; current architecture works fine |

### 8.2 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Waves/dbx adds analysis features | Medium | High | First-mover advantage in analysis; academic depth is hard to replicate |
| Free tier cannibalization | Medium | Medium | Careful feature gating; Pro features must be compelling |
| Church market is donation-funded | High | Medium | Free tier for churches; Pro for larger churches with tech budgets |
| Mixer manufacturers lock protocols | Low | Medium | OSC is open; most protocols are reverse-engineered by community |
| Dante SDK licensing costs | Medium | Medium | Start with Dante Via (zero-code); DAL SDK only for desktop app |

### 8.3 Market Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| "Nice tool but I don't need it every day" | High | High | Session recording + analytics create daily value; training mode |
| Pro audio community skepticism of browser-based tools | Medium | Medium | Transparent algorithms; academic citations; open-source core DSP |
| PWA distribution limitations (no App Store presence) | Medium | Medium | Add to App Store via Capacitor/TWA wrapper |

---

## 9. Appendix: File-by-File Audit Notes

### DSP Engine (`lib/dsp/`)

| File | Lines | Purpose | Issues | Recommendations |
|------|-------|---------|--------|-----------------|
| `constants.ts` | ~800 | All DSP tuning constants | Well-organized; SCREAMING_SNAKE consistent | Add JSDoc for each constant group |
| `feedbackDetector.ts` | ~1730 | Core peak detection engine | 12.7% test coverage; FUTURE-002 incomplete | Priority: add mock-based tests; complete FUTURE-002 |
| `algorithmFusion.ts` | ~500 | 7-algorithm fusion engine | 86.6% coverage; well-tested | Consider adding onset slope as 8th algorithm |
| `msdAnalysis.ts` | ~200 | Magnitude Slope Deviation | 100% coverage; clean implementation | No changes needed |
| `phaseCoherence.ts` | ~150 | Phase coherence analysis | 100% coverage; clean implementation | No changes needed |
| `compressionDetection.ts` | ~200 | Spectral flatness + compression | BUG-001 in broad peak calculation | Fix Wiener entropy for wide peaks |
| `classifier.ts` | ~400 | Track classification | 43.7% coverage; complex Bayesian logic | Add edge case tests |
| `eqAdvisor.ts` | ~500 | EQ recommendations | 87.2% coverage; ERB psychoacoustics | Add mixer-specific mappings |
| `dspWorker.ts` | ~430 | Worker orchestrator | Zero test coverage; excluded from reports | Add message dispatch tests |
| `workerFft.ts` | ~300 | FFT processing | Tested via integration tests | No changes needed |
| `advisoryManager.ts` | ~300 | Advisory lifecycle | Tested via integration tests | No changes needed |
| `decayAnalyzer.ts` | ~200 | Decay analysis | Tested via integration tests | No changes needed |
| `trackManager.ts` | ~200 | Track lifecycle | Tested via integration tests | No changes needed |
| `acousticUtils.ts` | ~300 | Room acoustics calculations | Tested indirectly via classifier | Consider dedicated tests |
| `severityUtils.ts` | ~100 | Severity level mapping | Simple mapping; minimal risk | No changes needed |
| `feedbackHistory.ts` | ~200 | Session history | Tested via integration tests | No changes needed |

### Components (`components/kill-the-ring/`)

| File | Purpose | Issues | Recommendations |
|------|---------|--------|-----------------|
| `KillTheRing.tsx` | Root orchestrator | Clean; memo-wrapped | No changes |
| `SpectrumCanvas.tsx` | Canvas visualization | Complex; canvas perf critical | Profile for unnecessary redraws |
| `MobileLayout.tsx` | Mobile layout | WAI-ARIA tabs pattern | Verify roving tabindex on all screen sizes |
| `DesktopLayout.tsx` | Desktop layout | `landscape:flex` CSS toggle | No changes (never modify for mobile) |
| `OnboardingOverlay.tsx` | First-run tutorial | Exists but may need enhancement | User test with non-technical users |
| `SettingsPanel.tsx` | Settings container | Lazy-load opportunity | Consider React.lazy for tab content |

### Infrastructure

| File | Purpose | Issues | Recommendations |
|------|---------|--------|-----------------|
| `next.config.mjs` | Build + security config | CSP `unsafe-inline`; image opt disabled | Evaluate nonce-based CSP; re-evaluate image opt |
| `eslint.config.mjs` | Linting rules | React 19 rules downgraded | Monitor for false positives; consider re-enabling |
| `app/api/v1/ingest/route.ts` | Data ingest | Rate limiting is per-session, in-memory | Acceptable for now; add Redis/Upstash for scale |
| `app/sw.ts` | Service worker | Clean Serwist setup | No changes |
| `.github/workflows/ci.yml` | CI pipeline | Solid: tsc + lint + test + build | Add bundle size limit check |

---

*This audit was conducted by Claude Opus 4.6 on 2026-03-14 against Kill The Ring v0.95.0. All findings are based on static code analysis, test execution results, and market research. No runtime testing was performed.*
