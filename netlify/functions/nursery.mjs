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

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return Response.json({ error: "ANTHROPIC_API_KEY is not set on this site." }, { status: 500 });

  const { vibes = [], light = "", furniture = "", notes = "" } = await req.json();
  const prompt = `Design 4 nursery themes.
Desired vibes: ${vibes.join(", ") || "designer's choice"}.
Room light: ${light || "unknown"}.
Existing furniture finish: ${furniture || "none yet"}.
Parents' notes: ${notes || "none"}.
Baby's sex is a surprise — keep every theme gender-neutral.`;

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 2500, system: SYSTEM, messages: [{ role: "user", content: prompt }] }),
  });
  if (!r.ok) return Response.json({ error: `Anthropic API ${r.status}: ${await r.text()}` }, { status: 502 });
  const data = await r.json();
  const text = data.content.filter((c) => c.type === "text").map((c) => c.text).join("\n").replace(/```json|```/g, "").trim();
  try {
    return Response.json(JSON.parse(text));
  } catch {
    return Response.json({ error: "Model returned malformed JSON", raw: text }, { status: 502 });
  }
};

export const config = { path: "/api/nursery" };
