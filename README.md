# Owl Studio 🎵

A one-page AI music studio built on the [Suno API](https://docs.sunoapi.org/) by **Angela Arrigone** (FAU).
Bring your own Suno API key, from [sunoapi.org/api-key](https://sunoapi.org/api-key), to unlock it.

## Features
- **Key gate:** the studio unlocks only after your key is checked against the credits endpoint. You can
  keep the key on this device or only for the current tab, and lock it again at any time.
- **Create (Simple):** describe a song, pick vibes, and optionally add an image, audio or video reference.
- **Create (Custom):** title, style (with ✨ Boost style), lyrics with section tags, excluded styles,
  vocal gender, target length, and fine-tuning (style weight, weirdness, audio weight, variety,
  persona / voice).
- **Models:** V6, V6 Wild and V6 Mini, plus the legacy V5.5, V5, V4.5+, V4.5 All, V4.5 and V4.
- **Lyrics lab:** generate two sets of lyrics and send either one straight into a Custom song.
- **Remix your audio:** cover / restyle, extend, add vocals, add instrumental, mashup, and stem splitting.
  Upload a file or paste a public link.
- **Sounds:** loops and one-shots with a set tempo and key.
- **Library:** live progress, streaming playback before a track finishes, favourites, search and
  MP3 downloads. Each song's ⋯ menu offers karaoke (synced lyrics), extend, replace a section,
  restyle, stems, WAV, music video, new cover art, and create a persona.
- Bottom player with karaoke mode, and light, dark and system themes.

## How it works
It's a static site (`index.html`, `styles.css`, `app.js`) with no build step. Suno tasks run
asynchronously; the app polls each task's `record-info` endpoint and saves your library and jobs in
`localStorage`. Suno requires a `callBackUrl` on every task, so the app sends a placeholder unless you
set your own under ⚙ Settings.

On Netlify, `netlify.toml` proxies `/suno-api/*` → `https://api.sunoapi.org` and `/suno-upload/*` →
the Suno file-upload host, so the browser doesn't run into CORS. When those proxies aren't there, for
example when you run it locally, the app calls the APIs directly.

## Run locally
```bash
python3 -m http.server 8000
```

## Deploy to Netlify
Connect the repo in Netlify and leave the build command empty. The site publishes from the repo root.

The earlier **Owl Weather** app now lives at [`/weather/`](weather/).
