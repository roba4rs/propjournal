import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Disable Vercel's automatic body parsing — we need the raw bytes for HMAC
export const config = {
  api: { bodyParser: false },
};

// Read raw body from the request stream
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Read raw body before any parsing
    const rawBody = await getRawBody(req);

    // Verify HMAC-SHA512 signature over the raw body
    const signature = req.headers['x-nowpayments-sig'];
    const hmac = crypto
      .createHmac('sha512', process.env.NOWPAYMENTS_IPN_SECRET)
      .update(rawBody)
      .digest('hex');

    if (hmac !== signature) {
      console.error('Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Now safe to parse
    const { payment_status, order_id } = JSON.parse(rawBody);

    // Only process confirmed/finished payments
    if (payment_status !== 'confirmed' && payment_status !== 'finished') {
      return res.status(200).json({ received: true });
    }

    // order_id format: userId_plan_timestamp
    const [user_id, plan] = order_id.split('_');

    const planDays = {
      monthly: 30,
      biannual: 183,
      annual: 365,
    };

    const days = planDays[plan];
    if (!days) {
      console.error('Unknown plan:', plan);
      return res.status(400).json({ error: 'Unknown plan' });
    }

    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + days);

    const { error } = await supabase
      .from('users')
      .update({
        plan: plan,
        plan_expires_at: expires_at.toISOString(),
      })
      .eq('id', user_id);

    if (error) {
      console.error('Supabase update error:', error);
      return res.status(500).json({ error: 'DB update failed' });
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('webhook error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}