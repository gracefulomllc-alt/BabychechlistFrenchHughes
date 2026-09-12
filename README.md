# Baby Prep — shared checklist + nursery planner

Two-tab site: a shared "before baby arrives" checklist and a Claude-powered nursery theme planner.

## Deploy (GitHub → Netlify)

1. Create a new GitHub repo (e.g. `baby-prep`) and upload everything in this folder
   (drag the folder contents into the GitHub web uploader is fine).
2. In Netlify: **Add new project → Import an existing project → GitHub → pick the repo.**
   Build settings are read from `netlify.toml` (publish dir `public`, no build command).
3. In the Netlify project: **Site configuration → Environment variables → Add**
   `ANTHROPIC_API_KEY` = your key from console.anthropic.com. Mark it secret.
   Redeploy once after adding it (Deploys → Trigger deploy).
4. Open the site. It creates a 6-character household code and puts it in the URL.
   Tap **Copy share link** and send that link to anyone who should share the list.

## How sharing works

- Ticks and saved themes are stored in Netlify Blobs under the household code in the URL (`?h=ABC123`).
- Everyone using the same link sees the same list; the page checks for changes every 8 seconds.
- Different code = separate list. To start fresh, remove `?h=…` from the URL and reload.
- If the functions can't be reached, ticks fall back to that device's localStorage and re-sync later.

## Files

- `public/index.html` — the whole front end (checklist data, nursery UI, room preview)
- `netlify/functions/state.mjs` — GET/POST shared state (`/api/state?h=CODE`)
- `netlify/functions/nursery.mjs` — calls the Anthropic API and returns 4 themes as JSON (`/api/nursery`)
- `netlify.toml`, `package.json` — Netlify config and the Blobs dependency

## Cost note

Each "Design 4 themes" click is one Claude Sonnet call (~$0.02). The shared-state functions are free-tier usage.
