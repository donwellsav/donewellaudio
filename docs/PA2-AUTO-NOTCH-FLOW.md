# PA2 Auto-Notch Flow

## How DoneWell Audio decides to cut feedback on the PA2

### The Short Version

1. DWA detects feedback → advisory card appears
2. Auto-send checks confidence ≥ 40% and sends to Companion
3. Companion checks its own confidence ≥ 20% and notchMode = auto
4. Companion writes a PEQ Bell notch to the PA2 via TCP
5. Cut stays until manually cleared

### Detection → Advisory

DWA runs its detection pipeline at 50fps. Six algorithms plus ML score each peak. The fused result produces a severity and confidence. When the score crosses the mode threshold, an advisory card appears in the UI.

### Auto-Send Filtering (DWA side)

Every 1 second, the auto-send checks active advisories:

- Auto-send mode not off
- PA2 hardware connected (green status)
- Advisory not resolved (feedback still active)
- Confidence ≥ slider value (default 40%)
- Severity not INSTRUMENT

### What Gets Sent

In "Both PEQ+GEQ" mode, two requests go out in parallel:

**GEQ path** — maps frequency to nearest GEQ band, severity to cut depth:
- RUNAWAY → -12 dB
- GROWING → -6 dB
- WHISTLE → -4 dB
- RESONANCE → -3 dB
- POSSIBLE_RING → -2 dB

Cuts are additive to the current GEQ value, clamped at -12 dB.

**PEQ path** — sends exact frequency, Q (4-16), and confidence to Companion.

### Companion Filtering

The detect handler has its own gates:
- Type must be 'feedback'
- Confidence ≥ Companion threshold (config, default 0.20)
- notchMode must be 'auto'
- No existing notch within 1/3 octave (dedup)
- PEQ slot available (8 per output band)

### Over Time

- While feedback persists: auto-send fires every 1s, GEQ deepens, PEQ deduplicates
- When feedback stops: advisory resolves, sending stops
- Cuts stay on the PA2 — they are NOT auto-removed
- Clear via Companion or DELETE /notches endpoint

### Every Gate in the Chain

```
Feedback detected → Advisory card
  → DWA: autoSend on? pa2Connected? confidence ≥ 40%? not resolved?
    → HTTP POST /detect + POST /geq
      → Companion: confidence ≥ 20%? notchMode auto? slot free?
        → TCP set PEQ Bell filter on PA2
          → Cut applied
```

### Config Reference

| Setting | Location | Default |
|---------|----------|---------|
| Auto-send mode | DWA Setup tab | Both PEQ+GEQ |
| Min confidence | DWA slider | 40% |
| Companion confidence | Companion module config | 0.20 |
| Notch mode | Companion module config | auto |
| Max notch depth | Companion module config | -6 dB |
| Send interval | Hardcoded | 1000 ms |
| PEQ dedup window | Hardcoded | 1/3 octave |
| Max PEQ slots | PA2 hardware | 8 per output |
