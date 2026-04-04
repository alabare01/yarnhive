// api/send-feedback.js
// Accepts user feedback, stores in Supabase, sends formatted email via Resend
// Env vars: SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_URL, RESEND_API_KEY

import { createClient } from '@supabase/supabase-js';

let _supabase = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabase;
}

function buildSubject(category, severity, email, page) {
  const from = email || 'anonymous';
  if (category === 'Bug') return `🐛 ${severity ? `[${severity}] ` : ''}Bug from ${from} on ${page || '/'}`;
  if (category === 'Idea') return `💡 New Idea from ${from}`;
  if (category === 'Love it') return `❤️ Love Note from ${from}`;
  return `New ${category} from ${from}`;
}

function buildEmailBody(data) {
  const { category, message, stepsToReproduce, expectedBehavior, severity, email, page, browser, device, screenSize, attachmentUrl } = data;
  const lines = [];
  lines.push(`Category: ${category}`);
  lines.push(`From: ${email || 'anonymous'}`);
  lines.push(`Page: ${page || '/'}`);
  lines.push('');

  if (category === 'Bug') {
    lines.push('── What went wrong ──');
    lines.push(message);
    if (stepsToReproduce) { lines.push(''); lines.push('── Steps to reproduce ──'); lines.push(stepsToReproduce); }
    if (expectedBehavior) { lines.push(''); lines.push('── Expected behavior ──'); lines.push(expectedBehavior); }
    if (severity) { lines.push(''); lines.push(`Severity: ${severity}`); }
    lines.push('');
    lines.push('── Device Info ──');
    lines.push(`Browser: ${browser || 'unknown'}`);
    lines.push(`Device: ${device || 'unknown'}`);
    lines.push(`Screen: ${screenSize || 'unknown'}`);
    if (attachmentUrl) { lines.push(''); lines.push(`Attachment: ${attachmentUrl}`); }
  } else if (category === 'Idea') {
    lines.push('── The Idea ──');
    lines.push(message);
    if (stepsToReproduce) { lines.push(''); lines.push('── How it would help ──'); lines.push(stepsToReproduce); }
  } else {
    lines.push(message);
  }

  lines.push('');
  lines.push(`Submitted: ${new Date().toISOString()}`);
  return lines.join('\n');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const _url = process.env.VITE_SUPABASE_URL;
  const _key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const _t0 = Date.now();

  // Env var checks
  if (!process.env.VITE_SUPABASE_URL) {
    console.error('[send-feedback] Missing VITE_SUPABASE_URL');
    return res.status(500).json({ error: 'Missing VITE_SUPABASE_URL' });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[send-feedback] Missing SUPABASE_SERVICE_ROLE_KEY');
    return res.status(500).json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' });
  }
  if (!process.env.RESEND_API_KEY) {
    console.error('[send-feedback] Missing RESEND_API_KEY');
    return res.status(500).json({ error: 'Missing RESEND_API_KEY' });
  }

  try {
    const { userId, email, category, message, stepsToReproduce, expectedBehavior, severity, attachmentUrl, page, browser, device, screenSize } = req.body;

    if (!category || !message) {
      return res.status(400).json({ error: 'Category and message are required' });
    }

    // Insert into Supabase
    // NOTE: user_id should be nullable without FK constraint on feedback table
    // to avoid 23503 foreign key violations when user IDs differ across environments.
    try {
      const insertPayload = {
        user_id: userId || null,
        email: email || null,
        category,
        message,
        steps_to_reproduce: stepsToReproduce || null,
        expected_behavior: expectedBehavior || null,
        severity: severity || null,
        page: page || null,
        browser: browser || null,
        device: device || null,
        screen_size: screenSize || null,
        attachment_url: attachmentUrl || null,
        created_at: new Date().toISOString()
      };
      console.log('[send-feedback] Attempting insert with payload:', JSON.stringify(insertPayload));

      const { data: dbData, error: dbError } = await getSupabase()
        .from('feedback')
        .insert(insertPayload)
        .select();

      console.log('[send-feedback] Full DB result:', JSON.stringify(dbData), JSON.stringify(dbError));

      if (dbError) {
        if (dbError.code === '23503') {
          console.error('[send-feedback] Foreign key violation (23503) — user_id may not exist in auth.users:', dbError.message, 'details:', dbError.details);
        } else if (dbError.code === '23502') {
          console.error('[send-feedback] Not-null violation (23502) — a required column is null:', dbError.message, 'details:', dbError.details);
        } else {
          console.error('[send-feedback] Supabase insert error:', dbError.message, 'details:', dbError.details, 'hint:', dbError.hint, 'code:', dbError.code);
        }
        return res.status(500).json({ error: 'Failed to save feedback', detail: dbError.message, code: dbError.code });
      }
    } catch (dbErr) {
      console.error('[send-feedback] Supabase insert exception:', dbErr);
      return res.status(500).json({ error: 'Failed to save feedback', detail: dbErr.message });
    }

    // Send email via Resend
    try {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Wovely Feedback <support@wovely.app>',
          to: 'support@wovely.app',
          subject: buildSubject(category, severity, email, page),
          text: buildEmailBody(req.body)
        })
      });

      if (!emailRes.ok) {
        const errBody = await emailRes.text();
        console.error('[send-feedback] Resend error:', emailRes.status, errBody);
      }
    } catch (emailErr) {
      console.error('[send-feedback] Resend exception:', emailErr);
      // Don't fail the request — feedback was already saved
    }

    if (_url && _key) {
      fetch(`${_url}/rest/v1/vercel_logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': _key, 'Authorization': `Bearer ${_key}`, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', message: `POST /api/send-feedback → 200 (${Date.now() - _t0}ms)`, source: 'serverless', request_path: '/api/send-feedback', request_method: 'POST', status_code: 200, project_id: 'wovely' })
      }).catch(() => {});
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[send-feedback] Unexpected error:', err);
    if (_url && _key) {
      fetch(`${_url}/rest/v1/vercel_logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': _key, 'Authorization': `Bearer ${_key}`, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ timestamp: new Date().toISOString(), level: 'error', message: `[send-feedback] error: ${err.message} (${Date.now() - _t0}ms)`, source: 'serverless', request_path: '/api/send-feedback', request_method: 'POST', status_code: 500, project_id: 'wovely' })
      }).catch(() => {});
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}

