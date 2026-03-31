---
name: cia
description: Auto-generate a Change Impact Audit from staged or unstaged changes
---

# Change Impact Audit Generator

Generate a CIA from the current git diff, mapping changes to the 16-system table.

## Instructions

1. Run `git diff --cached --name-only` (staged) and `git diff --name-only` (unstaged) to get changed files
2. For each changed file, map it to the affected system(s) using this table:

| File Pattern | System |
|-------------|--------|
| `lib/dsp/*` | DSP / Detection |
| `lib/dsp/feedbackDetector.ts` | Audio Pipeline |
| `lib/dsp/dspWorker.ts`, `lib/dsp/workerFft.ts` | Worker / Threading |
| `contexts/*`, `hooks/*` | React State |
| `components/*` | UI Components |
| `lib/canvas/*` | Canvas / Visualization |
| `lib/storage/*` | Settings / Storage |
| `app/sw.ts`, `serwist*` | PWA / Service Worker |
| `middleware.ts` | Security / CSP |
| `app/api/*` | API / Ingest |
| `vitest*`, `*test*` | Testing |
| `next.config*`, `.github/*`, `ci.yml` | Build / CI |
| `*aria*`, `*focus*`, `*a11y*` | Accessibility |
| `lib/dsp/feedbackDetector.ts` (hot path) | Performance |
| `scripts/ml/*`, `*.onnx`, `mlInference*` | ML Pipeline |
| `lib/data/*`, `*consent*`, `*gdpr*` | Data / Privacy |

3. Read the actual diffs to understand what changed
4. Classify each system impact as POSITIVE, NEGATIVE, or NEUTRAL with evidence
5. Output the CIA in the standard format from CLAUDE.md
6. Write the audit to `$TEMP/claude-cia-audit.md` so the pre-commit hook can find it

## Output Format

```
CHANGE: [one-line description]
CLASSIFICATION: [emoji] POSITIVE | NEGATIVE | NEUTRAL
SCOPE: [affected systems]

| System | Impact | Evidence |
|--------|--------|----------|
| ... | ... | ... |

Verdict: [summary]
```
