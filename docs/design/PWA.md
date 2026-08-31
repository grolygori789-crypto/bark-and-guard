# PWA Install Contract

BARK & GUARD is installable from its GitHub Pages URL as a Progressive Web App.

## Canonical files

- `manifest.webmanifest`
- `service-worker.js`
- `src/pwa/install.js`
- `assets/app/icons/`

## App identity

- Name: `BARK & GUARD: Shih Tzu Defense`
- Short name: `BARK & GUARD`
- Orientation: landscape
- Preferred display: fullscreen
- Theme: deep navy + gold

## Icon rules

The icon master is stored at:
`assets/app/icons/icon-master-1024.png`

Normal icons and maskable icons are separate. The maskable version deliberately keeps the Shih Tzu and shield inside a safe area so Android launchers may crop the icon into a circle, squircle, rounded square, or other adaptive shape without cutting off the subject.

Do not create `icon-final2`, `icon-new`, or version-suffixed duplicates. Update the canonical master and regenerate the canonical sizes.

## Install behavior

### Android / Chromium browsers
When the browser exposes the `beforeinstallprompt` event, the game shows its own BARK & GUARD install card. Tapping INSTALL invokes the native browser install prompt.

### iPhone / iPad
iOS does not expose `beforeinstallprompt`. The game therefore shows an install card that opens concise Safari instructions for Add to Home Screen.

The browser/OS ultimately controls whether and when a native installation sheet is displayed; a website cannot force the native prompt without browser support/user interaction.
