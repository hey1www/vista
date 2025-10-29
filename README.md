# Vista

A lightweight geolocation dashboard for mobile inspired layouts, built with vanilla HTML, CSS, and JavaScript. Vista continuously watches the device position, formats longitude/latitude in DMS, exposes altitude, speed, timestamp, and accuracy, and ships with full localisation (中文 / English), theme switching, and a configurable interface.

## Features

- Continuous `watchPosition` updates with high-accuracy hints and graceful error handling + retry.
- DMS conversion with hemisphere logic, altitude and speed (km/h ↔ m/s) formatting, local timestamp, and accuracy display.
- Language (简体中文 / English), light/dark mode, and module visibility preferences persisted in `localStorage`.
- Installable Progressive Web App with offline cache (cache-first) covering every static asset.
- Privacy friendly: no analytics, network requests, or data uploads beyond the Geolocation API call in the browser.

## Getting Started

```bash
# Serve the site from the repository root
cd vista
python3 -m http.server 8000
# Visit http://localhost:8000 in your browser
```

Allow location access when prompted. If permission is denied or unavailable, the interface keeps placeholders and shows a retry action.

## Offline Testing

1. Open DevTools → Application → Service Workers and make sure "Update on reload" is disabled.
2. Load the page once while online so all assets are cached.
3. Toggle "Offline" in DevTools or disconnect the network; refresh to verify the app opens fully offline.

## Deployment to GitHub Pages

1. Commit and push the `vista` folder to the `main` branch of the `vista` repository.
2. In the GitHub repository, navigate to **Settings → Pages**.
3. Select the `main` branch with the `/ (root)` folder and save.
4. Wait for the deployment to finish; the PWA will be available at the generated GitHub Pages URL.

## Privacy

Vista never transmits or stores location data on a server. All processing happens locally in the browser and remains on your device.
