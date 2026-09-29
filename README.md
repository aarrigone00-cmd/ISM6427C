# Owl Weather

A responsive weather app by **Angela Arrigone**, a student at FAU. It uses the free
[Open-Meteo](https://open-meteo.com/) API, which needs no API key, account, or payment.

## Features
- Live current conditions, 24-hour and 7-day forecasts
- Defaults to Boca Raton (Florida Atlantic University)
- City search (Open-Meteo geocoding) and "use my location"
- Light, dark, and system themes (remembered per browser)
- °F / °C toggle
- Responsive layout for desktop, tablet, and phone
- Refreshes automatically every 10 minutes

## Run locally
It is a static site with no build step. Open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8000
```

## Deploy to Netlify
- **Drag and drop:** drop this folder onto https://app.netlify.com/drop, or
- **Git:** connect the repo in Netlify. `netlify.toml` publishes the repo root; leave the build command empty.
