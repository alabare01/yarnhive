// api/stitch-vision.js
// Vercel serverless function — identifies crochet stitch from a photo via Gemini

export const config = { maxDuration: 60, api: { bodyParser: { sizeLimit: "10mb" } } };

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

const PROMPT = `You are an expert crochet stitch identifier with deep knowledge of all crochet stitches, stitch patterns, and textures.

Analyze this image and identify the specific crochet stitch or stitch pattern shown. Focus exclusively on the stitch texture and structure — ignore yarn color, yarn weight, and the overall shape of the finished object.

IMPORTANT: The image may contain crochet hooks, knitting needles, hands, or other tools in the foreground. IGNORE these objects entirely. Your job is to identify the stitch pattern visible in the yarn or fabric — look past any tools or hands to the textile itself. If a hook or needle is present, it is simply being used to work the stitch — focus on the fabric structure, texture, and stitch pattern in the yarn surrounding or behind the tool. There will always be enough fabric visible to make a confident identification.

IMPORTANT — Two Scenarios:

Scenario A — Single stitch texture visible (close-up or clear repeating pattern):
Return the specific stitch name as stitch_name (e.g. "Moss Stitch", "Shell Stitch", "Bobble Stitch").
Do NOT return construction techniques like "Corner-to-Corner C2C" as stitch_name in this case.

Scenario B — Full project or blanket visible (multiple stitches, overall construction visible):
Return the PRIMARY construction technique as stitch_name (e.g. "Corner-to-Corner (C2C)", "Granny Square", "Amigurumi").
ALSO identify the base stitch used within that construction in a new field called "base_stitch" (e.g. "Half Double Crochet", "Single Crochet").
In description, acknowledge this is a full project view and describe what you observe.

Rules:
- Be specific. "Single crochet" is better than "basic stitch." "Moss stitch" is better than "textured stitch."
- If you can see a clear repeating stitch pattern, name it precisely.
- Only set confidence to "low" if the image is genuinely unclear, blurry, or too zoomed out to identify the stitch. If you can see the stitch texture clearly, use "high" or "medium."
- ALWAYS populate description, common_uses, also_known_as, tutorial_search, and difficulty regardless of confidence level. confidence only reflects how certain you are of the stitch_name — it never affects whether other fields are filled in. Even at low confidence, provide your best description of what you see.
- Never return empty string for description or common_uses. If unsure, describe what you observe visually.
- Only set not_crochet to true if this is definitively not a crochet item AND there is no yarn or fabric visible at all. When in doubt, attempt identification. If a crochet hook, knitting needle, or hands are visible alongside any yarn or fabric, this is a crochet work-in-progress — NEVER return not_crochet: true in this case. Treat it as low confidence instead and identify the stitch pattern in the visible fabric.
- For also_known_as, include regional name variations (US vs UK) and common alternate names.

Return ONLY a valid JSON object with no markdown, no backticks, no explanation before or after:
{
  "stitch_name": "specific name of the stitch or stitch pattern",
  "base_stitch": "the underlying stitch technique if stitch_name is a construction technique, otherwise null",
  "also_known_as": ["alternate names if any, otherwise empty array"],
  "difficulty": "Beginner" or "Intermediate" or "Advanced",
  "description": "2-3 sentences describing what makes this stitch distinctive, how it is worked, and what the texture looks like. NEVER leave this empty.",
  "common_uses": "what this stitch is typically used for. NEVER leave this empty.",
  "tutorial_search": "best YouTube search term to find a tutorial for this exact stitch",
  "confidence": "high" or "medium" or "low",
  "not_crochet": false
}`;

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

  const _url = process.env.VITE_SUPABASE_URL;
  const _key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const _t0 = Date.now();

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
    console.error("[STITCH-STEP-4] Network error:", err.message);
    console.error("[STITCH-STEP-4] Stack:", err.stack);
    geminiRes = null;
  }

  let geminiFailed = !geminiRes || !geminiRes.ok;
  if (geminiRes && !geminiRes.ok) {
    let errBody = "";
    try { errBody = await geminiRes.text(); } catch {}
    console.error("[STITCH-STEP-4] Gemini non-ok — status:", geminiRes.status, "body:", errBody.substring(0, 500));
    console.log("[STITCH-STEP-4] Gemini failed with status", geminiRes.status, "— trying Haiku fallback");
  }
  if (!geminiRes) {
    console.log("[STITCH-STEP-4] Gemini failed with network error — trying Haiku fallback");
  }

  // Helper: parse raw text into stitch result
  const parseStitchText = (text, tag) => {
    if (!text) return null;
    let toParse = text.trim();
    toParse = toParse.replace(/^```[\w]*\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    if (!toParse.startsWith("{")) {
      const match = toParse.match(/\{[\s\S]*\}/);
      toParse = match ? match[0] : toParse;
    }
    toParse = toParse.replace(/,\s*([\]}])/g, "$1").trim();
    try {
      return JSON.parse(toParse);
    } catch (parseErr) {
      console.error(`[${tag}] JSON.parse failed, attempting regex extraction. Raw text:`, toParse.substring(0, 500));
      const nameMatch = toParse.match(/"stitch_name"\s*:\s*"([^"]+)"/);
      const diffMatch = toParse.match(/"difficulty"\s*:\s*"([^"]+)"/);
      const descMatch = toParse.match(/"description"\s*:\s*"([^"]+)"/);
      const confMatch = toParse.match(/"confidence"\s*:\s*"([^"]+)"/);
      const usesMatch = toParse.match(/"common_uses"\s*:\s*"([^"]+)"/);
      const tutMatch  = toParse.match(/"tutorial_search"\s*:\s*"([^"]+)"/);
      if (nameMatch) {
        console.log(`[${tag}] Regex extraction succeeded — stitch_name:`, nameMatch[1]);
        return {
          stitch_name: nameMatch[1],
          difficulty: diffMatch?.[1] || "Intermediate",
          description: descMatch?.[1] || "",
          confidence: confMatch?.[1] || "low",
          common_uses: usesMatch?.[1] || "",
          tutorial_search: tutMatch?.[1] || nameMatch[1] + " crochet stitch tutorial",
          also_known_as: [],
          not_crochet: false,
        };
      }
      console.error(`[${tag}] Regex extraction also failed.`);
      return null;
    }
  };

  // ── STEP 5: Parse response (Gemini or Haiku fallback) ──
  let result;

  if (!geminiFailed) {
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
      } else {
        result = parseStitchText(text, "STITCH-STEP-5");
      }
    } catch (err) {
      console.error("[STITCH-STEP-5] FAILED — parse error:", err);
      console.error("[STITCH-STEP-5] Stack:", err.stack);
    }
  }

  // ── STEP 5b: Haiku fallback if Gemini failed or returned no result ──
  if (!result) {
    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_KEY) {
      console.error("[STITCH-STEP-4-HAIKU] ANTHROPIC_API_KEY not configured — cannot fall back");
      return res.status(200).json({ error: true, message: "Stitch identification failed. Please try again with a different photo." });
    }
    console.log("[STITCH-STEP-4-HAIKU] Calling Haiku fallback — base64 length:", imgBase64.length, "mime:", mimeType);
    try {
      const haikuRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          messages: [{ role: "user", content: [
            { type: "image", source: { type: "base64", media_type: mimeType, data: imgBase64 } },
            { type: "text", text: PROMPT },
          ] }],
        }),
      });
      console.log("[STITCH-STEP-4-HAIKU] Haiku response status:", haikuRes.status);
      if (!haikuRes.ok) {
        let haikuErr = "";
        try { haikuErr = await haikuRes.text(); } catch {}
        console.error("[STITCH-STEP-4-HAIKU] Haiku non-ok — status:", haikuRes.status, "body:", haikuErr.substring(0, 500));
        return res.status(200).json({ error: true, message: "Stitch identification failed. Please try again with a different photo." });
      }
      const haikuData = await haikuRes.json();
      const haikuText = haikuData.content?.[0]?.text || "";
      console.log("[STITCH-STEP-4-HAIKU] Haiku text:", haikuText.substring(0, 500));
      if (!haikuText) {
        console.error("[STITCH-STEP-4-HAIKU] Empty response from Haiku");
        return res.status(200).json({ error: true, message: "Stitch identification failed. Please try again with a different photo." });
      }
      result = parseStitchText(haikuText, "STITCH-STEP-4-HAIKU");
      if (!result) {
        return res.status(200).json({ error: true, message: "Could not interpret the stitch analysis. Please try a clearer photo." });
      }
    } catch (haikuErr) {
      console.error("[STITCH-STEP-4-HAIKU] FAILED — network error:", haikuErr.message);
      return res.status(200).json({ error: true, message: "Stitch identification failed. Please try again with a different photo." });
    }
  }

  if (!result) {
    return res.status(200).json({ error: true, message: "Could not interpret the stitch analysis. Please try a clearer photo." });
  }
  console.log("[STITCH-STEP-5] Success — identified:", result.stitch_name, "confidence:", result.confidence);

  // inline log — direct, no utility dependency
  if (_url && _key) {
    await fetch(`${_url}/rest/v1/vercel_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': _key,
        'Authorization': `Bearer ${_key}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `POST /api/stitch-vision → 200 (${Date.now() - _t0}ms)`,
        source: 'serverless',
        request_path: '/api/stitch-vision',
        request_method: 'POST',
        status_code: 200,
        project_id: 'wovely'
      })
    }).catch(() => {});
  }

  return res.status(200).json(result);
}

