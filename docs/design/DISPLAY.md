# Stage Display Contract

## Master board
- Gameplay artwork remains 1536×864 (16:9).
- The entire 16:9 gameplay board must remain visible.
- Never stretch the board.
- Never crop gameplay-critical content to fill ultra-wide phones.

## Ultra-wide phones
Modern 19.5:9 and 20:9 devices have more horizontal space than the 16:9 board.

The runtime therefore uses:
1. a full-viewport decorative backdrop made from the same stage image, dimmed;
2. the canonical 16:9 gameplay board centered above it using FIT scaling.

This removes black bars while preserving 100% of the gameplay image and geometry.

## UI
- HUD, debug route and Guard Spots scale from board height.
- Touch targets remain usable without dominating the scene.
- UI is a runtime layer and is never baked into master artwork.

## PWA cache
During active development, HTML/JS/data use network-first caching so GitHub Pages updates are not hidden by an old installed-PWA cache.
