import { useCallback, useEffect, useState } from 'react'
import { AnalysisModal } from './components/AnalysisModal.jsx'
import { Icon } from './components/Icon.jsx'
import { Sidebar } from './components/Sidebar.jsx'
import { TopBar } from './components/TopBar.jsx'
import { AuthScreen } from './components/AuthScreen.jsx'
import { AnalysisDetail } from './components/AnalysisDetail.jsx'
import { PublicSite } from './components/PublicSite.jsx'
import { AccountSettings } from './pages/AccountSettings.jsx'
import { PlanPage } from './pages/PlanPage.jsx'
import { Dashboard } from './pages/Dashboard.jsx'
import { authenticate, downloadPdf, generateCoverLetter, generateResumeOptimization, getAnalyses, getAnalysis, getCurrentUser, getResumes, signOut, submitAnalysis } from './lib/api.js'

function getInitialTheme() {
  try {
    const saved = localStorage.getItem('resumint-theme') || localStorage.getItem('reframe-theme')
    if (saved === 'dark' || saved === 'light') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch { return 'light' }
}

export default function App() {
  const [theme, setTheme] = useState(getInitialTheme)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [analysisOpen, setAnalysisOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [authState, setAuthState] = useState('checking')
  const [user, setUser] = useState(null)
  const [analyses, setAnalyses] = useState([])
  const [resumes, setResumes] = useState([])
  const [selectedAnalysis, setSelectedAnalysis] = useState(null)
  const [path, setPath] = useState(() => window.location.pathname)

  const navigate = useCallback((destination) => {
    const [pathname, hash] = destination.split('#')
    const nextPath = pathname || window.location.pathname
    window.history.pushState({}, '', destination)
    setPath(nextPath)
    setSelectedAnalysis(null)
    setSidebarOpen(false)
    if (hash) window.setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' }), 50)
    else window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const showToast = useCallback((message) => {
    setToast(message)
    window.clearTimeout(showToast.timeout)
    showToast.timeout = window.setTimeout(() => setToast(''), 3600)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('resumint-theme', theme) } catch { /* Theme still works for this session. */ }
  }, [theme])

  useEffect(() => {
    const listener = (event) => showToast(event.detail)
    window.addEventListener('resumint-toast', listener)
    window.addEventListener('reframe-toast', listener)
    return () => { window.removeEventListener('resumint-toast', listener); window.removeEventListener('reframe-toast', listener) }
  }, [showToast])

  useEffect(() => {
    const listener = () => setPath(window.location.pathname)
    window.addEventListener('popstate', listener)
    return () => window.removeEventListener('popstate', listener)
  }, [])

  useEffect(() => {
    const listener = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        document.querySelector('.search-box input')?.focus()
      }
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])

  useEffect(() => {
    let active = true
    getCurrentUser().then(({ user: currentUser }) => {
      if (!active) return
      setUser(currentUser)
      setAuthState('ready')
    }).catch((error) => {
      if (!active) return
      setAuthState(error.status === 401 ? 'signed-out' : 'offline')
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (authState === 'signed-out' && path.startsWith('/dashboard')) navigate('/login')
    if (authState === 'ready' && ['/login', '/register'].includes(path)) navigate('/dashboard')
  }, [authState, path, navigate])

  useEffect(() => {
    if (!user) { setAnalyses([]); return undefined }
    let active = true
    getAnalyses().then(({ analyses: records }) => { if (active) setAnalyses(records) }).catch((error) => showToast(error.message))
    return () => { active = false }
  }, [user, showToast])

  useEffect(() => {
    if (!user) { setResumes([]); return undefined }
    let active = true
    getResumes().then(({ resumes: records }) => { if (active) setResumes(records) }).catch((error) => showToast(error.message))
    return () => { active = false }
  }, [user, showToast])

  const openAnalysis = () => { setAnalysisOpen(true); setNotificationOpen(false) }
  const handleAuthenticate = async (mode, values) => {
    const response = await authenticate(mode, values)
    setUser(response.user)
    setSelectedAnalysis(null)
    setAuthState('ready')
    navigate('/dashboard')
  }
  const handleSignOut = async () => {
    try { await signOut() } catch { /* Clear the local workspace even if the API is temporarily unreachable. */ }
    setUser(null)
    setAnalyses([])
    setResumes([])
    setSelectedAnalysis(null)
    setAuthState('signed-out')
    navigate('/login')
  }
  const openAnalysisDetail = async (id) => {
    try { setSelectedAnalysis((await getAnalysis(id)).analysis) }
    catch (error) { showToast(error.message) }
  }
  const generateArtifact = async (kind) => {
    if (!selectedAnalysis) return
    try {
      if (kind === 'optimization') {
        const { optimization } = await generateResumeOptimization(selectedAnalysis.id)
        setSelectedAnalysis((current) => ({ ...current, resumeOptimization: optimization }))
        showToast('Your resume edits are ready to review.')
      } else {
        const { coverLetter } = await generateCoverLetter(selectedAnalysis.id)
        setSelectedAnalysis((current) => ({ ...current, coverLetter }))
        showToast('Your cover letter draft is ready.')
      }
    } catch (error) { showToast(error.message) }
  }
  const downloadReport = async () => {
    if (!selectedAnalysis) return
    try { await downloadPdf(`/analyses/${selectedAnalysis.id}/report.pdf`, `resumint-${selectedAnalysis.id.slice(-8)}-report.pdf`) }
    catch (error) { showToast(error.message) }
  }
  const downloadCoverLetter = async (letter) => {
    if (!selectedAnalysis) return
    try { await downloadPdf(`/analyses/${selectedAnalysis.id}/cover-letter.pdf`, `resumint-${selectedAnalysis.id.slice(-8)}-cover-letter.pdf`, { letter }) }
    catch (error) { showToast(error.message) }
  }
  const handleCreateAnalysis = async (values) => {
    if (authState !== 'ready') throw new Error('Sign in to analyze and save this resume to your workspace.')
    const { analysis, subscription } = await submitAnalysis(values)
    setAnalyses((current) => [analysis, ...current.filter((item) => item.id !== analysis.id)])
    if (subscription) setUser((current) => ({ ...current, subscription }))
    getResumes().then(({ resumes: records }) => setResumes(records)).catch((error) => showToast(error.message))
    setSelectedAnalysis(analysis)
    setAnalysisOpen(false)
    showToast('Your resume analysis is ready.')
  }
  const updateUser = (updatedUser) => setUser((current) => ({ ...current, ...updatedUser }))

  if (path === '/login' || path === '/register') {
    return <AuthScreen key={path} mode={path.slice(1)} onNavigate={navigate} onAuthenticate={handleAuthenticate} loading={authState === 'checking'} />
  }
  if (!path.startsWith('/dashboard')) return <PublicSite path={path} user={user} theme={theme} onToggleTheme={() => setTheme((current) => current === 'light' ? 'dark' : 'light')} onNavigate={navigate} />
  if (authState === 'checking') return <main className="auth-page auth-loading" aria-label="Loading Resumint"><div className="loading-mark"><Icon name="sparkle" size={22} /></div><span>Opening your workspace…</span></main>
  if (authState !== 'ready') return <main className="auth-page auth-loading"><div className="auth-card"><h1>Sign in to your workspace</h1><p>Dashboard data is available only to your account.</p><button className="button button-primary" type="button" onClick={() => navigate('/login')}>Go to sign in</button></div></main>

  const route = path.replace(/\/$/, '').split('/')[2] || 'overview'
  const routeLabels = { overview: 'Overview', history: 'Analysis history', optimizer: 'Resume optimizer', letters: 'Cover letters', resumes: 'My resumes', settings: 'Settings', plan: 'My plan' }
  return (
    <div className="app-shell">
      <Sidebar activeNav={route} onNavigate={(section) => navigate(section === 'overview' ? '/dashboard' : `/dashboard/${section}`)} onNewAnalysis={openAnalysis} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} theme={theme} onToggleTheme={() => setTheme((current) => current === 'light' ? 'dark' : 'light')} onToast={showToast} user={user} onSignOut={handleSignOut} onSettings={() => navigate('/dashboard/settings')} onPlan={() => navigate('/dashboard/plan')} analysisCount={analyses.length} />
      <main className="main-shell">
        <TopBar onOpenSidebar={() => setSidebarOpen(true)} search={search} onSearch={setSearch} notificationOpen={notificationOpen} onToggleNotifications={() => setNotificationOpen((current) => !current)} onToast={showToast} onNavigate={navigate} user={user} onSignOut={handleSignOut} onSettings={() => navigate('/dashboard/settings')} currentSection={routeLabels[route] || 'Overview'} />
        {selectedAnalysis
          ? <AnalysisDetail analysis={selectedAnalysis} user={user} onBack={() => setSelectedAnalysis(null)} onToast={showToast} onGenerate={generateArtifact} onDownloadReport={downloadReport} onDownloadCoverLetter={downloadCoverLetter} onUpgrade={() => navigate('/dashboard/plan')} />
          : route === 'settings'
            ? <AccountSettings user={user} onUpdated={updateUser} onToast={showToast} />
            : route === 'plan'
              ? <PlanPage user={user} onUpdated={updateUser} onToast={showToast} />
              : <Dashboard route={route} onNavigate={(section) => navigate(section === 'overview' ? '/dashboard' : `/dashboard/${section}`)} onNewAnalysis={openAnalysis} onAnalyze={handleCreateAnalysis} onToast={showToast} search={search} analyses={analyses} resumes={resumes} user={user} onOpenAnalysis={openAnalysisDetail} />}
      </main>
      <AnalysisModal open={analysisOpen} onClose={() => setAnalysisOpen(false)} onSubmit={handleCreateAnalysis} isAuthenticated={authState === 'ready'} />
      {toast && <div className="toast-message" role="status"><span><Icon name="check" size={16} /></span>{toast}</div>}
    </div>
  )
}
