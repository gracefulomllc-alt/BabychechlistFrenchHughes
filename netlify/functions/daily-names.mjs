// Daily Drop: once per day (Mountain time) per household, Gemini generates 30 fresh names that
// nobody in the household has seen before. Each batch is stored as its own record, so two phones
// opening the app at the same moment can never overwrite each other's batch.
import { store, clean, takeQuota } from "../shared/lib.mjs";

const PER_DAY = 30;
const dayKey = (d = new Date()) => d.toLocaleDateString("en-CA", { timeZone: "America/Denver" }); // YYYY-MM-DD

const SYSTEM = `You are a thoughtful baby-name consultant. Return ONLY valid JSON, no markdown.
Schema: {"names":[{"n":"Name","g":"b|g|n","s":"classic|unique","m":"short meaning","o":"origin"}]}
Rules:
- Exactly ${PER_DAY} names: 10 boy (g:"b"), 10 girl (g:"g"), 10 gender-neutral (g:"n").
- Roughly 40% classic, 60% unique. Real, wearable names — no invented gibberish, no novelty spellings unless genuinely in use.
- The family is a mixed-race couple (Black father, white mother). Favor names that feel warm, modern and beautiful across both
  heritages: African, African-American, Afro-Caribbean, and European roots, plus names popular with blended families.
- Vary origins and sounds day to day. Never repeat any name from the exclusion list (case-insensitive).
- "m" under 60 characters, "o" under 30 characters. Name is letters, spaces, hyphens or apostrophes only.`;

const clip = (x, n) => String(x || "").replace(/[<>"`]/g, "").trim().slice(0, n);
function sanitize(list, seen) {
  const out = [];
  for (const x of Array.isArray(list) ? list : []) {
    const n = String((x && x.n) || "").trim();
    if (!/^[A-Za-z][A-Za-z' -]{0,29}$/.test(n)) continue;   // reject anything that isn't a clean name — don't try to repair it
    const k = n.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ n, g: ["b", "g", "n"].includes(x.g) ? x.g : "n", s: x.s === "classic" ? "classic" : "unique", m: clip(x.m, 60), o: clip(x.o, 30) });
  }
  return out;
}

async function askGemini(key, exclude) {
  const prompt = `Today's ${PER_DAY} names, please.\nExclusion list (already seen — do not use): ${exclude.join(", ")}`;
  const models = (process.env.GEMINI_TEXT_MODEL ? [process.env.GEMINI_TEXT_MODEL] : []).concat(["gemini-2.5-flash", "gemini-3.1-flash", "gemini-3.7-flash"]);
  let r;
  for (const m of models) {
    r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 1.0 },
      }),
    });
    if (r.status !== 404) break;
  }
  if (!r.ok) throw new Error(`Gemini ${r.status}`);
  const data = await r.json();
  const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").replace(/```json|```/g, "").trim();
  return JSON.parse(text).names;
}

async function readBatches(st, h) {
  const { blobs } = await st.list({ prefix: `${h}/daily/` });
  const keys = blobs.map((b) => b.key).sort().slice(-90); // keep the last ~90 batches
  const batches = await Promise.all(keys.map(async (k) => ({ date: k.split("/")[2], names: (await st.get(k, { type: "json" })) || [] })));
  return batches;
}

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const h = clean(new URL(req.url).searchParams.get("h"));
  if (!h) return Response.json({ error: "missing household code" }, { status: 400 });
  const st = store();
  const today = dayKey();
  let batches = await readBatches(st, h);
  let note = "";

  if (!batches.some((b) => b.date === today)) {
    const key = (process.env.GEMINI_API_KEY || "").trim();
    if (!key) note = "Daily names need GEMINI_API_KEY set on the site.";
    else {
      const q = await takeQuota(h, "daily-names", 3, 300);
      if (!q.ok) note = q.error;
      else {
        try {
          const body = await req.json().catch(() => ({}));
          const seen = new Set([...(Array.isArray(body.exclude) ? body.exclude : []), ...batches.flatMap((b) => b.names.map((x) => x.n))].map((x) => String(x).toLowerCase()));
          const exclude = [...seen].slice(-1500);
          const fresh = sanitize(await askGemini(key, exclude), new Set(seen));
          if (fresh.length) {
            await st.setJSON(`${h}/daily/${today}/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, fresh);
            batches = await readBatches(st, h);
          } else note = "The AI didn't return usable names this time.";
        } catch (e) { note = `Couldn't fetch today's names (${e.message}).`; }
      }
    }
  }
  return Response.json({ today, batches, note });
};

export const config = { path: "/api/daily-names" };
