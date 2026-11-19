import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon.jsx'
import { getPlan, requestPlanChange } from '../lib/api.js'

const definitions = [
  { id: 'free', name: 'Free', price: '₹0', bullets: ['2 resume analyses / month', '1 resume upload / month', 'Basic ATS, match and skills analysis', '3 improvement suggestions', 'Sample ATS resume and limited history', 'PDF reports not included'] },
  { id: 'basic', name: 'Basic', price: '₹150', bullets: ['15 resume analyses / month', '5 resume uploads / month', 'Full ATS and skills gap analysis', '10 resume optimizations / month', '5 AI cover letters and PDF reports', '30 days of analysis history'] },
  { id: 'premium', name: 'Premium', price: '₹299', popular: true, bullets: ['50 resume analyses / month', '20 resume uploads / month', 'Advanced ATS and detailed AI analysis', '30 resume optimizations / month', '20 AI cover letters and 30 PDF reports', 'Unlimited history and priority processing'] },
]

const usageItems = [
  ['analyses', 'Resume analyses'],
  ['uploads', 'Resume uploads'],
  ['optimizations', 'Resume optimizations'],
  ['coverLetters', 'AI cover letters'],
  ['pdfReports', 'PDF reports'],
]

export function PlanPage({ user, onUpdated, onToast }) {
  const [snapshot, setSnapshot] = useState(user?.subscription || null)
  const [requests, setRequests] = useState([])
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getPlan().then(({ subscription, requests: currentRequests }) => {
      if (!active) return
      setSnapshot(subscription)
      setRequests(currentRequests || [])
    }).catch((requestError) => { if (active) setError(requestError.message) })
    return () => { active = false }
  }, [])

  const change = async (plan) => {
    setBusy(plan); setError('')
    try {
      const result = await requestPlanChange(plan)
      setSnapshot(result.subscription)
      onUpdated({ ...user, subscription: result.subscription })
      if (result.request) setRequests((current) => [result.request, ...current])
      onToast(result.activated ? 'Your Free plan is now active.' : 'Your plan request is saved. It will activate after billing is connected.')
    } catch (requestError) { setError(requestError.message) }
    finally { setBusy('') }
  }

  const currentPlan = snapshot?.plan || 'free'
  const usage = snapshot?.usage || {}
  const limits = snapshot?.limits || {}
  return <div className="dashboard-content plan-page">
    <div className="page-intro"><div><div className="intro-kicker"><span className="live-dot" /> YOUR RESUMINT PLAN</div><h1>My plan</h1><p>See what’s included and how much monthly usage remains.</p></div></div>
    <section className="plan-current panel"><div><span className="current-plan-label">CURRENT PLAN</span><h2>{snapshot?.name || 'Free'} <span>{snapshot?.status || 'active'}</span></h2><p>{snapshot?.priceInr === 0 || currentPlan === 'free' ? 'No charge' : `₹${snapshot?.priceInr || 0} / month`}</p></div><div className="plan-period"><Icon name="clock" size={17} /><span>Usage period<br /><strong>{snapshot?.periodKey || 'Current month'}</strong></span></div></section>
    <section className="usage-panel panel"><div className="section-title"><div><span className="eyebrow">MONTHLY USAGE</span><h2>Your allowance</h2></div></div><div className="usage-grid">{usageItems.map(([key, label]) => {
      const limit = limits[key] ?? 0
      const used = usage[key] ?? 0
      const remaining = snapshot?.remaining?.[key] ?? Math.max(0, limit - used)
      return <article className="usage-item" key={key}><span>{label}</span><strong>{used} <small>/ {Number.isFinite(limit) ? limit : 'Unlimited'}</small></strong><div className="usage-track"><i style={{ width: `${Number.isFinite(limit) && limit ? Math.min(100, used / limit * 100) : 0}%` }} /></div><small>{Number.isFinite(limit) ? `${remaining} remaining` : 'Unlimited'}</small></article>
    })}</div></section>
    <div className="plan-cards-heading"><div><span className="eyebrow">PLANS & PRICING</span><h2>Choose your level of support</h2></div><p>Billing is not connected yet. Paid selections are saved as requests and do not change your active plan.</p></div>
    <div className="dashboard-plans-grid">{definitions.map((plan) => <article key={plan.id} className={`dashboard-plan-card panel ${plan.popular ? 'is-popular' : ''}`}>
      {plan.popular && <span className="popular-ribbon">MOST POPULAR</span>}<span className="pricing-name">{plan.name}</span><div className="pricing-price"><strong>{plan.price}</strong><span>/ month</span></div><ul>{plan.bullets.map((item) => <li key={item}><Icon name="check" size={14} />{item}</li>)}</ul>
      {currentPlan === plan.id ? <button className="button button-ghost pricing-action" disabled>Current plan</button> : <button className={`button ${plan.popular ? 'button-primary' : 'button-ghost'} pricing-action`} onClick={() => change(plan.id)} disabled={Boolean(busy)}>{busy === plan.id ? 'Saving…' : plan.id === 'free' ? 'Downgrade to Free' : `Request ${plan.name}`} <Icon name="arrowUp" size={14} /></button>}
    </article>)}</div>
    {requests.length > 0 && <section className="billing-requests panel"><span className="eyebrow">BILLING SETUP REQUESTS</span>{requests.slice(0, 3).map((request, index) => <p key={`${request.requestedAt || request.plan}-${index}`}>{request.plan} plan · {request.status || 'pending'}{request.requestedAt ? ` · ${new Date(request.requestedAt).toLocaleDateString()}` : ''}</p>)}</section>}
    {error && <div className="form-error" role="alert"><Icon name="help" size={16} />{error}</div>}
  </div>
}
