# Streamverse

Open-source IPTV streaming web application delivering thousands of live television channels worldwide. No registration, no advertisements, and no persistent database required.

Live demonstration: deploy your own instance on Vercel (frontend) and Render (backend) or any compatible Node.js host.

## Architecture

Streamverse consists of two independent components:

- Backend (Node.js / Express): Aggregates public IPTV playlists, proxies streams to resolve CORS and hotlink restrictions, and serves cached channel metadata.
- Frontend (React / TypeScript / Vite): Provides channel browsing, search, favorites, HLS playback, theme switching, and branding customization.

The frontend includes a static channel catalog at `frontend/public/channels.json`. When the backend is unavailable or cold-starting, the application automatically falls back to this static catalog, ensuring continuous availability.

## Features

- Thousands of live channels covering Bangladesh, India, and international sources
- Category filtering: Sports, News, Kids, Movies, Music, Entertainment, Documentary, Religious
- Instant search and local favorites storage
- Dark and light theme support
- Custom logo upload for personal branding
- HLS playback with automatic quality selection
- Picture-in-picture and fullscreen support
- Dynamic Open Graph image generation for social sharing
- Automatic daily channel synchronization from upstream GitHub repositories
- Channel health monitoring with online / unstable / offline status tracking

## Project Structure

```
streamverse/
├── backend/
│   ├── server.js
│   ├── routes/
│   │   ├── channels.js
│   │   └── proxy.js
│   ├── middleware/
│   │   └── rateLimit.js
│   ├── utils/
│   │   ├── cache.js
│   │   └── m3uParser.js
│   └── data/
│       ├── playlists.json          Source playlist URLs
│       ├── custom.json             Generated channel catalog
│       ├── blocked.json            Offline channel identifiers
│       └── channel-health.json     Health history
├── frontend/
│   ├── src/
│   ├── public/
│   │   └── channels.json           Static fallback catalog
│   └── api/
│       └── og.tsx                  Open Graph image endpoint
├── scripts/
│   ├── refresh_channels.py         Pulls latest entries from live sources
│   ├── enrich_logos.py             Matches logos from iptv-org database
│   └── check_channels.py           Performs health checks
└── .github/workflows/
    └── check-channels.yml          Scheduled maintenance pipeline
```

## Automatic Channel Maintenance

A GitHub Actions workflow runs daily (and on manual dispatch). Each execution:

1. Fetches the latest playlists defined in `backend/data/playlists.json` (iptv-org, Free-TV, community scrapers, and additional country/category sources).
2. Merges new channels into the catalog while preserving existing health status.
3. Enriches missing logos using the iptv-org/database catalog (40,000+ entries).
4. Performs concurrent HEAD requests against every stream URL and updates online / unstable / offline status based on consecutive failure streaks.
5. Commits updated `custom.json`, `blocked.json`, `channel-health.json`, and `frontend/public/channels.json` back to the repository.

Because Vercel and Render redeploy on push, the live application receives the refreshed catalog automatically.

## Getting Started

### Prerequisites

- Node.js 18 or later
- Python 3.11 (only required for the maintenance scripts)

### Local Development

```bash
# Install dependencies
npm run install:all

# Start backend (port 3001)
npm run dev

# In a second terminal, start frontend (port 5000)
npm run dev:frontend
```

Copy `backend/.env.example` to `backend/.env` and `frontend/.env.example` to `frontend/.env`. Adjust `VITE_API_URL` if the backend runs on a different host.

### Production Build

```bash
npm run build
# Serves frontend/dist from the backend when NODE_ENV=production
```

## Deployment

### Backend (Render)

Use the provided `render.yaml`. The free tier is sufficient for moderate traffic. The health-check endpoint is `/health`.

### Frontend (Vercel)

Point the Vercel project root to the `frontend` directory. The `vercel.json` rewrite ensures client-side routing works correctly. Set the environment variable `VITE_API_URL` to your backend URL.

## Environment Variables

Backend (`.env`):

```
PORT=3001
NODE_ENV=development
```

Frontend (`.env`):

```
VITE_API_URL=http://localhost:3001
```

## Adding New Playlist Sources

Edit `backend/data/playlists.json` and append entries of the form:

```json
{
  "url": "https://raw.githubusercontent.com/example/repo/main/playlist.m3u",
  "enabled": true,
  "label": "Example Source"
}
```

The next scheduled workflow run (or a manual trigger) will incorporate any new channels automatically.

## Troubleshooting

- Dependencies missing: run `npm install` inside `backend` and `frontend`.
- Port in use: locate and terminate the process occupying the port.
- Empty channel list: verify the backend is reachable or confirm that `frontend/public/channels.json` exists and is valid JSON.
- Individual streams unavailable: many free sources are geo-restricted or intermittently offline. The health checker will mark them after consecutive failures.

## Design Decisions

- No authentication or user accounts (favorites remain device-local)
- No traditional database; channel data lives in version-controlled JSON files
- Generated data files (`custom.json`, `channel-health.json`, etc.) are produced by the maintenance scripts and can be regenerated at any time

## License

GPL-3.0. Intended for educational use. Comply with applicable local laws and the terms of any third-party stream sources.
