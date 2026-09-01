# Stage 1 Production Integration — Test Fix

This patch addresses the four issues found in the first production test.

## 1. Install flow and Home Screen launch
- A BARK & GUARD install surface opens automatically on browser launch while the app is not running as an installed PWA.
- Android/Chromium uses `beforeinstallprompt` when the browser exposes it.
- iPhone/iPad shows Add to Home Screen guidance because iOS does not expose the Chromium native install event.
- The canonical installed launch URL remains `/bark-and-guard/`.
- `manifest.webmanifest` now requests `display: fullscreen` and `orientation: landscape`.
- Service worker cache is bumped to Stage 1 Production v13 and takes over immediately on updates.

Browser security does not allow a site to fire the native installation sheet or Fullscreen API without user interaction. The custom install surface can appear automatically; the native install confirmation still requires the user's tap.

## 2. Landscape / fullscreen
- Installed PWA requests a fullscreen application shell and landscape orientation from the manifest.
- Browser play uses the `PLAY IN BROWSER` tap as the permission gesture for Fullscreen + landscape lock.
- Portrait gameplay is blocked by a rotate-device overlay rather than rendering a broken layout.

## 3. Exact road centerline
- Enemy path was re-traced directly from the locked approved Day overlay.
- 282 normalized path nodes follow the approved yellow route from START to HOME.
- Maximum adjacent path step in the 1536×691 world is about 13.3 px, preventing straight-line shortcuts across grass on tight curves.
- Guard Spots 1–7 were re-read from the same locked overlay.

## 4. UI / house visibility
- Removed the full-width top HUD.
- Premium pastel glass HUD is now a compact top-left island.
- START WAVE / speed / pause / settings moved to a bottom-right action dock.
- The upper-right modern house and entrance remain unobstructed during normal play.
- Placement and settings panels remain temporary overlays only.

## Canonical masters
Background artwork is not modified by this patch:
- `assets/stages/stage-01/day/background.png`
- `assets/stages/stage-01/night/background.png`
