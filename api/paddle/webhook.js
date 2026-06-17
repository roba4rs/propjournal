const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const getRawBody = require('raw-body');

// Disable Vercel's automatic body parsing — Paddle signature verification
// requires the exact raw request body, not the parsed/re-stringified JSON.
module.exports.config = {
  api: {
    bodyParser: false,
  },
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Maps Paddle price IDs back to your internal plan names
const PRICE_TO_PLAN = {
  [process.env.REACT_APP_PADDLE_MONTHLY_PRICE_ID]: { plan: 'monthly', days: 30 },
  [process.env.REACT_APP_PADDLE_SIXMONTH_PRICE_ID]: { plan: 'biannual', days: 183 },
  [process.env.REACT_APP_PADDLE_YEARLY_PRICE_ID]: { plan: 'annual', days: 365 },
};

function verifySignature(rawBody, signatureHeader, secret) {
  // Paddle signature header format: "ts=<timestamp>;h1=<hash>"
  const parts = Object.fromEntries(
    signatureHeader.split(';').map((p) => p.split('='))
  );
  const { ts, h1 } = parts;
  if (!ts || !h1) return false;

  const signedPayload = `${ts}:${rawBody}`;
  const expectedHash = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expectedHash, 'utf8'),
    Buffer.from(h1, 'utf8')
  );
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawBody = await getRawBody(req, { encoding: 'utf-8' });
  const signatureHeader = req.headers['paddle-signature'];

  if (!signatureHeader || !verifySignature(rawBody, signatureHeader, process.env.PADDLE_WEBHOOK_SECRET)) {
    console.error('paddle-webhook: signature verification failed');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (err) {
    console.error('paddle-webhook: failed to parse body', err);
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const eventType = event.event_type;
  const data = event.data;

  try {
    if (eventType === 'subscription.activated' || eventType === 'subscription.updated') {
      const userId = data.custom_data?.user_id;
      const priceId = data.items?.[0]?.price?.id;

      if (!userId) {
        console.error('paddle-webhook: missing user_id in custom_data', data);
        return res.status(200).json({ received: true }); // ack so Paddle doesn't retry forever
      }

      const planInfo = PRICE_TO_PLAN[priceId];
      const days = planInfo?.days ?? 30;
      const planName = planInfo?.plan ?? 'monthly';

      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase
        .from('users')
        .update({
          plan: planName,
          plan_expires_at: expiresAt,
        })
        .eq('id', userId);

      if (error) {
        console.error('paddle-webhook: supabase update failed', error);
        return res.status(500).json({ error: 'Database update failed' });
      }

      console.log(`paddle-webhook: activated ${planName} for user ${userId}`);
    }

    if (eventType === 'subscription.canceled') {
      const userId = data.custom_data?.user_id;
      if (userId) {
        await supabase
          .from('users')
          .update({ plan: 'free_trial' })
          .eq('id', userId);

        console.log(`paddle-webhook: canceled subscription for user ${userId}`);
      }
    }

    // transaction.completed is mainly useful for logging/analytics;
    // subscription.activated already handles granting access.
    if (eventType === 'transaction.completed') {
      console.log('paddle-webhook: transaction completed', data.id);
    }

    return res.status(200).json({ received: true });

  } catch (err) {
    console.error('paddle-webhook error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};