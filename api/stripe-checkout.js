// api/stripe-checkout.js
// Creates a Stripe Checkout session for Wovely Pro subscription

import { withLogging } from './utils/logger.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

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
            description: 'Unlimited pattern imports, Stitch Check, Row Tracker & more'
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

    res.json({ url: session.url });
  } catch (err) {
    console.error('[stripe-checkout] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

export default withLogging(handler);
