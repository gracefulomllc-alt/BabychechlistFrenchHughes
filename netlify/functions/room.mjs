// Stores the household's nursery photo (one per household code) for photo-based renders.
import { getStore } from "@netlify/blobs";
const clean = (s) => (s || "").replace(/[^a-z0-9]/gi, "").slice(0, 24);

export default async (req) => {
  const url = new URL(req.url);
  const h = clean(url.searchParams.get("h"));
  if (!h) return Response.json({ error: "missing household code" }, { status: 400 });
  const store = getStore("baby-prep");
  const key = `${h}/room`;

  if (req.method === "GET") {
    const img = await store.get(key);
    return Response.json({ image: img || null });
  }
  if (req.method === "POST") {
    const { image } = await req.json();
    if (!image || !image.startsWith("data:image/")) return Response.json({ error: "no image" }, { status: 400 });
    if (image.length > 4_500_000) return Response.json({ error: "Photo too large — try again, it should shrink automatically." }, { status: 413 });
    await store.set(key, image);
    return Response.json({ ok: true });
  }
  if (req.method === "DELETE") {
    await store.delete(key);
    return Response.json({ ok: true });
  }
  return new Response("Method not allowed", { status: 405 });
};

export const config = { path: "/api/room" };
