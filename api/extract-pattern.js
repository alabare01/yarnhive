// api/extract-pattern.js
// Vercel serverless function — extracts crochet pattern from PDF text via Gemini
// Supports mode: "extract" (default) and mode: "bevcheck" (pattern validation)

import { getPreferredProvider } from './_providerRouter.js';

export const config = { maxDuration: 300 };

const GEMINI_MODEL = 'gemini-2.5-flash';

function splitIntoChunks(text, maxChunkSize = 14000, overlapSize = 500) {
  // Split on --- PAGE N --- markers inserted by pdf.js
  const pageMarkerRegex = /(?=--- PAGE \d+ ---)/g;
  const pages = text.split(pageMarkerRegex).filter(p => p.trim());

  const chunks = [];
  let currentChunk = '';
  let currentOverlap = '';

  for (const page of pages) {
    // If adding this page would exceed chunk size, finalize current chunk
    if (currentChunk.length + page.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk);
      // Take last overlapSize chars as overlap context for next chunk
      currentOverlap = currentChunk.slice(-overlapSize);
      currentChunk = currentOverlap + page;
    } else {
      currentChunk += page;
    }
  }

  // Push final chunk
  if (currentChunk.trim()) chunks.push(currentChunk);

  // If no page markers found (plain text), fall back to simple size-based split with overlap
  if (chunks.length === 0) {
    let pos = 0;
    while (pos < text.length) {
      const end = Math.min(pos + maxChunkSize, text.length);
      const chunk = text.slice(pos, end);
      chunks.push(chunk);
      pos += maxChunkSize - overlapSize;
    }
  }

  return chunks;
}

function mergeChunkResults(results) {
  if (!results || results.length === 0) return null;
  if (results.length === 1) return results[0];

  // Base result from chunk 1 — provides title, designer, materials, metadata
  const merged = { ...results[0] };

  // Merge components from chunks 2+
  for (let i = 1; i < results.length; i++) {
    const chunk = results[i];
    if (!chunk.components) continue;

    for (const incomingComponent of chunk.components) {
      // Try to find matching component by name in merged result
      const existing = merged.components?.find(
        c => c.name?.toLowerCase().trim() === incomingComponent.name?.toLowerCase().trim()
      );

      if (existing) {
        // Append rows, deduplicating by label
        const existingLabels = new Set(existing.rows?.map(r => r.label) || []);
        const newRows = (incomingComponent.rows || []).filter(r => !existingLabels.has(r.label));
        existing.rows = [...(existing.rows || []), ...newRows];
      } else {
        // New component not seen in chunk 1 — add it
        if (!merged.components) merged.components = [];
        merged.components.push(incomingComponent);
      }
    }

    // Merge pattern_notes
    if (chunk.pattern_notes && chunk.pattern_notes !== merged.pattern_notes) {
      merged.pattern_notes = [merged.pattern_notes, chunk.pattern_notes].filter(Boolean).join(' ');
    }

    // Merge assembly_notes
    if (chunk.assembly_notes && chunk.assembly_notes !== merged.assembly_notes) {
      merged.assembly_notes = [merged.assembly_notes, chunk.assembly_notes].filter(Boolean).join(' ');
    }

    // Merge abbreviations (deduplicate by abbr)
    if (chunk.abbreviations?.length) {
      const existingAbbrs = new Set(merged.abbreviations?.map(a => a.abbr) || []);
      const newAbbrs = chunk.abbreviations.filter(a => !existingAbbrs.has(a.abbr));
      merged.abbreviations = [...(merged.abbreviations || []), ...newAbbrs];
    }

    // Merge abbreviations_map
    if (chunk.abbreviations_map) {
      merged.abbreviations_map = { ...(merged.abbreviations_map || {}), ...chunk.abbreviations_map };
    }
  }

  // Set confidence based on total rows extracted
  const totalRows = (merged.components || []).reduce((sum, c) => sum + (c.rows?.length || 0), 0);
  merged.confidence = totalRows >= 10 ? 'high' : totalRows >= 3 ? 'medium' : 'low';

  return merged;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const _url = process.env.VITE_SUPABASE_URL;
  const _key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const _t0 = Date.now();

  try {

  const { mode = "extract" } = req.body || {};

  if (mode === "bevcheck") {
    return await handleBevCheck(req, res, _url, _key, _t0);
  }

  // ── mode: "extract" (default) ──
  const { pdfText: rawText, pageCount } = req.body || {};
  if (!rawText) return res.status(400).json({ error: "pdfText required" });

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  console.log("[extract-pattern] ENV:", GEMINI_KEY ? "GEMINI EXISTS" : "GEMINI MISSING", ANTHROPIC_KEY ? "ANTHROPIC EXISTS" : "ANTHROPIC MISSING", "pdfText length:", rawText.length, "pageCount:", pageCount);
  if (!GEMINI_KEY) return res.status(500).json({ error: "API key not configured on server" });

  // No truncation — chunked extraction handles long patterns
  const pdfText = rawText;

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

  const callGemini = async (prompt, maxTokens) => {
    const controller = new AbortController();
    const geminiTimeout = setTimeout(() => controller.abort(), 4000);
    let r;
    try {
      r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt + "\n\nPATTERN TEXT:\n" + pdfText }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: maxTokens },
          }),
          signal: controller.signal,
        }
      );
    } catch (fetchErr) {
      clearTimeout(geminiTimeout);
      if (fetchErr.name === "AbortError") {
        console.error("[extract-pattern] Gemini aborted after 4s timeout");
        throw new Error("Gemini timeout after 4s");
      }
      throw fetchErr;
    }
    clearTimeout(geminiTimeout);
    if (!r.ok) {
      const errBody = await r.text();
      console.error("[extract-pattern] Gemini HTTP error:", r.status, errBody.substring(0, 500));
      throw new Error(`Gemini API error ${r.status}: ${errBody.substring(0, 300)}`);
    }
    const data = await r.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!text) {
      const finishReason = data.candidates?.[0]?.finishReason || "unknown";
      console.error("[extract-pattern] Gemini returned empty text, finishReason:", finishReason, "candidates:", JSON.stringify(data.candidates?.[0]).substring(0, 300));
      throw new Error("Gemini returned empty response, finishReason: " + finishReason);
    }
    const cleaned = text.replace(/^[\s\S]*?```(?:json|JSON)?\s*\n?/i, "").replace(/\n?\s*```[\s\S]*$/, "").trim();
    // If stripping fences removed everything or didn't find fences, fall back to raw trim
    const toParse = cleaned.startsWith("{") || cleaned.startsWith("[") ? cleaned : text.replace(/```json/gi, "").replace(/```/g, "").trim();
    try { return JSON.parse(toParse); } catch (parseErr) {
      console.error("[extract-pattern] JSON parse failed, text starts:", toParse.substring(0, 300), "ends:", toParse.substring(toParse.length - 200));
      throw new Error("JSON parse failed: " + parseErr.message);
    }
  };

  const callClaude = async (text) => {
    if (!ANTHROPIC_KEY) throw new Error("Anthropic API key not configured");
    // Truncate oversized text to prevent exhausting time budget
    const CLAUDE_TEXT_LIMIT = 20000;
    let truncatedText = text;
    console.log("[extract-pattern] Claude: input text length:", text.length, "limit:", CLAUDE_TEXT_LIMIT);
    if (text.length > CLAUDE_TEXT_LIMIT) {
      const lastNl = text.lastIndexOf("\n", CLAUDE_TEXT_LIMIT);
      truncatedText = text.slice(0, lastNl > 0 ? lastNl : CLAUDE_TEXT_LIMIT);
      console.log("[extract-pattern] Claude: truncated from", text.length, "to", truncatedText.length, "chars");
    } else {
      console.log("[extract-pattern] Claude: no truncation needed, using full text");
    }
    const claudePrompt = `You are a crochet pattern extraction specialist. Extract the pattern below into structured JSON.

Return ONLY valid JSON with no markdown, no backticks, no explanation. Use this exact structure:
{"title":"string","designer":"string","source_url":null,"finished_size":"string","difficulty":"Beginner or Intermediate or Advanced","yarn_weight":"string","hook_size":"string","gauge":"string or null","confidence":"low or medium or high","materials":[{"name":"string","amount":"string","notes":"string"}],"abbreviations":[{"abbr":"string","meaning":"string"}],"abbreviations_map":{},"suggested_resources":[],"pattern_notes":"string","components":[{"name":"string","make_count":1,"independent":false,"rows":[{"id":"rnd-1","label":"RND 1","text":"full instruction text","stitch_count":null,"note":null,"action_item":false,"repeat_brackets":[]}]}],"assembly_notes":"string","image_description":"string"}

Rules:
- Extract EVERY round/row as its own entry — never skip or collapse ranges
- Use RND for rounds worked in the round, ROW for flat rows
- Expand ranges like "RND 10-23" into individual entries RND 10, RND 11... each with the same instruction
- Keep bracket notation exactly as written: (sc, inc) x 6
- Set confidence: "high" if 10+ rounds extracted, "medium" otherwise
- Extract all materials, hook size, yarn weight

PATTERN TEXT:
${truncatedText}`;

    const controller = new AbortController();
    const claudeTimeout = setTimeout(() => controller.abort(), 55000);
    let r;
    try {
      r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 32000,
          messages: [{ role: "user", content: claudePrompt }],
        }),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(claudeTimeout);
      if (fetchErr.name === "AbortError") {
        console.error("[extract-pattern] Claude aborted after 45s timeout");
        throw new Error("Claude timeout after 45s");
      }
      throw fetchErr;
    }
    clearTimeout(claudeTimeout);

    if (!r.ok) {
      const errBody = await r.text();
      console.error("[extract-pattern] Claude HTTP error:", r.status, errBody.substring(0, 300));
      throw new Error(`Claude API error ${r.status}: ${errBody.substring(0, 200)}`);
    }

    const data = await r.json();
    console.log("[extract-pattern] Claude response: stop_reason=", data.stop_reason, "usage=", JSON.stringify(data.usage), "content_blocks=", (data.content||[]).length);
    const rawText = data.content?.[0]?.text || "";
    console.log("[extract-pattern] Claude rawText length:", rawText.length, "truncated:", data.stop_reason === "max_tokens");
    if (!rawText) throw new Error("Claude returned empty response, stop_reason=" + data.stop_reason);

    const jsonStart = rawText.indexOf("{");
    let toParse = jsonStart >= 0 ? rawText.slice(jsonStart) : rawText.trim();

    // If response was truncated by max_tokens, repair the JSON
    if (data.stop_reason === "max_tokens") {
      console.log("[extract-pattern] Claude output truncated — attempting JSON repair");
      // Close any open strings, arrays, and objects to make it parseable
      // Strip trailing incomplete value (after last comma or colon)
      toParse = toParse.replace(/,\s*"[^"]*$/, "").replace(/,\s*$/, "").replace(/:\s*"[^"]*$/, ': ""');
      // Count unclosed brackets and braces
      let openBraces = 0, openBrackets = 0;
      for (const ch of toParse) {
        if (ch === "{") openBraces++;
        else if (ch === "}") openBraces--;
        else if (ch === "[") openBrackets++;
        else if (ch === "]") openBrackets--;
      }
      toParse += "]".repeat(Math.max(0, openBrackets)) + "}".repeat(Math.max(0, openBraces));
    } else {
      // Normal path: find matching last brace
      const jsonEnd = toParse.lastIndexOf("}");
      toParse = jsonEnd >= 0 ? toParse.slice(0, jsonEnd + 1) : toParse;
    }

    try {
      return JSON.parse(toParse);
    } catch (parseErr) {
      console.error("[extract-pattern] Claude JSON parse failed, text starts:", toParse.substring(0, 300), "ends:", toParse.substring(toParse.length - 200));
      throw new Error("Claude JSON parse failed: " + parseErr.message);
    }
  };

  const callClaudeChunk = async (chunkText, chunkIndex, totalChunks, isFirstChunk) => {
    if (!ANTHROPIC_KEY) throw new Error("Anthropic API key not configured");

    const chunkPrompt = isFirstChunk
      ? `You are a crochet pattern extraction specialist. This is chunk ${chunkIndex + 1} of ${totalChunks} from a long pattern PDF. Extract ALL available information from this section.

Return ONLY valid JSON with no markdown, no backticks, no explanation. Use this exact structure:
{"title":"string","designer":"string","source_url":null,"finished_size":"string","difficulty":"Beginner or Intermediate or Advanced","yarn_weight":"string","hook_size":"string","gauge":"string or null","confidence":"low or medium or high","materials":[{"name":"string","amount":"string","notes":"string"}],"abbreviations":[{"abbr":"string","meaning":"string"}],"abbreviations_map":{},"suggested_resources":[],"pattern_notes":"string","components":[{"name":"string","make_count":1,"independent":false,"rows":[{"id":"rnd-1","label":"RND 1","text":"full instruction text","stitch_count":null,"note":null,"action_item":false,"repeat_brackets":[]}]}],"assembly_notes":"string","image_description":"string"}

Rules:
- Extract EVERY round/row as its own entry — never skip or collapse ranges
- Use RND for rounds worked in the round, ROW for flat rows
- Expand ranges like "RND 10-23" into individual entries RND 10, RND 11... each with the same instruction
- Keep bracket notation exactly as written: (sc, inc) x 6
- For components like "FLIPPER (MAKE 2)", set make_count: 2
- Extract title, designer, materials, hook size, yarn weight, abbreviations from this section if present
- If a component starts in this chunk but appears incomplete, extract what is here — subsequent chunks will continue it

PATTERN SECTION:
${chunkText}`
      : `You are a crochet pattern extraction specialist. This is chunk ${chunkIndex + 1} of ${totalChunks} from a long pattern PDF. The beginning of this chunk may overlap with the previous chunk — skip any rows/rounds you see repeated from earlier.

Return ONLY valid JSON with no markdown, no backticks, no explanation. Use this exact structure (metadata fields can be empty strings if not in this section):
{"title":"","designer":"","source_url":null,"finished_size":"","difficulty":"","yarn_weight":"","hook_size":"","gauge":null,"confidence":"medium","materials":[],"abbreviations":[],"abbreviations_map":{},"suggested_resources":[],"pattern_notes":"string","components":[{"name":"string","make_count":1,"independent":false,"rows":[{"id":"rnd-1","label":"RND 1","text":"full instruction text","stitch_count":null,"note":null,"action_item":false,"repeat_brackets":[]}]}],"assembly_notes":"string","image_description":""}

Rules:
- Extract EVERY round/row visible in this section — never skip or collapse ranges
- Use RND for rounds worked in the round, ROW for flat rows
- Expand ranges like "RND 10-23" into individual entries RND 10, RND 11...
- Keep bracket notation exactly as written: (sc, inc) x 6
- For components like "FLIPPER (MAKE 2)", set make_count: 2
- Focus only on pattern rows/components in this section — metadata already captured from chunk 1
- If a component continues from previous chunk, use the same component name so it merges correctly

PATTERN SECTION:
${chunkText}`;

    const controller = new AbortController();
    const claudeTimeout = setTimeout(() => controller.abort(), 55000);
    let r;
    try {
      r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 32000,
          messages: [{ role: "user", content: chunkPrompt }],
        }),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(claudeTimeout);
      if (fetchErr.name === "AbortError") throw new Error(`Claude chunk ${chunkIndex + 1} timeout after 55s`);
      throw fetchErr;
    }
    clearTimeout(claudeTimeout);

    if (!r.ok) {
      const errBody = await r.text();
      throw new Error(`Claude chunk ${chunkIndex + 1} API error ${r.status}: ${errBody.substring(0, 200)}`);
    }

    const data = await r.json();
    console.log(`[extract-pattern] Chunk ${chunkIndex + 1}/${totalChunks} Claude response: stop_reason=${data.stop_reason} usage=${JSON.stringify(data.usage)}`);
    const rawText = data.content?.[0]?.text || "";
    if (!rawText) throw new Error(`Claude chunk ${chunkIndex + 1} empty response`);

    const jsonStart = rawText.indexOf("{");
    let toParse = jsonStart >= 0 ? rawText.slice(jsonStart) : rawText.trim();

    if (data.stop_reason === "max_tokens") {
      console.log(`[extract-pattern] Chunk ${chunkIndex + 1} truncated — attempting JSON repair`);
      toParse = toParse.replace(/,\s*"[^"]*$/, "").replace(/,\s*$/, "").replace(/:\s*"[^"]*$/, ': ""');
      let openBraces = 0, openBrackets = 0;
      for (const ch of toParse) {
        if (ch === "{") openBraces++;
        else if (ch === "}") openBraces--;
        else if (ch === "[") openBrackets++;
        else if (ch === "]") openBrackets--;
      }
      toParse += "]".repeat(Math.max(0, openBrackets)) + "}".repeat(Math.max(0, openBraces));
    } else {
      const jsonEnd = toParse.lastIndexOf("}");
      toParse = jsonEnd >= 0 ? toParse.slice(0, jsonEnd + 1) : toParse;
    }

    try {
      return JSON.parse(toParse);
    } catch (parseErr) {
      throw new Error(`Claude chunk ${chunkIndex + 1} JSON parse failed: ${parseErr.message} — starts: ${toParse.substring(0, 200)}`);
    }
  };

  // Chunked extraction: no truncation — process full text in sequential chunks
  const CHUNK_THRESHOLD = 14000; // patterns under this go single-pass, over go chunked
  const chunks = splitIntoChunks(rawText, CHUNK_THRESHOLD, 500);
  const isChunked = chunks.length > 1;

  console.log(`[extract-pattern] Text length: ${rawText.length} chars, chunks: ${chunks.length}, chunked: ${isChunked}, pageCount: ${pageCount || 'unknown'}`);

  // SHORT PATTERNS: single chunk — use existing Gemini fast-path → Haiku fallback
  if (!isChunked) {

  // Attempt 1: Gemini opportunistic fast attempt (4s timeout)
  const preferredProvider = await getPreferredProvider(GEMINI_KEY);
  console.log("[extract-pattern] Router selected provider:", preferredProvider);

  if (preferredProvider === 'gemini') {
    console.log("[extract-pattern] Attempt 1: Gemini full prompt, pages:", pageCount || "unknown", "chars:", pdfText.length);
    try {
      const result = await callGemini(fullPrompt, 65536);
      console.log("[extract-pattern] Success:", result.title, "—", (result.components || []).length, "components");
      if (_url && _key) {
        await fetch(`${_url}/rest/v1/vercel_logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': _key, 'Authorization': `Bearer ${_key}`, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', message: `POST /api/extract-pattern → 200 gemini (${Date.now() - _t0}ms)`, source: 'serverless', request_path: '/api/extract-pattern', request_method: 'POST', status_code: 200, project_id: 'wovely' })
        }).catch(() => {});
      }
      return res.status(200).json(result);
    } catch (e) {
      console.error("[extract-pattern] Attempt 1 failed:", e.message);
    }
  } else {
    console.log("[extract-pattern] Router: Gemini degraded — skipping to Haiku");
  }

    // Haiku fallback for short patterns
    const t2 = Date.now();
    const elapsed = t2 - _t0;
    if (elapsed > 40000) {
      console.error("[extract-pattern] Skipping Claude fallback — insufficient time budget, elapsed:", elapsed);
      if (_url && _key) {
        await fetch(`${_url}/rest/v1/vercel_logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': _key, 'Authorization': `Bearer ${_key}`, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ timestamp: new Date().toISOString(), level: 'error', message: `[extract-pattern] budget exceeded (${elapsed}ms)`, source: 'serverless', request_path: '/api/extract-pattern', request_method: 'POST', status_code: 500, project_id: 'wovely' })
        }).catch(() => {});
      }
      return res.status(500).json({ error: "Pattern extraction failed — time budget exceeded" });
    }
    console.log("[extract-pattern] Attempt 2: Claude Haiku fallback, textLen:", pdfText.length, "elapsed:", elapsed + "ms");
    try {
      const result = await callClaude(pdfText);
      console.log("[extract-pattern] Claude success:", result.title, `(${Date.now()-t2}ms)`);
      if (_url && _key) {
        await fetch(`${_url}/rest/v1/vercel_logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': _key, 'Authorization': `Bearer ${_key}`, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', message: `POST /api/extract-pattern → 200 claude (${Date.now() - _t0}ms)`, source: 'serverless', request_path: '/api/extract-pattern', request_method: 'POST', status_code: 200, project_id: 'wovely' })
        }).catch(() => {});
      }
      return res.status(200).json(result);
    } catch (e2) {
      console.error("[extract-pattern] Claude fallback also failed:", e2.message, e2.stack?.substring(0, 500), `(${Date.now()-t2}ms)`);
      if (_url && _key) {
        await fetch(`${_url}/rest/v1/vercel_logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': _key, 'Authorization': `Bearer ${_key}`, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ timestamp: new Date().toISOString(), level: 'error', message: `[extract-pattern] ALL 2 FAILED (${Date.now() - _t0}ms) | attempt2: ${e2.message}`, source: 'serverless', request_path: '/api/extract-pattern', request_method: 'POST', status_code: 500, project_id: 'wovely' })
        }).catch(() => {});
      }
      return res.status(500).json({ error: "Pattern extraction failed after 2 attempts" });
    }
  } // end if (!isChunked)

  // LONG PATTERNS: chunked extraction via Haiku — sequential, one chunk at a time
  console.log(`[extract-pattern] CHUNKED MODE: ${chunks.length} chunks, total chars: ${rawText.length}`);
  const chunkResults = [];
  let chunksFailed = 0;

  for (let i = 0; i < chunks.length; i++) {
    const elapsed = Date.now() - _t0;
    // Stop processing chunks if we are dangerously close to the 300s function timeout
    if (elapsed > 250000) {
      console.warn(`[extract-pattern] Chunked: time budget nearly exhausted at chunk ${i + 1}/${chunks.length}, elapsed: ${elapsed}ms — stopping early`);
      break;
    }

    console.log(`[extract-pattern] Chunk ${i + 1}/${chunks.length}: chars=${chunks[i].length}, elapsed=${elapsed}ms`);
    try {
      const result = await callClaudeChunk(chunks[i], i, chunks.length, i === 0);
      console.log(`[extract-pattern] Chunk ${i + 1} success: components=${result.components?.length || 0}, rows=${(result.components || []).reduce((s, c) => s + (c.rows?.length || 0), 0)}`);
      chunkResults.push(result);
    } catch (chunkErr) {
      console.error(`[extract-pattern] Chunk ${i + 1} failed:`, chunkErr.message);
      chunksFailed++;
      // Continue to next chunk — partial results are better than nothing
    }
  }

  if (chunkResults.length === 0) {
    console.error("[extract-pattern] All chunks failed");
    if (_url && _key) {
      await fetch(`${_url}/rest/v1/vercel_logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': _key, 'Authorization': `Bearer ${_key}`, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ timestamp: new Date().toISOString(), level: 'error', message: `[extract-pattern] CHUNKED ALL FAILED chunks=${chunks.length} (${Date.now() - _t0}ms)`, source: 'serverless', request_path: '/api/extract-pattern', request_method: 'POST', status_code: 500, project_id: 'wovely' })
      }).catch(() => {});
    }
    return res.status(500).json({ error: "Pattern extraction failed — all chunks failed" });
  }

  const merged = mergeChunkResults(chunkResults);
  const totalRows = (merged.components || []).reduce((s, c) => s + (c.rows?.length || 0), 0);
  console.log(`[extract-pattern] CHUNKED COMPLETE: ${chunkResults.length}/${chunks.length} chunks succeeded, ${chunksFailed} failed, ${merged.components?.length || 0} components, ${totalRows} total rows, elapsed: ${Date.now() - _t0}ms`);

  if (_url && _key) {
    await fetch(`${_url}/rest/v1/vercel_logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': _key, 'Authorization': `Bearer ${_key}`, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', message: `POST /api/extract-pattern → 200 chunked/${chunks.length}chunks/${totalRows}rows (${Date.now() - _t0}ms)`, source: 'serverless', request_path: '/api/extract-pattern', request_method: 'POST', status_code: 200, project_id: 'wovely' })
    }).catch(() => {});
  }

  return res.status(200).json(merged);

  } catch (err) {
    console.error("[extract-pattern] UNHANDLED ERROR:", err.message, err.stack);
    if (_url && _key) {
      await fetch(`${_url}/rest/v1/vercel_logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': _key, 'Authorization': `Bearer ${_key}`, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ timestamp: new Date().toISOString(), level: 'error', message: `[extract-pattern] error: ${err.message} (${Date.now() - _t0}ms)`, source: 'serverless', request_path: '/api/extract-pattern', request_method: 'POST', status_code: 500, project_id: 'wovely' })
      }).catch(() => {});
    }
    return res.status(500).json({ error: "Internal server error", message: err.message });
  }
}

// ── mode: "bevcheck" — pattern validation with Gemini/Claude cascade ──

const BEVCHECK_PROMPT = `You are a crochet pattern validator. Analyze this pattern and return ONLY a JSON object with this exact structure — no markdown, no backticks, no explanation:
{
  "state": "pass" or "warning" or "issues",
  "checks": [
    { "id": "string", "label": "string", "tier": "core" or "advisory", "status": "pass" or "warning" or "fail", "detail": "string" }
  ],
  "summary": "string"
}

CATEGORY DEFINITIONS — use these exact IDs and tiers, always return all 6:
id: "sequence", label: "Sequential rounds/rows", tier: "core"
id: "stitch_math", label: "Stitch count math", tier: "core"
id: "duplicates", label: "Duplicate round numbers", tier: "core"
id: "cross_refs", label: "Cross-references", tier: "core"
id: "translation", label: "Translation artifacts", tier: "advisory"
id: "structure", label: "Component structure", tier: "advisory"

STATE RULES — derive "state" from core checks only:
Any core check with status "fail" → state: "issues".
No core fails but any warning exists → state: "warning".
All checks pass → state: "pass".
Advisory checks NEVER drive state to "issues". They can only contribute to "warning".

CROCHET STITCH MATH RULES:
"inc" = 2 stitches produced, consumes 1 from previous round.
"dec"/"sc2tog"/"inv dec" = 1 stitch produced, consumes 2.
"sc","hdc","dc","tr","sl st" = 1 produced, consumes 1.
"ch" inside a round adds 1 to count, does not consume from previous round.
Magic ring has 0 stitches before round 1.
Bracket repeats: "(sc, inc) x 6" = 6 × (1+2) = 18 produced, consuming 12.
Do NOT flag counts as wrong unless you have done the arithmetic yourself and confirmed a mismatch.

UNCERTAINTY RULE:
Confidently correct → "pass".
Confidently wrong → "fail".
Cannot verify due to ambiguity, unusual abbreviations, or complex construction → "warning" with brief explanation.
Never guess. Never silently pass something you cannot calculate with confidence.

IGNORE: PDF formatting artifacts, OCR typos in tip/intro sections, print-friendly page duplications at end of PDF.`;

const BEVCHECK_SIMPLE_PROMPT = `You are a crochet pattern validator. Return ONLY a JSON object — no markdown, no backticks:
{"state":"pass or warning or issues","checks":[{"id":"string","label":"string","tier":"core or advisory","status":"pass or warning or fail","detail":"string"}],"summary":"string"}
Always return all 6 checks with these exact IDs and tiers — core: sequence, stitch_math, duplicates, cross_refs — advisory: translation, structure.
STATE derived from core checks only. Any core fail → "issues". Warning only → "warning". All pass → "pass". Advisory never causes "issues".
Stitch math: inc = 2 produced, dec = 1 produced from 2. "(sc, inc) x 6 (12)" is CORRECT. Never flag math wrong unless you verify arithmetic yourself. Cannot verify → "warning" not "fail".`;

async function handleBevCheck(req, res, _url, _key, _t0) {
  const { patternText } = req.body || {};
  if (!patternText) return res.status(400).json({ error: "patternText required" });

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  console.log("[bevcheck] ENV:", GEMINI_KEY ? "GEMINI EXISTS" : "GEMINI MISSING", ANTHROPIC_KEY ? "ANTHROPIC EXISTS" : "ANTHROPIC MISSING", "patternText length:", patternText.length);
  if (!GEMINI_KEY && !ANTHROPIC_KEY) return res.status(500).json({ error: "No API keys configured" });

  const TEXT_LIMIT = 20000;
  const text = patternText.length > TEXT_LIMIT
    ? patternText.slice(0, patternText.lastIndexOf("\n", TEXT_LIMIT) || TEXT_LIMIT)
    : patternText;

  const callGeminiBevCheck = async (prompt) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let r;
    try {
      r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt + "\n\nPATTERN TEXT:\n" + text }] }],
            generationConfig: { temperature: 0, maxOutputTokens: 65536 },
          }),
          signal: controller.signal,
        }
      );
    } catch (fetchErr) {
      clearTimeout(timeout);
      if (fetchErr.name === "AbortError") throw new Error("Gemini timeout after 8s");
      throw fetchErr;
    }
    clearTimeout(timeout);
    if (!r.ok) {
      const errBody = await r.text();
      throw new Error(`Gemini API error ${r.status}: ${errBody.substring(0, 300)}`);
    }
    const data = await r.json();
    const raw = data.candidates?.[0]?.content?.parts?.filter(p => !p.thought)?.map(p => p.text)?.join("") || "";
    if (!raw) throw new Error("Gemini returned empty response");
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  };

  const callClaudeBevCheck = async () => {
    if (!ANTHROPIC_KEY) throw new Error("Anthropic API key not configured");
    const controller = new AbortController();
    const claudeTimeout = setTimeout(() => controller.abort(), 55000);
    let r;
    try {
      r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 2000,
          messages: [{ role: "user", content: BEVCHECK_PROMPT + "\n\nPATTERN TEXT:\n" + text }],
        }),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(claudeTimeout);
      if (fetchErr.name === "AbortError") throw new Error("Claude timeout after 55s");
      throw fetchErr;
    }
    clearTimeout(claudeTimeout);
    if (!r.ok) {
      const errBody = await r.text();
      throw new Error(`Claude API error ${r.status}: ${errBody.substring(0, 200)}`);
    }
    const data = await r.json();
    const raw = data.content?.[0]?.text || "";
    if (!raw) throw new Error("Claude returned empty response");
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    // Attempt direct parse first
    try {
      return JSON.parse(cleaned);
    } catch {
      // Haiku sometimes adds preamble — extract the JSON object via regex
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch (parseErr) {
          throw new Error("Claude returned unparseable JSON: " + cleaned.substring(0, 200));
        }
      }
      throw new Error("Claude returned no JSON object: " + cleaned.substring(0, 200));
    }
  };

  const logToSupabase = (level, message, status) => {
    if (!_url || !_key) return;
    fetch(`${_url}/rest/v1/vercel_logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': _key, 'Authorization': `Bearer ${_key}`, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ timestamp: new Date().toISOString(), level, message, source: 'serverless', request_path: '/api/extract-pattern?mode=bevcheck', request_method: 'POST', status_code: status, project_id: 'wovely' })
    }).catch(() => {});
  };

  // Provider router: check Gemini health before attempting
  const preferredProvider = await getPreferredProvider(GEMINI_KEY);
  console.log("[bevcheck] Router selected provider:", preferredProvider);

  if (preferredProvider === 'gemini') {
    // Attempt 1: Gemini opportunistic fast attempt (8s timeout)
    const t1 = Date.now();
    console.log("[bevcheck] → Attempt 1: Gemini full prompt, chars:", text.length);
    try {
      const result = await callGeminiBevCheck(BEVCHECK_PROMPT);
      console.log("[bevcheck] ✓ Attempt 1 success, state:", result.state, "checks:", (result.checks||[]).length, `(${Date.now()-t1}ms)`);
      logToSupabase('info', `POST /api/extract-pattern?mode=bevcheck → 200 gemini (${Date.now() - _t0}ms)`, 200);
      return res.status(200).json({ ...result, provider: "gemini" });
    } catch (e) {
      console.error("[bevcheck] ✗ Attempt 1 failed:", e.message, `(${Date.now()-t1}ms)`);
    }
  } else {
    console.log("[bevcheck] Router: Gemini degraded — skipping to Haiku");
  }

  // Attempt 2: Claude Haiku primary fallback
  const t2 = Date.now();
  const elapsed = Date.now() - _t0;
  if (elapsed > 40000) {
    console.error("[bevcheck] Skipping Claude fallback — insufficient time budget, elapsed:", elapsed);
    return res.status(500).json({ error: true, message: "bev_tangled", provider: "failed" });
  }
  console.log("[bevcheck] → Attempt 2: Claude Haiku fallback, ANTHROPIC_KEY:", ANTHROPIC_KEY ? "EXISTS" : "MISSING");
  try {
    const result = await callClaudeBevCheck();
    console.log("[bevcheck] ✓ Attempt 2 success, state:", result.state, "checks:", (result.checks||[]).length, `(${Date.now()-t2}ms)`);
    logToSupabase('info', `POST /api/extract-pattern?mode=bevcheck → 200 claude (${Date.now() - _t0}ms)`, 200);
    return res.status(200).json({ ...result, provider: "claude" });
  } catch (e2) {
    console.error("[bevcheck] ✗ Attempt 2 failed:", e2.message, e2.stack?.substring(0, 300), `(${Date.now()-t2}ms)`);
    logToSupabase('error', `[bevcheck] all 2 attempts failed (${Date.now() - _t0}ms)`, 500);
    return res.status(500).json({ error: true, message: "bev_tangled", provider: "failed" });
  }
}

