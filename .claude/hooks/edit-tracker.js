// Post-edit hook: tracks which files are modified and maps them to the
// 16 system categories defined in CLAUDE.md "Change Impact Audit" section.
// These categories are NOT invented — they are from CLAUDE.md lines 285-302.
// Purpose: warn when edits touch more systems than originally planned.
const fs = require('fs');
const os = require('os');
const path = require('path');

const TRACKER = path.join(os.tmpdir(), 'claude-edit-tracker.json');

// Categories from CLAUDE.md Change Impact Audit table (lines 285-302)
const MAP = [
  [/lib\/dsp\//, 'DSP / Detection'],
  [/dspWorker|workerFft/, 'Worker / Threading'],
  [/components\//, 'UI Components'],
  [/contexts\//, 'React State'],
  [/hooks\//, 'React State'],
  [/spectrumDrawing|canvas/, 'Canvas / Visualization'],
  [/ktrStorage/, 'Settings / Storage'],
  [/middleware/, 'Security / CSP'],
  [/api\//, 'API / Ingest'],
  [/\.test\.|vitest|__tests__/, 'Testing'],
  [/next\.config|ci\.yml|\.github/, 'Build / CI'],
  [/sw\.ts|serwist/, 'PWA / Service Worker'],
  [/mlInference|models\/|onnx/, 'ML Pipeline'],
  [/snapshot|consent|data\.ts/, 'Data / Privacy'],
  [/calibration|useAudio|useDSP/, 'Audio Pipeline'],
];

let input = '';
process.stdin.on('data', d => input += d);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const fp = ((data.tool_input && data.tool_input.file_path) || '').replace(/\\/g, '/');

    const systems = [];
    for (const [pat, sys] of MAP) {
      if (pat.test(fp)) systems.push(sys);
    }
    if (systems.length === 0) systems.push('Other');

    let edits = [];
    try { edits = JSON.parse(fs.readFileSync(TRACKER, 'utf8')); } catch (e) {}

    if (!edits.some(e => e.file === fp)) {
      edits.push({ file: fp, systems, time: Date.now() });
      fs.writeFileSync(TRACKER, JSON.stringify(edits));
    }

    const allSys = [...new Set(edits.flatMap(e => e.systems))];

    let ctx;
    if (edits.length >= 3 && allSys.length >= 3) {
      ctx = `SCOPE CHECK: ${edits.length} files across ${allSys.length} systems (${allSys.join(', ')}). Verify this matches your planned scope.`;
    } else {
      ctx = `Edit tracked: ${path.basename(fp)} [${systems.join(', ')}] (${edits.length} files, ${allSys.length} systems)`;
    }
    console.log(JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: ctx }
    }));
  } catch (e) {
    process.exit(0);
  }
});
