# Baby Prep — shared checklist + nursery planner

Two-tab site: a shared "before baby arrives" checklist and a Claude-powered nursery theme planner.

## Deploy (GitHub → Netlify)

1. Create a new GitHub repo (e.g. `baby-prep`) and upload everything in this folder
   (drag the folder contents into the GitHub web uploader is fine).
2. In Netlify: **Add new project → Import an existing project → GitHub → pick the repo.**
   Build settings are read from `netlify.toml` (publish dir `public`, no build command).
3. In the Netlify project: **Site configuration → Environment variables → Add** ONE of:
   - `ANTHROPIC_API_KEY` (console.anthropic.com → API Keys), or
   - `GEMINI_API_KEY` (aistudio.google.com → Get API key)
   Mark it secret. If both are set, Claude is used with Gemini as fallback.
   Redeploy once after adding it (Deploys → Trigger deploy).
4. Open the site. It creates a 6-character household code and puts it in the URL.
   Tap **Copy share link** and send that link to anyone who should share the list.

## Photo renders

**Use your own room:** on the Nursery tab, upload a photo of the actual room (phone camera works). It's saved for the
household and every theme is then rendered onto that photo — same walls, window and floor, new colors and decor.
Tips for a good base photo: stand in the doorway, shoot in daylight, get the whole room in frame, landscape orientation.

Each theme is auto-rendered as a photo by Gemini's image model (`gemini-3.1-flash-image`). This needs `GEMINI_API_KEY`
even if Claude is doing the designing. Renders cost a few cents each (4 per "Design" click). Saved themes keep their photo.

If renders time out, raise the function timeout in Netlify (Site configuration → Functions) — image generation can take 8–15 s.

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
