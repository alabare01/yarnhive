// api/stripe-checkout.js
// Creates a Stripe Checkout session for Wovely Pro subscription

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const _url = process.env.VITE_SUPABASE_URL;
  const _key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const _t0 = Date.now();

  const { userId, email } = req.body || {};
  if (!userId || !email) return res.status(400).json({ error: 'Missing userId or email' });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Wovely Pro',
            description: 'Unlimited pattern imports, BevCheck, Row Tracker & more'
          },
          unit_amount: 899,
          recurring: { interval: 'month' }
        },
        quantity: 1
      }],
      metadata: { userId },
      success_url: 'https://wovely.app?upgrade=success',
      cancel_url: 'https://wovely.app?upgrade=cancelled',
    });

    if (_url && _key) {
      await fetch(`${_url}/rest/v1/vercel_logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': _key, 'Authorization': `Bearer ${_key}`, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', message: `POST /api/stripe-checkout → 200 (${Date.now() - _t0}ms)`, source: 'serverless', request_path: '/api/stripe-checkout', request_method: 'POST', status_code: 200, project_id: 'wovely' })
      }).catch(() => {});
    }
    res.json({ url: session.url });
  } catch (err) {
    console.error('[stripe-checkout] Error:', err.message);
    if (_url && _key) {
      await fetch(`${_url}/rest/v1/vercel_logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': _key, 'Authorization': `Bearer ${_key}`, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ timestamp: new Date().toISOString(), level: 'error', message: `[stripe-checkout] error: ${err.message} (${Date.now() - _t0}ms)`, source: 'serverless', request_path: '/api/stripe-checkout', request_method: 'POST', status_code: 500, project_id: 'wovely' })
      }).catch(() => {});
    }
    res.status(500).json({ error: err.message });
  }
}

