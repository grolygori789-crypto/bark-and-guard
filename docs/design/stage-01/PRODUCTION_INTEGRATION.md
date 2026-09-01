# Stage 1 Production Integration — Locked Contract

## Master artwork
- Day: `assets/stages/stage-01/day/background.png`
- Night: `assets/stages/stage-01/night/background.png`
- Native master geometry: 1536×691 (20:9)
- These two master images are locked. Do not regenerate or redesign without explicit approval.

## Development overlays
- `docs/design/stage-01/overlay-day.png`
- `docs/design/stage-01/overlay-night.png`
- The locked overlay defines the single continuous gate-to-home route and Guard Spots 1–7.

## Runtime presentation
- Mobile-first 20:9 landscape.
- Full-viewport cover scaling; no stretching and no duplicated fake backdrop.
- Debug route/numbers appear only with `?debug=1`.
- Production guard zones use subtle premium placement rings instead of numbered debug circles.

## UI direction
- Premium pastel + bright accents.
- Day UI uses translucent frosted glass so the garden remains visible underneath.
- Night UI reuses the same system with stronger contrast.
- Coral = primary action, mint = positive/placement, butter = currency, sky = home/utility, lavender = elite/special.

## PWA reliability
- The game runtime is self-contained and has no external game-engine CDN dependency.
- `start_url` is exactly `/bark-and-guard/`.
- Critical launch/runtime assets are precached by the service worker.
- Installed app can launch directly from its Home Screen icon.
- Android/Chromium uses the native install prompt when available; iOS uses Add to Home Screen.
