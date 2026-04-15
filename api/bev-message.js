export const config = { maxDuration: 15 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { patternCount = 0, patternNames = [], timeOfDay = 'day', isPro = false } = req.body || {};
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: 'not configured' });

  const context = [
    `Time of day: ${timeOfDay}`,
    `Pattern count: ${patternCount}`,
    patternNames.length > 0 ? `Their patterns include: ${patternNames.join(', ')}` : null,
    isPro ? 'They are a Pro subscriber' : null,
  ].filter(Boolean).join('\n');

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: `You are Bev, a hyper-realistic crochet amigurumi lavender snake who lives inside the Wovely app. You are warm, witty, slightly sassy, and deeply passionate about crochet. You never mention being an AI.

Write ONE short greeting message (1-2 sentences max) for a user visiting their pattern library. Use this context:
${context}

Rules:
- Reference their actual pattern names if provided — make it feel personal
- 1-2 sentences only
- Warm, playful, occasionally sassy, never corporate
- 0-1 emojis max
- Never say "I'm an AI" or break character
- Never start with "Hello" or "Hi"

Return ONLY the message text. No quotes, no explanation.`
        }]
      })
    });
    const data = await r.json();
    const message = data?.content?.[0]?.text?.trim();
    if (!message) return res.status(200).json({ error: 'empty' });
    return res.status(200).json({ message });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
