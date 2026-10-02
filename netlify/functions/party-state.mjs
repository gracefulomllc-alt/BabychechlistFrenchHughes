// Guest-facing endpoint for the family & friends name game.
// Guests can only: see guest swipes, friend-suggested names and the daily drop; save their OWN swipes; suggest names.
// Guests see Leslie & Terel's likes and matches (never their passes). They never see the household code or anything else.
import { store, clean, takeQuota } from "../shared/lib.mjs";
import { readSwipes, writeSwipe, readGuestNames, writeGuestName, readCustomNames, addCustomName, NAME_RE, GUEST_RE } from "../shared/swipes.mjs";

async function snapshot(st, h) {
  const all = await readSwipes(st, h);
  const likesOf = (k) => Object.entries(all[k] || {}).filter(([, v]) => v === "like").map(([n]) => n).sort();
  const l = likesOf("leslie"), t = likesOf("anthony"), ts = new Set(t);
  const parents = { leslie: l, terel: t, matches: l.filter((n) => ts.has(n)) };
  const guests = Object.fromEntries(Object.entries(all).filter(([k]) => k.startsWith("guest:")));
  const doc = (await st.get(h, { type: "json" })) || {};
  const legacyNames = Object.fromEntries(Object.entries((doc.meta && doc.meta.guestNames) || {}).filter(([k, v]) => k.startsWith("guest:") && GUEST_RE.test(String(v))));
  const guestNames = Object.assign(legacyNames, await readGuestNames(st, h));
  const custom = await readCustomNames(st, h);
  const { blobs } = await st.list({ prefix: `${h}/daily/` });
  const keys = blobs.map((b) => b.key).sort().slice(-30);
  const daily = await Promise.all(keys.map(async (k) => ({ date: k.split("/")[2], names: (await st.get(k, { type: "json" })) || [] })));
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Denver" });
  const due = doc.meta && /^\d{4}-\d{2}-\d{2}$/.test(doc.meta.due || "") ? doc.meta.due : null;   // only the date, nothing else from the household
  return { guests, guestNames, custom, daily, today, parents, due };
}

export default async (req) => {
  const code = clean(new URL(req.url).searchParams.get("p"));
  const st = store();
  const h = code ? await st.get(`party/${code}`) : null;
  if (!h) return Response.json({ error: "This invite link isn't active anymore — ask Leslie or Terel for a new one." }, { status: 404 });

  if (req.method === "GET") return Response.json(await snapshot(st, h));
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const body = await req.json().catch(() => ({}));
  const guest = String(body.guest || "").trim();
  if (!GUEST_RE.test(guest)) return Response.json({ error: "Please enter your name (letters and numbers only)." }, { status: 400 });
  const bucket = `guest:${guest.toLowerCase()}`;
  let saved = 0;
  if (body.swipeSet && typeof body.swipeSet === "object") {
    for (const [n, v] of Object.entries(body.swipeSet).slice(0, 60)) {
      if (!NAME_RE.test(n)) continue;
      await writeSwipe(st, h, bucket, n.toLowerCase(), v === "like" || v === "pass" ? v : null); saved++;
    }
  }
  let suggested = null;
  if (body.suggest) {
    const q = await takeQuota(h, "suggest", 80, 500);
    if (!q.ok) return Response.json({ error: "Lots of suggestions today! Try again tomorrow." }, { status: 429 });
    suggested = await addCustomName(st, h, body.suggest.n, body.suggest.g, guest);
    if (suggested.error) return Response.json({ error: suggested.error }, { status: 400 });
    await writeSwipe(st, h, bucket, String(body.suggest.n).trim().toLowerCase(), "like"); // you like what you suggest
  }
  if (saved || (suggested && !suggested.error) || body.join) await writeGuestName(st, h, guest); // only real players get listed
  return Response.json({ ok: true, bucket, suggested, ...(await snapshot(st, h)) });
};
export const config = { path: "/api/party-state" };
