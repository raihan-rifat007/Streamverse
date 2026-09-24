<div align="center">

<img src="frontend/public/logo.svg" width="72" height="72" alt="Streamverse" />

# Streamverse

**Open-source IPTV streaming platform**  
Thousands of live channels. No signup. No ads. No database required.

[Features](#features) · [Architecture](#architecture) · [Quick start](#quick-start) · [Deploy](#deploy) · [Automation](#automation) · [API](#api) · [Contributing](#contributing)

<br/>

![license](https://img.shields.io/badge/license-GPL--3.0-white?style=flat-square&labelColor=000000)
![stack](https://img.shields.io/badge/stack-React%20%7C%20Express%20%7C%20Vite-white?style=flat-square&labelColor=000000)
![ui](https://img.shields.io/badge/UI-liquid%20glass%20·%20mono-white?style=flat-square&labelColor=000000)
![ci](https://img.shields.io/badge/CI-daily%20channel%20sync-white?style=flat-square&labelColor=000000)

</div>

---

## Features

| Area | Details |
| --- | --- |
| Catalog | Multi-source M3U aggregation (iptv-org, Free-TV, community lists) |
| Playback | HLS via hls.js, quality control, PiP, fullscreen, mini player |
| UX | Liquid glass UI, pure black / white themes, 120fps-oriented motion |
| Offline path | Static `channels.json` fallback when the API is asleep |
| Favorites | Device-local storage, no accounts |
| Branding | Default product mark + optional custom logo upload |
| Ops | Daily GitHub Actions: refresh, logo enrich, health check, auto-commit |

---

## Architecture

```text
┌──────────────────────────────┐
│  Browser (Vercel / static)   │
│  React + Vite + Zustand      │
│  /channels.json  (fallback)  │
└──────────────┬───────────────┘
               │  REST + proxy
┌──────────────▼───────────────┐
│  API (Render / Node)         │
│  Express + in-memory cache   │
│  custom.json · playlists.json│
└──────────────┬───────────────┘
               │
┌──────────────▼───────────────┐
│  Upstream M3U sources        │
│  iptv-org · Free-TV · others │
└──────────────────────────────┘
```

**Design rules**

- No MongoDB / Postgres — catalogs are versioned JSON
- Backend is optional at runtime; static fallback keeps the UI alive
- Health history uses consecutive failure streaks (online / unstable / offline)
- UI motion prefers `transform` + `opacity` only for compositor-friendly 120Hz panels

---

## Repository map

```text
backend/                 Express API, proxy, cache, data JSON
frontend/                Vite React app + public assets + OG edge function
scripts/                 refresh_channels · enrich_logos · check_channels
.github/workflows/       Daily maintenance pipeline
render.yaml              Render blueprint
```

---

## Quick start

```bash
git clone https://github.com/raihan-rifat007/Streamverse.git
cd Streamverse
npm run install:all
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm run dev                 # API :3001
npm run dev:frontend        # UI  :5000
```

`frontend/.env`

```env
VITE_API_URL=http://localhost:3001
```

---

## Deploy

### Vercel (frontend)

| Setting | Value |
| --- | --- |
| Root Directory | `frontend` |
| Framework | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Env | `VITE_API_URL=https://<your-render-host>` |

### Render (backend)

| Setting | Value |
| --- | --- |
| Root Directory | repository root |
| Build Command | `cd frontend && npm install && npm run build && cd ../backend && npm install` |
| Start Command | `cd backend && NODE_ENV=production node server.js` |
| Health Check | `/health` |
| Env | `NODE_ENV=production` |

Order: deploy Render first → copy public URL into Vercel `VITE_API_URL` → deploy Vercel.

---

## Automation

Workflow: `.github/workflows/check-channels.yml`

| Trigger | Schedule |
| --- | --- |
| Cron | `0 4 * * *` (04:00 UTC daily) |
| Manual | Actions → Channel Maintenance → Run workflow |

Pipeline:

1. `refresh_channels.py` — rebuild `custom.json` from `playlists.json`
2. `enrich_logos.py` — match logos from iptv-org/database
3. `check_channels.py` — concurrent HEAD checks → blocked + health + static catalog
4. Commit as `streamverse-bot` when files change

Add a source:

```json
{
  "url": "https://raw.githubusercontent.com/org/repo/main/playlist.m3u",
  "enabled": true,
  "label": "My Source"
}
```

---

## UI system

- **Brand**: `frontend/public/logo.svg` is the default header mark (no letter placeholders)
- **Theme**: pure black dark mode, pure white/light gray light mode
- **Glass**: high-blur frosted panels, inner highlight stroke, liquid ambient gradients
- **Motion**: short cubic-bezier transitions on transform/opacity; `will-change` + `contain` for scroll lists
- **Density**: compact channel tiles, glass chips, monochrome LIVE / ON AIR badges

---

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness |
| GET | `/api/channels` | Filtered catalog |
| GET | `/api/channels/categories` | Category summary |
| GET | `/api/channels/featured` | Featured set |
| GET | `/api/channels/countries/:code` | Country slice |
| GET | `/api/proxy` | Media proxy |

---

## Data files

| File | Editable | Role |
| --- | --- | --- |
| `backend/data/playlists.json` | yes | Upstream list |
| `backend/data/custom.json` | generated | Merged catalog |
| `frontend/public/channels.json` | generated | Static fallback |
| `backend/data/blocked.json` | generated | Offline IDs |
| `backend/data/channel-health.json` | generated | Streak history |

---

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Build fails on `import.meta.env` | `frontend/src/vite-env.d.ts` present |
| Backend crash on start | Template strings in `routes/channels.js` intact; run `node --check backend/routes/channels.js` |
| Empty UI | `channels.json` valid + `VITE_API_URL` reachable |
| Workflow no commit | Actions enabled, `contents: write`, branch `main` |

---

## streamverse-bot

Commits use:

```text
streamverse-bot <streamverse-bot@users.noreply.github.com>
```

Avatar asset: `.github/streamverse-bot.svg` (same mark as `frontend/public/logo.svg`).  
To show a custom avatar on GitHub, create a dedicated user and upload that SVG/PNG as the profile picture.

---

## License

GPL-3.0. Educational use. Respect local law and third-party stream terms.
