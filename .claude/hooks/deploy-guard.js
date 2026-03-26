#!/usr/bin/env node
/**
 * Deploy Guard Hook — PreToolUse on Bash
 *
 * Blocks deploy and remote operations unless a one-shot approval marker exists.
 * Claude writes the marker after getting user approval in chat.
 * The hook reads, validates (must be <60s old), and deletes the marker atomically.
 */

const fs = require('fs');
const path = require('path');

const MARKER_PATH = path.join(__dirname, '..', 'tmp', 'deploy-approved');
const MARKER_MAX_AGE_MS = 60_000; // 60 seconds

const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(Buffer.concat(chunks).toString());
    const fullCmd = (input.tool_input?.command || '');
    const cmdLine = fullCmd.split(/<<\s*'?EOF'?|<<\s*'?HEREDOC'?|<<\s*'?PRBODY'?|\n/)[0].toLowerCase();

    const blocked = [
      /git\s+push/,
      /gh\s+pr\s+(create|merge)/,
      /vercel\s+(deploy|--prod)/,
      /npx\s+vercel/,
      /pnpm\s+deploy/,
    ];

    const match = blocked.find(r => r.test(cmdLine));
    if (!match) return; // not a deploy command, allow

    // Check for one-shot approval marker
    try {
      const marker = JSON.parse(fs.readFileSync(MARKER_PATH, 'utf8'));
      const age = Date.now() - marker.timestamp;

      // Delete marker immediately (one-shot — consumed on read)
      fs.unlinkSync(MARKER_PATH);

      if (age <= MARKER_MAX_AGE_MS) {
        // Valid marker — allow
        return;
      }
      // Stale marker — block
    } catch {
      // No marker or invalid — block
    }

    console.log(JSON.stringify({
      decision: 'block',
      reason: `BLOCKED: Deploy command detected (${match.toString()}). Ask the user for explicit permission, then write the approval marker before retrying.`
    }));
    process.exit(2);
  } catch {
    // Parse error — allow through
  }
});
