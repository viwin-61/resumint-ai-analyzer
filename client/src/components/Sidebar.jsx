import { Icon } from './Icon.jsx'
import { Brand } from './Brand.jsx'

const navigation = [
  { label: 'Overview', icon: 'grid', key: 'overview' },
  { label: 'New analysis', icon: 'filePlus', key: 'new-analysis', action: true },
  { label: 'My resumes', icon: 'file', key: 'resumes' },
  { label: 'Resume optimizer', icon: 'sparkle', key: 'optimizer' },
  { label: 'Cover letters', icon: 'mail', key: 'letters' },
  { label: 'Analysis history', icon: 'clock', key: 'history' },
  { label: 'Settings', icon: 'settings', key: 'settings' },
  { label: 'My plan', icon: 'creditCard', key: 'plan' },
]

export function Sidebar({ activeNav, onNavigate, onNewAnalysis, isOpen, onClose, theme, onToggleTheme, onToast, user, onSignOut, onSettings, onPlan, analysisCount = 0 }) {
  const displayName = user?.fullName || user?.name || 'Your workspace'
  const initials = displayName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const subscription = user?.subscription || {}
  const planName = subscription.name || (subscription.plan ? `${subscription.plan[0].toUpperCase()}${subscription.plan.slice(1)}` : 'Free')
  const used = subscription.usage?.analyses || 0
  const limit = subscription.limits?.analyses ?? 2

  const handleItem = (item) => {
    if (item.action) { onNewAnalysis(); onClose(); return }
    onNavigate(item.key)
    onClose()
  }
  return <>
    <button type="button" className={`sidebar-scrim ${isOpen ? 'is-visible' : ''}`} onClick={onClose} aria-label="Close navigation" />
    <aside className={`sidebar ${isOpen ? 'is-open' : ''}`} aria-label="Main navigation">
      <div className="brand-lockup"><Brand /><button className="mobile-close icon-button" type="button" onClick={onClose} aria-label="Close menu"><Icon name="close" /></button></div>
      <button className="workspace-switcher" type="button" onClick={() => onToast(`${displayName}’s private workspace.`)}><div className="workspace-avatar">{initials.slice(0, 1)}</div><div className="workspace-copy"><span>Workspace</span><strong>{displayName}</strong></div><Icon name="down" size={15} className="switcher-chevron" /></button>
      <nav className="sidebar-nav" aria-label="Workspace navigation">
        <div className="nav-section-label">Workspace</div>
        {navigation.map((item) => <button className={`nav-item ${activeNav === item.key ? 'is-active' : ''} ${item.action ? 'nav-item-action' : ''}`} type="button" key={item.key} onClick={() => handleItem(item)} aria-current={activeNav === item.key ? 'page' : undefined}><Icon name={item.icon} size={18} /><span>{item.label}</span>{item.key === 'history' && analysisCount > 0 && <span className="nav-count">{analysisCount}</span>}</button>)}
      </nav>
      <div className="sidebar-spacer" />
      <div className="plan-card"><div className="plan-topline"><span className="plan-spark"><Icon name="sparkle" size={14} /></span><span>YOUR PLAN</span><span className="plan-pill">{planName}</span></div><div className="plan-caption"><strong>{used} / {Number.isFinite(limit) ? limit : '∞'}</strong> analyses used this month</div><div className="plan-progress"><span style={{ width: `${Number.isFinite(limit) && limit ? Math.min(100, used / limit * 100) : 0}%` }} /></div><button type="button" className="plan-link" onClick={onPlan}>Manage plan <Icon name="arrowUp" size={14} /></button></div>
      <button className="profile-row" type="button" onClick={onSettings} aria-label="Open profile settings"><div className="profile-avatar">{initials.slice(0, 1)}</div><div className="profile-copy"><strong>{displayName}</strong><span>{user?.email || ''}</span></div><Icon name="settings" size={15} /></button>
      <div className="sidebar-bottom-actions"><button className="theme-switch" type="button" onClick={onToggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}><Icon name={theme === 'light' ? 'moon' : 'sun'} size={17} /><span>{theme === 'light' ? 'Dark appearance' : 'Light appearance'}</span><span className={`theme-track ${theme === 'dark' ? 'is-dark' : ''}`}><span /></span></button><button className="sidebar-logout" type="button" onClick={onSignOut}><Icon name="logout" size={15} /> Sign out</button></div>
      <div className="sidebar-footer">Your Resume. Smarter. <span>✳</span></div>
    </aside>
  </>
}
