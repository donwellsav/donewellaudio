---
name: companion-build
description: Build, version, and package the Companion module for GitHub Releases
---

# Companion Build

Build and package the Companion module zip for distribution.

## Instructions

1. **Version check** — Read `companion-module/package.json` version. If the user provides a version, update it. Otherwise auto-increment the date suffix (e.g., `0.3.20260331`).

2. **Build** — Run from the companion-module directory:
   ```bash
   cd companion-module && pnpm install && pnpm build
   ```

3. **Verify build** — Check that `companion-module/dist/main.js` exists and is non-empty.

4. **Package** — Create a zip containing the module files needed for Companion:
   ```bash
   cd companion-module && zip -r ../companion-module-donewell-audio-v<version>.zip package.json dist/ LICENSE 2>/dev/null
   ```

5. **Report** — Show the zip file path, size, and version. Remind the user to:
   - Upload to GitHub Releases
   - Update `CompanionTab.tsx` download links if the release tag changed

6. **Stop** — Do NOT push or create releases. The user handles GitHub Releases manually.
