// api/stitch-vision.js
// Vercel serverless function — identifies crochet stitch from a photo via Gemini

export const config = { maxDuration: 30, api: { bodyParser: { sizeLimit: "10mb" } } };

import sharp from "sharp";

// Global error catchers — log full details for any unhandled errors in this function
process.on("unhandledRejection", (reason) => {
  console.error("[STITCH-FULL-ERROR] Unhandled rejection:", reason);
  if (reason instanceof Error) console.error("[STITCH-FULL-ERROR] Stack:", reason.stack);
});
process.on("uncaughtException", (err) => {
  console.error("[STITCH-FULL-ERROR] Uncaught exception:", err);
  console.error("[STITCH-FULL-ERROR] Stack:", err.stack);
});

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

  // ── STEP 1: Parse request body ──
  console.log("[STITCH-STEP-1] Parsing request body");
  let imageUrl;
  try {
    const body = req.body || {};
    imageUrl = body.imageUrl;
    console.log("[STITCH-STEP-1] imageUrl:", imageUrl ? imageUrl.substring(0, 120) + "..." : "MISSING");
    if (!imageUrl) return res.status(400).json({ error: "imageUrl required" });
  } catch (err) {
    console.error("[STITCH-STEP-1] FAILED — body parse error:", err);
    console.error("[STITCH-STEP-1] Stack:", err.stack);
    return res.status(200).json({ error: true, message: "Invalid request. Please try again." });
  }

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) {
    console.error("[STITCH-STEP-1] GEMINI_API_KEY not configured");
    return res.status(500).json({ error: "API key not configured" });
  }

  // ── STEP 2: Fetch image from storage URL ──
  console.log("[STITCH-STEP-2] Fetching image from:", imageUrl);
  let imgBuffer, mimeType, fileName;
  try {
    const imgRes = await fetch(imageUrl);
    console.log("[STITCH-STEP-2] Fetch response — status:", imgRes.status, "content-type:", imgRes.headers.get("content-type"), "content-length:", imgRes.headers.get("content-length"));

    if (!imgRes.ok) {
      let respBody = "";
      try { respBody = await imgRes.text(); } catch {}
      console.error("[STITCH-STEP-2] FAILED — non-ok status:", imgRes.status, "body:", respBody.substring(0, 500));
      return res.status(200).json({ error: true, message: "Could not load the uploaded image. Please try again." });
    }

    imgBuffer = Buffer.from(await imgRes.arrayBuffer());
    mimeType = (imgRes.headers.get("content-type") || "image/jpeg").split(";")[0].trim().toLowerCase();
    fileName = "unknown";
    try { fileName = new URL(imageUrl).pathname.split("/").pop() || "unknown"; } catch {}

    console.log("[STITCH-STEP-2] Success — file:", fileName, "size:", imgBuffer.byteLength, "bytes, mime:", mimeType, "buffer valid:", Buffer.isBuffer(imgBuffer));
  } catch (err) {
    console.error("[STITCH-STEP-2] FAILED — exception during image fetch:", err);
    console.error("[STITCH-STEP-2] Stack:", err.stack);
    return res.status(200).json({ error: true, message: "Could not load the uploaded image. Please try again." });
  }

  // ── STEP 3: Sharp conversion/resize ──
  console.log("[STITCH-STEP-3] Processing image — mime:", mimeType, "size:", imgBuffer.byteLength, "needs conversion:", NEEDS_CONVERSION.has(mimeType) || !mimeType.startsWith("image/"));
  try {
    // Normalize non-standard MIME types to JPEG
    if (NEEDS_CONVERSION.has(mimeType) || !mimeType.startsWith("image/")) {
      console.log("[STITCH-STEP-3] Converting", mimeType, "to JPEG via sharp");
      imgBuffer = await sharp(imgBuffer).jpeg({ quality: 85 }).toBuffer();
      mimeType = "image/jpeg";
      console.log("[STITCH-STEP-3] Converted — new size:", imgBuffer.byteLength, "bytes");
    }

    // Resize if over 4MB
    if (imgBuffer.byteLength > 4 * 1024 * 1024) {
      console.log("[STITCH-STEP-3] Resizing — image is", imgBuffer.byteLength, "bytes (over 4MB)");
      imgBuffer = await sharp(imgBuffer)
        .resize({ width: 1500, height: 1500, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      mimeType = "image/jpeg";
      console.log("[STITCH-STEP-3] Resized — new size:", imgBuffer.byteLength, "bytes");
    }

    console.log("[STITCH-STEP-3] Success — final size:", imgBuffer.byteLength, "bytes, mime:", mimeType);
  } catch (err) {
    console.error("[STITCH-STEP-3] FAILED — sharp processing error:", err);
    console.error("[STITCH-STEP-3] Stack:", err.stack);
    return res.status(200).json({ error: true, message: "Could not process this image. Try taking a screenshot and uploading that instead." });
  }

  // ── STEP 4: Call Gemini API ──
  const imgBase64 = imgBuffer.toString("base64");
  console.log("[STITCH-STEP-4] Calling Gemini — base64 length:", imgBase64.length, "mime:", mimeType);
  let geminiRes;
  try {
    geminiRes = await fetch(
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
    console.log("[STITCH-STEP-4] Gemini response — status:", geminiRes.status);
  } catch (err) {
    console.error("[STITCH-STEP-4] FAILED — Gemini network error:", err);
    console.error("[STITCH-STEP-4] Stack:", err.stack);
    return res.status(200).json({ error: true, message: "Could not reach the stitch identification service. Please try again in a moment." });
  }

  if (!geminiRes.ok) {
    let errBody = "";
    try { errBody = await geminiRes.text(); } catch {}
    console.error("[STITCH-STEP-4] Gemini non-ok — status:", geminiRes.status, "body:", errBody.substring(0, 500));
    if (geminiRes.status === 429) {
      return res.status(200).json({ error: true, message: "Our stitch identifier is busy right now. Please wait a moment and try again." });
    }
    return res.status(200).json({ error: true, message: "Stitch identification failed. Please try again with a different photo." });
  }

  // ── STEP 5: Parse Gemini response ──
  console.log("[STITCH-STEP-5] Parsing Gemini response");
  try {
    const data = await geminiRes.json();
    const finishReason = data.candidates?.[0]?.finishReason;
    const parts = data.candidates?.[0]?.content?.parts || [];
    console.log("[STITCH-STEP-5] Parts count:", parts.length, "finish reason:", finishReason);
    let text = "";
    for (const part of parts) {
      const t = part.text || "";
      console.log("[STITCH-STEP-5] Part type:", part.thought ? "thinking" : "output", "length:", t.length, "preview:", t.substring(0, 100));
      if (!part.thought && t.trim().length > 0) { text = t; break; }
    }
    if (!text && parts.length > 0) text = parts[parts.length - 1]?.text || "";
    console.log("[STITCH-STEP-5] Selected text:", text.substring(0, 500));

    if (!text) {
      console.error("[STITCH-STEP-5] Empty text — finishReason:", finishReason, "full response:", JSON.stringify(data).substring(0, 500));
      return res.status(200).json({ error: true, message: "The stitch identifier couldn't analyze this image. Try a clearer, well-lit photo." });
    }

    // Sanitize JSON
    let toParse = text.trim();
    toParse = toParse.replace(/^```[\w]*\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    if (!toParse.startsWith("{")) {
      const match = toParse.match(/\{[\s\S]*\}/);
      toParse = match ? match[0] : toParse;
    }
    toParse = toParse.replace(/,\s*([\]}])/g, "$1").trim();

    const result = JSON.parse(toParse);
    console.log("[STITCH-STEP-5] Success — identified:", result.stitch_name, "confidence:", result.confidence);
    return res.status(200).json(result);
  } catch (err) {
    console.error("[STITCH-STEP-5] FAILED — parse error:", err);
    console.error("[STITCH-STEP-5] Stack:", err.stack);
    return res.status(200).json({ error: true, message: "Could not interpret the stitch analysis. Please try a clearer photo." });
  }
}
