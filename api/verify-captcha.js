// Verifies a Cloudflare Turnstile token server-side before the client is
// allowed to call supabase.auth.signUp() for email/password signup.
//
// This is intentionally separate from Supabase's built-in CAPTCHA setting,
// which applies to the whole Auth API (signup, login, password reset).
// We only want bot protection on the email signup form — not on login,
// not on Google OAuth — so we verify the token ourselves and only proceed
// to call Supabase if it passes.

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }
  
    const { token } = req.body || {}
    if (!token) {
      return res.status(400).json({ success: false, error: 'Missing captcha token' })
    }
  
    const secret = process.env.TURNSTILE_SECRET_KEY
    if (!secret) {
      console.error('verify-captcha: missing TURNSTILE_SECRET_KEY')
      // Fail closed — if misconfigured, don't silently let signups through unverified
      return res.status(500).json({ success: false, error: 'Captcha not configured' })
    }
  
    try {
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret,
          response: token,
          remoteip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '',
        }),
      })
  
      const data = await verifyRes.json()
  
      if (!data.success) {
        console.error('verify-captcha: Turnstile rejected token', data['error-codes'])
        return res.status(200).json({ success: false })
      }
  
      return res.status(200).json({ success: true })
    } catch (err) {
      console.error('verify-captcha error:', err)
      return res.status(500).json({ success: false, error: 'Verification failed' })
    }
  }