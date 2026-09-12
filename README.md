# Baby Prep — shared checklist + nursery planner

Two-tab site: a shared "before baby arrives" checklist and an AI nursery theme planner with photo renders.

## Deploy (GitHub → Netlify)

1. Push this folder to a GitHub repo.
2. Netlify: **Add new project → Import an existing project → GitHub → pick the repo.** `netlify.toml` sets publish dir `public`.
3. **Site configuration → Environment variables**, add one or both (mark Secret; on the free plan paste the value into *Production*):
   - `GEMINI_API_KEY` — from aistudio.google.com → API keys. Needed for photo renders, and for the Gemini designer.
   - `ANTHROPIC_API_KEY` — from console.anthropic.com. Optional; enables the Claude designer.
4. **Deploys → Trigger deploy** once after adding keys.
5. Open the site, tap **Copy share link**, send it to anyone who should share the list.

## What's in it

**Checklist** — 100+ items with brands, buy links, plain-English explanations, timing tags.
- Due date → each timing tag becomes a real date; a **Behind** filter shows overdue unticked items.
- Add your own items to any category; hide items that don't apply; per-item notes ("ordered 9/14", "Mom is buying this").
- Ticks, notes, custom items and hidden items are shared across everyone on the household link and merge safely
  (each tick carries a timestamp; the server keeps the latest, so two people ticking at once don't overwrite each other).

**Nursery** — pick vibes, light, furniture finish, and layout details; choose Claude / Gemini / Auto as designer.
- Four themes with palette, paint matches, decor list, Pinterest/Houzz links.
- Each theme is rendered as a photo by Gemini's image model. Upload a photo of the real room and renders are painted onto it.
- Renders run as background jobs (no 10-second function timeout) and fall back to a direct call if background functions
  aren't available on the plan. Saved themes keep their photo.

**Protection** — every AI endpoint requires a household code and is capped per household (20 designs, 40 renders per day)
and site-wide (150 / 300 per day) so a leaked link can't run up the bill. Household codes are 10 characters.

**Installable** — Add to Home Screen on iPhone/Android; the shell opens offline, data syncs when online.

## Files

- `public/index.html` — the entire front end
- `public/manifest.json`, `public/sw.js`, `public/icon-*.png` — PWA bits
- `netlify/functions/state.mjs` — shared list state (merge-safe patches)
- `netlify/functions/nursery.mjs` — theme design (Claude or Gemini)
- `netlify/functions/render-start.mjs`, `render-worker-background.mjs`, `render-status.mjs` — background photo renders
- `netlify/functions/render.mjs` — synchronous render fallback
- `netlify/functions/room.mjs` — the household's room photo
- `netlify/shared/` — code shared by the functions (quota, Gemini image call)

## Costs

Designs: ~2¢ each on Claude, free-tier on Gemini. Renders: a few cents each on Gemini (4 per design click).
If Gemini's free tier refuses image generation, enable billing on the key in AI Studio.
