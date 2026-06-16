import React from 'react'
import { Link } from 'react-router-dom'

export default function Terms() {
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
          <h1 style={styles.title}>Terms &amp; Conditions</h1>
          <p style={styles.meta}>Last updated: June 16, 2026 &nbsp;·&nbsp; Robel Gidey, doing business as PropJournal</p>

          <div style={styles.intro}>
            These Terms &amp; Conditions ("Terms") govern your use of PropJournal, a trading journal
            application for prop firm traders, operated by Robel Gidey, doing business as "PropJournal"
            ("we," "us," or "our"), available at thepropjournal.com (the "Service"). By creating an
            account or using the Service, you agree to these Terms. If you do not agree, do not use
            the Service.
          </div>

          <Section num="1" title="Description of Service">
            <p>
              PropJournal is a software tool that allows users to log trades, track performance metrics,
              and monitor progress against prop trading firm challenge rules. PropJournal is a
              record-keeping and analytics tool only.
            </p>
            <p style={styles.highlight}>
              PropJournal does not provide financial, investment, or trading advice. Nothing in the
              Service should be construed as a recommendation to buy, sell, or hold any financial
              instrument, or to participate in any prop trading challenge. You are solely responsible
              for your own trading decisions and outcomes.
            </p>
          </Section>

          <Section num="2" title="Eligibility">
            <p>
              You must be at least 18 years old to use the Service. By using PropJournal, you confirm
              that you meet this requirement.
            </p>
          </Section>

          <Section num="3" title="Account Registration">
            <p>
              You may sign up using Google Sign-In. You are responsible for maintaining the security
              of your account and for all activity that occurs under it. Notify us immediately at{' '}
              <a href="mailto:robel4cs@gmail.com" style={styles.link}>robel4cs@gmail.com</a> if you
              suspect unauthorized access to your account.
            </p>
          </Section>

          <Section num="4" title="Subscription Plans &amp; Billing">
            <SubSection title="4.1 Plans">
              PropJournal offers a free 7-day trial, after which access requires a paid subscription,
              billed monthly ($12/month), every 6 months ($60 every 6 months, equivalent to $10/month),
              or annually ($96/year, equivalent to $8/month).
            </SubSection>
            <SubSection title="4.2 Payment Processors">
              <p>We accept payment through two channels:</p>
              <ul style={styles.list}>
                <li><strong style={styles.strong}>Card payments:</strong> processed by Paddle.com, who act as the merchant of record for these transactions. Your purchase is also subject to Paddle's Buyer Terms &amp; Conditions.</li>
                <li><strong style={styles.strong}>Cryptocurrency payments:</strong> processed by NOWPayments, settled directly to us. NOWPayments' terms apply to the processing of crypto transactions.</li>
              </ul>
            </SubSection>
            <SubSection title="4.3 Auto-Renewal">
              Subscriptions renew automatically at the end of each billing cycle unless cancelled before
              the renewal date. You may cancel at any time from your account settings; cancellation
              takes effect at the end of the current billing period.
            </SubSection>
            <SubSection title="4.4 Price Changes">
              We may change subscription pricing with reasonable advance notice. Changes will not apply
              retroactively to a billing period you have already paid for.
            </SubSection>
          </Section>

          <Section num="5" title="Refunds">
            <p>
              All subscription fees are generally non-refundable. However, we review refund requests
              on a case-by-case basis at our sole discretion. To request a refund, contact us at{' '}
              <a href="mailto:robel4cs@gmail.com" style={styles.link}>robel4cs@gmail.com</a> within
              14 days of your charge, explaining your situation. We reserve the right to grant or deny
              any refund request.
            </p>
            <p>
              For card payments processed by Paddle, Paddle's standard buyer protections also apply.
              Crypto payments processed by NOWPayments are non-refundable once confirmed on the
              blockchain.
            </p>
          </Section>

          <Section num="6" title="Acceptable Use">
            <p>You agree not to:</p>
            <ul style={styles.list}>
              <li>Use the Service for any unlawful purpose.</li>
              <li>Attempt to gain unauthorized access to other users' accounts or data.</li>
              <li>Reverse-engineer, scrape, or resell access to the Service without our written permission.</li>
              <li>Upload data that infringes the rights of others or violates applicable law.</li>
            </ul>
            <p>We reserve the right to suspend or terminate accounts that violate these Terms.</p>
          </Section>

          <Section num="7" title="Intellectual Property">
            <p>
              The Service, including its design, code, and branding, is owned by Robel Gidey /
              PropJournal. Your trading data and journal entries remain your property; you grant us a
              limited license to store and process that data solely to provide the Service to you.
            </p>
          </Section>

          <Section num="8" title="Disclaimers">
            <p>
              The Service is provided "as is" without warranties of any kind, express or implied. We
              do not guarantee that the Service will be uninterrupted or error-free, or that any
              calculations, analytics, or challenge-tracking features will be free from inaccuracies.
              You are responsible for independently verifying your trading data and challenge progress
              with your prop firm.
            </p>
          </Section>

          <Section num="9" title="Limitation of Liability">
            <p>
              To the maximum extent permitted by law, Robel Gidey / PropJournal shall not be liable
              for any indirect, incidental, special, or consequential damages, including loss of
              trading profits or prop firm challenge failures, arising from your use of the Service.
            </p>
            <p>
              Our total liability for any claim relating to the Service is limited to the amount you
              paid us in the 12 months preceding the claim.
            </p>
          </Section>

          <Section num="10" title="Termination">
            <p>
              You may stop using the Service and cancel your subscription at any time. We may suspend
              or terminate your account if you violate these Terms, with notice where reasonably
              possible.
            </p>
          </Section>

          <Section num="11" title="Governing Law">
            <p>
              These Terms are governed by the laws of Ethiopia, without regard to conflict-of-law
              principles. This does not affect any statutory consumer rights you may have in your own
              country of residence.
            </p>
          </Section>

          <Section num="12" title="Changes to These Terms">
            <p>
              We may update these Terms from time to time. Continued use of the Service after changes
              take effect constitutes acceptance of the updated Terms. For material changes, we will
              make reasonable efforts to notify you in advance.
            </p>
          </Section>

          <Section num="13" title="Contact Us">
            <p>
              Questions about these Terms can be sent to:{' '}
              <a href="mailto:robel4cs@gmail.com" style={styles.link}>robel4cs@gmail.com</a>
            </p>
          </Section>

          <div style={styles.footer}>
            <Link to="/privacy" style={styles.link}>Privacy Policy</Link>
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
        <span style={styles.sectionNum}>{num}.</span> <span dangerouslySetInnerHTML={{ __html: title }} />
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