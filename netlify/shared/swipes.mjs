// Shared, collision-proof storage for swipes, guest names, and friend-suggested names.
// Every item is its own record, so many people saving at once can never overwrite each other.
export const enc = (x) => encodeURIComponent(String(x).toLowerCase().slice(0, 60));
export async function readSwipes(st, h, legacy) {
  const out = {};
  const { blobs } = await st.list({ prefix: `${h}/sw/` });
  for (const { key } of blobs) {
    const rest = key.slice(`${h}/sw/`.length); const slash = rest.indexOf("/"); const eq = rest.lastIndexOf("=");
    if (slash < 0 || eq < slash) continue;
    const b = decodeURIComponent(rest.slice(0, slash)), n = decodeURIComponent(rest.slice(slash + 1, eq)), v = rest.slice(eq + 1);
    if (v === "like" || v === "pass") (out[b] = out[b] || {})[n] = v;
  }
  // Fold in any swipes still in the old single-document format (only where no newer record exists)
  for (const [b, e] of Object.entries(legacy || {})) for (const [n, v] of Object.entries(e || {}))
    if ((v === "like" || v === "pass") && !(out[b] && n in out[b])) (out[b] = out[b] || {})[n] = v;
  return out;
}
export async function writeSwipe(st, h, b, n, v) {
  const base = `${h}/sw/${enc(b)}/${enc(n)}`;
  await Promise.all([st.delete(`${base}=like`), st.delete(`${base}=pass`)]);
  if (v === "like" || v === "pass") await st.set(`${base}=${v}`, "1");
}
export async function resetBucket(st, h, b) {
  const { blobs } = await st.list({ prefix: `${h}/sw/${enc(b)}/` });
  await Promise.all(blobs.map(({ key }) => st.delete(key)));
}


export const NAME_RE = /^[A-Za-z][A-Za-z' -]{0,29}$/;          // baby names
export const GUEST_RE = /^[A-Za-z0-9][A-Za-z0-9' .-]{0,29}$/;  // people's names

// Guest display names: `${h}/gn/<lowercased>` = "Display Name"
export async function readGuestNames(st, h) {
  const out = {};
  const { blobs } = await st.list({ prefix: `${h}/gn/` });
  await Promise.all(blobs.map(async ({ key }) => { const lower = decodeURIComponent(key.slice(`${h}/gn/`.length)); const v = await st.get(key); if (v) out[`guest:${lower}`] = v; }));
  return out;
}
export async function writeGuestName(st, h, display) {
  const d = String(display || "").trim();
  if (!GUEST_RE.test(d)) return null;
  await st.set(`${h}/gn/${enc(d)}`, d);
  return `guest:${d.toLowerCase()}`;
}

// Friend-suggested names: `${h}/cn/<lowercased>` = {n,g,s,m,o,by,at}
export async function readCustomNames(st, h) {
  const { blobs } = await st.list({ prefix: `${h}/cn/` });
  const list = await Promise.all(blobs.map(({ key }) => st.get(key, { type: "json" })));
  return list.filter(Boolean).sort((a, b) => (a.at || 0) - (b.at || 0));
}
export async function addCustomName(st, h, n, g, by) {
  const name = String(n || "").trim(), who = String(by || "").trim();
  if (!NAME_RE.test(name)) return { error: "Names can only use letters, spaces, hyphens and apostrophes." };
  if (who && !GUEST_RE.test(who)) return { error: "bad suggester name" };
  const key = `${h}/cn/${enc(name)}`;
  if (await st.get(key)) return { exists: true, name };
  const rec = { n: name.charAt(0).toUpperCase() + name.slice(1), g: ["b", "g", "n"].includes(g) ? g : "n", s: "unique", m: who ? `Suggested by ${who}` : "Suggested by family", o: "Family pick", by: who, at: Date.now() };
  await st.setJSON(key, rec);
  return { added: rec };
}
