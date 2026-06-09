import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { plan, user_id, email } = req.body;

  const plans = {
    monthly: { amount: 12, description: 'PropJournal Monthly Plan', days: 30 },
    biannual: { amount: 60, description: 'PropJournal 6-Month Plan', days: 183 },
    annual: { amount: 96, description: 'PropJournal Annual Plan', days: 365 },
  };

  const selected = plans[plan];
  if (!selected) {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  try {
    const response = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.NOWPAYMENTS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_amount: selected.amount,
        price_currency: 'usd',
        order_id: `${user_id}_${plan}_${Date.now()}`,
        order_description: selected.description,
        ipn_callback_url: `${process.env.APP_URL}/api/nowpayments-webhook`,
        success_url: `${process.env.APP_URL}/dashboard?payment=success`,
        cancel_url: `${process.env.APP_URL}/pricing?payment=cancelled`,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('NOWPayments error:', data);
      return res.status(500).json({ error: 'Failed to create invoice' });
    }

    return res.status(200).json({
      payment_url: data.invoice_url,
      payment_id: data.id,
    });

  } catch (err) {
    console.error('create-invoice error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}