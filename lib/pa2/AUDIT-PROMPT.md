# Code Audit Request — DoneWellAudio ↔ PA2 Integration

## Context

I'm building an integration between DoneWellAudio (a real-time acoustic analysis web app) and the dbx DriveRack PA2 (a loudspeaker management processor) via a Bitfocus Companion module. The integration enables:

1. DoneWellAudio's browser-based FFT detects feedback/resonance in real-time
2. Advisories (with frequency, severity, confidence, Q estimate) are generated
3. These advisories are translated into PA2 GEQ/PEQ corrections
4. Corrections are sent via HTTP to a Companion module running on the local network
5. The PA2 applies them in <1ms (burst TCP writes)
6. The PA2's own RTA mic data flows back to verify the corrections worked

## Tech Stack

- **DoneWellAudio:** Next.js 16, React 19, TypeScript 5.7 (strict, zero `any`), Web Audio API, Web Workers
- **Companion Module:** Node.js 22, CommonJS, TCP to PA2 port 19272 (control) + port 19274 (DSP meters)
- **Communication:** HTTP polling (200ms) from browser to Companion's HTTP bridge (port 8000)

## Files to Review

### 1. types/pa2.ts (~170 lines)
TypeScript type definitions for the PA2 Companion module's HTTP API responses. Defines all request/response types, connection config, bridge state, and the 31-band GEQ frequency constants.

```typescript
[PASTE CONTENTS OF types/pa2.ts HERE]
```

### 2. lib/pa2/pa2Client.ts (~180 lines)
Stateless HTTP client factory. Creates a client with methods for each API endpoint. Handles timeouts via AbortController, merges abort signals for cancellation, and includes a custom error class.

```typescript
[PASTE CONTENTS OF lib/pa2/pa2Client.ts HERE]
```

### 3. lib/pa2/advisoryBridge.ts (~200 lines)
Translation layer between DoneWellAudio's Advisory type and PA2 API commands. Three modes:
- GEQ: Maps advisories to 31-band GEQ corrections (coarse)
- PEQ/detect: Maps advisories to /detect payloads for precision notch filters
- Hybrid: GEQ for broad issues, PEQ for narrow feedback (mimics how a sound engineer thinks)

```typescript
[PASTE CONTENTS OF lib/pa2/advisoryBridge.ts HERE]
```

### 4. hooks/usePA2Bridge.ts (~300 lines)
React hook that manages the polling loop, state synchronization, and advisory forwarding. Supports four auto-send modes (off, geq, peq, hybrid). Uses refs for stable callbacks, AbortController for cleanup, and interval-based polling.

```typescript
[PASTE CONTENTS OF hooks/usePA2Bridge.ts HERE]
```

## What to Audit

Please review for:

### Correctness
- Are the type definitions complete and accurate for the API responses?
- Does the advisory-to-GEQ mapping use correct log-space frequency matching?
- Is the severity-to-cut-depth mapping reasonable for live sound?
- Does the hybrid mode decision logic (narrow Q → PEQ, broad → GEQ) make sense?
- Are abort signals handled correctly in the polling loop?

### React Patterns
- Is the useEffect cleanup correct? Will it leak timers or connections?
- Is the state update pattern safe (no stale closures)?
- Are the useCallback dependencies correct?
- Is the auto-send effect safe from infinite loops?
- Should any of this use useReducer instead of useState?

### Performance
- The poll loop runs every 200ms. Is this creating too many re-renders?
- The advisory effect runs on every advisory change. Could this cause excessive HTTP calls?
- Is the mergeAbortSignals implementation efficient?
- Should the client be memoized differently?

### Security
- The HTTP client sends to a user-configured URL. Are there SSRF concerns?
- API key is sent as a header. Is this sufficient?
- Any XSS vectors in the response handling?

### Architecture
- Is the separation between client/bridge/hook clean?
- Should the bridge logic live in the hook or stay separate?
- Is the polling approach appropriate or should we consider SSE/WebSocket?
- How would you handle the case where the PA2 disconnects mid-session?

### Edge Cases
- What happens when the browser tab is backgrounded? (Timers throttle)
- What if the Companion module restarts mid-poll?
- What if advisories arrive faster than autoSendIntervalMs?
- What if the PA2's GEQ is in a different topology (stereo vs dual-mono) than expected?

## Existing DoneWellAudio Conventions

- Zero `any` — strict TypeScript throughout
- All DSP code is pure functions where possible
- Hooks use stable refs for callbacks passed to workers
- Advisory type has: trueFrequencyHz, severity (RUNAWAY/GROWING/RESONANCE/POSSIBLE_RING/WHISTLE/INSTRUMENT), confidence (0-1), qEstimate, bandwidthHz
- Constants use SCREAMING_SNAKE_CASE
- Academic references in JSDoc comments
- 799 existing tests via Vitest

## Expected Output

1. List of issues found (with severity: critical/major/minor/nit)
2. Specific code suggestions for fixes
3. Overall architecture assessment
4. Any concerns about the integration approach itself
