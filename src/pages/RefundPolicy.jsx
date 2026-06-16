import React from 'react'
import { Link } from 'react-router-dom'

export default function RefundPolicy() {
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
          <h1 style={styles.title}>Refund Policy</h1>
          <p style={styles.meta}>Last updated: June 16, 2026 &nbsp;·&nbsp; Robel Gidey, doing business as PropJournal</p>

          <div style={styles.intro}>
            This Refund Policy applies to all purchases made through PropJournal, available at
            thepropjournal.com, operated by Robel Gidey doing business as PropJournal.
          </div>

          <Section num="1" title="General Policy">
            <p>
              All PropJournal subscription fees are generally non-refundable. Because PropJournal is
              a digital service with immediate access upon purchase, we do not offer automatic refunds
              once a billing period has begun.
            </p>
            <p>
              However, we understand that exceptional circumstances arise. We review all refund
              requests individually, at our sole discretion, and may grant refunds where we consider
              it fair and reasonable to do so.
            </p>
          </Section>

          <Section num="2" title="How to Request a Refund">
            <p>
              To request a refund, please contact us within 14 days of your charge at{' '}
              <a href="mailto:robel4cs@gmail.com" style={styles.link}>robel4cs@gmail.com</a>.
            </p>
            <p>Your request should include:</p>
            <ul style={styles.list}>
              <li>Your account email address.</li>
              <li>The date of the charge.</li>
              <li>A brief explanation of your reason for requesting a refund.</li>
            </ul>
            <p>
              We aim to respond to all refund requests within 5 business days. If approved, refunds
              are typically processed within 5–10 business days, depending on your payment method
              and provider.
            </p>
          </Section>

          <Section num="3" title="Card Payments (Paddle)">
            <p>
              Card payments are processed by Paddle.com, who act as the merchant of record for these
              transactions. In addition to this policy, Paddle's own buyer protections may apply to
              your purchase.
            </p>
            <p>
              If a refund is approved, it will be issued to the original payment method via Paddle.
              PropJournal will not issue refunds via any other channel for card payments.
            </p>
            <p>
              If you have a billing dispute that you cannot resolve with us directly, you may contact
              Paddle at paddle.com or initiate a chargeback with your card issuer. However, we
              encourage you to contact us first, as chargebacks may result in suspension of your
              account.
            </p>
          </Section>

          <Section num="4" title="Cryptocurrency Payments (NOWPayments)">
            <p>
              Cryptocurrency payments processed by NOWPayments are settled directly on the blockchain
              and are generally non-refundable once confirmed, due to the irreversible nature of
              blockchain transactions.
            </p>
            <p style={styles.highlight}>
              In exceptional circumstances, we may issue a refund equivalent to the USD subscription
              value at the time of payment, via an alternative method (e.g., credit toward a future
              subscription period), at our discretion.
            </p>
          </Section>

          <Section num="5" title="Free Trial">
            <p>
              PropJournal offers a 7-day free trial. You will not be charged during the trial period.
              If you do not wish to be charged, you must cancel before the trial ends. We do not issue
              refunds for charges that occur because a trial was not cancelled in time, except at our
              discretion.
            </p>
          </Section>

          <Section num="6" title="Account Termination">
            <p>
              If we suspend or terminate your account due to a violation of our Terms &amp; Conditions,
              you will not be entitled to a refund of any fees paid.
            </p>
          </Section>

          <Section num="7" title="Changes to This Policy">
            <p>
              We may update this Refund Policy from time to time. Changes will be posted on our
              website with an updated date. Continued use of the Service constitutes acceptance of
              the updated policy.
            </p>
          </Section>

          <Section num="8" title="Contact Us">
            <p>
              Questions about this Refund Policy can be sent to:{' '}
              <a href="mailto:robel4cs@gmail.com" style={styles.link}>robel4cs@gmail.com</a>
            </p>
          </Section>

          <div style={styles.footer}>
            <Link to="/terms" style={styles.link}>Terms &amp; Conditions</Link>
            <span style={styles.dot}>·</span>
            <Link to="/privacy" style={styles.link}>Privacy Policy</Link>
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
  highlight: {
    backgroundColor: 'oklch(0.72 0.17 152 / 0.08)',
    border: '1px solid oklch(0.72 0.17 152 / 0.2)',
    borderRadius: '6px',
    padding: '0.875rem 1rem',
    color: 'oklch(0.88 0 0)',
  },
  list: {
    paddingLeft: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    margin: '0.5rem 0',
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