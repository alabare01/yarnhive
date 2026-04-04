// api/stitch-vision.js
// Vercel serverless function — identifies crochet stitch from a photo via Gemini

export const config = { maxDuration: 30, api: { bodyParser: { sizeLimit: "10mb" } } };

import sharp from "sharp";

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

// MIME types that need conversion to JPEG for Gemini compatibility
const NEEDS_CONVERSION = new Set([
  "image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence",
  "image/avif", "image/tiff", "image/bmp", "image/x-ms-bmp",
]);

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

    // Step 2: Get raw buffer and detect MIME type
    let imgBuffer = Buffer.from(await imgRes.arrayBuffer());
    let mimeType = (imgRes.headers.get("content-type") || "image/jpeg").split(";")[0].trim().toLowerCase();
    const originalSize = imgBuffer.byteLength;
    const originalMime = mimeType;

    // Extract filename from URL for logging
    let fileName = "unknown";
    try { fileName = new URL(imageUrl).pathname.split("/").pop() || "unknown"; } catch {}

    console.log("[stitch-vision] Image fetched — file:", fileName, "size:", originalSize, "bytes, mime:", originalMime);

    // Step 3: Normalize MIME type — convert HEIC and other non-standard formats to JPEG
    if (NEEDS_CONVERSION.has(mimeType) || !mimeType.startsWith("image/")) {
      console.log("[stitch-vision] Converting", mimeType, "to JPEG");
      try {
        imgBuffer = await sharp(imgBuffer).jpeg({ quality: 85 }).toBuffer();
        mimeType = "image/jpeg";
        console.log("[stitch-vision] Converted to JPEG, new size:", imgBuffer.byteLength, "bytes");
      } catch (convErr) {
        console.error("[stitch-vision] MIME conversion failed:", convErr.message);
        return res.status(422).json({ error: "Could not process this image format. Try taking a screenshot and uploading that instead." });
      }
    }

    // Step 4: Resize if over 4MB — scale to max 1500px on longest side
    if (imgBuffer.byteLength > 4 * 1024 * 1024) {
      console.log("[stitch-vision] Image over 4MB (" + imgBuffer.byteLength + " bytes), resizing to max 1500px");
      try {
        imgBuffer = await sharp(imgBuffer)
          .resize({ width: 1500, height: 1500, fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer();
        mimeType = "image/jpeg";
        console.log("[stitch-vision] Resized to", imgBuffer.byteLength, "bytes");
      } catch (resizeErr) {
        console.error("[stitch-vision] Resize failed:", resizeErr.message);
        return res.status(422).json({ error: "Could not resize image. Try uploading a smaller photo." });
      }
    }

    // Step 5: Convert to base64
    const imgBase64 = imgBuffer.toString("base64");
    console.log("[stitch-vision] Ready for Gemini — file:", fileName, "size:", imgBuffer.byteLength, "bytes, mime:", mimeType, "base64 length:", imgBase64.length);

    // Step 6: Call Gemini
    let r;
    try {
      r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [
              { inline_data: { mime_type: mimeType, data: imgBase64 } },
              { text: PROMPT },
            ] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
          }),
        }
      );
    } catch (geminiNetErr) {
      console.error("[stitch-vision] Gemini network error:", geminiNetErr.message);
      return res.status(502).json({ error: "Could not reach the stitch identification service. Please try again in a moment." });
    }

    console.log("[stitch-vision] Gemini status:", r.status);

    if (!r.ok) {
      const errBody = await r.text();
      console.error("[stitch-vision] Gemini error:", r.status, errBody.substring(0, 500));
      if (r.status === 429) {
        return res.status(429).json({ error: "Our stitch identifier is busy right now. Please wait a moment and try again." });
      }
      if (r.status >= 500) {
        return res.status(502).json({ error: "The stitch identification service is temporarily unavailable. Please try again." });
      }
      return res.status(500).json({ error: "Stitch identification failed. Please try again with a different photo." });
    }

    // Step 7: Parse response
    const data = await r.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const finishReason = data.candidates?.[0]?.finishReason;
    console.log("[stitch-vision] Raw Gemini text:", text.substring(0, 500));
    console.log("[stitch-vision] Finish reason:", finishReason);

    if (!text) {
      return res.status(500).json({ error: "The stitch identifier couldn't analyze this image. Try a clearer, well-lit photo of the stitch.", detail: `finishReason: ${finishReason}` });
    }

    let toParse = text.replace(/^[\s\S]*?```(?:json|JSON)?\s*/i, "").replace(/\s*```[\s\S]*$/i, "").trim();
    if (!toParse.startsWith("{")) {
      const match = text.match(/\{[\s\S]*\}/);
      toParse = match ? match[0] : text;
    }

    let result;
    try { result = JSON.parse(toParse); } catch (parseErr) {
      console.error("[stitch-vision] JSON parse failed:", parseErr.message, "raw:", toParse.substring(0, 300));
      return res.status(500).json({ error: "Could not interpret the stitch analysis. Please try again with a different photo." });
    }

    console.log("[stitch-vision] Identified:", result.stitch_name, "confidence:", result.confidence);
    return res.status(200).json(result);
  } catch (err) {
    console.error("[stitch-vision] FATAL:", err.name, err.message, err.stack?.substring(0, 500));
    return res.status(500).json({ error: "Something went wrong analyzing your photo. Please try again." });
  }
}
