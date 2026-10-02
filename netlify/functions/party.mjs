// Household-only: create, replace, or turn off the family & friends invite link.
// The invite code maps to the household on the server; the household code is never shown to guests.
import { store, clean } from "../shared/lib.mjs";
import { randomBytes } from "node:crypto";

const newCode = () => Array.from(randomBytes(10)).map((b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const h = clean(new URL(req.url).searchParams.get("h"));
  if (!h) return Response.json({ error: "missing household code" }, { status: 400 });
  const { action = "get" } = await req.json().catch(() => ({}));
  const st = store();
  const current = await st.get(`${h}/partycode`);

  if (action === "get" && current) return Response.json({ code: current });
  if (current && (action === "new" || action === "off")) await st.delete(`party/${current}`);
  if (action === "off") { await st.delete(`${h}/partycode`); return Response.json({ code: null }); }

  const code = newCode();
  await st.set(`party/${code}`, h);
  await st.set(`${h}/partycode`, code);
  return Response.json({ code });
};
export const config = { path: "/api/party" };
