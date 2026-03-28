#!/usr/bin/env node
/**
 * Ship Guard Hook — PreToolUse on Bash
 *
 * YOU ARE NOT ALLOWED TO SHIP ANYTHING LIVE.
 *
 * Blocks any command that would deploy code or merge work without
 * Don's explicit approval via GitHub UI:
 *
 *   - git push origin main  (triggers Vercel auto-deploy)
 *   - git push <anything> main
 *   - gh pr merge  (merging PRs — Don does this manually)
 *   - vercel deploy / npx vercel  (already in deploy-guard.js, belt+suspenders)
 *   - git merge  (merging branches locally into main)
 *
 * CORRECT WORKFLOW:
 *   1. Create a feature branch
 *   2. Push the branch:  git push origin <branch-name>
 *   3. Open a PR:        gh pr create ...
 *   4. STOP — Don merges on GitHub. You are done.
 *
 * This hook cannot be bypassed by allow-list entries because it runs
 * as a PreToolUse hook before command execution.
 */

const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(Buffer.concat(chunks).toString());
    const command = (input.tool_input && input.tool_input.command) || '';

    const WORKFLOW_REMINDER = [
      'CORRECT WORKFLOW:',
      '  1. git checkout -b <feature-branch>',
      '  2. git push origin <feature-branch>',
      '  3. gh pr create ...',
      '  4. STOP — Don merges on GitHub.',
    ].join('\n');

    const rules = [
      // Direct push to main — triggers Vercel auto-deploy
      {
        pattern: /git\s+push\b[^|&;]*\bmain\b/i,
        reason: `SHIP BLOCKED: Direct push to main is forbidden. It triggers Vercel auto-deploy without review.\n\n${WORKFLOW_REMINDER}`,
      },
      // Push with HEAD -> main or refs/heads/main
      {
        pattern: /git\s+push\b.*refs\/heads\/main/i,
        reason: `SHIP BLOCKED: Pushing refs/heads/main directly is forbidden.\n\n${WORKFLOW_REMINDER}`,
      },
      // gh pr merge — merging PRs (Don does this manually)
      {
        pattern: /gh\s+pr\s+merge\b/i,
        reason: `SHIP BLOCKED: PR merges are done by Don manually on GitHub. Do not merge PRs programmatically.\n\n${WORKFLOW_REMINDER}`,
      },
      // git merge (merging into current branch — risky when on main)
      {
        pattern: /git\s+merge\b/i,
        reason: `SHIP BLOCKED: git merge is blocked to prevent inadvertent main merges. Use rebase or let Don handle merges via GitHub.\n\n${WORKFLOW_REMINDER}`,
      },
      // vercel deploy (belt + suspenders on top of deploy-guard.js)
      {
        pattern: /vercel\s+deploy|npx\s+vercel\b/i,
        reason: `SHIP BLOCKED: Direct Vercel deploys are forbidden. Vercel auto-deploys from main after Don merges the PR.\n\n${WORKFLOW_REMINDER}`,
      },
    ];

    for (const { pattern, reason } of rules) {
      if (pattern.test(command)) {
        console.log(JSON.stringify({
          hookSpecificOutput: {
            permissionDecision: 'deny',
            permissionDecisionReason: reason,
          },
        }));
        process.exit(0);
        return;
      }
    }

    // Allow
    process.exit(0);

  } catch (e) {
    process.stderr.write('SHIP-GUARD HOOK ERROR — blocking as precaution: ' + (e.message || String(e)));
    process.exit(2);
  }
});
