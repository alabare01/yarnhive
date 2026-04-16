// api/fetch-pattern.js
// Vercel serverless function — fetches a URL server-side and extracts pattern via Gemini

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const _url = process.env.VITE_SUPABASE_URL;
  const _key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const _t0 = Date.now();

  const { url, mode: fetchMode } = req.body || {};
  if (!url) return res.status(400).json({ error: "URL required" });

  // proxy_pdf mode: download raw PDF bytes server-side and return them (avoids CORS on CDN URLs)
  if (fetchMode === 'proxy_pdf') {
    try {
      const pdfRes = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/pdf,*/*',
        },
        redirect: 'follow',
      });
      if (!pdfRes.ok) throw new Error(`Could not fetch PDF (${pdfRes.status})`);
      const arrayBuffer = await pdfRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.setHeader('Content-Type', 'application/pdf');
      return res.status(200).send(buffer);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) return res.status(500).json({ error: "API key not configured on server" });

  try {
    const pageRes = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      redirect: "follow",
    });

    if (!pageRes.ok) throw new Error(`Could not load that page (${pageRes.status})`);
    const html = await pageRes.text();

    // Extract hero image before stripping HTML
    let thumbnail_url = "";
    const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
                 || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    if (ogImage?.[1]) thumbnail_url = ogImage[1];

    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
      .replace(/<header[\s\S]*?<\/header>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
      .replace(/<aside[\s\S]*?<\/aside>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#\d+;/g, " ")
      .trim()
      .slice(0, 14000);

    const prompt = `You are a crochet pattern parser. Extract the complete crochet pattern from the page text below. Return ONLY a raw JSON object — no markdown, no code fences, no explanation. Just the JSON.

IGNORE ALL OF THE FOLLOWING — this is web page noise, not pattern content:
- Navigation menus, header links, footer links, breadcrumbs
- Blog post listings, "related posts", "you might also like" sections
- Instagram feeds, social media embeds, Pinterest buttons, share links
- Comment sections, user reviews, reply threads
- Sidebar content, category lists, tag clouds, archive links
- Author bios, "about the designer" sections (except the designer name)
- Advertisement text, sponsored content, affiliate disclaimers
- Photo captions, image descriptions, alt text
- Newsletter signup forms, popup text, cookie notices

FOCUS ONLY ON:
- Rows and rounds with stitch instructions (e.g. "Row 1: Ch 20, sc in 2nd ch from hook...")
- Stitch counts in parentheses (e.g. "(24 sts)", "(40)")
- Materials lists: yarn name/weight/yardage, hook size, notions
- Pattern notes, gauge, abbreviations, special stitches
- Section and component headers (e.g. "Body", "Sleeves", "Border")
- Assembly and finishing instructions

If the page contains multiple patterns or blog posts, extract ONLY the pattern that is most prominently featured or that the URL directly references. Do not extract content from related post listings or suggested patterns.

Schema:
{
  "title": "pattern name",
  "source": "domain only e.g. allfreecrochet.com",
  "cat": "Blankets or Wearables or Accessories or Amigurumi or Home Décor or Uncategorized",
  "hook": "hook size e.g. 5.0mm or empty string",
  "weight": "yarn weight e.g. Worsted or empty string",
  "yardage": 0,
  "notes": "1-2 sentence description of the pattern",
  "materials": [{"id": 1, "name": "material name", "amount": "amount", "yardage": 0}],
  "components": [{"name": "string", "make_count": 1, "independent": false, "rows": [{"id": 1, "text": "exact instruction", "done": false, "note": ""}]}]
}

Important:
- Group instructions into named components (e.g. "Body", "Arm", "Assembly & Finishing")
- Extract EVERY instruction as its own rows entry within its component
- Include foundation chain, every round or row, assembly steps, finishing
- Keep instruction text exactly as written
- Set independent: true on a component ONLY when the pattern explicitly says it can be worked separately or simultaneously (e.g. "make 2 separately", "can be worked at the same time"). Default is false.
- If the pattern has no clear components, use a single component with name matching the pattern title
- If no crochet pattern instructions are found, return: {"error": "No crochet pattern found"}
- NEVER hallucinate or invent pattern steps — if the page text does not contain actual stitch instructions, return empty rows and components arrays rather than guessing

Page content:
${text}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 16000 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      throw new Error(`Gemini API error ${geminiRes.status}: ${errBody}`);
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    let cleanJson = rawText.replace(/```json|```/g, "").trim();

    // If JSON is truncated, attempt to salvage what we have
    if (!cleanJson.endsWith("}")) {
      const lastCompleteRow = cleanJson.lastIndexOf('{"id"');
      if (lastCompleteRow > 0) {
        cleanJson = cleanJson.substring(0, lastCompleteRow);
        cleanJson = cleanJson.replace(/,\s*$/, "") + "]}";
      }
    }

    const parsed = JSON.parse(cleanJson);

    if (parsed.error) return res.status(422).json({ error: parsed.error });

    // Build rows from components if available, otherwise fall back to flat rows
    let rows;
    if (parsed.components && parsed.components.length > 0) {
      rows = [];
      let rowId = 1;
      parsed.components.forEach(comp => {
        const makeCount = comp.make_count || 1;
        const label = comp.name + (makeCount > 1 ? ` (MAKE ${makeCount})` : "");
        rows.push({ id: Date.now() + rowId, text: "── " + label.toUpperCase() + " ──", isHeader: true, done: false, note: "", componentName: comp.name, makeCount, independent: !!comp.independent });
        rowId++;
        (comp.rows || []).forEach(r => {
          rows.push({ id: Date.now() + rowId, text: r.text || "", done: false, note: "", componentName: comp.name });
          rowId++;
        });
      });
    } else {
      rows = (parsed.rows || []).map((r, i) => ({
        id: Date.now() + i,
        text: r.text || "",
        done: false,
        note: "",
      }));
    }

    if (_url && _key) {
      await fetch(`${_url}/rest/v1/vercel_logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': _key, 'Authorization': `Bearer ${_key}`, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', message: `POST /api/fetch-pattern → 200 (${Date.now() - _t0}ms)`, source: 'serverless', request_path: '/api/fetch-pattern', request_method: 'POST', status_code: 200, project_id: 'wovely' })
      }).catch(() => {});
    }
    return res.status(200).json({ ...parsed, rows, thumbnail_url });

  } catch (err) {
    console.error("[fetch-pattern]", err.message);
    if (_url && _key) {
      await fetch(`${_url}/rest/v1/vercel_logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': _key, 'Authorization': `Bearer ${_key}`, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ timestamp: new Date().toISOString(), level: 'error', message: `[fetch-pattern] error: ${err.message} (${Date.now() - _t0}ms)`, source: 'serverless', request_path: '/api/fetch-pattern', request_method: 'POST', status_code: 500, project_id: 'wovely' })
      }).catch(() => {});
    }
    return res.status(500).json({ error: err.message || "Failed to extract pattern" });
  }
}

