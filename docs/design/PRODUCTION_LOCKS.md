# Production Locks

## Display rule
- Stage 1 keeps 16:9 master artwork.
- Runtime presentation must be full-screen with no letterbox bars.
- The game must fill the device viewport using responsive cover scaling.
- Day and Night keep the same gameplay geometry and normalized coordinates.

## Canonical Stage 1 master files
- Day: `assets/stages/stage-01/day/background.png`
- Night: `assets/stages/stage-01/night/background.png`

Do not regenerate or redesign these background masters unless the user explicitly requests it.
