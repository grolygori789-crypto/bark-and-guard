# PWA Launch Root Fix

- Home-screen launch URL is now exactly `/bark-and-guard/`.
- Removed query parameters from `start_url`.
- Removed `display_override` to reduce launcher-specific ambiguity.
- Navigation always resolves to the canonical app root.
- Service worker v8 caches both the app root and index shell as launch fallbacks.
