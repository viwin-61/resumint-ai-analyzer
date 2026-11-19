import { useState } from 'react'
import { Brand } from './Brand.jsx'
import { Icon } from './Icon.jsx'
import { apiRequest } from '../lib/api.js'

const featureCards = [
  { icon: 'sparkle', title: 'AI resume analysis', text: 'See how your experience maps to the work you want to do next.' },
  { icon: 'shield', title: 'ATS compatibility', text: 'Find formatting and keyword issues before your resume reaches a recruiter.' },
  { icon: 'target', title: 'Job description matching', text: 'Compare your resume against the responsibilities and skills that matter.' },
  { icon: 'chart', title: 'Skills gap analysis', text: 'Understand what already aligns and what you could make more visible.' },
  { icon: 'file', title: 'Resume optimization', text: 'Get practical, evidence-based edits that preserve your real experience.' },
  { icon: 'mail', title: 'Cover letter drafts', text: 'Start with a role-specific letter, then shape it in your own voice.' },
]

const plans = [
  { name: 'Free', price: '₹0', cadence: '/ month', subtitle: 'A thoughtful place to begin.', bullets: ['2 resume analyses each month', '1 resume upload each month', 'Basic ATS, match and skills scores', '3 AI improvement suggestions', 'Sample ATS resume access', 'History for your latest 5 analyses', 'PDF reports not included'] },
  { name: 'Basic', price: '₹150', cadence: '/ month', subtitle: 'More clarity for an active search.', bullets: ['15 resume analyses each month', '5 resume uploads each month', 'Full ATS and skills gap analysis', '10 optimization suggestions', '5 AI cover letters', '5 PDF reports', '30 days of analysis history'] },
  { name: 'Premium', price: '₹299', cadence: '/ month', subtitle: 'For a focused, high-volume search.', popular: true, bullets: ['50 resume analyses each month', '20 resume uploads each month', 'Advanced ATS and resume analysis', '30 resume optimizations', '20 AI cover letters', '30 PDF reports', 'Unlimited analysis history'] },
]

function PublicHeader({ path, user, theme, onToggleTheme, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const items = [['Home', '/'], ['About', '/about'], ['Services', '/services'], ['Support', '/support']]
  return (
    <header className="public-header">
      <div className="public-header-inner">
        <Brand onNavigate={onNavigate} />
        <nav className={`public-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Public navigation">
          {items.map(([label, href]) => <a className={path === href ? 'is-current' : ''} href={href} key={href} onClick={() => setMenuOpen(false)}>{label}</a>)}
          <a className="mobile-nav-login" href={user ? '/dashboard' : '/login'}>{user ? 'Dashboard' : 'Login'}</a>
          <a className="button button-primary public-nav-cta" href={user ? '/dashboard' : '/register'}>{user ? 'Open dashboard' : 'Get started free'} <Icon name="arrowUp" size={14} /></a>
        </nav>
        <div className="public-header-actions">
          <button className="icon-button public-theme-toggle" type="button" onClick={onToggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}><Icon name={theme === 'light' ? 'moon' : 'sun'} size={17} /></button>
          <a className="public-login-link" href={user ? '/dashboard' : '/login'}>{user ? 'Dashboard' : 'Login'}</a>
          <a className="button button-primary public-header-cta" href={user ? '/dashboard' : '/register'}>{user ? 'Open dashboard' : 'Get started free'} <Icon name="arrowUp" size={14} /></a>
          <button className="icon-button public-menu-toggle" type="button" onClick={() => setMenuOpen((value) => !value)} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}><Icon name={menuOpen ? 'close' : 'menu'} size={19} /></button>
        </div>
      </div>
    </header>
  )
}

function PricingCards({ onNavigate }) {
  return (
    <section className="public-section pricing-section" id="plans">
      <div className="public-section-heading"><span className="public-eyebrow">PLANS THAT GROW WITH YOU</span><h2>Start free. Find your pace.</h2><p>Choose the level of support that fits your search. Paid plan billing is not enabled yet.</p></div>
      <div className="pricing-grid">
        {plans.map((plan) => <article className={`pricing-card ${plan.popular ? 'is-popular' : ''}`} key={plan.name}>
          {plan.popular && <span className="popular-ribbon">MOST POPULAR</span>}
          <span className="pricing-name">{plan.name}</span><p>{plan.subtitle}</p>
          <div className="pricing-price"><strong>{plan.price}</strong><span>{plan.cadence}</span></div>
          <a className={`button ${plan.popular ? 'button-primary' : 'button-ghost'} pricing-action`} href="/register" onClick={onNavigate ? (event) => { event.preventDefault(); onNavigate('/register') } : undefined}>{plan.name === 'Free' ? 'Start for free' : 'Explore this plan'}</a>
          <ul>{plan.bullets.map((item) => <li key={item}><Icon name="check" size={14} />{item}</li>)}</ul>
        </article>)}
      </div>
      <p className="pricing-note">No payment gateway is connected. Paid plan requests will be recorded for future billing setup.</p>
    </section>
  )
}

function HomePage({ onNavigate }) {
  return (
    <>
      <section className="public-hero">
        <div className="public-hero-glow public-hero-glow-one" /><div className="public-hero-glow public-hero-glow-two" />
        <div className="public-hero-inner">
          <div className="public-hero-copy"><span className="public-eyebrow"><i /> CAREER CLARITY, WITH A LITTLE MORE HEART</span><h1>Your Resume.<br /><em>Smarter.</em> Your Career.<br /><strong>Stronger.</strong></h1><p>Know where you stand, see what’s possible, and bring your best work into focus—one thoughtful application at a time.</p><div className="public-hero-actions"><a className="button button-primary" href="/register" onClick={(event) => { event.preventDefault(); onNavigate('/register') }}>Get started free <Icon name="arrowUp" size={15} /></a><a className="button button-glass" href="#how-it-works">See how it works <Icon name="chevron" size={14} /></a></div><div className="hero-trust-row"><span><Icon name="shield" size={15} /> Private by design</span><span><Icon name="sparkle" size={15} /> Thoughtful AI guidance</span></div></div>
          <div className="hero-preview-card" aria-label="Example resume match preview"><div className="preview-card-top"><span className="preview-avatar"><Icon name="file" size={18} /></span><div><strong>Product Designer</strong><small>Example match preview</small></div><span className="preview-pill">SAMPLE</span></div><div className="preview-score-row"><div className="preview-score"><strong>86</strong><span>%</span></div><div><strong>A promising fit</strong><small>Review the full result in your workspace</small></div></div><div className="preview-meter"><span style={{ width: '86%' }} /></div><div className="preview-tags"><span><Icon name="check" size={12} /> Research</span><span><Icon name="check" size={12} /> Prototyping</span><span className="tag-gap">Skills gap: SQL</span></div><div className="preview-card-footer"><span><Icon name="shield" size={14} /> ATS ready to review</span><span>Example only</span></div></div>
        </div>
        <div className="hero-scroll-cue"><span /> Scroll to explore</div>
      </section>
      <section className="public-section intro-section"><div className="intro-orbit"><span /><span /><span /><Icon name="sparkle" size={24} /></div><div><span className="public-eyebrow">A SMARTER WAY TO SHOW UP</span><h2>Your next opportunity deserves your clearest story.</h2><p>Resumint helps you understand how your experience connects to a role, make thoughtful improvements, and move forward with confidence.</p></div></section>
      <section className="public-section feature-section" id="features"><div className="public-section-heading"><span className="public-eyebrow">A THOUGHTFUL CAREER TOOLKIT</span><h2>Everything you need to make your next move.</h2><p>Clear feedback across your resume, the role, and the story you want to tell.</p></div><div className="feature-grid">{featureCards.map((feature, index) => <article className="public-feature-card" key={feature.title}><span className={`feature-icon feature-icon-${index}`}><Icon name={feature.icon} size={19} /></span><h3>{feature.title}</h3><p>{feature.text}</p><span className="feature-number">0{index + 1}</span></article>)}</div></section>
      <section className="public-section how-section" id="how-it-works"><div className="public-section-heading"><span className="public-eyebrow">THREE GENTLE STEPS</span><h2>From “I wonder” to “I’m ready.”</h2></div><div className="steps-grid"><article><span>01</span><h3>Bring your resume</h3><p>Upload a text-based PDF to your private workspace. Your original file is discarded after extraction.</p></article><article><span>02</span><h3>Choose a role</h3><p>Paste the job description so the analysis can focus on what this opportunity asks for.</p></article><article><span>03</span><h3>Move forward</h3><p>Review your match, ATS feedback, skill gaps, and tailored suggestions in one place.</p></article></div></section>
      <PricingCards onNavigate={onNavigate} />
      <section className="public-bottom-cta"><div><span className="public-eyebrow">YOUR NEXT CHAPTER STARTS HERE</span><h2>Make your next application feel more like you.</h2></div><a className="button button-white" href="/register" onClick={(event) => { event.preventDefault(); onNavigate('/register') }}>Create your free account <Icon name="arrowUp" size={15} /></a></section>
    </>
  )
}

function AboutPage() {
  return <main className="public-content-page"><section className="public-page-hero"><span className="public-eyebrow">ABOUT RESUMINT</span><h1>A little more clarity.<br /><em>A lot more possibility.</em></h1><p>We believe a resume should help you tell a true, compelling story—not make you guess what an applicant tracking system might see.</p></section><section className="about-story-grid"><article><span className="about-icon"><Icon name="sparkle" size={20} /></span><span className="public-eyebrow">OUR MISSION</span><h2>Help people show up as their strongest selves.</h2><p>Resumint makes practical career guidance more accessible. We turn a resume and a job description into clear feedback you can use, while leaving the decisions and the voice in your hands.</p></article><article><span className="about-icon about-icon-green"><Icon name="target" size={20} /></span><span className="public-eyebrow">OUR VISION</span><h2>More confidence in every career move.</h2><p>We imagine a world where people understand their strengths, see what a role asks for, and can choose their next step with less noise and more confidence.</p></article></section><section className="about-why"><div><span className="public-eyebrow">WHY RESUMINT</span><h2>Thoughtful guidance, grounded in your real experience.</h2></div><ul><li><Icon name="check" size={16} /> Clear evidence from your resume and target role</li><li><Icon name="check" size={16} /> Suggestions that never ask you to invent credentials</li><li><Icon name="check" size={16} /> Your resume stays private to your account</li><li><Icon name="check" size={16} /> You review every edit before using it</li></ul></section><section className="technology-strip"><div><Icon name="shield" size={20} /><strong>Private workspace</strong><span>Account-scoped analysis history</span></div><div><Icon name="sparkle" size={20} /><strong>Structured AI</strong><span>Validated, evidence-based results</span></div><div><Icon name="file" size={20} /><strong>ATS-aware</strong><span>Simple, readable PDF workflows</span></div></section></main>
}

function ServicesPage({ onNavigate }) {
  const serviceIds = ['analysis', 'ats', 'matching', 'skills', 'optimizer', 'cover-letter']
  return <main className="public-content-page services-page"><section className="public-page-hero"><span className="public-eyebrow">RESUMINT SERVICES</span><h1>Good tools for the work<br /><em>you want to do next.</em></h1><p>Use one clear analysis or bring together a full application workflow.</p></section><div className="service-list">{featureCards.map((feature, index) => <article className="service-row" id={serviceIds[index]} key={feature.title}><span className={`feature-icon feature-icon-${index}`}><Icon name={feature.icon} size={18} /></span><div><h2>{feature.title}</h2><p>{feature.text}</p></div><span className="service-index">0{index + 1}</span></article>)}</div><PricingCards onNavigate={onNavigate} /></main>
}

const faqs = [
  ['What kind of resume can I upload?', 'Upload a text-based PDF under 4 MB. Scanned image-only resumes need OCR before Resumint can read their text.'],
  ['How should I read my ATS score?', 'It is a compatibility estimate based on readable structure and role-relevant evidence, not a guarantee that a particular employer’s software will rank the resume the same way.'],
  ['Can Resumint change my resume automatically?', 'No. Suggestions are drafts for you to review, edit, and approve. They should never add experience or results that are not true.'],
  ['I cannot sign in. What should I do?', 'Check that you are using the email or username associated with your account. For password help, use the support form and include the email on your account.'],
]

function SupportPage() {
  const [form, setForm] = useState({ fullName: '', email: '', category: 'account', subject: '', message: '' })
  const [attachment, setAttachment] = useState(null)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  const submit = async (event) => {
    event.preventDefault(); setError(''); setSending(true)
    try {
      const body = new FormData()
      Object.entries(form).forEach(([key, value]) => body.append(key, value))
      if (attachment) body.append('attachment', attachment)
      await apiRequest('/support', { method: 'POST', body })
      setSubmitted(true)
    }
    catch (requestError) { setError(requestError.message) }
    finally { setSending(false) }
  }
  return <main className="public-content-page support-page"><section className="public-page-hero"><span className="public-eyebrow">HERE WHEN YOU NEED US</span><h1>Let’s figure it out<br /><em>together.</em></h1><p>Find a quick answer or send our support team a note. We’ll help you get back to your next step.</p></section><div className="support-grid"><section className="faq-panel"><span className="public-eyebrow">HELP CENTER</span><h2>Common questions</h2>{faqs.map(([question, answer]) => <details className="faq-item" key={question}><summary>{question}<Icon name="plus" size={15} /></summary><p>{answer}</p></details>)}</section><section className="support-form-panel" id="contact"><span className="public-eyebrow">CONTACT SUPPORT</span><h2>Send us a message</h2>{submitted ? <div className="support-success" role="status"><span><Icon name="check" size={18} /></span><strong>Thanks — your message is with our support team.</strong><p>We’ll reply to the email address you provided.</p><button className="button button-ghost" type="button" onClick={() => { setSubmitted(false); setForm({ fullName: '', email: '', category: 'account', subject: '', message: '' }); setAttachment(null) }}>Send another message</button></div> : <form onSubmit={submit} encType="multipart/form-data"><label className="public-field"><span>Full name</span><input value={form.fullName} onChange={update('fullName')} required minLength={2} maxLength={100} /></label><label className="public-field"><span>Email</span><input type="email" value={form.email} onChange={update('email')} required maxLength={254} /></label><label className="public-field"><span>Issue category</span><select value={form.category} onChange={update('category')}><option value="account">Account / login</option><option value="resume-upload">Resume upload</option><option value="analysis">ATS or analysis</option><option value="billing">Plans and billing</option><option value="other">Something else</option></select></label><label className="public-field"><span>Subject</span><input value={form.subject} onChange={update('subject')} required minLength={4} maxLength={140} /></label><label className="public-field"><span>Message</span><textarea value={form.message} onChange={update('message')} required minLength={20} maxLength={5000} rows={5} placeholder="Tell us what happened and what you were trying to do." /></label><label className="public-field support-attachment"><span>Attachment <small>(optional · PDF, PNG or JPG · up to 5 MB)</small></span><input type="file" accept="application/pdf,image/png,image/jpeg" onChange={(event) => setAttachment(event.target.files?.[0] || null)} />{attachment && <small>{attachment.name}</small>}</label>{error && <div className="form-error" role="alert"><Icon name="help" size={16} />{error}</div>}<button className="button button-primary support-submit" type="submit" disabled={sending}>{sending ? 'Sending…' : 'Send to support'} <Icon name="arrowUp" size={14} /></button></form>}</section></div></main>
}

function LegalPage({ path }) {
  const title = path === '/terms' ? 'Terms & Conditions' : path === '/cookies' ? 'Cookie Policy' : 'Privacy Policy'
  return <main className="public-content-page legal-page"><span className="public-eyebrow">RESUMINT</span><h1>{title}</h1><p>This page explains how Resumint handles account access, resume content, AI processing, and service use. The production legal text should be reviewed for the jurisdiction where the service operates before launch.</p><h2>Your information</h2><p>Resume text and job descriptions are processed to generate your requested analysis and stored with your private analysis history. Original PDF files are discarded after extraction. OpenAI requests use `store: false`.</p><h2>Using AI guidance</h2><p>Scores are estimates, not hiring guarantees. Review every suggestion and make sure your final application reflects your own experience.</p></main>
}

export function PublicSite({ path, user, theme, onToggleTheme, onNavigate }) {
  const normalizedPath = path.replace(/\/$/, '') || '/'
  let content
  if (normalizedPath === '/about') content = <AboutPage />
  else if (normalizedPath === '/services') content = <ServicesPage onNavigate={onNavigate} />
  else if (normalizedPath === '/support') content = <SupportPage />
  else if (['/privacy', '/terms', '/cookies'].includes(normalizedPath)) content = <LegalPage path={normalizedPath} />
  else content = <HomePage onNavigate={onNavigate} />
  const footerVisible = ['/', '/about', '/services', '/support'].includes(normalizedPath)
  return <div className="public-site"><PublicHeader path={normalizedPath} user={user} theme={theme} onToggleTheme={onToggleTheme} onNavigate={onNavigate} />{content}{footerVisible && <PublicFooter onNavigate={onNavigate} />}</div>
}

export function PublicFooter({ onNavigate }) {
  const handleInternal = (path) => (event) => { if (!path.startsWith('http') && onNavigate) { event.preventDefault(); onNavigate(path) } }
  return <footer className="public-footer"><div className="footer-grid">
    <section className="footer-support"><span className="footer-column-title">CUSTOMER SUPPORT</span><a href="/support" onClick={handleInternal('/support')}>Help Center</a><a href="/support#contact" onClick={handleInternal('/support#contact')}>Contact Support</a><p>Questions about your account, upload, or analysis? We’re here to help.</p><div className="social-links"><a href="https://www.linkedin.com" aria-label="LinkedIn">in</a><a href="https://x.com" aria-label="X">𝕏</a><a href="https://www.instagram.com" aria-label="Instagram">ig</a></div></section>
    <section><span className="footer-column-title">PRODUCTS</span><a href="/services#analysis" onClick={handleInternal('/services#analysis')}>AI Resume Analysis</a><a href="/services#ats" onClick={handleInternal('/services#ats')}>ATS Checker</a><a href="/services#optimizer" onClick={handleInternal('/services#optimizer')}>Resume Optimizer</a><a href="/services#cover-letter" onClick={handleInternal('/services#cover-letter')}>Cover Letter Generator</a><a href="/services#matching" onClick={handleInternal('/services#matching')}>Job Description Matching</a></section>
    <section><span className="footer-column-title">COMPANY</span><a href="/about" onClick={handleInternal('/about')}>About Us</a><a href="/services" onClick={handleInternal('/services')}>Services</a><a href="/support" onClick={handleInternal('/support')}>Support</a><a href="/privacy" onClick={handleInternal('/privacy')}>Privacy Policy</a><a href="/terms" onClick={handleInternal('/terms')}>Terms & Conditions</a></section>
    <section className="footer-brand-column"><Brand onNavigate={onNavigate} /><p>Your Resume. Smarter. Your Career. Stronger. Thoughtful AI guidance for the next chapter of your career.</p><span className="footer-security"><Icon name="shield" size={14} /> Private by design</span></section>
  </div><div className="footer-bottom"><span>© 2026 Resumint. All rights reserved.</span><div><a href="/terms" onClick={handleInternal('/terms')}>Terms & Conditions</a><a href="/privacy" onClick={handleInternal('/privacy')}>Privacy Policy</a><a href="/cookies" onClick={handleInternal('/cookies')}>Cookie Policy</a></div></div></footer>
}
