import { getStore } from "@netlify/blobs";

const clean = (s) => (s || "").replace(/[^a-z0-9]/gi, "").slice(0, 24);

export default async (req) => {
  const url = new URL(req.url);
  const h = clean(url.searchParams.get("h"));
  if (!h) return Response.json({ error: "missing household code" }, { status: 400 });
  const store = getStore("baby-prep");

  if (req.method === "GET") {
    const v = await store.get(h, { type: "json" });
    return Response.json(v || { ticks: {}, favorites: [], updated: 0 });
  }
  if (req.method === "POST") {
    const body = await req.json();
    const doc = {
      ticks: body.ticks || {},
      favorites: Array.isArray(body.favorites) ? body.favorites.slice(0, 20) : [],
      updated: Date.now(),
    };
    await store.setJSON(h, doc);
    return Response.json({ ok: true, updated: doc.updated });
  }
  return new Response("Method not allowed", { status: 405 });
};

export const config = { path: "/api/state" };
