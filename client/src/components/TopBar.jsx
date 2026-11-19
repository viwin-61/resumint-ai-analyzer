import { useState } from 'react'
import { Icon } from './Icon.jsx'

export function TopBar({ onOpenSidebar, search, onSearch, notificationOpen, onToggleNotifications, onToast, onNavigate, onSettings, user, onSignOut, currentSection = 'Overview' }) {
  const [accountOpen, setAccountOpen] = useState(false)
  const displayName = user?.fullName || user?.name || 'Account'
  const initials = displayName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="mobile-menu icon-button" type="button" onClick={onOpenSidebar} aria-label="Open menu"><Icon name="menu" /></button>
        <div className="breadcrumb"><span>Workspace</span><Icon name="chevron" size={14} /><strong>{currentSection}</strong></div>
      </div>
      <div className="topbar-actions">
        <label className="search-box">
          <Icon name="search" size={17} />
          <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search analyses" aria-label="Search analyses" />
          <kbd>⌘ K</kbd>
        </label>
        <button type="button" className="icon-button help-button" aria-label="Help" onClick={() => onNavigate?.('/support')}><Icon name="help" /></button>
        <div className="notification-wrap">
          <button type="button" className={`icon-button notification-button ${notificationOpen ? 'is-on' : ''}`} aria-label="Notifications" onClick={onToggleNotifications}>
            <Icon name="bell" /><span className="notification-dot" />
          </button>
          {notificationOpen && (
            <div className="notification-popover">
              <div className="popover-heading"><strong>You’re all caught up</strong><span>1</span></div>
              <div className="notification-item"><span className="notification-icon"><Icon name="sparkle" size={15} /></span><p><strong>Welcome, {displayName}</strong><br />Your private career workspace is ready.</p></div>
            </div>
          )}
        </div>
        <div className="topbar-divider" />
        <div className="account-menu-wrap">
          <button type="button" className="topbar-user" onClick={() => setAccountOpen((value) => !value)} aria-label="Open account menu" aria-expanded={accountOpen}><span className="topbar-avatar">{initials}</span><Icon name="down" size={14} /></button>
          {accountOpen && <div className="account-popover"><div className="account-popover-user"><strong>{displayName}</strong><span>{user?.email || ''}</span></div><button type="button" onClick={() => { setAccountOpen(false); onSettings?.() }}>Settings <Icon name="settings" size={13} /></button>{onSignOut && <button type="button" onClick={() => { setAccountOpen(false); onSignOut() }}>Sign out <Icon name="logout" size={13} /></button>}</div>}
        </div>
      </div>
    </header>
  )
}
