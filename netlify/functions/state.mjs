import { store, clean, slug, normalize } from "../shared/lib.mjs";

const enc = (x) => encodeURIComponent(String(x).toLowerCase().slice(0, 60));
async function readSwipes(st, h, legacy) {
  const out = {};
  const { blobs } = await st.list({ prefix: `${h}/sw/` });
  for (const { key } of blobs) {
    const rest = key.slice(`${h}/sw/`.length); const slash = rest.indexOf("/"); const eq = rest.lastIndexOf("=");
    if (slash < 0 || eq < slash) continue;
    const b = decodeURIComponent(rest.slice(0, slash)), n = decodeURIComponent(rest.slice(slash + 1, eq)), v = rest.slice(eq + 1);
    if (v === "like" || v === "pass") (out[b] = out[b] || {})[n] = v;
  }
  // Fold in any swipes still in the old single-document format (only where no newer record exists)
  for (const [b, e] of Object.entries(legacy || {})) for (const [n, v] of Object.entries(e || {}))
    if ((v === "like" || v === "pass") && !(out[b] && n in out[b])) (out[b] = out[b] || {})[n] = v;
  return out;
}
async function writeSwipe(st, h, b, n, v) {
  const base = `${h}/sw/${enc(b)}/${enc(n)}`;
  await Promise.all([st.delete(`${base}=like`), st.delete(`${base}=pass`)]);
  if (v === "like" || v === "pass") await st.set(`${base}=${v}`, "1");
}
async function resetBucket(st, h, b) {
  const { blobs } = await st.list({ prefix: `${h}/sw/${enc(b)}/` });
  await Promise.all(blobs.map(({ key }) => st.delete(key)));
}

export default async (req) => {
  const url = new URL(req.url);
  const h = clean(url.searchParams.get("h"));
  if (!h) return Response.json({ error: "missing household code" }, { status: 400 });
  const st = store();

  if (req.method === "GET") {
    const v = normalize(await st.get(h, { type: "json" }));
    v.favorites = await Promise.all((v.favorites || []).map(async (f) => {
      if (f.hasImage) { const img = await st.get(`${h}/img/${slug(f.name)}`); if (img) f.image = img; }
      return f;
    }));
    v.meta.swipes = await readSwipes(st, h, v.meta.swipes);
    return Response.json(v);
  }

  if (req.method === "POST") {
    const body = await req.json();
    const doc = normalize(await st.get(h, { type: "json" }));

    // Merge-safe patch: only the fields provided are touched; ticks merge by timestamp.
    const p = body.patch || {};
    if (p.ticks) for (const [id, t] of Object.entries(p.ticks)) {
      const cur = doc.ticks[id];
      if (!cur || (t.t || 0) >= (cur.t || 0)) doc.ticks[id] = { v: !!t.v, t: t.t || Date.now(), by: ["leslie", "anthony", "both", "other"].includes(t.by) ? t.by : undefined, byName: t.byName ? String(t.byName).slice(0, 40) : undefined };
    }
    if (p.notes) for (const [id, n] of Object.entries(p.notes)) { if (n) doc.notes[id] = String(n).slice(0, 500); else delete doc.notes[id]; }
    if (p.sources) for (const [id, v] of Object.entries(p.sources)) { if (v && v.from) doc.sources[id] = { type: String(v.type || "gift").slice(0, 20), from: String(v.from).slice(0, 60) }; else delete doc.sources[id]; }
    if (p.hidden) for (const [id, v] of Object.entries(p.hidden)) { if (v) doc.hidden[id] = true; else delete doc.hidden[id]; }
    if (p.customAdd) for (const c of p.customAdd) {
      if (!c.id || !c.name) continue;
      if (!doc.custom.some((x) => x.id === c.id)) doc.custom.push({ id: String(c.id).slice(0, 40), name: String(c.name).slice(0, 120), note: String(c.note || "").slice(0, 300), when: ["now","m3","m1","bag"].includes(c.when) ? c.when : "m3", sec: String(c.sec || "home").slice(0, 20) });
      if (doc.custom.length > 200) doc.custom = doc.custom.slice(-200);
    }
    if (p.customRemove) doc.custom = doc.custom.filter((c) => !p.customRemove.includes(c.id));
    const { swipes: legacySwipes, guestNames, ...restMeta } = p.meta || {};
    if (p.meta) {
      Object.assign(doc.meta, restMeta);
      // guestNames only ever grows — merge, never replace
      if (guestNames && typeof guestNames === "object") doc.meta.guestNames = Object.assign(doc.meta.guestNames || {}, guestNames);
    }
    // Swipes live as one record per swipe, so two phones swiping at the same instant can never erase each other.
    const legacyDoc = doc.meta.swipes; delete doc.meta.swipes;
    const current = await readSwipes(st, h, legacyDoc);
    if (legacyDoc) for (const [bk, e] of Object.entries(legacyDoc)) for (const [n, v] of Object.entries(e || {}))
      if (v === "like" || v === "pass") await writeSwipe(st, h, bk, n, current[bk]?.[n] || v);   // one-time migration
    if (legacySwipes && typeof legacySwipes === "object")                                            // older app versions: additive only
      for (const [bk, e] of Object.entries(legacySwipes)) for (const [n, v] of Object.entries(e || {}))
        if ((v === "like" || v === "pass") && !(current[bk] && n in current[bk])) await writeSwipe(st, h, bk, String(n).toLowerCase(), v);
    if (Array.isArray(p.swipeReset)) for (const bk of p.swipeReset) await resetBucket(st, h, bk);
    if (p.swipeSet && typeof p.swipeSet === "object")
      for (const [bk, e] of Object.entries(p.swipeSet)) for (const [n, v] of Object.entries(e || {})) await writeSwipe(st, h, bk, String(n).toLowerCase(), v);
    if (p.favorites) {
      const favs = [];
      for (const f of p.favorites.slice(0, 12)) {
        const { image, ...rest } = f;
        if (image && image.startsWith("data:")) { await st.set(`${h}/img/${slug(f.name)}`, image); rest.hasImage = true; }
        else if (doc.favorites.find((x) => x.name === f.name)?.hasImage) rest.hasImage = true;
        favs.push(rest);
      }
      doc.favorites = favs;
    }
    if (body.reset) doc.ticks = {};
    doc.updated = Date.now();
    await st.setJSON(h, doc);
    return Response.json({ ok: true, updated: doc.updated, swipes: await readSwipes(st, h) });
  }
  return new Response("Method not allowed", { status: 405 });
};

export const config = { path: "/api/state" };
