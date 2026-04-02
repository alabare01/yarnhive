// api/stitch-vision.js
// Vercel serverless function — identifies crochet stitch from a photo via Gemini

export const config = { maxDuration: 30 };

const PROMPT = `You are an expert crochet stitch identifier.
Analyze this image and identify the crochet stitch or stitch pattern shown.

Return ONLY a JSON object with no markdown, no backticks:
{
  "stitch_name": "string — common name of the stitch",
  "also_known_as": ["array of alternate names if any"],
  "difficulty": "Beginner" or "Intermediate" or "Advanced",
  "description": "2-3 sentences describing what makes this stitch distinctive and what it looks like",
  "common_uses": "string — what this stitch is typically used for (blankets, bags, garments, etc)",
  "tutorial_search": "string — best YouTube search term to find tutorials for this stitch",
  "confidence": "high" or "medium" or "low",
  "not_crochet": boolean — true if this doesn't appear to be a crochet stitch photo
}

If you cannot identify the specific stitch, give your best guess and set confidence to "low". If the image doesn't show a crochet stitch at all, set not_crochet to true.`;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { imageBase64, mimeType } = req.body || {};
    if (!imageBase64) return res.status(400).json({ error: "imageBase64 required" });

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) return res.status(500).json({ error: "API key not configured" });

    console.log("[stitch-vision] Identifying stitch, mime:", mimeType || "image/jpeg");

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [
            { inline_data: { mime_type: mimeType || "image/jpeg", data: imageBase64 } },
            { text: PROMPT },
          ] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 500 },
        }),
      }
    );

    if (!r.ok) {
      const errBody = await r.text();
      console.error("[stitch-vision] Gemini error:", r.status, errBody.substring(0, 300));
      return res.status(500).json({ error: "Gemini API error: " + r.status });
    }

    const data = await r.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!text) return res.status(500).json({ error: "Empty response from Gemini" });

    const cleaned = text.replace(/^[\s\S]*?```(?:json|JSON)?\s*\n?/i, "").replace(/\n?\s*```[\s\S]*$/, "").trim();
    const toParse = cleaned.startsWith("{") ? cleaned : text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const result = JSON.parse(toParse);

    console.log("[stitch-vision] Identified:", result.stitch_name, "confidence:", result.confidence);
    return res.status(200).json(result);
  } catch (err) {
    console.error("[stitch-vision] Error:", err.message);
    return res.status(500).json({ error: "Stitch identification failed", message: err.message });
  }
}
