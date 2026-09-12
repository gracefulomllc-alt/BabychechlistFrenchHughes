// Nursery theme designer — works with either ANTHROPIC_API_KEY or GEMINI_API_KEY.
// If both are set, Claude is used. If neither, returns a clear error.

const SYSTEM = `You are an interior designer who specializes in nurseries. Return ONLY valid JSON, no markdown, no preamble.
Schema:
{"themes":[{
  "name":"short theme name",
  "vibe":"one sentence on the feel of the room",
  "palette":[
    {"role":"wall","hex":"#RRGGBB","name":"plain-English color name"},
    {"role":"accent","hex":"#RRGGBB","name":"..."},
    {"role":"textile","hex":"#RRGGBB","name":"..."},
    {"role":"trim","hex":"#RRGGBB","name":"..."},
    {"role":"pop","hex":"#RRGGBB","name":"..."}
  ],
  "paint":["2 well-known paint colors close to the wall color, brand + name, e.g. 'Sherwin-Williams Sea Salt'"],
  "furniture":"crib / dresser finish that fits (white, natural oak, walnut, black)",
  "accents":["4-5 concrete decor ideas: rug, mobile, wall art, lighting, plants"],
  "search":"a 3-5 word phrase to search on Pinterest for this look"
}]}
Rules: exactly 4 themes, each distinctly different. Gender-neutral unless told otherwise. Real, harmonious hex values that would actually work together on a wall. Keep every string under 140 characters.`;

function layoutText(L={}) {
  const lines = [];
  if (L.crib && !/designer/i.test(L.crib)) lines.push(`Crib: ${L.crib}.`);
  if (L.chair) lines.push(/skip/i.test(L.chair) ? "No glider/chair." : `Glider chair: ${L.chair}.`);
  if (L.dresser) lines.push(/skip/i.test(L.dresser) ? "No dresser." : `Dresser with changing pad on top: ${L.dresser}.`);
  if (L.window) lines.push(`Window treatment: ${L.window}.`);
  if (L.floor) lines.push(`Floor: ${L.floor}.`);
  if (L.walls) lines.push(`Walls: ${L.walls}.`);
  if (L.lighting) lines.push(`Lighting: ${L.lighting}.`);
  if (L.extras && L.extras.length) lines.push(`Also include: ${L.extras.join(", ")}.`);
  return lines.join("\n");
}
function buildPrompt({ vibes = [], light = "", furniture = "", layout = {}, notes = "" }) {
  return `Design 4 nursery themes.
Desired vibes: ${vibes.join(", ") || "designer's choice"}.
Room light: ${light || "unknown"}.
Existing furniture finish: ${furniture || "none yet"}.
Layout the parents have decided (respect it in your accents and suggestions):
${layoutText(layout) || "(none given)"}
Parents' notes: ${notes || "none"}.
Baby's sex is a surprise — keep every theme gender-neutral.`;
}

async function askClaude(key, prompt) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 2500, system: SYSTEM, messages: [{ role: "user", content: prompt }] }),
  });
  if (!r.ok) throw new Error(`Anthropic API ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return data.content.filter((c) => c.type === "text").map((c) => c.text).join("\n");
}

async function askGemini(key, prompt) {
  const models = (process.env.GEMINI_TEXT_MODEL ? [process.env.GEMINI_TEXT_MODEL] : []).concat(["gemini-2.5-flash", "gemini-3.1-flash", "gemini-3.7-flash"]);
  let r;
  for (const m of models) {
    r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.9 },
    }),
    });
    if (r.status !== 404) break;
  }
  if (!r.ok) throw new Error(`Gemini API ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("\n");
}

import { clean, takeQuota } from "../shared/lib.mjs";

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const h = clean(new URL(req.url).searchParams.get("h"));
  if (!h) return Response.json({ error: "missing household code" }, { status: 400 });
  const q = await takeQuota(h, "design", 20, 150);
  if (!q.ok) return Response.json({ error: q.error }, { status: 429 });
  const claudeKey = (process.env.ANTHROPIC_API_KEY || "").trim();
  const geminiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!claudeKey && !geminiKey) {
    return Response.json({ error: "No AI key set. Add ANTHROPIC_API_KEY or GEMINI_API_KEY in Netlify → Site configuration → Environment variables, then redeploy." }, { status: 500 });
  }

  const body = await req.json();
  const prompt = buildPrompt(body);
  const want = (body.provider || "auto").toLowerCase();
  if (want === "claude" && !claudeKey) return Response.json({ error: "Claude isn't set up on this site yet (no ANTHROPIC_API_KEY)." }, { status: 400 });
  if (want === "gemini" && !geminiKey) return Response.json({ error: "Gemini isn't set up on this site yet (no GEMINI_API_KEY)." }, { status: 400 });
  let text, provider;
  try {
    if (want === "gemini" || (want === "auto" && !claudeKey)) { provider = "gemini"; text = await askGemini(geminiKey, prompt); }
    else { provider = "claude"; text = await askClaude(claudeKey, prompt); }
  } catch (e) {
    // Auto mode: if Claude fails and Gemini is available, fall back.
    if (want === "auto" && provider === "claude" && geminiKey) {
      try { provider = "gemini"; text = await askGemini(geminiKey, prompt); }
      catch (e2) { return Response.json({ error: `${e.message} — then ${e2.message}` }, { status: 502 }); }
    } else {
      return Response.json({ error: e.message }, { status: 502 });
    }
  }

  const clean = text.replace(/```json|```/g, "").trim();
  try {
    const parsed = JSON.parse(clean);
    parsed.provider = provider;
    return Response.json(parsed);
  } catch {
    return Response.json({ error: `${provider} returned malformed JSON`, raw: clean }, { status: 502 });
  }
};

export const config = { path: "/api/nursery" };
