import { useState } from 'react'
import { Icon } from './Icon.jsx'
import { Brand } from './Brand.jsx'

export function AuthScreen({ onAuthenticate, onNavigate, mode: initialMode = 'login', loading = false }) {
  const [mode, setMode] = useState(initialMode === 'register' ? 'register' : 'login')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const changeMode = (nextMode) => {
    setMode(nextMode)
    setError('')
    onNavigate?.(nextMode === 'register' ? '/register' : '/login')
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (mode === 'register' && password !== confirmPassword) { setError('Your passwords do not match.'); return }
    setSubmitting(true)
    try {
      const values = mode === 'register'
        ? { fullName, username, email, password, confirmPassword }
        : { identifier, password, rememberMe }
      await onAuthenticate(mode, values)
    } catch (requestError) { setError(requestError.message) }
    finally { setSubmitting(false) }
  }

  return (
    <main className="auth-page">
      <div className="auth-glow auth-glow-one" /><div className="auth-glow auth-glow-two" />
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand"><Brand onNavigate={onNavigate} /></div>
        <span className="eyebrow">YOUR RESUME. SMARTER. YOUR CAREER. STRONGER.</span>
        <h1 id="auth-title">{mode === 'login' ? 'Welcome back.' : 'Make room for what’s next.'}</h1>
        <p className="auth-lede">{mode === 'login' ? 'Sign in to your private career workspace.' : 'Create your account to make every application more intentional.'}</p>
        <div className="auth-tabs" role="tablist" aria-label="Account access">
          <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'is-active' : ''} onClick={() => changeMode('login')}>Sign in</button>
          <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'is-active' : ''} onClick={() => changeMode('register')}>Create account</button>
        </div>
        <form className="auth-form" onSubmit={submit}>
          {mode === 'register' && <>
            <label className="auth-field"><span>Full name</span><div><Icon name="user" size={17} /><input autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Jordan Lee" required minLength={2} maxLength={80} /></div></label>
            <label className="auth-field"><span>Username</span><div><Icon name="user" size={17} /><input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="jordanlee" required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]{3,24}" title="Use 3–24 letters, numbers, or underscores." /></div></label>
            <label className="auth-field"><span>Email address</span><div><Icon name="mail" size={17} /><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required maxLength={254} /></div></label>
          </>}
          {mode === 'login' && <label className="auth-field"><span>Username or email</span><div><Icon name="user" size={17} /><input autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="you@example.com" required maxLength={254} /></div></label>}
          <label className="auth-field"><span>Password</span><div><Icon name="shield" size={17} /><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === 'register' ? 'At least 10 characters' : 'Your password'} required minLength={mode === 'register' ? 10 : 1} maxLength={128} /><button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}><Icon name={showPassword ? 'eyeOff' : 'eye'} size={17} /></button></div></label>
          {mode === 'register' && <label className="auth-field"><span>Confirm password</span><div><Icon name="shield" size={17} /><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat your password" required minLength={10} maxLength={128} /></div></label>}
          {mode === 'login' && <div className="auth-options"><label><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} /> Remember me</label><a href="/support#contact" onClick={onNavigate ? (event) => { event.preventDefault(); onNavigate('/support#contact') } : undefined}>Forgot password?</a></div>}
          {error && <div className="form-error" role="alert"><Icon name="help" size={16} /> {error}</div>}
          <button className="button button-primary auth-submit" type="submit" disabled={submitting || loading}>{submitting ? 'Please wait…' : mode === 'login' ? 'Sign in to Resumint' : 'Create my account'} <Icon name="arrowUp" size={15} /></button>
        </form>
        <div className="auth-privacy"><Icon name="shield" size={15} /><span>Your resume is private to your account. Passwords are securely hashed.</span></div>
      </section>
      <p className="auth-footer">Your Resume. Smarter. Your Career. Stronger.</p>
    </main>
  )
}
