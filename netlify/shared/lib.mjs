import { getStore } from "@netlify/blobs";
export const store = () => getStore("baby-prep");
export const clean = (s) => (s || "").replace(/[^a-z0-9]/gi, "").slice(0, 24);
export const slug = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
export const today = () => new Date().toISOString().slice(0, 10);

// Per-household + global daily caps to protect the API key from abuse.
export async function takeQuota(h, kind, perHouse, globalCap) {
  const st = store();
  const d = today();
  const hk = `${h}/quota/${d}/${kind}`, gk = `global/quota/${d}/${kind}`;
  const hc = Number((await st.get(hk)) || 0), gc = Number((await st.get(gk)) || 0);
  if (hc >= perHouse) return { ok: false, error: `Daily limit reached for this household (${perHouse} ${kind}s/day). Try again tomorrow.` };
  if (gc >= globalCap) return { ok: false, error: `Site-wide daily limit reached. Try again tomorrow.` };
  await st.set(hk, String(hc + 1)); await st.set(gk, String(gc + 1));
  return { ok: true, used: hc + 1, left: perHouse - hc - 1 };
}

export function emptyDoc() { return { ticks: {}, notes: {}, hidden: {}, custom: [], sources: {}, meta: {}, favorites: [], updated: 0 }; }

// Upgrade old {id:true} ticks to {id:{v:true,t:ts}}
export function normalize(doc) {
  const d = Object.assign(emptyDoc(), doc || {});
  for (const k of Object.keys(d.ticks)) if (typeof d.ticks[k] !== "object") d.ticks[k] = { v: !!d.ticks[k], t: d.updated || 1 };
  return d;
}
