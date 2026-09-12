import { store } from "../shared/lib.mjs";
export default async (req) => {
  const job = new URL(req.url).searchParams.get("job") || "";
  if (!/^[a-z0-9]+\/job\/[a-z0-9]+$/i.test(job)) return Response.json({ error: "bad job" }, { status: 400 });
  const st = store();
  const s = await st.get(job, { type: "json" });
  if (!s) return Response.json({ status: "missing" });
  if (s.status === "done") { const img = await st.get(`${job}/img`); return Response.json({ status: "done", image: img }); }
  return Response.json(s);
};
export const config = { path: "/api/render-status" };
