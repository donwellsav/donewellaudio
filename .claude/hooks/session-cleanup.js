// Stop hook: removes all temp marker files when the session ends.
// Ensures a clean slate for the next session.
const fs = require('fs');
const os = require('os');
const path = require('path');

const FILES = [
  'claude-edit-tracker.json',
  'claude-build-gate-passed',
  'claude-cia-audit.md',
  'claude-nonui-edit',
];

for (const f of FILES) {
  try { fs.unlinkSync(path.join(os.tmpdir(), f)); } catch (e) {}
}
