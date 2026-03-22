// Pre-Bash hook: blocks git commit unless two conditions are met:
// 1. Build gate passed (tsc + test succeeded) — marker from build-gate-marker.js
// 2. Change Impact Audit file exists — written by Claude per CLAUDE.md instructions
// This enforces CLAUDE.md "Build verification after every change" and "Change Impact Audit"
const fs = require('fs');
const os = require('os');
const path = require('path');

const BUILD_MARKER = path.join(os.tmpdir(), 'claude-build-gate-passed');
const CIA_FILE = path.join(os.tmpdir(), 'claude-cia-audit.md');

let input = '';
process.stdin.on('data', d => input += d);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const cmd = (data.tool_input && data.tool_input.command) || '';

    // Only gate on git commit commands
    if (!/git\s+commit/i.test(cmd)) {
      process.exit(0);
      return;
    }

    const buildPassed = fs.existsSync(BUILD_MARKER);
    const ciaExists = fs.existsSync(CIA_FILE);

    const missing = [];
    if (!buildPassed) missing.push('Build gate not passed — run: npx tsc --noEmit && pnpm test');
    if (!ciaExists) missing.push('Change Impact Audit not found — write CIA to temp file before committing');

    if (missing.length > 0) {
      console.log(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: 'PRE-COMMIT GATE BLOCKED. Missing: ' + missing.join('; ')
        }
      }));
    } else {
      // Both conditions met — allow and inject the CIA content as context
      let ciaContent = '';
      try { ciaContent = fs.readFileSync(CIA_FILE, 'utf8').trim(); } catch (e) {}

      console.log(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          additionalContext: 'Pre-commit gate passed. CIA audit and build gate verified.'
        }
      }));
    }
  } catch (e) {
    process.exit(0);
  }
});
