import { Icon } from './Icon.jsx'

export function Brand({ onNavigate, light = false }) {
  return (
    <a className={`brand-lockup ${light ? 'brand-lockup-light' : ''}`} href="/" onClick={onNavigate ? (event) => { event.preventDefault(); onNavigate('/') } : undefined} aria-label="Resumint home">
      <span className="brand-mark"><Icon name="sparkle" size={20} strokeWidth={1.8} /></span>
      <span className="brand-wordmark">resumint<span>.</span></span>
    </a>
  )
}
