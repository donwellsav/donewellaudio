---
name: dsp-bench
description: Run DSP performance benchmarks and compare against baselines
---

# DSP Performance Benchmark

Measure hot-path performance to catch regressions before they ship.

## Instructions

1. **Create a benchmark script** (if not already present) at `scripts/dsp-bench.mjs`:
   - Import `FeedbackDetector` and core DSP modules
   - Generate synthetic spectrum data (4096 bins, realistic dB distribution)
   - Run `FeedbackDetector.analyze()` in a tight loop for 1000 iterations
   - Measure total time, ops/sec, and per-call microseconds
   - Also benchmark individual hot functions:
     - `_buildPowerSpectrum()` via the detector
     - `fuseAlgorithmResults()` from fusionEngine
     - `classifyTrackWithAlgorithms()` from classifier
   - Print results in a table

2. **Run the benchmark**:
   ```bash
   node --experimental-vm-modules scripts/dsp-bench.mjs
   ```

3. **Compare against baselines** (if baseline file exists at `scripts/dsp-bench-baseline.json`):
   - Flag any function that regressed >10% from baseline
   - Highlight any function that improved >10%

4. **Report** — Show the results table with pass/fail indicators. If this is the first run, suggest saving as baseline:
   ```bash
   node scripts/dsp-bench.mjs --save-baseline
   ```

## Performance Budget

From CLAUDE.md constraints:
- `analyze()` must complete in <20ms (50fps target)
- MSD pool: O(1) slot allocation
- Prefix sum: O(1) prominence
- EXP_LUT: no Math.pow() in hot loops
