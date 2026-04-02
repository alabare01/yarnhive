// api/stitch-vision.js
// Vercel serverless function — identifies crochet stitch from a photo via Gemini

export const config = { maxDuration: 30, api: { bodyParser: { sizeLimit: "1mb" } } };

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
    const { imageUrl } = req.body || {};
    if (!imageUrl) return res.status(400).json({ error: "imageUrl required" });

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) return res.status(500).json({ error: "API key not configured" });

    // Step 1: Fetch image
    console.log("[stitch-vision] Fetching image from:", imageUrl);
    let imgRes;
    try { imgRes = await fetch(imageUrl); } catch (fetchErr) {
      console.error("[stitch-vision] Image fetch network error:", fetchErr.message);
      return res.status(502).json({ error: "Could not fetch image", detail: fetchErr.message });
    }
    console.log("[stitch-vision] Image fetch status:", imgRes.status);
    if (!imgRes.ok) {
      console.error("[stitch-vision] Image fetch failed:", imgRes.status);
      return res.status(502).json({ error: "Could not fetch image: " + imgRes.status });
    }

    // Step 2: Convert to base64
    let imgBase64, mimeType;
    try {
      const imgBuffer = await imgRes.arrayBuffer();
      console.log("[stitch-vision] Image buffer size:", imgBuffer.byteLength);
      imgBase64 = Buffer.from(imgBuffer).toString("base64");
      mimeType = imgRes.headers.get("content-type") || "image/jpeg";
      console.log("[stitch-vision] Base64 length:", imgBase64.length, "mime:", mimeType);
    } catch (bufErr) {
      console.error("[stitch-vision] Buffer conversion error:", bufErr.message);
      return res.status(500).json({ error: "Image processing failed", detail: bufErr.message });
    }

    if (imgBase64.length > 4000000) {
      console.error("[stitch-vision] Image too large for Gemini:", imgBase64.length, "chars");
      return res.status(413).json({ error: "Image too large — try a smaller or more compressed photo" });
    }

    // Step 3: Call Gemini
    console.log("[stitch-vision] Calling Gemini...");
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [
            { inline_data: { mime_type: mimeType, data: imgBase64 } },
            { text: PROMPT },
          ] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 500 },
        }),
      }
    );
    console.log("[stitch-vision] Gemini status:", r.status);

    if (!r.ok) {
      const errBody = await r.text();
      console.error("[stitch-vision] Gemini error:", r.status, errBody.substring(0, 500));
      return res.status(500).json({ error: "Gemini error: " + r.status, detail: errBody.substring(0, 200) });
    }

    // Step 4: Parse response
    const data = await r.json();
    console.log("[stitch-vision] Gemini response candidates:", data.candidates?.length);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("[stitch-vision] Raw text:", text.substring(0, 300));
    if (!text) {
      const finishReason = data.candidates?.[0]?.finishReason || "unknown";
      console.error("[stitch-vision] Empty response, finishReason:", finishReason);
      return res.status(500).json({ error: "Empty response from Gemini", finishReason });
    }

    const cleaned = text.replace(/^[\s\S]*?```(?:json|JSON)?\s*\n?/i, "").replace(/\n?\s*```[\s\S]*$/, "").trim();
    const toParse = cleaned.startsWith("{") ? cleaned : text.replace(/```json/gi, "").replace(/```/g, "").trim();
    let result;
    try { result = JSON.parse(toParse); } catch (parseErr) {
      console.error("[stitch-vision] JSON parse failed:", parseErr.message, "text starts:", toParse.substring(0, 200));
      return res.status(500).json({ error: "Failed to parse Gemini response" });
    }

    console.log("[stitch-vision] Identified:", result.stitch_name, "confidence:", result.confidence);
    return res.status(200).json(result);
  } catch (err) {
    console.error("[stitch-vision] Error:", err.message);
    return res.status(500).json({ error: "Stitch identification failed", message: err.message });
  }
}
