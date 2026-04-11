// api/extract-pattern.js
// Vercel serverless function — extracts crochet pattern from PDF text via Gemini
// Supports mode: "extract" (default) and mode: "bevcheck" (pattern validation)

export const config = { maxDuration: 60 };

const GEMINI_MODEL = 'gemini-2.5-flash';

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
    return handleBevCheck(req, res, _url, _key, _t0);
  }

  // ── mode: "extract" (default) ──
  const { pdfText: rawText, pageCount } = req.body || {};
  if (!rawText) return res.status(400).json({ error: "pdfText required" });

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  console.log("[extract-pattern] ENV:", GEMINI_KEY ? "GEMINI EXISTS" : "GEMINI MISSING", ANTHROPIC_KEY ? "ANTHROPIC EXISTS" : "ANTHROPIC MISSING", "pdfText length:", rawText.length, "pageCount:", pageCount);
  if (!GEMINI_KEY) return res.status(500).json({ error: "API key not configured on server" });

  // Hard truncation: cap at 15k chars to prevent memory issues
  const TEXT_LIMIT = 15000;
  let pdfText = rawText;
  if (pdfText.length > TEXT_LIMIT) {
    const lastNewline = pdfText.lastIndexOf("\n", TEXT_LIMIT);
    pdfText = pdfText.slice(0, lastNewline > 0 ? lastNewline : TEXT_LIMIT)
      + "\n[Note: Pattern truncated at 15,000 chars for processing.]";
    console.log("[extract-pattern] Truncated from", rawText.length, "to", pdfText.length, "chars");
  }

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
        `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
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
${text}`;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 8000,
        messages: [{ role: "user", content: claudePrompt }],
      }),
    });

    if (!r.ok) {
      const errBody = await r.text();
      console.error("[extract-pattern] Claude HTTP error:", r.status, errBody.substring(0, 300));
      throw new Error(`Claude API error ${r.status}: ${errBody.substring(0, 200)}`);
    }

    const data = await r.json();
    const rawText = data.content?.[0]?.text || "";
    if (!rawText) throw new Error("Claude returned empty response");

    const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
    const toParse = cleaned.startsWith("{") ? cleaned : rawText.trim();
    try {
      return JSON.parse(toParse);
    } catch (parseErr) {
      console.error("[extract-pattern] Claude JSON parse failed, text starts:", toParse.substring(0, 300));
      throw new Error("Claude JSON parse failed: " + parseErr.message);
    }
  };

  // Attempt 1: full structured prompt
  console.log("[extract-pattern] Attempt 1: full prompt, pages:", pageCount || "unknown", "chars:", pdfText.length);
  try {
    const result = await callGemini(fullPrompt, 65536);
    console.log("[extract-pattern] Success:", result.title, "—", (result.components || []).length, "components");
    if (_url && _key) {
      await fetch(`${_url}/rest/v1/vercel_logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': _key, 'Authorization': `Bearer ${_key}`, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', message: `POST /api/extract-pattern → 200 (${Date.now() - _t0}ms)`, source: 'serverless', request_path: '/api/extract-pattern', request_method: 'POST', status_code: 200, project_id: 'wovely' })
      }).catch(() => {});
    }
    return res.status(200).json(result);
  } catch (e) {
    console.error("[extract-pattern] Attempt 1 failed:", e.message);
  }

  // Attempt 2: simplified prompt — flat rows, faster response
  console.log("[extract-pattern] Attempt 2: simplified prompt");
  try {
    const result = await callGemini(simplePrompt, 32768);
    console.log("[extract-pattern] Simplified success:", result.title);
    if (_url && _key) {
      await fetch(`${_url}/rest/v1/vercel_logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': _key, 'Authorization': `Bearer ${_key}`, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', message: `POST /api/extract-pattern → 200 simplified (${Date.now() - _t0}ms)`, source: 'serverless', request_path: '/api/extract-pattern', request_method: 'POST', status_code: 200, project_id: 'wovely' })
      }).catch(() => {});
    }
    return res.status(200).json(result);
  } catch (e2) {
    console.error("[extract-pattern] Attempt 2 also failed:", e2.message);
  }

  // Attempt 3: Claude Haiku fallback — silent, user never sees this happen
  console.log("[extract-pattern] Attempt 3: Claude Haiku fallback");
  try {
    const result = await callClaude(pdfText);
    console.log("[extract-pattern] Claude fallback success:", result.title);
    if (_url && _key) {
      await fetch(`${_url}/rest/v1/vercel_logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': _key, 'Authorization': `Bearer ${_key}`, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', message: `POST /api/extract-pattern → 200 claude-fallback (${Date.now() - _t0}ms)`, source: 'serverless', request_path: '/api/extract-pattern', request_method: 'POST', status_code: 200, project_id: 'wovely' })
      }).catch(() => {});
    }
    return res.status(200).json(result);
  } catch (e3) {
    console.error("[extract-pattern] Claude fallback also failed:", e3.message);
    if (_url && _key) {
      await fetch(`${_url}/rest/v1/vercel_logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': _key, 'Authorization': `Bearer ${_key}`, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ timestamp: new Date().toISOString(), level: 'error', message: `[extract-pattern] error: all 3 attempts failed (${Date.now() - _t0}ms)`, source: 'serverless', request_path: '/api/extract-pattern', request_method: 'POST', status_code: 500, project_id: 'wovely' })
      }).catch(() => {});
    }
    return res.status(500).json({ error: "Pattern extraction failed after 3 attempts" });
  }

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
  "overall": "valid" or "review" or "issues",
  "score": number 0-100,
  "checks": [
    { "id": "string", "label": "string", "status": "pass" or "warning" or "fail", "detail": "string" }
  ],
  "summary": "string"
}

Check for these 3 items ONLY (sequential rows, stitch math, and duplicate checks are handled separately by code):
1. Cross-references — does the pattern reference rounds that don't exist? (id: "cross_refs")
2. Translation artifacts — does phrasing suggest a translated pattern that may have errors? (id: "translation")
3. Component structure — are section headers clear and consistent? (id: "structure")

SCORING: Score is based ONLY on these 3 checks. 100 = all pass, deduct points for warnings/failures proportionally across 3 checks.

SCORING RULES — do NOT penalize for any of the following:
• PDF formatting artifacts (OCR typos in tip/intro sections, formatting inconsistencies, page headers/footers)
• Print-Friendly page duplications — if the pattern appears duplicated at the end under a "Print-Friendly" or similar heading, ignore the duplicate section entirely. This is a common PDF feature, not a pattern error.
• Non-US decimal conventions (comma instead of period for decimals)
• Minor grammatical issues that do not affect the crochet instructions
These may be noted as informational "pass" items at most, never scored as warnings or failures.

Be specific in detail fields. Name exact round numbers where issues occur. If everything looks clean, say so clearly. Aim for scores 80-100 for patterns with no structural issues.`;

const BEVCHECK_SIMPLE_PROMPT = `You are a crochet pattern validator. Analyze this pattern and return ONLY a JSON object — no markdown, no backticks:
{"overall":"valid or review or issues","score":0-100,"checks":[{"id":"string","label":"string","status":"pass or warning or fail","detail":"string"}],"summary":"string"}
Check ONLY these 3 items (sequential rows, stitch math, and duplicates are handled by code separately):
1. Cross-references — references to rounds that don't exist? (id: "cross_refs")
2. Translation artifacts — signs of machine translation errors? (id: "translation")
3. Component structure — are sections clear and consistent? (id: "structure")
Score based on these 3 checks only. 100 = all pass. Be specific. Aim 80-100 for clean patterns.`;

// ── Deterministic BevCheck helpers ──

function parseSections(text) {
  // Split pattern text into named sections/components
  const sections = [];
  const sectionRegex = /^(?:#{1,3}\s+|[A-Z][A-Za-z\s&'-]*(?:\(.*?\))?[\s]*[:—–-]\s*$)/gm;
  const headers = [...text.matchAll(sectionRegex)];
  if (headers.length === 0) {
    sections.push({ name: "Main", body: text });
  } else {
    for (let i = 0; i < headers.length; i++) {
      const start = headers[i].index + headers[i][0].length;
      const end = i + 1 < headers.length ? headers[i + 1].index : text.length;
      sections.push({ name: headers[i][0].trim().replace(/[:—–-]\s*$/, '').trim(), body: text.slice(start, end) });
    }
  }
  return sections;
}

function extractRows(sectionBody) {
  // Match rows like "RND 1:", "Rnd 1.", "Row 1:", "R1:", "1.", "1:" etc.
  const rowRegex = /^[\s]*(?:(?:rnd|round|row|r)[\s.]*)?(\d+)[\s]*[.:)—–-]/gim;
  const rows = [];
  let m;
  while ((m = rowRegex.exec(sectionBody)) !== null) {
    const num = parseInt(m[1], 10);
    // grab the rest of the line as the instruction
    const lineEnd = sectionBody.indexOf('\n', m.index);
    const instruction = sectionBody.slice(m.index, lineEnd === -1 ? undefined : lineEnd).trim();
    rows.push({ num, instruction, offset: m.index });
  }
  return rows;
}

function checkSequentialRows(text) {
  const sections = parseSections(text);
  const gaps = [];
  for (const sec of sections) {
    const rows = extractRows(sec.body);
    if (rows.length < 2) continue;
    for (let i = 1; i < rows.length; i++) {
      const expected = rows[i - 1].num + 1;
      if (rows[i].num !== expected && rows[i].num > rows[i - 1].num) {
        gaps.push(`${sec.name}: gap between row ${rows[i - 1].num} and ${rows[i].num}`);
      } else if (rows[i].num < rows[i - 1].num && rows[i].num !== 1) {
        // out of order (but row 1 restart = new section, skip)
        gaps.push(`${sec.name}: row ${rows[i].num} appears after row ${rows[i - 1].num} (out of order)`);
      }
    }
  }
  return {
    id: "sequence", label: "Sequential rounds/rows",
    status: gaps.length ? "fail" : "pass",
    detail: gaps.length ? gaps.join("; ") : "All rows are sequential with no gaps."
  };
}

function checkDuplicateRounds(text) {
  const sections = parseSections(text);
  const dupes = [];
  for (const sec of sections) {
    const rows = extractRows(sec.body);
    const seen = new Map();
    for (const row of rows) {
      const prev = seen.get(row.num);
      if (prev && prev !== row.instruction) {
        dupes.push(`${sec.name}: row ${row.num} appears multiple times with different instructions`);
      }
      if (!prev) seen.set(row.num, row.instruction);
    }
  }
  return {
    id: "duplicates", label: "Duplicate round numbers",
    status: dupes.length ? "fail" : "pass",
    detail: dupes.length ? dupes.join("; ") : "No duplicate round numbers found."
  };
}

function checkStitchMath(text) {
  // Parse stitch counts from parenthetical totals at end of row instructions
  const STITCH_COUNTS = {
    sc: 1, hdc: 1, dc: 1, tr: 1, slst: 1, 'sl st': 1, 'sl-st': 1,
    inc: 2, dec: 1, sc2tog: 1, hdc2tog: 1, dc2tog: 1, invdec: 1, 'inv dec': 1,
  };

  function countStitchesInGroup(groupText) {
    let total = 0;
    let confident = true;
    // Normalize
    const norm = groupText.toLowerCase().replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    // tokenize: match "N stitch" or "stitch" patterns
    const tokenRegex = /(\d+)?\s*(sc2tog|hdc2tog|dc2tog|inv\s*dec|invdec|sl[\s-]*st|slst|sc|hdc|dc|tr|inc|dec)\b/gi;
    let t;
    let matched = false;
    while ((t = tokenRegex.exec(norm)) !== null) {
      matched = true;
      const count = t[1] ? parseInt(t[1], 10) : 1;
      const stitch = t[2].toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
      const mapped = stitch === 'slst' ? 1 : (stitch === 'invdec' ? 1 : STITCH_COUNTS[stitch]);
      if (mapped === undefined) { confident = false; continue; }
      total += count * mapped;
    }
    if (!matched) confident = false;
    return { total, confident };
  }

  const flagged = [];
  const sections = parseSections(text);
  for (const sec of sections) {
    const rows = extractRows(sec.body);
    for (const row of rows) {
      // Look for stated count in parentheses at end: (40) or (40 sts) or (40 st)
      const statedMatch = row.instruction.match(/\((\d+)(?:\s*(?:sts?|stitches?))?\)\s*$/i);
      if (!statedMatch) continue;
      const stated = parseInt(statedMatch[1], 10);

      // Get the instruction text before the stated count
      const instrText = row.instruction.slice(0, row.instruction.lastIndexOf(statedMatch[0]));

      // Handle repeat groups: (group) x N or (group) * N
      const repeatRegex = /\(([^)]+)\)\s*[x×*]\s*(\d+)/gi;
      let totalCalc = 0;
      let allConfident = true;
      let hasRepeats = false;
      let processedText = instrText;

      let rm;
      while ((rm = repeatRegex.exec(instrText)) !== null) {
        hasRepeats = true;
        const { total: groupTotal, confident } = countStitchesInGroup(rm[1]);
        if (!confident) { allConfident = false; break; }
        const repeatCount = parseInt(rm[2], 10);
        totalCalc += groupTotal * repeatCount;
        processedText = processedText.replace(rm[0], '');
      }

      if (!allConfident) continue; // too complex, skip

      // Count remaining stitches outside repeat groups
      const { total: remainingTotal, confident: remainingConfident } = countStitchesInGroup(processedText);
      if (!remainingConfident && !hasRepeats) continue; // can't parse at all, skip
      totalCalc += remainingTotal;

      if (totalCalc > 0 && totalCalc !== stated) {
        flagged.push(`${sec.name} row ${row.num}: calculated ${totalCalc}, stated (${stated})`);
      }
    }
  }
  return {
    id: "stitch_math", label: "Stitch count math",
    status: flagged.length ? "fail" : "pass",
    detail: flagged.length ? flagged.join("; ") : "All verifiable stitch counts match."
  };
}

function runDeterministicChecks(text) {
  return [
    checkSequentialRows(text),
    checkDuplicateRounds(text),
    checkStitchMath(text),
  ];
}

function mergeChecks(llmResult, codeChecks) {
  // Combine LLM checks with code-based checks, recalculate overall score
  const allChecks = [...codeChecks, ...(llmResult.checks || [])];
  const failCount = allChecks.filter(c => c.status === "fail").length;
  const warnCount = allChecks.filter(c => c.status === "warning").length;
  const total = allChecks.length;
  // Each check is worth equal weight; fails deduct full share, warnings deduct half
  const score = total > 0 ? Math.round(100 * (1 - (failCount / total) - (warnCount / (2 * total)))) : 100;
  const clampedScore = Math.max(0, Math.min(100, score));
  const overall = failCount > 0 ? "issues" : warnCount > 0 ? "review" : "valid";
  return { overall, score: clampedScore, checks: allChecks, summary: llmResult.summary || "" };
}

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
    const timeout = setTimeout(() => controller.abort(), 4000);
    let r;
    try {
      r = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
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
      if (fetchErr.name === "AbortError") throw new Error("Gemini timeout after 4s");
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
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4000,
        messages: [{ role: "user", content: BEVCHECK_PROMPT + "\n\nPATTERN TEXT:\n" + text }],
      }),
    });
    if (!r.ok) {
      const errBody = await r.text();
      throw new Error(`Claude API error ${r.status}: ${errBody.substring(0, 200)}`);
    }
    const data = await r.json();
    const raw = data.content?.[0]?.text || "";
    if (!raw) throw new Error("Claude returned empty response");
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  };

  const logToSupabase = (level, message, status) => {
    if (!_url || !_key) return;
    fetch(`${_url}/rest/v1/vercel_logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': _key, 'Authorization': `Bearer ${_key}`, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ timestamp: new Date().toISOString(), level, message, source: 'serverless', request_path: '/api/extract-pattern?mode=bevcheck', request_method: 'POST', status_code: status, project_id: 'wovely' })
    }).catch(() => {});
  };

  // ── Deterministic code-based checks ──
  const codeChecks = runDeterministicChecks(text);

  // Attempt 1: Gemini full prompt
  console.log("[bevcheck] Attempt 1: Gemini full prompt, chars:", text.length);
  try {
    const result = await callGeminiBevCheck(BEVCHECK_PROMPT);
    console.log("[bevcheck] Gemini full success, score:", result.score);
    logToSupabase('info', `POST /api/extract-pattern?mode=bevcheck → 200 gemini (${Date.now() - _t0}ms)`, 200);
    const merged = mergeChecks(result, codeChecks);
    return res.status(200).json({ ...merged, provider: "gemini" });
  } catch (e) {
    console.error("[bevcheck] Attempt 1 failed:", e.message);
  }

  // Attempt 2: Gemini simplified prompt
  console.log("[bevcheck] Attempt 2: Gemini simplified prompt");
  try {
    const result = await callGeminiBevCheck(BEVCHECK_SIMPLE_PROMPT);
    console.log("[bevcheck] Gemini simplified success, score:", result.score);
    logToSupabase('info', `POST /api/extract-pattern?mode=bevcheck → 200 gemini_simplified (${Date.now() - _t0}ms)`, 200);
    const merged = mergeChecks(result, codeChecks);
    return res.status(200).json({ ...merged, provider: "gemini_simplified" });
  } catch (e2) {
    console.error("[bevcheck] Attempt 2 failed:", e2.message);
  }

  // Attempt 3: Claude Haiku fallback
  console.log("[bevcheck] Attempt 3: Claude Haiku fallback");
  try {
    const result = await callClaudeBevCheck();
    console.log("[bevcheck] Claude success, score:", result.score);
    logToSupabase('info', `POST /api/extract-pattern?mode=bevcheck → 200 claude (${Date.now() - _t0}ms)`, 200);
    const merged = mergeChecks(result, codeChecks);
    return res.status(200).json({ ...merged, provider: "claude" });
  } catch (e3) {
    console.error("[bevcheck] Attempt 3 failed:", e3.message);
    logToSupabase('error', `[bevcheck] all 3 attempts failed (${Date.now() - _t0}ms)`, 500);
    return res.status(500).json({ error: true, message: "bev_tangled", provider: "failed" });
  }
}

