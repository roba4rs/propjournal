import React from 'react'
import { Link } from 'react-router-dom'

export default function PrivacyPolicy() {
  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <div style={styles.navInner}>
          <Link to="/" style={styles.logo}>
            <span style={styles.logoAccent}>Prop</span>Journal
          </Link>
        </div>
      </nav>

      <main style={styles.main}>
        <div style={styles.container}>
          <p style={styles.eyebrow}>Legal</p>
          <h1 style={styles.title}>Privacy Policy</h1>
          <p style={styles.meta}>Last updated: June 16, 2026 &nbsp;·&nbsp; Robel Gidey, doing business as PropJournal</p>

          <div style={styles.intro}>
            PropJournal ("we," "us," or "our") is a trading journal application for prop firm traders,
            operated by Robel Gidey ("the Operator"). This Privacy Policy explains how we collect,
            use, store, and protect your information when you use PropJournal at thepropjournal.com
            (the "Service"). By creating an account or using the Service, you agree to the practices
            described in this policy.
          </div>

          <Section num="1" title="Information We Collect">
            <SubSection title="1.1 Account Information">
              When you sign up via Google Sign-In, we receive your name, email address, and profile
              picture from Google. We do not receive or store your Google password.
            </SubSection>
            <SubSection title="1.2 Trading Data">
              We store the trading data you enter or import into PropJournal, including trade entries,
              account balances, challenge progress, profit/loss figures, and any notes or journal
              entries you add.
            </SubSection>
            <SubSection title="1.3 Payment Information">
              <p>
                We do not directly collect or store your payment card details. Card payments are
                processed by Paddle.com under their own privacy policy (available at
                paddle.com/legal/privacy). Crypto payments are processed by NOWPayments under their
                own privacy policy.
              </p>
              <p>
                We receive only confirmation of payment status, subscription tier, and transaction
                history from these providers — not your full card or wallet details.
              </p>
            </SubSection>
            <SubSection title="1.4 Usage Data">
              We may automatically collect technical information such as your IP address, browser type,
              device type, and how you interact with the Service, for the purpose of improving
              performance and security.
            </SubSection>
          </Section>

          <Section num="2" title="How We Use Your Information">
            <p>We use the information we collect to:</p>
            <ul style={styles.list}>
              <li>Provide, maintain, and improve the Service.</li>
              <li>Process subscription payments and manage your account.</li>
              <li>Communicate with you about your account, billing, or updates to the Service.</li>
              <li>Monitor for fraud, abuse, or security issues.</li>
              <li>Comply with legal obligations.</li>
            </ul>
            <p style={styles.highlight}>We do not sell your personal information to third parties.</p>
          </Section>

          <Section num="3" title="Third-Party Service Providers">
            <p>PropJournal relies on the following third parties to operate:</p>
            <ul style={styles.list}>
              <li><strong style={styles.strong}>Supabase</strong> — database hosting, authentication, and file storage.</li>
              <li><strong style={styles.strong}>Google</strong> — sign-in authentication (OAuth).</li>
              <li><strong style={styles.strong}>Paddle</strong> — card payment processing and billing (acts as merchant of record for card transactions).</li>
              <li><strong style={styles.strong}>NOWPayments</strong> — cryptocurrency payment processing.</li>
              <li><strong style={styles.strong}>Vercel</strong> — application hosting.</li>
            </ul>
            <p>
              Each provider processes data under their own privacy policies. By using the Service you
              agree to their applicable terms where relevant to the feature you are using.
            </p>
          </Section>

          <Section num="4" title="Cookies">
            <p>
              We use cookies and similar technologies that are necessary to keep you signed in and to
              remember basic preferences (such as dashboard settings). We do not use cookies for
              third-party advertising.
            </p>
          </Section>

          <Section num="5" title="Data Retention">
            <p>
              We retain your account and trading data for as long as your account remains active. If
              you delete your account, we will delete your personal data within 30 days, except where
              we are required to retain certain records (such as payment records) for legal, tax, or
              accounting purposes.
            </p>
          </Section>

          <Section num="6" title="Your Rights">
            <p>
              Depending on your location, you may have rights to access, correct, export, or delete
              your personal data. To exercise these rights, contact us at{' '}
              <a href="mailto:robel4cs@gmail.com" style={styles.link}>robel4cs@gmail.com</a>.
            </p>
            <p>
              If you are located in the European Economic Area or UK, you also have the right to
              lodge a complaint with your local data protection authority.
            </p>
          </Section>

          <Section num="7" title="Data Security">
            <p>
              We use industry-standard measures, including encryption in transit and access controls
              provided by Supabase, to protect your information. No system is completely secure, and
              we cannot guarantee absolute security.
            </p>
          </Section>

          <Section num="8" title="Children's Privacy">
            <p>
              PropJournal is not directed at individuals under 18. We do not knowingly collect data
              from minors. If you believe a minor has provided us with personal information, contact
              us at <a href="mailto:robel4cs@gmail.com" style={styles.link}>robel4cs@gmail.com</a> so
              we can remove it.
            </p>
          </Section>

          <Section num="9" title="International Data Transfers">
            <p>
              PropJournal is operated from Ethiopia. Your information may be processed and stored on
              servers located in other countries through our service providers (Supabase, Paddle,
              NOWPayments). By using the Service, you consent to this transfer.
            </p>
          </Section>

          <Section num="10" title="Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. We will update the "Last updated"
              date above when changes are made. For material changes, we may notify you by email.
            </p>
          </Section>

          <Section num="11" title="Contact Us">
            <p>
              If you have questions about this Privacy Policy, contact us at:{' '}
              <a href="mailto:robel4cs@gmail.com" style={styles.link}>robel4cs@gmail.com</a>
            </p>
          </Section>

          <div style={styles.footer}>
            <Link to="/terms" style={styles.link}>Terms &amp; Conditions</Link>
            <span style={styles.dot}>·</span>
            <Link to="/refund" style={styles.link}>Refund Policy</Link>
            <span style={styles.dot}>·</span>
            <Link to="/" style={styles.link}>Back to PropJournal</Link>
          </div>
        </div>
      </main>
    </div>
  )
}

function Section({ num, title, children }) {
  return (
    <section style={styles.section}>
      <h2 style={styles.sectionTitle}>
        <span style={styles.sectionNum}>{num}.</span> {title}
      </h2>
      <div style={styles.sectionBody}>{children}</div>
    </section>
  )
}

function SubSection({ title, children }) {
  return (
    <div style={styles.subSection}>
      <h3 style={styles.subTitle}>{title}</h3>
      <div>{children}</div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: 'oklch(0.16 0 0)',
    color: 'oklch(0.96 0 0)',
    fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
    WebkitFontSmoothing: 'antialiased',
    lineHeight: '1.6',
  },
  nav: {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    borderBottom: '1px solid oklch(0.28 0 0)',
    backgroundColor: 'oklch(0.16 0 0 / 0.85)',
    backdropFilter: 'blur(12px)',
  },
  navInner: {
    maxWidth: '860px',
    margin: '0 auto',
    padding: '0 1.5rem',
    height: '56px',
    display: 'flex',
    alignItems: 'center',
  },
  logo: {
    fontSize: '15px',
    fontWeight: 600,
    letterSpacing: '-0.02em',
    textDecoration: 'none',
    color: 'oklch(0.96 0 0)',
  },
  logoAccent: {
    color: 'oklch(0.72 0.17 152)',
  },
  main: {
    padding: '4rem 1.5rem 6rem',
  },
  container: {
    maxWidth: '720px',
    margin: '0 auto',
  },
  eyebrow: {
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: 'oklch(0.72 0.17 152)',
    marginBottom: '0.75rem',
  },
  title: {
    fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
    fontWeight: 600,
    letterSpacing: '-0.03em',
    lineHeight: 1.1,
    marginBottom: '0.75rem',
  },
  meta: {
    fontSize: '13px',
    color: 'oklch(0.68 0 0)',
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    marginBottom: '2.5rem',
  },
  intro: {
    fontSize: '14px',
    lineHeight: 1.75,
    color: 'oklch(0.78 0 0)',
    borderLeft: '2px solid oklch(0.28 0 0)',
    paddingLeft: '1.25rem',
    marginBottom: '2.5rem',
  },
  section: {
    borderTop: '1px solid oklch(0.22 0 0)',
    paddingTop: '2rem',
    marginBottom: '2rem',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '1rem',
    display: 'flex',
    gap: '0.4rem',
    alignItems: 'baseline',
  },
  sectionNum: {
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: '12px',
    color: 'oklch(0.72 0.17 152)',
  },
  sectionBody: {
    fontSize: '14px',
    lineHeight: 1.75,
    color: 'oklch(0.78 0 0)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  subSection: {
    marginBottom: '1.25rem',
  },
  subTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'oklch(0.88 0 0)',
    marginBottom: '0.5rem',
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    letterSpacing: '0.02em',
  },
  highlight: {
    backgroundColor: 'oklch(0.72 0.17 152 / 0.08)',
    border: '1px solid oklch(0.72 0.17 152 / 0.2)',
    borderRadius: '6px',
    padding: '0.875rem 1rem',
    color: 'oklch(0.88 0 0)',
    fontWeight: 500,
  },
  list: {
    paddingLeft: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    margin: '0.5rem 0',
  },
  strong: {
    color: 'oklch(0.92 0 0)',
    fontWeight: 600,
  },
  link: {
    color: 'oklch(0.72 0.17 152)',
    textDecoration: 'none',
  },
  footer: {
    marginTop: '4rem',
    paddingTop: '2rem',
    borderTop: '1px solid oklch(0.22 0 0)',
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
    fontSize: '13px',
    flexWrap: 'wrap',
  },
  dot: {
    color: 'oklch(0.4 0 0)',
  },
}