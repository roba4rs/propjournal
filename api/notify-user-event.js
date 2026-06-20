// Receives Supabase Database Webhook calls for INSERT and UPDATE events
// on the `users` table, and sends a Telegram notification to the admin for:
//   1. New signup (row INSERT — i.e. trial started)
//   2. Payment confirmed (row UPDATE where plan_expires_at goes from null -> a real value)
//
// This file does NOT touch webhook.js or any Paddle logic. It is purely
// reacting to changes already written to Supabase by other parts of the app.

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }
  
    // ── Verify the request actually came from Supabase ──────────────────────
    const incomingSecret = req.headers['x-webhook-secret']
    if (!incomingSecret || incomingSecret !== process.env.SUPABASE_WEBHOOK_SECRET) {
      console.error('notify-user-event: invalid or missing webhook secret')
      return res.status(401).json({ error: 'Unauthorized' })
    }
  
    const payload = req.body
    // Supabase Database Webhook payload shape:
    // { type: 'INSERT' | 'UPDATE' | 'DELETE', table, record, old_record, schema }
    const { type, record, old_record } = payload || {}
  
    try {
      if (type === 'INSERT') {
        await sendNewSignupNotification(record)
      }
  
      if (type === 'UPDATE') {
        const wentFromNullToSet =
          old_record &&
          record &&
          old_record.plan_expires_at == null &&
          record.plan_expires_at != null
  
        if (wentFromNullToSet) {
          await sendPaymentConfirmedNotification(record)
        }
      }
  
      return res.status(200).json({ received: true })
    } catch (err) {
      console.error('notify-user-event error:', err)
      // Still 200 so Supabase doesn't endlessly retry on a Telegram hiccup
      return res.status(200).json({ received: true, notified: false })
    }
  }
  
  async function sendNewSignupNotification(record) {
    const email = record?.email || 'unknown'
    const name = record?.name || null
    const trialStart = record?.trial_start
      ? new Date(record.trial_start).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
      : 'just now'
  
    const lines = [
      '🎉 *New signup*',
      `Email: ${escapeMarkdown(email)}`,
    ]
    if (name) lines.push(`Name: ${escapeMarkdown(name)}`)
    lines.push(`Trial started: ${escapeMarkdown(trialStart)}`)
  
    await sendTelegramMessage(lines.join('\n'))
  }
  
  async function sendPaymentConfirmedNotification(record) {
    const email = record?.email || 'unknown'
    const plan = record?.plan || 'unknown'
    const expiresAt = record?.plan_expires_at
      ? new Date(record.plan_expires_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
      : 'unknown'
  
    const planLabels = {
      monthly: 'Monthly',
      biannual: '6 Months',
      annual: 'Annual',
    }
    const planLabel = planLabels[plan] || plan
  
    const lines = [
      '💰 *Payment confirmed*',
      `Email: ${escapeMarkdown(email)}`,
      `Plan: ${escapeMarkdown(planLabel)}`,
      `Renews/expires: ${escapeMarkdown(expiresAt)}`,
    ]
  
    await sendTelegramMessage(lines.join('\n'))
  }
  
  async function sendTelegramMessage(text) {
    const token = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID
  
    if (!token || !chatId) {
      console.error('notify-user-event: missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID')
      return
    }
  
    const url = `https://api.telegram.org/bot${token}/sendMessage`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    })
  
    if (!response.ok) {
      const errText = await response.text()
      console.error('notify-user-event: Telegram send failed', response.status, errText)
    }
  }
  
  // Telegram Markdown mode treats _ * ` [ as special characters —
  // escape them so emails/names with these don't break message formatting.
  function escapeMarkdown(str) {
    return String(str).replace(/([_*`[\]])/g, '\\$1')
  }