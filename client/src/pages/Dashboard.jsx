import { useRef, useState } from 'react'
import { Icon } from '../components/Icon.jsx'
import { ScoreRing } from '../components/ScoreRing.jsx'

const sampleAnalysis = {
  matchScore: 86,
  atsScore: 91,
  matchedSkills: ['Product design', 'User research', 'Prototyping', 'Accessibility'],
  missingSkills: ['SQL', 'Experiment design'],
  suggestions: ['Add a measurable outcome to one project bullet.', 'Use a clear Skills heading and consistent date format.', 'Mention collaboration with engineering where it reflects your work.'],
}

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function AnalysisRows({ analyses, onOpenAnalysis, emptyMessage, search }) {
  const filtered = search ? analyses.filter((item) => `${item.jobTitle} ${item.company || ''}`.toLowerCase().includes(search.toLowerCase())) : analyses
  return <div className="analysis-list">{filtered.map((item) => <button className="analysis-list-row" key={item.id} type="button" onClick={() => onOpenAnalysis(item.id)}>
    <span className="analysis-list-icon"><Icon name="file" size={18} /></span><span className="analysis-list-title"><strong>{item.jobTitle}</strong><small>{item.company || 'Company not specified'} · {item.resumeName}</small></span><span className="analysis-list-score">{item.matchScore}<small>% match</small></span><span className="analysis-list-date">{formatDate(item.createdAt)}</span><Icon name="chevron" size={16} />
  </button>)}{filtered.length === 0 && <div className="analysis-empty"><span className="empty-icon"><Icon name="file" size={20} /></span><strong>{search ? 'No matching analyses' : 'Your workspace is ready'}</strong><p>{search ? 'Try a different role or company name.' : emptyMessage}</p></div>}</div>
}

function SamplePanel({ onToast }) {
  const [showSample, setShowSample] = useState(false)
  return <section className="sample-resume-panel panel" aria-labelledby="sample-heading">
    <div className="sample-resume-top"><div><span className="eyebrow">A SAFE PLACE TO EXPLORE</span><h2 id="sample-heading">Sample ATS resume</h2><p>Try the workflow using a fictional product designer resume. Sample results never enter your account history or usage.</p></div><span className="sample-badge">EXAMPLE ONLY</span></div>
    <div className="sample-actions"><a className="button button-ghost" href="/sample-ats-resume.pdf" target="_blank" rel="noreferrer"><Icon name="file" size={16} /> View sample resume</a><button className="button button-primary" type="button" onClick={() => { setShowSample((value) => !value); onToast('This is a prewritten sample result, separate from your account data.') }}><Icon name="sparkle" size={16} /> {showSample ? 'Hide sample analysis' : 'Try sample resume'}</button></div>
    {showSample && <div className="sample-result" aria-label="Sample analysis results"><div className="sample-result-heading"><span><Icon name="sparkle" size={16} /> Sample Analysis</span><a href="/sample-ats-resume.pdf" target="_blank" rel="noreferrer">View source PDF <Icon name="arrowUp" size={13} /></a></div><div className="sample-score-row"><div className="sample-score"><strong>{sampleAnalysis.atsScore}</strong><small>Sample ATS score</small></div><div className="sample-score"><strong>{sampleAnalysis.matchScore}%</strong><small>Example match score</small></div></div><div className="sample-skills-grid"><div><strong>Matched skills</strong><div className="skill-chip-list">{sampleAnalysis.matchedSkills.map((skill) => <span className="skill-chip skill-chip-good" key={skill}><Icon name="check" size={12} />{skill}</span>)}</div></div><div><strong>Missing skills</strong><div className="skill-chip-list">{sampleAnalysis.missingSkills.map((skill) => <span className="skill-chip skill-chip-missing" key={skill}>{skill}</span>)}</div></div></div><div className="sample-suggestions"><strong>Example improvement suggestions</strong><ol>{sampleAnalysis.suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}</ol></div></div>}
  </section>
}

function QuickAnalysis({ onAnalyze, resumes = [] }) {
  const fileInput = useRef(null)
  const [file, setFile] = useState(null)
  const [resumeId, setResumeId] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [company, setCompany] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const acceptFile = (candidate) => {
    if (!candidate) return
    if (candidate.type !== 'application/pdf' && !candidate.name.toLowerCase().endsWith('.pdf')) { setError('Choose a PDF resume.'); return }
    if (candidate.size > 4 * 1024 * 1024) { setError('Choose a PDF smaller than 4 MB.'); return }
    setError(''); setFile(candidate); setResumeId('')
  }
  const submit = async (event) => {
    event.preventDefault(); setError('')
    if (!file && !resumeId) { setError('Choose a saved resume or upload a PDF to continue.'); return }
    if (jobTitle.trim().length < 2 || jobDescription.trim().length < 80) { setError('Add the role title and a job description with at least 80 characters.'); return }
    setSubmitting(true)
    try { await onAnalyze({ file, resumeId, jobTitle: jobTitle.trim(), company: company.trim(), jobDescription: jobDescription.trim() }) }
    catch (requestError) { setError(requestError.message) }
    finally { setSubmitting(false) }
  }
  return <section className="quick-analysis panel"><div className="quick-analysis-heading"><span className="quick-analysis-icon"><Icon name="sparkle" size={19} /></span><div><span className="eyebrow">START WITH THE ROLE YOU WANT</span><h2>Analyze a resume</h2><p>Choose a saved resume or upload a PDF, then share the job description for an account-scoped AI review.</p></div></div>
    {resumes.length > 0 && <label className="form-field quick-saved-resume"><span>Saved resume</span><select value={resumeId} onChange={(event) => { setResumeId(event.target.value); setFile(null); setError('') }}><option value="">Upload a new resume instead</option>{resumes.map((resume) => <option value={resume.id} key={resume.id}>{resume.name}</option>)}</select></label>}
    <form onSubmit={submit}>
      <div className="quick-analysis-fields"><div className="quick-analysis-resume"><input ref={fileInput} type="file" className="visually-hidden" accept="application/pdf,.pdf" aria-label="Choose resume PDF" onChange={(event) => acceptFile(event.target.files?.[0])} /><button className={`quick-upload ${file ? 'has-file' : ''}`} type="button" onClick={() => { setResumeId(''); fileInput.current?.click() }}><span><Icon name={file ? 'check' : 'upload'} size={17} /></span><span><strong>{file ? file.name : resumeId ? 'Saved resume selected' : 'Upload resume PDF'}</strong><small>{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB · PDF` : resumeId ? 'Choose a different file to replace' : 'PDF · up to 4 MB'}</small></span><Icon name="chevron" size={16} /></button></div>
        <label className="form-field"><span>Job title</span><input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} placeholder="e.g. Product Designer" maxLength={120} /></label><label className="form-field"><span>Company <small>(optional)</small></span><input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Company name" maxLength={100} /></label></div>
      <label className="form-field quick-description"><span>Job description</span><textarea value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} placeholder="Paste the job description here…" maxLength={16000} rows={5} /><small>{jobDescription.length}/16,000 characters · minimum 80</small></label>
      {error && <div className="form-error" role="alert"><Icon name="help" size={16} />{error}</div>}
      <div className="quick-analysis-footer"><span><Icon name="shield" size={15} /> Your PDF is discarded after text extraction.</span><button className="button button-primary" type="submit" disabled={submitting}>{submitting ? 'Analyzing…' : 'Analyze resume'} <Icon name="arrowUp" size={15} /></button></div>
    </form>
  </section>
}

export function Dashboard({ route = 'overview', onNavigate, onNewAnalysis, onAnalyze, onToast, search = '', analyses = [], resumes = [], user, onOpenAnalysis }) {
  const averageMatch = analyses.length ? Math.round(analyses.reduce((sum, item) => sum + item.matchScore, 0) / analyses.length) : 0
  const atsReady = analyses.filter((item) => item.atsScore >= 75).length
  const name = (user?.fullName || user?.name || '').trim()
  const firstName = name.split(/\s+/)[0]
  const heading = route === 'history' ? 'Analysis history' : route === 'resumes' ? 'My resumes' : route === 'optimizer' ? 'Resume optimizer' : route === 'letters' ? 'Cover letters' : 'Overview'
  // These pages are entry points into generation, so show every analysis the
  // user can open even before they have created their first artifact.
  const relevant = analyses

  return <div className="dashboard-content">
    <div className="page-intro"><div><div className="intro-kicker"><span className="live-dot" /> YOUR CAREER, IN FOCUS</div><h1>{route === 'overview' ? `Welcome, ${name || 'there'}!` : heading}</h1><p>{route === 'overview' ? 'Bring a resume and a role together for a more focused next step.' : 'Explore your saved, account-specific career work.'}</p></div>{route !== 'overview' && <button className="button button-primary intro-action" type="button" onClick={onNewAnalysis}><Icon name="plus" size={17} /> New analysis</button>}</div>

    {route === 'overview' && <>
      <section className="metric-grid account-metric-grid" aria-label="Your analysis statistics">
        <article className="metric-card"><div className="metric-icon metric-icon-violet"><Icon name="file" size={18} /></div><div className="metric-meta"><span>Applications analyzed</span><strong>{analyses.length}</strong></div></article>
        <article className="metric-card"><div className="metric-icon metric-icon-blue"><Icon name="target" size={18} /></div><div className="metric-meta"><span>Average match score</span><strong>{averageMatch}<span className="metric-percent">%</span></strong></div></article>
        <article className="metric-card"><div className="metric-icon metric-icon-green"><Icon name="shield" size={18} /></div><div className="metric-meta"><span>ATS ready</span><strong>{atsReady}</strong></div></article>
      </section>
      <QuickAnalysis onAnalyze={onAnalyze} resumes={resumes} />
      <section className="panel recent-card account-recent"><div className="panel-heading recent-heading"><div><span className="eyebrow">YOUR PRIVATE WORKSPACE</span><h2>Recent analysis <span className="heading-count">{analyses.length}</span></h2></div><button className="text-link all-analyses" type="button" onClick={() => onNavigate('history')}>View history <Icon name="chevron" size={15} /></button></div><AnalysisRows analyses={analyses.slice(0, 5)} onOpenAnalysis={onOpenAnalysis} search={search} emptyMessage="Your real analysis results will appear here after your first resume review." /></section>
      <SamplePanel onToast={onToast} />
    </>}

    {route === 'history' && <section className="panel route-content-panel"><div className="panel-heading"><div><span className="eyebrow">ACCOUNT HISTORY</span><h2>Saved analyses <span className="heading-count">{analyses.length}</span></h2></div></div><AnalysisRows analyses={analyses} onOpenAnalysis={onOpenAnalysis} search={search} emptyMessage="Analyze a resume to build your private history." /></section>}

    {route === 'resumes' && <section className="panel route-content-panel"><div className="panel-heading"><div><span className="eyebrow">YOUR RESUME LIBRARY</span><h2>Saved resume text</h2></div><button className="button button-primary" type="button" onClick={onNavigate.bind(null, 'overview')}><Icon name="plus" size={16} /> Analyze a resume</button></div><p className="route-note">The original PDF is discarded after extraction. Your private resume text is retained so you can analyze it against more than one role.</p><div className="analysis-list">{resumes.map((resume) => <div className="analysis-list-row resume-library-row" key={resume.id}><span className="analysis-list-icon"><Icon name="file" size={18} /></span><span className="analysis-list-title"><strong>{resume.name}</strong><small>Added {formatDate(resume.createdAt)} · {resume.textLength.toLocaleString()} extracted characters</small></span><span className="analysis-list-date">Updated {formatDate(resume.updatedAt)}</span><Icon name="shield" size={15} /></div>)}{resumes.length === 0 && <div className="analysis-empty"><strong>No resumes yet</strong><p>Upload a PDF when you start an analysis.</p></div>}</div></section>}

    {(route === 'optimizer' || route === 'letters') && <section className="panel route-content-panel"><div className="panel-heading"><div><span className="eyebrow">{route === 'optimizer' ? 'AI RESUME OPTIMIZER' : 'AI COVER LETTERS'}</span><h2>{route === 'optimizer' ? 'Resume optimization' : 'Generated cover letters'}</h2></div></div><p className="route-note">{route === 'optimizer' ? 'Open an analysis to generate role-specific suggestions. Resumint keeps suggestions grounded in the resume you provided.' : 'Open an analysis to draft and edit a cover letter for that role.'}</p><AnalysisRows analyses={relevant} onOpenAnalysis={onOpenAnalysis} search={search} emptyMessage={route === 'optimizer' ? 'No resume optimizations are saved yet. Open a real analysis to generate suggestions.' : 'No cover letters are saved yet. Open a real analysis to generate a draft.'} /></section>}
  </div>
}
