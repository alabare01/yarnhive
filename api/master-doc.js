export default async function handler(req, res) {
  // CORS — only allow yarnhive.app and yarnhive.com
  const origin = req.headers.origin || "";
  const allowed = ["https://yarnhive.app", "https://yarnhive.com", "http://localhost:5173"];
  if (allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { password } = req.body || {};
  if (!password || password !== process.env.MASTER_DOC_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "Server configuration error" });
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/master_doc?order=version.desc&limit=1&select=content,version,updated_at,change_summary`,
      {
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("[master-doc] Supabase error:", response.status, err);
      return res.status(500).json({ error: "Failed to fetch document" });
    }

    const rows = await response.json();
    if (!rows.length) {
      return res.status(404).json({ error: "No document found" });
    }

    return res.status(200).json(rows[0]);
  } catch (e) {
    console.error("[master-doc] Error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
}
