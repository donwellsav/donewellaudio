# FUTURE-004: Storage Abstraction Layer

**Date:** 2026-03-13
**Status:** Implemented

## Problem

26 direct `localStorage` calls scattered across 9 files with inconsistent error handling (some had try/catch, some didn't), no SSR guards, and no type safety.

## Approach: Per-Domain Typed Helpers

Created `lib/storage/ktrStorage.ts` with three factory functions:
- `typedStorage<T>(key, fallback)` — JSON-serialized typed storage
- `stringStorage(key, fallback)` — raw string storage (no JSON wrapper)
- `flagStorage(key)` — boolean presence check (key exists = true)

Each factory returns `{ load(), save(), clear() }` with built-in try/catch, SSR guards (`typeof window`), and quota-safe writes.

## Domain Accessors

| Accessor | Factory | Key | Consumer(s) |
|----------|---------|-----|-------------|
| `presetStorage` | `typedStorage<CustomPreset[]>` | `ktr-custom-presets` | DetectionControls.tsx |
| `deviceStorage` | `stringStorage` | `ktr-audio-device` | useAudioDevices.ts |
| `roomStorage` | `typedStorage<RoomProfile>` | `ktr-calibration-room` | useCalibrationSession.ts |
| `onboardingStorage` | `flagStorage` | `ktr-onboarding-seen` | OnboardingOverlay.tsx, DisplayTab.tsx |
| `customDefaultsStorage` | `typedStorage<DetectorSettings\|null>` | `ktr-custom-defaults` | SettingsPanel.tsx |
| `clearPanelLayouts()` | standalone fn | `react-resizable-panels:ktr-layout-*` | UIContext.tsx |

## Excluded Domains

- **consent.ts** (`ktr-data-consent`) — Already has versioning, state machine, and clean try/catch
- **feedbackHistory.ts** (`killTheRing_feedbackHistory`) — Has debounced writes, quota recovery (50% pruning), and structural validation deeply integrated into the class

## Files Modified

- `lib/storage/ktrStorage.ts` (new)
- `contexts/UIContext.tsx`
- `components/kill-the-ring/DetectionControls.tsx`
- `hooks/useAudioDevices.ts`
- `hooks/useCalibrationSession.ts`
- `components/kill-the-ring/OnboardingOverlay.tsx`
- `components/kill-the-ring/settings/DisplayTab.tsx`
- `components/kill-the-ring/SettingsPanel.tsx`
