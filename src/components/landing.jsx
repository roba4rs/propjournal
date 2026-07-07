import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const FIRMS = [
  { name: 'FTMO', style: { fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase' } },
  { name: 'FundedNext', style: { fontWeight: 600 } },
  { name: 'Funding Pips', style: { fontWeight: 700 } },
  { name: 'Goat Funded Trader', style: { fontWeight: 600, fontStyle: 'italic' } },
  { name: 'Alpha Capital Group', style: { fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' } },
  { name: 'The5ers', style: { fontWeight: 700 } },
  { name: 'Maven Trading', style: { fontWeight: 600 } },
  { name: 'Hola Prime', style: { fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em' } },
  { name: 'E8 Funding', style: { fontWeight: 300, letterSpacing: '0.3em', textTransform: 'uppercase' } },
  { name: 'Equity Edge', style: { fontWeight: 600, fontStyle: 'italic' } },
  { name: 'Blue Guardian', style: { fontWeight: 500, letterSpacing: '0.06em' } },
  { name: 'Blueberry Funded', style: { fontWeight: 700 } },
  { name: 'Funded Trading Plus', style: { fontWeight: 600 } },
  { name: 'The Trading Pit', style: { fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em' } },
  { name: 'Audacity Capital', style: { fontWeight: 300, fontStyle: 'italic', letterSpacing: '0.06em' } },
  { name: 'Lark Funding', style: { fontWeight: 600 } },
  { name: 'Lux Trading Firm', style: { fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' } },
]

const AVATAR_PALETTES = [
  { bg: 'rgba(29,185,123,0.15)', fg: '#1db97b' },
  { bg: 'rgba(96,165,250,0.15)', fg: '#60a5fa' },
  { bg: 'rgba(251,191,36,0.15)', fg: '#f59e0b' },
  { bg: 'rgba(239,68,68,0.15)', fg: '#ef4444' },
]

function avatarPalette(seed) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_PALETTES[hash % AVATAR_PALETTES.length]
}

function getInitials(fullName, email) {
  if (fullName?.trim()) {
    const parts = fullName.trim().split(/\s+/)
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase()
  }
  return (email || '').split('@')[0].slice(0, 2).toUpperCase()
}

export default function Landing() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Auth check
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setAuthLoading(false)
    })
  }, [])

  // Theme sync
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  // Footer year
  const year = new Date().getFullYear()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setDropdownOpen(false)
  }

  const isLight = theme === 'light'

  // Avatar info
  const email = user?.email || ''
  const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || ''
  const initials = getInitials(fullName, email)
  const palette = avatarPalette(email)

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --background: oklch(0.16 0 0);
          --foreground: oklch(0.96 0 0);
          --surface: oklch(0.19 0 0);
          --surface-2: oklch(0.22 0 0);
          --border: oklch(0.28 0 0);
          --border-strong: oklch(0.36 0 0);
          --muted: oklch(0.24 0 0);
          --muted-fg: oklch(0.68 0 0);
          --nav-fg: oklch(0.85 0 0);
          --brand: oklch(0.72 0.17 152);
          --brand-hover: oklch(0.78 0.17 152);
          --brand-fg: oklch(0.16 0 0);
          --brand-soft: oklch(0.72 0.17 152 / 0.12);
          --red: oklch(0.6 0.2 25);
          --red-soft: oklch(0.55 0.18 25 / 0.15);
          --red-fg: oklch(0.72 0.18 25);
          --yellow: oklch(0.75 0.15 70);
          --blue: oklch(0.65 0.15 240);
          --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
          --font-mono: 'JetBrains Mono', ui-monospace, monospace;
          --radius-sm: 4px;
          --radius-md: 6px;
          --radius-lg: 8px;
          --radius-xl: 12px;
        }

        [data-theme='light'] {
          --background: oklch(0.97 0 0);
          --foreground: oklch(0.15 0 0);
          --surface: oklch(1 0 0);
          --surface-2: oklch(0.96 0 0);
          --border: oklch(0.89 0 0);
          --border-strong: oklch(0.8 0 0);
          --muted: oklch(0.94 0 0);
          --muted-fg: oklch(0.45 0 0);
          --nav-fg: oklch(0.22 0 0);
          --brand: oklch(0.6 0.18 152);
          --brand-hover: oklch(0.66 0.18 152);
          --brand-fg: oklch(0.99 0 0);
          --brand-soft: oklch(0.6 0.18 152 / 0.14);
          --red: oklch(0.55 0.2 25);
          --red-soft: oklch(0.55 0.18 25 / 0.12);
          --red-fg: oklch(0.5 0.2 25);
          --yellow: oklch(0.55 0.15 70);
          --blue: oklch(0.5 0.16 240);
        }

        html { scroll-behavior: smooth; }

        body {
          background-color: var(--background);
          color: var(--foreground);
          font-family: var(--font-sans);
          -webkit-font-smoothing: antialiased;
          min-height: 100vh;
          line-height: 1.5;
        }

        a { color: inherit; text-decoration: none; }
        ul { list-style: none; }

        .nav {
          position: sticky; top: 0; z-index: 50;
          border-bottom: 1px solid color-mix(in oklch, var(--border) 80%, transparent);
          background: color-mix(in oklch, var(--background) 80%, transparent);
          backdrop-filter: blur(12px);
        }
        .nav-inner {
          max-width: 1280px; margin: 0 auto; padding: 0 1.5rem;
          height: 56px; display: flex; align-items: center; justify-content: space-between;
        }
        .nav-logo { font-size: 15px; font-weight: 600; letter-spacing: -0.02em; cursor: pointer; }
        .nav-logo span { color: var(--brand); }
        .theme-toggle {
          display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border-radius: var(--radius-md);
          border: none; background: transparent; color: var(--foreground);
          cursor: pointer; transition: background 0.15s;
        }
        .theme-toggle:hover { background: var(--surface-2); }
        .nav-links { display: flex; align-items: center; gap: 1.5rem; }
        .nav-links a { font-size: 13px; color: var(--nav-fg); transition: color 0.15s; }
        .nav-links a:hover { color: var(--foreground); }
        .nav-actions { display: flex; align-items: center; gap: 0.375rem; }
        .nav-login { font-size: 13px; color: var(--nav-fg); transition: color 0.15s; cursor: pointer; }
        .nav-login:hover { color: var(--foreground); }
        .btn-brand {
          display: inline-flex; align-items: center; gap: 6px;
          background: var(--brand); color: var(--brand-fg);
          border-radius: var(--radius-md);
          padding: 5px 12px; font-size: 12px; font-weight: 600;
          transition: background 0.15s; cursor: pointer; border: none;
        }
        .btn-brand:hover { background: var(--brand-hover); }

        @media (max-width: 768px) {
          .nav-links, .nav-login { display: none; }
          .nav-dashboard-btn { display: none !important; }
        }

        .avatar-wrap { position: relative; display: inline-flex; }
        .avatar-dropdown {
          position: absolute; top: calc(100% + 8px); right: 0;
          min-width: 160px; background: var(--surface);
          border: 1px solid var(--border); border-radius: var(--radius-lg);
          overflow: hidden; z-index: 200;
        }
        .avatar-dropdown a,
        .avatar-dropdown button {
          display: flex; align-items: center; gap: 10px;
          width: 100%; padding: 11px 14px;
          font-size: 13px; font-family: var(--font-sans);
          color: var(--foreground); background: transparent;
          border: none; cursor: pointer; text-align: left;
          text-decoration: none; transition: background 0.12s;
        }
        .avatar-dropdown a:hover,
        .avatar-dropdown button:hover { background: var(--surface-2); }
        .avatar-dropdown .signout { color: var(--red-fg); }
        .avatar-dropdown .divider { height: 1px; background: var(--border); margin: 0; }

        .nav-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          font-size: 12px; font-weight: 700;
          display: inline-flex; align-items: center; justify-content: center;
          letter-spacing: 0.02em; cursor: pointer;
          flex-shrink: 0; border: none; font-family: var(--font-sans);
        }

        .hero { position: relative; overflow: hidden; border-bottom: 1px solid var(--border); }
        .grid-bg {
          position: absolute; inset: 0; opacity: 0.6; pointer-events: none;
          background-image:
            linear-gradient(to right, color-mix(in oklch, var(--foreground) 4%, transparent) 1px, transparent 1px),
            linear-gradient(to bottom, color-mix(in oklch, var(--foreground) 4%, transparent) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse at center, black 40%, transparent 75%);
        }
        .hero-inner {
          position: relative; max-width: 1280px; margin: 0 auto;
          padding: 3rem 1.5rem 3.5rem;
        }
        @media (min-width: 640px) { .hero-inner { padding: 5rem 1.5rem; } }
        @media (min-width: 768px) { .hero-inner { padding-top: 7rem; } }
        .hero-text { max-width: 48rem; margin: 0 auto; text-align: center; }
        .hero-text h1 {
          font-size: clamp(2rem, 6vw, 4rem); font-weight: 600;
          line-height: 1.05; letter-spacing: -0.03em;
        }
        .hero-text p {
          margin-top: 1.5rem; max-width: 36rem;
          margin-left: auto; margin-right: auto;
          font-size: 15px; line-height: 1.7; color: var(--muted-fg);
        }
        .hero-ctas {
          margin-top: 2rem; display: flex; flex-wrap: wrap;
          gap: 0.75rem; justify-content: center;
        }
        .btn-secondary {
          display: inline-flex; align-items: center; gap: 6px;
          border: 1px solid var(--border);
          background: color-mix(in oklch, var(--surface) 40%, transparent);
          color: var(--foreground); border-radius: var(--radius-md);
          padding: 10px 16px; font-size: 14px; font-weight: 500;
          transition: background 0.15s; cursor: pointer;
        }
        .btn-secondary:hover { background: var(--surface); }
        .btn-primary-lg {
          display: inline-flex; align-items: center; gap: 6px;
          background: var(--brand); color: var(--brand-fg);
          border-radius: var(--radius-md);
          padding: 10px 16px; font-size: 14px; font-weight: 500;
          transition: background 0.15s; cursor: pointer;
        }
        .btn-primary-lg:hover { background: var(--brand-hover); }
        .btn-primary-lg svg, .btn-secondary svg { width: 14px; height: 14px; }

        .hero-mockup { position: relative; max-width: 1152px; margin: 4rem auto 0; }
        .hero-glow {
          position: absolute; inset: -2rem -3rem;
          background: radial-gradient(ellipse at center, color-mix(in oklch, var(--brand) 18%, transparent), transparent 60%);
          filter: blur(40px); pointer-events: none;
        }

        .bento { display: grid; gap: 1rem; grid-template-columns: 1fr; position: relative; }
        @media (min-width: 768px) {
          .bento { grid-template-columns: repeat(8, 1fr); }
          .bento-1 { grid-column: span 4; }
          .bento-2 { grid-column: span 4; }
          .bento-3 { grid-column: span 2; }
          .bento-4 { grid-column: span 2; }
          .bento-5 { grid-column: span 2; }
          .bento-6 { grid-column: span 2; }
        }
        .bento-card {
          position: relative; border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          background: radial-gradient(ellipse at top right, color-mix(in oklch, var(--brand) 8%, transparent), transparent 60%), var(--surface);
          overflow: hidden; display: flex; flex-direction: column;
          min-height: 420px; transition: border-color 0.2s;
        }
        .bento-card:hover { border-color: var(--border-strong); }
        .bento-head { padding: 24px 24px 0; display: flex; flex-direction: column; gap: 8px; }
        .bento-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--foreground); }
        .bento-eyebrow svg { width: 16px; height: 16px; color: var(--brand); }
        .bento-title { font-size: 17px; font-weight: 600; line-height: 1.35; letter-spacing: -0.01em; color: var(--foreground); max-width: 30ch; }
        .bento-title .accent { color: var(--brand); }
        .bento-desc { font-size: 13px; line-height: 1.55; color: var(--muted-fg); max-width: 38ch; }
        .bento-visual {
          position: relative; flex: 1; margin-top: 16px; overflow: hidden;
          display: flex; align-items: flex-end; justify-content: center; padding: 0 24px 20px;
        }
        .bento-visual.mobile-shot img {
          width: 78%; max-width: 240px; border-radius: 14px;
          border: 1px solid var(--border); box-shadow: 0 -10px 40px -10px oklch(0 0 0 / 0.6); display: block;
        }
        .shot-light { display: none !important; }
        [data-theme='light'] .shot-dark { display: none !important; }
        [data-theme='light'] .shot-light { display: block !important; }
        .bento-visual.desktop-shot img {
          width: 100%; height: 100%; border-radius: 10px 10px 0 0;
          border: 1px solid var(--border); border-bottom: none;
          box-shadow: 0 -10px 40px -10px oklch(0 0 0 / 0.6);
          display: block; object-fit: contain;
        }
        .bento-2 .bento-visual.desktop-shot { align-items: flex-end; padding: 0; }
        .bento-2 .bento-visual.desktop-shot img {
          width: 100%; height: auto; max-height: 100%;
          border-radius: 10px 10px 0 0; border: 1px solid var(--border); border-bottom: none;
          object-fit: cover; object-position: top center;
        }

        .card { border: 1px solid var(--border); border-radius: var(--radius-xl); background: var(--surface); overflow: hidden; }
        .card-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border); padding: 12px 20px; }
        .card-title { font-size: 13px; font-weight: 600; }

        .trust-bar { display: flex; flex-direction: column; align-items: center; gap: 1.25rem; }
        .trust-label { font-size: 12px; color: var(--muted-fg); letter-spacing: 0.04em; text-align: center; }
        .trust-marquee-wrapper { position: relative; width: 100%; overflow: hidden; }
        .trust-fade-l {
          position: absolute; inset-y: 0; left: 0; width: 8rem; z-index: 10;
          background: linear-gradient(to right, var(--background), transparent); pointer-events: none;
        }
        .trust-fade-r {
          position: absolute; inset-y: 0; right: 0; width: 8rem; z-index: 10;
          background: linear-gradient(to left, var(--background), transparent); pointer-events: none;
        }
        .trust-track {
          display: flex; align-items: center; gap: 4rem; width: max-content;
          padding: 0.5rem 2rem; animation: marquee 90s linear infinite;
        }
        .trust-track:hover { animation-play-state: paused; }
        .firm-name { white-space: nowrap; font-size: 14px; color: var(--muted-fg); transition: color 0.15s; }
        .firm-name:hover { color: var(--foreground); }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .section { border-bottom: 1px solid var(--border); padding: 4rem 0; }
        @media (min-width: 640px) { .section { padding: 6rem 0; } }
        .section-inner { max-width: 1280px; margin: 0 auto; padding: 0 1.5rem; }

        .eyebrow { font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--brand); }
        .section-h2 { margin-top: 0.75rem; font-size: clamp(1.75rem, 4vw, 2.75rem); font-weight: 600; letter-spacing: -0.03em; line-height: 1.1; }
        .section-h2 .dim { color: var(--muted-fg); }
        .section-sub { margin-top: 1rem; color: var(--muted-fg); max-width: 42rem; }

        .steps-grid {
          margin-top: 3.5rem; display: grid; gap: 1px;
          border: 1px solid var(--border); border-radius: var(--radius-xl);
          background: var(--border); overflow: hidden;
        }
        @media (min-width: 768px) { .steps-grid { grid-template-columns: repeat(3, 1fr); } }
        .step { display: flex; flex-direction: column; gap: 0.75rem; background: var(--background); padding: 1.25rem 1.75rem; }
        .step-num { font-family: var(--font-mono); font-size: 11px; color: var(--brand); }
        .step h3 { font-size: 17px; font-weight: 600; letter-spacing: -0.02em; }
        .step p { font-size: 14px; line-height: 1.65; color: var(--muted-fg); }
        .step-tag {
          margin-top: auto; display: inline-block; width: fit-content;
          border: 1px solid var(--border); border-radius: 999px;
          background: var(--surface); padding: 4px 10px;
          font-family: var(--font-mono); font-size: 10px;
          text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted-fg);
        }

        .challenge-layout { display: grid; gap: 2.5rem; align-items: center; padding-bottom: 2rem; }
        @media (min-width: 1024px) { .challenge-layout { grid-template-columns: 1fr 1fr; } }
        .check-list { margin-top: 1.75rem; display: flex; flex-direction: column; gap: 0.875rem; }
        .check-item { display: flex; align-items: flex-start; gap: 0.75rem; font-size: 14px; color: var(--muted-fg); }
        .check-icon { margin-top: 2px; flex-shrink: 0; color: var(--brand); width: 16px; height: 16px; }

        .challenge-card {
          border: 1px solid var(--border-strong); border-radius: var(--radius-xl);
          background: var(--surface); padding: 1.25rem 1.5rem;
          box-shadow: 0 0 0 1px color-mix(in oklch, var(--brand) 12%, transparent), 0 8px 40px -8px color-mix(in oklch, var(--brand) 20%, transparent);
        }
        .challenge-top { display: flex; align-items: center; justify-content: space-between; }
        .challenge-firm { font-family: var(--font-mono); font-size: 12px; font-weight: 700; letter-spacing: 0.1em; }
        .badge-progress { background: var(--brand-soft); color: var(--brand); font-size: 10px; font-weight: 500; padding: 2px 8px; border-radius: 999px; }
        .challenge-meta { font-family: var(--font-mono); font-size: 11px; color: var(--muted-fg); margin-top: 4px; }
        .stats-grid {
          margin-top: 1.25rem; display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem;
          border: 1px solid var(--border); border-radius: var(--radius-lg);
          background: var(--muted); padding: 1rem;
        }
        .stat-label { font-family: var(--font-mono); font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted-fg); }
        .stat-value { margin-top: 4px; font-family: var(--font-mono); font-size: 15px; font-weight: 700; }
        .stat-value.green { color: var(--brand); }
        .rules-list { margin-top: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
        .rule-header { display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 11px; }
        .rule-name { color: var(--muted-fg); }
        .rule-track { height: 6px; border-radius: 999px; background: var(--background); margin-top: 6px; overflow: hidden; }
        .rule-fill { height: 100%; border-radius: 999px; }
        .rule-footer { margin-top: 4px; display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 10px; color: var(--muted-fg); }

        .features-grid {
          margin-top: 3.5rem; display: grid; gap: 1px;
          border: 1px solid var(--border); border-radius: var(--radius-xl);
          background: var(--border); overflow: hidden;
        }
        @media (min-width: 768px) { .features-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1024px) { .features-grid { grid-template-columns: repeat(3, 1fr); } }
        .feature { position: relative; display: flex; flex-direction: column; gap: 1rem; background: var(--background); padding: 1.25rem 1.75rem; transition: background 0.15s; }
        .feature:hover { background: var(--surface); }
        .feature-flag {
          position: absolute; top: 1.25rem; right: 1.25rem;
          background: var(--brand-soft); color: var(--brand);
          font-family: var(--font-mono); font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em;
          padding: 2px 8px; border-radius: 999px;
        }
        .feature-icon {
          width: 36px; height: 36px; display: grid; place-items: center;
          border: 1px solid var(--border); border-radius: var(--radius-md);
          background: var(--surface); color: var(--brand);
        }
        .feature-icon svg { width: 16px; height: 16px; }
        .feature h3 { font-size: 15px; font-weight: 600; }
        .feature p { font-size: 14px; line-height: 1.65; color: var(--muted-fg); }

        .pricing-intro { max-width: 36rem; margin: 0 auto; text-align: center; }
        .plans-grid { margin-top: 3.5rem; display: grid; gap: 1.5rem; }
        @media (min-width: 900px) { .plans-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1200px) { .plans-grid { grid-template-columns: repeat(4, 1fr); } }
        .plan {
          position: relative; display: flex; flex-direction: column;
          border: 1px solid var(--border); border-radius: var(--radius-xl);
          background: var(--surface); padding: 1.25rem 1.75rem;
        }
        .plan.featured {
          border-color: var(--brand);
          box-shadow: 0 0 0 1px color-mix(in oklch, var(--brand) 30%, transparent), 0 8px 40px -8px color-mix(in oklch, var(--brand) 40%, transparent);
        }
        .plan-badge {
          position: absolute; top: -12px; left: 1.75rem;
          background: var(--brand); color: var(--brand-fg);
          font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;
          padding: 4px 10px; border-radius: 999px;
        }
        .plan-name { font-size: 18px; font-weight: 600; }
        .plan-price { margin-top: 1rem; display: flex; align-items: baseline; gap: 4px; }
        .plan-dollar { font-size: 18px; color: var(--muted-fg); }
        .plan-amount { font-size: 3rem; font-weight: 600; letter-spacing: -0.04em; }
        .plan-per { font-size: 14px; color: var(--muted-fg); }
        .plan-total { margin-top: 8px; font-family: var(--font-mono); font-size: 11px; color: var(--muted-fg); }
        .plan-discount { font-family: var(--font-mono); font-size: 11px; color: var(--brand); margin-top: 4px; }
        .plan-divider { border: none; border-top: 1px solid var(--border); margin: 1.25rem 0; }
        .plan-desc { font-size: 13px; line-height: 1.65; color: var(--muted-fg); }
        .plan-cta {
          margin-top: auto; padding-top: 1.5rem;
          display: inline-flex; align-items: center; justify-content: center;
          border-radius: var(--radius-md); padding: 10px 16px;
          font-size: 14px; font-weight: 500; transition: background 0.15s; cursor: pointer;
        }
        .plan-cta.featured-cta { background: var(--brand); color: var(--brand-fg); }
        .plan-cta.featured-cta:hover { background: var(--brand-hover); }
        .plan-cta.default-cta { border: 1px solid var(--border); background: var(--background); color: var(--foreground); }
        .plan-cta.default-cta:hover { background: var(--surface-2); }
        .pricing-note { text-align: center; font-family: var(--font-mono); font-size: 11px; color: var(--muted-fg); margin-top: 2rem; }

        footer { background: var(--background); }
        .footer-inner {
          max-width: 1280px; margin: 0 auto; padding: 3rem 1.5rem;
          display: flex; flex-wrap: wrap; gap: 1.5rem;
          align-items: center; justify-content: space-between;
        }
        .footer-logo { font-size: 15px; font-weight: 600; letter-spacing: -0.02em; }
        .footer-logo span { color: var(--brand); }
        .footer-copy { font-size: 12px; color: var(--muted-fg); }
        .footer-links { display: flex; align-items: center; gap: 1.25rem; }
        .footer-links a { font-size: 13px; color: var(--muted-fg); transition: color 0.15s; }
        .footer-links a:hover { color: var(--foreground); }

        .icon { display: block; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

        .community-intro { text-align: center; max-width: 42rem; margin: 0 auto; }
        .community-intro .section-sub { margin-left: auto; margin-right: auto; }
        .community-cta {
          margin: 2rem auto 0; display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.625rem 1rem; background: var(--surface);
          border: 1px solid var(--border); border-radius: var(--radius-md);
          color: var(--foreground); font-size: 0.875rem; font-weight: 500;
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .community-cta:hover { background: var(--surface-2); border-color: var(--border-strong); }
        .community-cta svg { width: 16px; height: 16px; }

        .testimonials-wrap {
          margin-top: 3.5rem; position: relative;
          -webkit-mask-image: linear-gradient(to right, transparent, #000 8%, #000 92%, transparent);
          mask-image: linear-gradient(to right, transparent, #000 8%, #000 92%, transparent);
        }
        .testimonials-grid { column-count: 1; column-gap: 1rem; }
        @media (min-width: 640px) { .testimonials-grid { column-count: 2; } }
        @media (min-width: 960px) { .testimonials-grid { column-count: 3; } }
        @media (min-width: 1200px) { .testimonials-grid { column-count: 4; } }
        .testimonial {
          break-inside: avoid; margin: 0 0 1rem; padding: 1.25rem;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--radius-lg); transition: border-color 0.15s ease, background 0.15s ease; display: block;
        }
        .testimonial:hover { border-color: var(--border-strong); background: var(--surface-2); }
        .testimonial-head { display: flex; align-items: center; gap: 0.625rem; margin-bottom: 0.75rem; }
        .testimonial-avatar {
          width: 32px; height: 32px; border-radius: 999px; border: 1px solid var(--border);
          display: grid; place-items: center; flex-shrink: 0;
          font-size: 12px; font-weight: 700; color: #fff; letter-spacing: 0.02em;
        }
        .testimonial-handle { font-size: 0.875rem; font-weight: 600; color: var(--foreground); }
        .testimonial-body { font-size: 0.875rem; line-height: 1.55; color: var(--muted-fg); white-space: pre-line; }
        .testimonial-body strong { color: var(--foreground); font-weight: 500; }
      `}</style>

      {/* Nav */}
      <header className="nav">
        <div className="nav-inner">
          <a href="/" className="nav-logo"><span>Prop</span>Journal</a>
          <nav className="nav-links">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
          </nav>
          <div className="nav-actions">
            <button
              className="theme-toggle"
              aria-label="Toggle light/dark theme"
              onClick={() => setTheme(isLight ? 'dark' : 'light')}
            >
              {isLight ? (
                <svg className="icon" viewBox="0 0 24 24" width="16" height="16">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg className="icon" viewBox="0 0 24 24" width="16" height="16">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>

            {!authLoading && (
              <>
                {user ? (
                  <>
                    <div className="avatar-wrap" ref={dropdownRef}>
                      <button
                        className="nav-avatar"
                        style={{ background: palette.bg, color: palette.fg }}
                        title={email}
                        onClick={(e) => { e.stopPropagation(); setDropdownOpen(o => !o) }}
                      >
                        {initials}
                      </button>
                      {dropdownOpen && (
                        <div className="avatar-dropdown">
                          <a href="/dashboard">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                            Dashboard
                          </a>
                          <div className="divider" />
                          <button className="signout" onClick={handleSignOut}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                            Sign out
                          </button>
                        </div>
                      )}
                    </div>
                    <a href="/dashboard" className="btn-brand nav-dashboard-btn" style={{ padding: '5px 12px', fontSize: '12px', fontWeight: 600, borderRadius: '6px' }}>
                      Dashboard
                    </a>
                  </>
                ) : (
                  <>
                    <a href="/login" className="nav-login">Log in</a>
                    <a href="/signup" className="btn-brand">
                      Sign up
                      <svg className="icon" viewBox="0 0 24 24" width="14" height="14"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </a>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="grid-bg" aria-hidden="true" />
        <div className="hero-inner">
          <div className="hero-text">
            <h1>The journal that knows<br /><span style={{ color: 'var(--brand)' }}>your prop firm rules.</span></h1>
            <p>Select your firm and PropJournal auto-fills every challenge rule. Track drawdown, hit targets, and pass — no spreadsheets, no guessing.</p>
            <div className="hero-ctas">
              {user ? (
                <>
                  <a href="/dashboard" className="btn-primary-lg">
                    Dashboard
                    <svg className="icon" viewBox="0 0 24 24" width="14" height="14"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </a>
                  <a href="/trades?openForm=true" className="btn-secondary">Log Trade</a>
                </>
              ) : (
                <>
                  <a href="/signup" className="btn-primary-lg">
                    Sign up
                    <svg className="icon" viewBox="0 0 24 24" width="14" height="14"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </a>
                  <a href="/login" className="btn-secondary">Log in</a>
                </>
              )}
            </div>

            {/* Firms Marquee */}
            <div className="trust-bar" style={{ marginTop: '2rem' }}>
              <div className="trust-marquee-wrapper">
                <div className="trust-fade-l" aria-hidden="true" />
                <div className="trust-fade-r" aria-hidden="true" />
                <div className="trust-track">
                  {[...FIRMS, ...FIRMS].map((f, i) => (
                    <span key={i} className="firm-name" style={f.style}>{f.name}</span>
                  ))}
                </div>
              </div>
            </div>
            <p className="trust-label">Trusted by prop firm traders worldwide</p>
          </div>

          {/* Bento */}
          <div className="hero-mockup">
            <div className="hero-glow" aria-hidden="true" />
            <div className="bento">
              <article className="bento-card bento-1">
                <div className="bento-head">
                  <div className="bento-eyebrow">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                    Calendar P&L
                  </div>
                  <h3 className="bento-title">Every trading day, <span className="accent">color-coded.</span></h3>
                  <p className="bento-desc">See profit, loss and breakeven sessions at a glance — spot streaks, slumps and your best days of the week.</p>
                </div>
                <div className="bento-visual desktop-shot">
                  <img className="shot-dark" src="/images/screenshot-01.png" alt="Calendar P&L view" loading="lazy" />
                  <img className="shot-light" src="/images/screenshot-02.png" alt="Calendar P&L view (light)" loading="lazy" />
                </div>
              </article>

              <article className="bento-card bento-3">
                <div className="bento-head">
                  <div className="bento-eyebrow">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 17 9 11 13 15 21 7"/><polyline points="14 7 21 7 21 14"/></svg>
                    Account Overview
                  </div>
                  <h3 className="bento-title">Real-time P&L <span className="accent">per account.</span></h3>
                  <p className="bento-desc">Win rate, profit factor, consistency and growth — all in your pocket.</p>
                </div>
                <div className="bento-visual mobile-shot">
                  <img className="shot-dark" src="/images/screenshot-03.jpg" alt="Account overview" loading="lazy" />
                  <img className="shot-light" src="/images/screenshot-04.jpg" alt="Account overview (light)" loading="lazy" />
                </div>
              </article>

              <article className="bento-card bento-4">
                <div className="bento-head">
                  <div className="bento-eyebrow">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg>
                    Challenge Progress
                  </div>
                  <h3 className="bento-title">Track every phase, <span className="accent">live.</span></h3>
                  <p className="bento-desc">Phase 1, Phase 2, funded — see exactly where you stand on each challenge.</p>
                </div>
                <div className="bento-visual mobile-shot">
                  <img loading="lazy" className="shot-dark" src="/images/screenshot-05.jpg" alt="Maven Phase 1 challenge progress" />
                  <img loading="lazy" className="shot-light" src="/images/screenshot-06.jpg" alt="Maven Phase 1 challenge progress (light)" />
                </div>
              </article>

              <article className="bento-card bento-5">
                <div className="bento-head">
                  <div className="bento-eyebrow">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                    Fast Trade Log
                  </div>
                  <h3 className="bento-title">Log a trade in <span className="accent">under 10 seconds.</span></h3>
                  <p className="bento-desc">Pair, direction, R:R, session — built for speed on mobile.</p>
                </div>
                <div className="bento-visual mobile-shot">
                  <img className="shot-dark" src="/images/screenshot-07.jpg" alt="Log trade form" loading="lazy" />
                  <img className="shot-light" src="/images/screenshot-08.jpg" alt="Log trade form (light)" loading="lazy" />
                </div>
              </article>

              <article className="bento-card bento-6">
                <div className="bento-head">
                  <div className="bento-eyebrow">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>
                    Rules Engine
                  </div>
                  <h3 className="bento-title">Target &amp; drawdown <span className="accent">auto-tracked.</span></h3>
                  <p className="bento-desc">Pick your firm — rules fill themselves in and update live as you trade.</p>
                </div>
                <div className="bento-visual mobile-shot">
                  <img className="shot-dark" src="/images/screenshot-09.jpg" alt="Challenge phase detail with rules" loading="lazy" />
                  <img className="shot-light" src="/images/screenshot-10.jpg" alt="Challenge phase detail with rules (light)" loading="lazy" />
                </div>
              </article>

              <article className="bento-card bento-2">
                <div className="bento-head">
                  <div className="bento-eyebrow">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                    Challenge Tracker
                  </div>
                  <h3 className="bento-title">All your prop firm challenges, <span className="accent">in one dashboard.</span></h3>
                  <p className="bento-desc">Active, funded, passed and failed — P&L, win rate, drawdown and target progress side by side.</p>
                </div>
                <div className="bento-visual desktop-shot">
                  <img loading="lazy" className="shot-dark" src="/images/screenshot-11.png" alt="Challenge Tracker Dashboard" />
                  <img loading="lazy" className="shot-light" src="/images/screenshot-12.png" alt="Challenge Tracker Dashboard (light)" />
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section" id="how">
        <div className="section-inner">
          <div style={{ maxWidth: '40rem' }}>
            <p className="eyebrow">How it works</p>
            <h2 className="section-h2">From zero to tracking<br /><span className="dim">in under a minute.</span></h2>
            <p className="section-sub">No manual setup. No googling firm rules. Just pick, confirm, and start logging.</p>
          </div>
          <div className="steps-grid">
            <div className="step">
              <div className="step-num">01</div>
              <h3>Pick your prop firm</h3>
              <p>Choose from a growing list of pre-loaded firms — FTMO, FundedNext, E8, Alpha Capital, Maven Trading, and more. New firms added regularly based on trader demand.</p>
              <span className="step-tag">30+ firms supported</span>
            </div>
            <div className="step">
              <div className="step-num">02</div>
              <h3>Rules auto-fill instantly</h3>
              <p>Profit targets, max drawdown, daily loss limits, and minimum trading days — all pre-populated the moment you pick your firm. Edit any rule anytime if your firm updates their terms.</p>
              <span className="step-tag">Zero manual entry</span>
            </div>
            <div className="step">
              <div className="step-num">03</div>
              <h3>Track, analyse, pass</h3>
              <p>Log trades manually or import directly from MT5, MT4, cTrader and more. Watch your rule progress in real time and use deep analytics to fix your weaknesses.</p>
              <span className="step-tag">Live rule tracking</span>
            </div>
          </div>
        </div>
      </section>

      {/* Challenge Tracker */}
      <section className="section">
        <div className="section-inner">
          <div className="challenge-layout">
            <div>
              <p className="eyebrow">Challenge tracker</p>
              <h2 className="section-h2">Every rule. Every account. <span className="dim">One view.</span></h2>
              <p className="section-sub">See exactly where you stand against your prop firm rules at a glance — P&L, drawdown, win rate, and minimum trading days, all in one card.</p>
              <ul className="check-list">
                {[
                  'Color-coded drawdown bars — know instantly if you\'re safe or at risk',
                  'Track multiple active challenges simultaneously across different firms',
                  'Drill into any challenge for full analytics and trade history',
                  'Edit challenge rules anytime if your firm\'s terms change',
                ].map((item, i) => (
                  <li key={i} className="check-item">
                    <svg className="check-icon icon" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="challenge-card">
              <div className="challenge-top">
                <div className="challenge-firm">MAVEN TRADING</div>
                <span className="badge-progress">In Progress</span>
              </div>
              <div className="challenge-meta">PHASE 1 · $5,000 · Started 2026-05-11 · 28 trades</div>
              <div className="stats-grid">
                <div><div className="stat-label">P&L</div><div className="stat-value green">+$289.61</div></div>
                <div><div className="stat-label">Win Rate</div><div className="stat-value">39.3%</div></div>
                <div><div className="stat-label">Trades</div><div className="stat-value">28</div></div>
                <div><div className="stat-label">W / L / BE</div><div className="stat-value" style={{ fontSize: 12 }}>11W · 16L · 1BE</div></div>
              </div>
              <div className="rules-list">
                {[
                  { name: 'PROFIT TARGET — 8.0%', val: '+5.79%', valColor: 'var(--brand)', width: '72%', fillColor: 'var(--brand)', left: '+5.79%', right: 'target 8.0%' },
                  { name: 'MAX DRAWDOWN — 8.0%', val: '0.00%', valColor: 'var(--brand)', width: '0%', fillColor: 'var(--red)', left: '0.00%', right: 'max 8.0%' },
                  { name: 'DAILY DRAWDOWN — 4.0%', val: '0.00%', valColor: 'var(--brand)', width: '0%', fillColor: 'var(--yellow)', left: '0.00%', right: 'max 4.0%' },
                  { name: 'MIN TRADING DAYS — 3', val: '14 days', valColor: 'var(--blue)', width: '100%', fillColor: 'var(--blue)', left: '14 days', right: 'need 3' },
                ].map((r, i) => (
                  <div key={i}>
                    <div className="rule-header"><span className="rule-name">{r.name}</span><span style={{ color: r.valColor }}>{r.val}</span></div>
                    <div className="rule-track"><div className="rule-fill" style={{ width: r.width, background: r.fillColor }} /></div>
                    <div className="rule-footer"><span>{r.left}</span><span>{r.right}</span></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section" id="features">
        <div className="section-inner">
          <div style={{ maxWidth: '40rem' }}>
            <p className="eyebrow">Features</p>
            <h2 className="section-h2">Everything a prop trader needs.</h2>
            <p className="section-sub">No bloat. No features built for stock traders. Just what you need to pass challenges and stay funded.</p>
          </div>
          <div className="features-grid">
            <div className="feature">
              <span className="feature-flag">Flagship feature</span>
              <div className="feature-icon"><svg className="icon" viewBox="0 0 24 24"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg></div>
              <h3>Auto-fill challenge rules</h3>
              <p>Select your prop firm and PropJournal pre-populates every rule — profit target, drawdown limits, min days. Edit anything you need.</p>
            </div>
            <div className="feature">
              <div className="feature-icon"><svg className="icon" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
              <h3>Deep analytics</h3>
              <p>Cumulative P&L, win rate, profit factor, RR distribution, streak tracker, and a calendar heatmap.</p>
            </div>
            <div className="feature">
              <div className="feature-icon"><svg className="icon" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></div>
              <h3>Trade log</h3>
              <p>Log every trade with entry, exit, notes, and screenshots. Each trade links automatically to its challenge account.</p>
            </div>
            <div className="feature">
              <div className="feature-icon"><svg className="icon" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>
              <h3>Screenshot storage</h3>
              <p>Attach chart screenshots to any trade. Review your setups and build a visual track record over time.</p>
            </div>
            <div className="feature">
              <div className="feature-icon"><svg className="icon" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
              <h3>Calendar heatmap</h3>
              <p>See P&L by day at a glance. Spot patterns in your best and worst trading days quickly.</p>
            </div>
            <div className="feature">
              <div className="feature-icon"><svg className="icon" viewBox="0 0 24 24"><rect x="2" y="7" width="10" height="14" rx="2"/><rect x="12" y="3" width="10" height="14" rx="2"/><line x1="7" y1="7" x2="7" y2="3"/><line x1="17" y1="17" x2="17" y2="21"/></svg></div>
              <h3>Multi-account tracking</h3>
              <p>Run multiple challenges at once? Switch between accounts instantly — P&L, rules, and trades all isolated per account.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section" id="community">
        <div className="section-inner">
          <div className="community-intro">
            <p className="eyebrow">Community</p>
            <h2 className="section-h2">Loved by challenge traders.</h2>
            <p className="section-sub">Discover what prop traders have to say about their PropJournal experience.</p>
            <a href="https://www.instagram.com/prop__journal/" target="_blank" rel="noopener noreferrer" className="community-cta">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              Follow us on Instagram
            </a>
          </div>
          <div className="testimonials-wrap">
            <div className="testimonials-grid">
              {[
                { initials: 'MK', bg: '#4f7fe8', handle: 'Marcus K.', body: 'Finally a journal that <strong>knows my prop firm rules</strong> without me typing them in. Picked FTMO, hit start, done. Spreadsheet is in the trash.' },
                { initials: 'PT', bg: '#e06c4f', handle: 'Prop Trader', body: 'The drawdown tracker alone saved my challenge last week. Got a warning at 4.2% daily — closed everything, came back next day, passed. ✅' },
                { initials: 'QR', bg: '#7c5ce8', handle: 'Quinn R.', body: 'Running 3 challenges across 2 firms. Multi-account switching is instant — P&L, rules, trades, all isolated. No more 4 browser tabs and a notepad.' },
                { initials: 'CT', bg: '#e8a84f', handle: 'Challenge Trader', body: 'Calendar heatmap made me realize I lose money every single Monday. Stopped trading Mondays. Win rate jumped 11%. That\'s it. That\'s the tweet.' },
                { initials: 'NJ', bg: '#4fbe8a', handle: 'Nathan J.', body: 'Tried every journal out there. TradeZella, Tradervue, you name it. None of them understand prop challenges. PropJournal does. Switched last month, never looking back.' },
                { initials: 'FT', bg: '#e84f9a', handle: 'Funded Trader', body: 'Logged my first trade in under 30 seconds. Screenshot upload, R:R auto-calculated, tagged the setup. This is what a journal should feel like.' },
                { initials: 'RT', bg: '#4fc4e8', handle: 'Ryan T.', body: 'Passed my FTMO 200k challenge last Friday 🎉 The minimum trading days counter kept me honest. Would\'ve blown it without this.' },
                { initials: 'PT', bg: '#a84fe8', handle: 'Prop Trader', body: 'No bloat. No "AI insights." No features built for stock investors. Just a clean log + the rules that actually matter to me. Refreshing.' },
              ].map((t, i) => (
                <div key={i} className="testimonial">
                  <div className="testimonial-head">
                    <div className="testimonial-avatar" style={{ background: t.bg }}>{t.initials}</div>
                    <span className="testimonial-handle">{t.handle}</span>
                  </div>
                  <p className="testimonial-body" dangerouslySetInnerHTML={{ __html: t.body }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="section" id="pricing">
        <div className="section-inner">
          <div className="pricing-intro">
            <p className="eyebrow">Pricing</p>
            <h2 className="section-h2">Simple, honest pricing.</h2>
            <p className="section-sub" style={{ marginLeft: 'auto', marginRight: 'auto', textAlign: 'center' }}>One plan. Everything included. No tiers, no confusion.</p>
          </div>
          <div className="plans-grid">
            <div className="plan featured">
              <span className="plan-badge">Start here</span>
              <h3 className="plan-name">Free Trial</h3>
              <div className="plan-price"><span className="plan-dollar">$</span><span className="plan-amount">0</span><span className="plan-per">/ 7 days</span></div>
              <div className="plan-total">No credit card required</div>
              <hr className="plan-divider" />
              <p className="plan-desc">Full access to everything — unlimited trades, challenge accounts, screenshot uploads, full analytics, calendar heatmap &amp; rule tracker.</p>
              <a href="/signup" className="plan-cta featured-cta">Start free trial</a>
            </div>
            <div className="plan">
              <h3 className="plan-name">Monthly</h3>
              <div className="plan-price"><span className="plan-dollar">$</span><span className="plan-amount">12</span><span className="plan-per">/ per month</span></div>
              <div className="plan-total">$12 billed monthly</div>
              <hr className="plan-divider" />
              <p className="plan-desc">Everything included — unlimited trades, challenge accounts, screenshot uploads, full analytics, calendar heatmap &amp; rule tracker.</p>
              <a href="/signup" className="plan-cta default-cta">Subscribe</a>
            </div>
            <div className="plan">
              <h3 className="plan-name">6 Months</h3>
              <div className="plan-price"><span className="plan-dollar">$</span><span className="plan-amount">10</span><span className="plan-per">/ per month</span></div>
              <div className="plan-total">$60 billed every 6 months</div>
              <div className="plan-discount">Save 17% vs monthly</div>
              <hr className="plan-divider" />
              <p className="plan-desc">Everything included — unlimited trades, challenge accounts, screenshot uploads, full analytics, calendar heatmap &amp; rule tracker.</p>
              <a href="/signup" className="plan-cta default-cta">Subscribe</a>
            </div>
            <div className="plan">
              <h3 className="plan-name">Annual</h3>
              <div className="plan-price"><span className="plan-dollar">$</span><span className="plan-amount">8</span><span className="plan-per">/ per month</span></div>
              <div className="plan-total">$96 billed once per year</div>
              <div className="plan-discount">Best value — Save 33%</div>
              <hr className="plan-divider" />
              <p className="plan-desc">Everything included — unlimited trades, challenge accounts, screenshot uploads, full analytics, calendar heatmap &amp; rule tracker.</p>
              <a href="/signup" className="plan-cta default-cta">Subscribe</a>
            </div>
          </div>
          <p className="pricing-note">7-day free trial · Full access during trial · Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="footer-inner">
          <div className="footer-logo"><span>Prop</span>Journal</div>
          <p className="footer-copy">© {year} PropJournal. All rights reserved.</p>
          <div className="footer-links">
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/refund-policy">Refund Policy</a>
            <a href="mailto:support@thepropjournal.com" aria-label="Email">
              <svg className="icon" width="16" height="16" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </a>
            <a href="https://www.instagram.com/prop__journal/" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
              <svg className="icon" width="16" height="16" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            </a>
          </div>
        </div>
      </footer>
    </>
  )
}