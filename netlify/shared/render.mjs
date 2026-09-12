// Shared Gemini image rendering used by both the sync and background endpoints.
const MODELS = (process.env.GEMINI_IMAGE_MODEL ? [process.env.GEMINI_IMAGE_MODEL] : [])
  .concat(["gemini-3.1-flash-image", "gemini-2.5-flash-image"]);

export function layoutText(L = {}) {
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

export async function renderImage(key, t) {
  const pal = (t.palette || []).map((p) => `${p.role} ${p.name} (${p.hex})`).join(", ");
  const room = typeof t.room === "string" && t.room.startsWith("data:image/") ? t.room : null;
  const styling = `Theme: ${t.name}. ${t.vibe || ""}
Color palette: ${pal}. Walls painted the wall color; accent wall or trim in the accent color; textiles (rug, curtains, bedding) in the textile color; small pops of the pop color.
Furniture: ${t.furniture || "natural wood"} crib and dresser, a comfortable glider chair.
Decor: ${(t.accents || []).join("; ")}.
Layout instructions (follow exactly):
${layoutText(t.layout) || "Designer's choice of placement."}
No people, no text, no watermarks. Gender-neutral. Tidy, cozy, realistic.`;
  const prompt = room
    ? `This is a photo of the actual room that will become the nursery. Redesign it as a finished nursery in the style below.
KEEP the room exactly as photographed: same camera angle, same walls, window and door placement, ceiling, flooring, trim, outlets, and dimensions. Do not add or remove windows or change the architecture.
CHANGE only the wall color, add nursery furniture and decor placed realistically within this room, and dress the window and floor with the theme's textiles. Remove any clutter or existing furniture that doesn't belong in a nursery.
${styling}`
    : `Interior design photograph of a real nursery, wide-angle shot from the doorway, natural daylight, photorealistic, editorial magazine quality.
${styling}`;

  const parts = [];
  if (room) { const m = room.match(/^data:(image\/[a-z]+);base64,(.+)$/i); if (m) parts.push({ inlineData: { mimeType: m[1], data: m[2] } }); }
  parts.push({ text: prompt });

  let lastErr = "";
  for (const model of MODELS) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: room ? { responseModalities: ["IMAGE"] } : { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "16:9" } } }),
    });
    if (r.status === 404) { lastErr = `${model} not available`; continue; }
    if (!r.ok) throw new Error(`Gemini image ${r.status}: ${(await r.text()).slice(0, 300)}`);
    const data = await r.json();
    const part = (data.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData);
    if (!part) throw new Error("No image returned (content may have been filtered).");
    return { image: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`, model };
  }
  throw new Error(lastErr || "No image model available");
}
