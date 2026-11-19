import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon.jsx'
import { updateProfile } from '../lib/api.js'

export function AccountSettings({ user, onUpdated, onToast }) {
  const [fullName, setFullName] = useState(user?.fullName || user?.name || '')
  const [username, setUsername] = useState(user?.username || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setFullName(user?.fullName || user?.name || '')
    setUsername(user?.username || '')
  }, [user?.fullName, user?.name, user?.username])

  const save = async (event) => {
    event.preventDefault(); setError(''); setSaving(true)
    try {
      const { user: updated } = await updateProfile({ fullName, username })
      onUpdated(updated)
      onToast('Your profile has been updated.')
    } catch (requestError) { setError(requestError.message) }
    finally { setSaving(false) }
  }

  return <div className="dashboard-content account-page">
    <div className="page-intro"><div><div className="intro-kicker"><span className="live-dot" /> YOUR ACCOUNT</div><h1>Settings</h1><p>Keep your profile details up to date across your workspace.</p></div></div>
    <section className="settings-panel panel"><div className="settings-heading"><span className="settings-icon"><Icon name="user" size={19} /></span><div><h2>Profile details</h2><p>Your name appears throughout your private dashboard.</p></div></div>
      <form className="settings-form" onSubmit={save}>
        <label className="form-field"><span>Full name</span><input value={fullName} onChange={(event) => setFullName(event.target.value)} required minLength={2} maxLength={80} autoComplete="name" /></label>
        <label className="form-field"><span>Username</span><input value={username} onChange={(event) => setUsername(event.target.value)} required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]{3,24}" autoComplete="username" /><small>3–24 letters, numbers, or underscores.</small></label>
        <label className="form-field"><span>Email address</span><input value={user?.email || ''} readOnly disabled /></label>
        {error && <div className="form-error" role="alert"><Icon name="help" size={16} />{error}</div>}
        <div className="settings-actions"><button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'} <Icon name="check" size={15} /></button></div>
      </form>
      <div className="settings-security"><Icon name="shield" size={16} /><span>Your account uses a secure HttpOnly session. Your password is never stored in plain text.</span></div>
    </section>
  </div>
}
