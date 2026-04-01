// api/extract-pattern-vision.js
// Vercel serverless function — extracts crochet pattern from uploaded images via Gemini Files API

export const config = { maxDuration: 300, api: { bodyParser: { sizeLimit: "10mb" } } };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {

  const { images, pageCount, fileName } = req.body || {};
  if (!images || !Array.isArray(images) || images.length === 0) return res.status(400).json({ error: "images array required" });

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  console.log("[extract-pattern-vision] ENV:", GEMINI_KEY ? "KEY EXISTS" : "KEY MISSING", "image count:", images.length, "pageCount:", pageCount, "fileName:", fileName);
  if (!GEMINI_KEY) return res.status(500).json({ error: "API key not configured on server" });

  // Step 1: Upload each image to Gemini Files API
  const fileUris = [];
  for (let i = 0; i < images.length; i++) {
    const base64Data = images[i];
    // Strip data URI prefix if present
    const raw = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
    const binaryBuffer = Buffer.from(raw, "base64");

    // Detect mime type from data URI prefix or default to jpeg
    let mimeType = "image/jpeg";
    if (base64Data.startsWith("data:")) {
      const match = base64Data.match(/^data:(image\/[^;]+);/);
      if (match) mimeType = match[1];
    }

    const boundary = "----GeminiUpload" + Date.now() + i;
    const metadataPart = JSON.stringify({ file: { mimeType, displayName: fileName || `image-${i + 1}` } });

    const bodyParts = [
      `--${boundary}\r\n`,
      `Content-Type: application/json; charset=UTF-8\r\n\r\n`,
      metadataPart,
      `\r\n--${boundary}\r\n`,
      `Content-Type: ${mimeType}\r\n\r\n`,
    ];

    const textEncoder = new TextEncoder();
    const prefix = textEncoder.encode(bodyParts.join(""));
    const suffix = textEncoder.encode(`\r\n--${boundary}--\r\n`);

    const fullBody = new Uint8Array(prefix.length + binaryBuffer.length + suffix.length);
    fullBody.set(prefix, 0);
    fullBody.set(new Uint8Array(binaryBuffer), prefix.length);
    fullBody.set(suffix, prefix.length + binaryBuffer.length);

    console.log("[extract-pattern-vision] Uploading image", i + 1, "of", images.length, "size:", binaryBuffer.length, "bytes", "mime:", mimeType);

    const uploadRes = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=multipart&key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
        body: fullBody,
      }
    );

    if (!uploadRes.ok) {
      const errBody = await uploadRes.text();
      console.error("[extract-pattern-vision] File upload failed for image", i + 1, ":", uploadRes.status, errBody.substring(0, 500));
      return res.status(500).json({ error: `Image upload failed for image ${i + 1}: ${uploadRes.status}` });
    }

    const uploadData = await uploadRes.json();
    const uri = uploadData.file?.uri;
    if (!uri) {
      console.error("[extract-pattern-vision] No file URI returned for image", i + 1, JSON.stringify(uploadData).substring(0, 300));
      return res.status(500).json({ error: `No file URI returned for image ${i + 1}` });
    }

    console.log("[extract-pattern-vision] Uploaded image", i + 1, "uri:", uri);
    fileUris.push({ uri, mimeType });
  }

  // Step 2: Build prompts — copied VERBATIM from api/extract-pattern.js
  const fullPrompt = `You are a crochet pattern extraction specialist. You will analyze this pattern using a strict 4-step process. Return ONLY valid JSON with no markdown, no backticks, no explanation.

═══ STEP 1 — STRUCTURE ANALYSIS ═══
Before extracting anything, silently determine:
• Is this pattern round-based (worked in the round) or row-based (worked flat)? Or mixed per component?
• Does it contain an abbreviations table, legend, or definition section?
• Are there cross-references like "Repeat R32", "work same as Round 5", or "work into ch3 on R9"?
• Are there branching instructions by size, color variation, or optional sections?
• How many distinct components exist (e.g. body, head, arms, border)?
Use these answers to guide the remaining steps. Do not output this analysis — it is internal context only.

═══ STEP 2 — ABBREVIATIONS FIRST ═══
Extract the COMPLETE abbreviations map from any table, legend, glossary, or definition section BEFORE touching pattern instructions.
• Populate abbreviations_map as a flat key-value object: {"mr":"magic ring","sc":"single crochet","inc":"increase","dec":"invisible decrease","fpdc":"front post double crochet"}
• Include EVERY abbreviation defined in the pattern, even uncommon ones
• If the pattern defines no abbreviations, use standard crochet abbreviations found in the instructions: sc, dc, hdc, tr, sl st, ch, inc, dec, mr, fo, blo, flo, yo, pm, sm, sc2tog
• This map is your reference for all subsequent extraction — use it to interpret shorthand in round/row instructions

═══ STEP 3 — ROUND/ROW EXTRACTION ═══
Extract every round or row as its own entry. Apply these rules strictly:

LABEL PREFIX: Use 'RND' for rounds (worked in the round) or 'ROW' for rows (worked flat). Detect from context which applies per component.

EXPAND RANGES: For any instruction covering multiple rounds like 'RND 10-23: sc in each st (40)' or 'Rows 5-12: repeat Row 4', expand into individual entries: RND 10, RND 11, RND 12... each with the same instruction text. Never leave a range as a single row. Every round the user needs to complete must be its own checkable row.

EXPAND CROSS-REFERENCES INLINE: If a round says "Repeat R32" or "Work same as Round 5", look up what Round 5 / R32 actually says and output the FULL instruction text for that round. Never output "Repeat R32" as a row — always resolve the reference to the actual stitch instructions.

PRESERVE BRACKET NOTATION: Keep bracket/parenthetical repeats exactly as written in the pattern. Examples: "(sc, inc) x 6", "[dc5, (ch1, skip 1) x 3] x 10", "*(2 sc, inc)* repeat 6 times". Do not simplify or expand these — the app tracks them as sub-counters.

EXTRACT repeat_brackets: For each row/round, extract bracket repeat patterns into repeat_brackets array. Example: "Round 16: (6 sc, inc) x 2 -- 16 sts" produces repeat_brackets: [{"sequence":"6 sc, inc","count":2}]. Match patterns like (sequence) x N, [sequence] x N, *sequence* repeat N times. If no bracket repeats, set repeat_brackets: [].

OPEN-ENDED REPEATS: For instructions like "repeat rounds X-Y until desired length" or "work even for as many rounds as you want", extract the repeating block ONCE as individual rounds, then add a note in pattern_notes explaining the open-ended nature. Do not generate infinite rounds.

SIZE/COLOR BRANCHING: If the pattern offers multiple sizes or color variations, extract the primary/default version as the main rows. Note all variations (stitch count differences, alternate colors) in pattern_notes.

ACTION ITEMS: For mid-pattern instructions that are not stitch rows (examples: 'Place the eyes now', 'Begin stuffing', 'Change to Color B', 'See page 7 for details') — include these as rows with label 'NOTE' and set action_item: true.

NOTES AND TIPS: Notes, tips, and instructional comments that accompany a specific row should be attached to that row as the 'note' field, NOT created as a separate row entry. A row should look like: {"id":"rnd-5","label":"RND 5","text":"(sc, inc) x 6 (12)","stitch_count":12,"note":"Use a stitch marker here","action_item":false}. Never create a standalone row where the instruction text starts with 'Note:', 'Tip:', or 'Remember:' — instead attach that text as the note field of the adjacent stitch row it refers to.

INLINE TIPS: If a row instruction contains an inline tip, note, or parenthetical explanation that is not part of the stitch counts or stitch abbreviations — extract it and place it in the row's note field instead, cleaning the instruction text to remove it. The instruction text field should contain only the actual stitch sequence and stitch count. Tips, explanations, and clarifications go in the note field. Example: 'RND 5: 2bpdc into next st (tip: work around the post, not through the top) (12)' should become text: '2bpdc into next st (12)', note: 'Work around the post, not through the top'.

NEVER SKIP ROUNDS: Even if consecutive rounds have identical instructions, each must be its own entry. A round that says "sc in each st around (40)" repeated 8 times means 8 separate row entries.

═══ STEP 4 — CONFIDENCE ═══
After extraction, assess quality:
• If fewer than 3 rounds/rows were extracted OR title is missing, set "confidence": "low"
• If all major sections were found and 10+ rounds extracted, set "confidence": "high"
• Otherwise set "confidence": "medium"

═══ OUTPUT FORMAT ═══
Return this exact JSON structure:
{"title":"string","designer":"string","source_url":null,"finished_size":"string","difficulty":"Beginner or Intermediate or Advanced","yarn_weight":"string","hook_size":"string","gauge":"string or null","confidence":"low or medium or high","materials":[{"name":"string","amount":"string","notes":"string"}],"abbreviations":[{"abbr":"string","meaning":"string"}],"abbreviations_map":{"mr":"magic ring","sc":"single crochet"},"suggested_resources":[{"label":"string","url":"string"}],"pattern_notes":"string","components":[{"name":"string","make_count":1,"independent":false,"rows":[{"id":"rnd-1","label":"RND 1","text":"full instruction text with all references resolved","stitch_count":null,"note":null,"action_item":false,"repeat_brackets":[{"sequence":"string","count":2}]}]}],"assembly_notes":"string","image_description":"string"}

COMPONENT RULES:
• For components like 'FLIPPER (MAKE 2)', set make_count: 2. Default 1 if not specified.
• Set independent: true ONLY when the pattern explicitly says a component can be made separately — e.g. "make 2 separately", "work independently". Default false.
• After all construction components, extract assembly/finishing as a final component named 'ASSEMBLY & FINISHING' with label: 'STEP' and action_item: true for all rows.

PATTERN NOTES: Extract as a single string containing all special technique notes, tension guidance, construction tips, size variations, and open-ended repeat instructions.

SUGGESTED RESOURCES: Extract {label, url} objects from any "Tutorials", "Resources", or hyperlink sections. Default to [] if none found.

Be thorough — extract every component, every round, every material. Ensure the JSON is complete and valid. Do not truncate.`;

  const simplePrompt = `Extract this crochet pattern. Return ONLY valid JSON, no markdown, no backticks.
{"title":"string","hook_size":"string","yarn_weight":"string","difficulty":"string","designer":"string","materials":[{"name":"string","amount":"string"}],"components":[{"name":"Main","make_count":1,"independent":false,"rows":[{"id":"row-1","label":"ROW 1","text":"instruction text","stitch_count":null,"action_item":false,"repeat_brackets":[]}]}],"pattern_notes":"string","assembly_notes":"string","confidence":"low"}
Extract every row/round as its own entry. Keep instruction text exactly as written. Do not truncate.`;

  // Step 3: Call Gemini generateContent with file references
  const callGemini = async (prompt, maxTokens) => {
    const parts = [
      ...fileUris.map(f => ({ file_data: { mime_type: f.mimeType, file_uri: f.uri } })),
      { text: prompt },
    ];

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { temperature: 0.1, maxOutputTokens: maxTokens },
        }),
      }
    );
    if (!r.ok) {
      const errBody = await r.text();
      console.error("[extract-pattern-vision] Gemini HTTP error:", r.status, errBody.substring(0, 500));
      throw new Error(`Gemini API error ${r.status}: ${errBody.substring(0, 300)}`);
    }
    const data = await r.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!text) {
      const finishReason = data.candidates?.[0]?.finishReason || "unknown";
      console.error("[extract-pattern-vision] Gemini returned empty text, finishReason:", finishReason, "candidates:", JSON.stringify(data.candidates?.[0]).substring(0, 300));
      throw new Error("Gemini returned empty response, finishReason: " + finishReason);
    }
    const cleaned = text.replace(/^[\s\S]*?```(?:json|JSON)?\s*\n?/i, "").replace(/\n?\s*```[\s\S]*$/, "").trim();
    // If stripping fences removed everything or didn't find fences, fall back to raw trim
    const toParse = cleaned.startsWith("{") || cleaned.startsWith("[") ? cleaned : text.replace(/```json/gi, "").replace(/```/g, "").trim();
    try { return JSON.parse(toParse); } catch (parseErr) {
      console.error("[extract-pattern-vision] JSON parse failed, text starts:", toParse.substring(0, 300), "ends:", toParse.substring(toParse.length - 200));
      throw new Error("JSON parse failed: " + parseErr.message);
    }
  };

  // Attempt 1: full structured prompt
  console.log("[extract-pattern-vision] Attempt 1: full prompt, images:", fileUris.length, "fileName:", fileName);
  try {
    const result = await callGemini(fullPrompt, 65536);
    console.log("[extract-pattern-vision] Success:", result.title, "—", (result.components || []).length, "components");
    return res.status(200).json(result);
  } catch (e) {
    console.error("[extract-pattern-vision] Attempt 1 failed:", e.message);
  }

  // Attempt 2: simplified prompt — flat rows, faster response
  console.log("[extract-pattern-vision] Attempt 2: simplified prompt");
  try {
    const result = await callGemini(simplePrompt, 32768);
    console.log("[extract-pattern-vision] Simplified success:", result.title);
    return res.status(200).json(result);
  } catch (e2) {
    console.error("[extract-pattern-vision] Attempt 2 also failed:", e2.message);
    return res.status(500).json({ error: "Pattern extraction failed after 2 attempts" });
  }

  } catch (err) {
    console.error("[extract-pattern-vision] UNHANDLED ERROR:", err.message, err.stack);
    return res.status(500).json({ error: "Internal server error", message: err.message });
  }
}
