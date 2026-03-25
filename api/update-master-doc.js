export default async function handler(req, res) {
  // CORS — wovely.app is primary
  const origin = req.headers.origin || "";
  const allowed = [
    "https://wovely.app",
    "https://www.wovely.app",
    "http://localhost:5173",
  ];
  if (allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { password, content, version, change_summary, updated_by } =
    req.body || {};

  // Auth check — same password as read endpoint
  if (!password || password !== process.env.MASTER_DOC_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Validate required fields
  if (!content || typeof content !== "string" || content.length < 100) {
    return res.status(400).json({ error: "Invalid content" });
  }
  if (!version || typeof version !== "number") {
    return res.status(400).json({ error: "Invalid version" });
  }

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "Server configuration error" });
  }

  try {
    // Get the current latest row ID so we know what to update
    const getResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/master_doc?order=version.desc&limit=1&select=id,version`,
      {
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!getResponse.ok) {
      const err = await getResponse.text();
      console.error("[update-master-doc] Supabase get error:", getResponse.status, err);
      return res.status(500).json({ error: "Failed to fetch current document" });
    }

    const rows = await getResponse.json();
    if (!rows.length) {
      return res.status(404).json({ error: "No document found to update" });
    }

    const currentRow = rows[0];
    const currentId = currentRow.id;

    // Update the row
    const updateResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/master_doc?id=eq.${currentId}`,
      {
        method: "PATCH",
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          content,
          version,
          change_summary: change_summary || `Updated to v${version}`,
          updated_by: updated_by || "claude",
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!updateResponse.ok) {
      const err = await updateResponse.text();
      console.error("[update-master-doc] Supabase patch error:", updateResponse.status, err);
      return res.status(500).json({ error: "Failed to update document" });
    }

    const updated = await updateResponse.json();
    const result = Array.isArray(updated) ? updated[0] : updated;

    return res.status(200).json({
      success: true,
      version: result?.version || version,
      updated_at: result?.updated_at || new Date().toISOString(),
      change_summary: result?.change_summary || change_summary,
    });
  } catch (e) {
    console.error("[update-master-doc] Error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
}
