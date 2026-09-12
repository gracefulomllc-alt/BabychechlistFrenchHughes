// Weekly bump photos: one per week per household. GET list, GET ?w= image, POST {w,image}, DELETE ?w=
import { store, clean } from "../shared/lib.mjs";
export default async (req) => {
  const url = new URL(req.url); const h = clean(url.searchParams.get("h")); const w = parseInt(url.searchParams.get("w") || "0", 10);
  if (!h) return Response.json({ error: "missing household code" }, { status: 400 });
  const st = store();
  if (req.method === "GET") {
    if (w) { const img = await st.get(`${h}/bump/${w}`); return Response.json({ w, image: img || null }); }
    const list = await st.list({ prefix: `${h}/bump/` });
    return Response.json({ weeks: list.blobs.map((b) => parseInt(b.key.split("/").pop(), 10)).filter(Boolean).sort((a, b) => a - b) });
  }
  if (req.method === "POST") {
    const body = await req.json(); const week = parseInt(body.w, 10);
    if (!week || week < 4 || week > 42 || !body.image || !body.image.startsWith("data:image/")) return Response.json({ error: "bad request" }, { status: 400 });
    if (body.image.length > 2_500_000) return Response.json({ error: "Photo too large" }, { status: 413 });
    await st.set(`${h}/bump/${week}`, body.image); return Response.json({ ok: true });
  }
  if (req.method === "DELETE") { if (w) await st.delete(`${h}/bump/${w}`); return Response.json({ ok: true }); }
  return new Response("Method not allowed", { status: 405 });
};
export const config = { path: "/api/bump" };
