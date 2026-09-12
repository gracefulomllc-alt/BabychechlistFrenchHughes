// Synchronous render (fallback when background functions aren't available). May hit the 10 s limit.
import { clean, takeQuota } from "../shared/lib.mjs";
import { renderImage } from "../shared/render.mjs";

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const key = (process.env.GEMINI_API_KEY || "").trim();
  if (!key) return Response.json({ error: "Photo renders need GEMINI_API_KEY set on this site." }, { status: 400 });
  const h = clean(new URL(req.url).searchParams.get("h"));
  if (!h) return Response.json({ error: "missing household code" }, { status: 400 });
  const q = await takeQuota(h, "render", 40, 300);
  if (!q.ok) return Response.json({ error: q.error }, { status: 429 });
  try { return Response.json(await renderImage(key, await req.json())); }
  catch (e) { return Response.json({ error: e.message }, { status: 502 }); }
};
export const config = { path: "/api/render" };
