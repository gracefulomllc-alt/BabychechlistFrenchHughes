// Starts a background render job: stores the request, returns a job id immediately.
import { store, clean, takeQuota } from "../shared/lib.mjs";

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!(process.env.GEMINI_API_KEY || "").trim()) return Response.json({ error: "Photo renders need GEMINI_API_KEY set on this site." }, { status: 400 });
  const h = clean(new URL(req.url).searchParams.get("h"));
  if (!h) return Response.json({ error: "missing household code" }, { status: 400 });
  const q = await takeQuota(h, "render", 40, 300);
  if (!q.ok) return Response.json({ error: q.error }, { status: 429 });

  const job = `${h}/job/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const st = store();
  await st.setJSON(job, { status: "queued", created: Date.now() });
  await st.setJSON(`${job}/req`, await req.json());

  // Fire the background worker (its response is ignored; it runs up to 15 min).
  const origin = new URL(req.url).origin;
  fetch(`${origin}/api/render-worker`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ job }) }).catch(() => {});
  return Response.json({ job }, { status: 202 });
};
export const config = { path: "/api/render-start" };
