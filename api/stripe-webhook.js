// api/stripe-webhook.js
// Handles Stripe webhook events for Wovely Pro subscriptions
// Requires in Vercel env vars:
//   STRIPE_SECRET_KEY — from Stripe dashboard
//   STRIPE_WEBHOOK_SECRET — from Stripe webhook endpoint config
//   SUPABASE_SERVICE_ROLE_KEY — from Supabase dashboard > Settings > API (bypasses RLS)
//   VITE_SUPABASE_URL — Supabase project URL

export const config = { api: { bodyParser: false } };

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function supabaseUpdate(table, data, filter) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${filter}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("[stripe-webhook] Supabase update failed:", res.status, err);
  }
  return res;
}

async function supabaseSelect(table, select, filter) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${filter}&select=${select}`;
  const res = await fetch(url, {
    headers: {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  if (!res.ok) return [];
  return res.json();
}

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => data += chunk);
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sig = req.headers["stripe-signature"];
  let event;

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err.message);
    return res.status(400).json({ error: err.message });
  }

  console.log("[stripe-webhook] Event received:", event.type);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata.userId;
    const customerId = session.customer;
    const subscriptionId = session.subscription;

    await supabaseUpdate("user_profiles", {
      is_pro: true,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
    }, `id=eq.${userId}`);

    console.log(`[stripe-webhook] Pro activated for user ${userId}`);
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    const profiles = await supabaseSelect("user_profiles", "id", `stripe_subscription_id=eq.${subscription.id}`);

    if (profiles?.length) {
      await supabaseUpdate("user_profiles", {
        is_pro: false,
        stripe_subscription_id: null,
      }, `stripe_subscription_id=eq.${subscription.id}`);

      console.log(`[stripe-webhook] Pro cancelled for subscription ${subscription.id}`);
    }
  }

  return res.status(200).json({ received: true });
}
