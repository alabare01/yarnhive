// api/fetch-pattern.js
// Vercel serverless function — fetches a URL server-side and extracts pattern via Gemini

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: "URL required" });

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
  "rows": [{"id": 1, "text": "exact instruction", "done": false, "note": ""}]
}

Important:
- Extract EVERY instruction as its own rows entry
- Include foundation chain, every round or row, assembly steps, finishing
- Keep instruction text exactly as written
- If no crochet pattern exists return: {"error": "No crochet pattern found"}

Page content:
${text}`;

    const geminiRes = await fetch(
     `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      throw new Error(`Gemini API error ${geminiRes.status}: ${errBody}`);
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleanJson = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanJson);

    if (parsed.error) return res.status(422).json({ error: parsed.error });

    const rows = (parsed.rows || []).map((r, i) => ({
      id: Date.now() + i,
      text: r.text || "",
      done: false,
      note: "",
    }));

    return res.status(200).json({ ...parsed, rows });

  } catch (err) {
    console.error("[fetch-pattern]", err.message);
    return res.status(500).json({ error: err.message || "Failed to extract pattern" });
  }
}
