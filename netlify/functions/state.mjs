import { getStore } from "@netlify/blobs";

const clean = (s) => (s || "").replace(/[^a-z0-9]/gi, "").slice(0, 24);
const slug = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);

export default async (req) => {
  const url = new URL(req.url);
  const h = clean(url.searchParams.get("h"));
  if (!h) return Response.json({ error: "missing household code" }, { status: 400 });
  const store = getStore("baby-prep");

  if (req.method === "GET") {
    const v = (await store.get(h, { type: "json" })) || { ticks: {}, favorites: [], updated: 0 };
    // Reattach rendered photos stored separately (they're too big for the main doc)
    v.favorites = await Promise.all((v.favorites || []).map(async (f) => {
      if (f.hasImage) { const img = await store.get(`${h}/img/${slug(f.name)}`); if (img) f.image = img; }
      return f;
    }));
    return Response.json(v);
  }

  if (req.method === "POST") {
    const body = await req.json();
    const favorites = [];
    for (const f of (Array.isArray(body.favorites) ? body.favorites : []).slice(0, 12)) {
      const { image, ...rest } = f;
      if (image && image.startsWith("data:")) {
        await store.set(`${h}/img/${slug(f.name)}`, image);
        rest.hasImage = true;
      }
      favorites.push(rest);
    }
    const doc = { ticks: body.ticks || {}, favorites, updated: Date.now() };
    await store.setJSON(h, doc);
    return Response.json({ ok: true, updated: doc.updated });
  }
  return new Response("Method not allowed", { status: 405 });
};

export const config = { path: "/api/state" };
