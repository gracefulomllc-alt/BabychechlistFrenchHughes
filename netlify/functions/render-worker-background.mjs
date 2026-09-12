// Background function (name ends in -background): runs the Gemini render without the 10 s limit.
import { store } from "../shared/lib.mjs";
import { renderImage } from "../shared/render.mjs";

export default async (req) => {
  const { job } = await req.json();
  const st = store();
  const key = (process.env.GEMINI_API_KEY || "").trim();
  try {
    await st.setJSON(job, { status: "running", created: Date.now() });
    const t = await st.get(`${job}/req`, { type: "json" });
    const out = await renderImage(key, t);
    await st.set(`${job}/img`, out.image);
    await st.setJSON(job, { status: "done", model: out.model, created: Date.now() });
  } catch (e) {
    await st.setJSON(job, { status: "error", error: e.message, created: Date.now() });
  }
  await st.delete(`${job}/req`).catch(() => {});
  return new Response(null, { status: 202 });
};
export const config = { path: "/api/render-worker" };
