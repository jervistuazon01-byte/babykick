# Android Installability (PWA) Readiness Check

## Verdict
The app is now configured to be installable as a PWA on Android **when hosted over HTTPS (including GitHub Pages)**.

## Implemented requirements

### 1) Web app manifest
- **Status:** ✅ Added (`public/manifest.webmanifest`)
- Includes `name`, `short_name`, `start_url`, `scope`, `display`, theme/background colors, and a maskable SVG app icon.

### 2) Service worker
- **Status:** ✅ Added (`public/service-worker.js`) and registered in `src/main.tsx`
- Caches app shell files and runtime GET responses for basic offline behavior.

### 3) Icons for install prompt
- **Status:** ✅ Added install icon asset
- `public/icons/pwa-icon.svg`

### 4) Root entry behavior
- **Status:** ✅ Updated
- `index.html` now serves the app directly and includes manifest/theme/icon metadata.

### 5) Build setup
- **Status:** ✅ Updated
- Removed `vite-plugin-singlefile` from build config so assets are emitted in normal PWA-friendly structure.

## GitHub Pages notes
1. Ensure Pages is enabled and serving the repository from HTTPS URL.
2. Deploy the Vite `dist/` output as the published site.
3. On Android Chrome, open the site and use “Add to Home screen” / install prompt.
