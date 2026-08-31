# PWA Launch and Install Contract

## Fixed failure mode

The Android install control must never become a dead button.

- If Chromium provides `beforeinstallprompt`, INSTALL invokes the native prompt.
- If Chromium does not provide it, INSTALL opens clear browser install instructions.
- iOS opens Safari Add to Home Screen instructions.
- Installed launch uses the explicit `/bark-and-guard/` GitHub Pages scope.

## Canonical app URL

`https://grolygori789-crypto.github.io/bark-and-guard/`

## Important during testing

After this patch is deployed, remove any previously installed broken BARK & GUARD
shortcut/app once, then reload the site and install it again. Android may retain
the old manifest/start URL for an existing installation.

## Service worker

Navigation is network-first with a cached `index.html` fallback so launching
from the home-screen icon does not fail simply because a query-string start URL
was not separately cached.
