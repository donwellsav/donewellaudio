// Post-Bash hook: writes a marker file when tsc + test pass successfully.
// The pre-commit gate (pre-commit-gate.js) checks for this marker.
// Enforces the CLAUDE.md build gate: "npx tsc --noEmit && pnpm test"
const fs = require('fs');
const os = require('os');
const path = require('path');

const MARKER = path.join(os.tmpdir(), 'claude-build-gate-passed');

let input = '';
process.stdin.on('data', d => input += d);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const cmd = (data.tool_input && data.tool_input.command) || '';
    const resp = JSON.stringify(data.tool_response || {});

    // Only mark if the command included both tsc and test
    const hasTsc = /tsc\s+--noEmit/.test(cmd);
    const hasTest = /pnpm\s+test/.test(cmd);

    // Check for success: no error exit code AND test output shows passes
    const hasError = /error TS|ERR!|FAIL|exit code [^0]|exitCode[^0]/.test(resp);
    const hasPass = /\d+ passed/.test(resp);

    if (hasTsc && hasTest && !hasError && hasPass) {
      fs.writeFileSync(MARKER, Date.now().toString());
      console.log(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: 'BUILD GATE PASSED. You may now produce the Change Impact Audit and commit.'
        }
      }));
    }
  } catch (e) {
    process.exit(0);
  }
});
