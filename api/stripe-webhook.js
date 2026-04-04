// api/stripe-webhook.js
// Handles Stripe webhook events for Wovely Pro subscriptions
// Requires Vercel env vars:
//   STRIPE_SECRET_KEY — from Stripe dashboard
//   STRIPE_WEBHOOK_SECRET — from Stripe webhook endpoint config
//   SUPABASE_SERVICE_ROLE_KEY — from Supabase dashboard > Settings > API (bypasses RLS)
//   VITE_SUPABASE_URL — Supabase project URL

import { withLogging } from './utils/logger.js';

export const config = { api: { bodyParser: false } };

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[stripe-webhook] Signature error:', err.message);
    return res.status(400).json({ error: err.message });
  }

  console.log('[stripe-webhook] Event:', event.type);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata.userId;
    const customerId = session.customer;
    const subscriptionId = session.subscription;

    const { error } = await supabase
      .from('user_profiles')
      .update({
        is_pro: true,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId
      })
      .eq('id', userId);

    if (error) {
      console.error('[stripe-webhook] Supabase update error:', error.message);
    } else {
      console.log('[stripe-webhook] Pro activated for user:', userId);
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const { error } = await supabase
      .from('user_profiles')
      .update({ is_pro: false, stripe_subscription_id: null })
      .eq('stripe_subscription_id', subscription.id);

    if (error) {
      console.error('[stripe-webhook] Cancel error:', error.message);
    } else {
      console.log('[stripe-webhook] Pro cancelled for subscription:', subscription.id);
    }
  }

  res.json({ received: true });
}

export default withLogging(handler);
