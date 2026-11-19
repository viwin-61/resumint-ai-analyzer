import { useEffect, useState } from 'react'
import { Icon } from './Icon.jsx'
import { ScoreRing } from './ScoreRing.jsx'

const sections = [
  ['matchedSkills', 'Skills that align', 'is-positive'],
  ['missingSkills', 'Skills to surface', 'is-neutral'],
  ['strengths', 'Resume strengths', 'is-positive'],
  ['skillGaps', 'Opportunity areas', 'is-neutral'],
  ['atsIssues', 'ATS compatibility', 'is-warning'],
  ['recommendations', 'Recommended next steps', 'is-recommendation'],
]

function ScoreCard({ label, score, accent }) {
  return <article className="result-score-card"><span className={`result-score-icon ${accent}`}><Icon name={accent === 'score-green' ? 'shield' : accent === 'score-blue' ? 'target' : 'sparkle'} size={17} /></span><span>{label}</span><strong>{score}<small>/100</small></strong><div className="result-track"><span style={{ width: `${score}%` }} /></div></article>
}

export function AnalysisDetail({ analysis, user, onBack, onToast, onGenerate, onDownloadReport, onDownloadCoverLetter, onUpgrade }) {
  const [busy, setBusy] = useState('')
  const [letterDraft, setLetterDraft] = useState(analysis.coverLetter?.letter || '')
  useEffect(() => setLetterDraft(analysis.coverLetter?.letter || ''), [analysis.id, analysis.coverLetter?.letter])
  const isFreePlan = (user?.subscription?.plan || 'free') === 'free'
  const date = new Date(analysis.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
  const generate = async (kind) => {
    setBusy(kind)
    try { await onGenerate(kind) } finally { setBusy('') }
  }
  return (
    <div className="dashboard-content analysis-detail">
      <button type="button" className="detail-back" onClick={onBack}><Icon name="chevron" size={15} /> Back to workspace</button>
      <div className="detail-title-row"><div><div className="intro-kicker"><span className="live-dot" /> RESUME ANALYSIS</div><h1>{analysis.jobTitle}</h1><p>{analysis.company || 'Company not specified'} <span>·</span> {date}</p></div><button type="button" className="button button-ghost" onClick={isFreePlan ? onUpgrade : onDownloadReport}><Icon name={isFreePlan ? 'arrowUp' : 'download'} size={15} /> {isFreePlan ? 'Upgrade for PDF report' : 'Download report'}</button></div>
      <section className="result-hero panel">
        <div className="result-ring-wrap"><ScoreRing score={analysis.matchScore} size={132} /><span>OVERALL MATCH</span></div>
        <div className="result-summary"><span className="eyebrow">YOUR MATCH, IN CONTEXT</span><h2>{analysis.matchScore >= 80 ? 'A strong foundation for this role.' : analysis.matchScore >= 65 ? 'A promising match with room to grow.' : 'A stretch role with useful signals.'}</h2><p>{analysis.summary}</p><div className="result-meta"><span><Icon name="file" size={14} /> {analysis.resumeName}</span><span><Icon name="sparkle" size={14} /> AI assisted review</span></div></div>
      </section>
      <div className="result-score-grid"><ScoreCard label="ATS compatibility" score={analysis.atsScore} accent="score-green" /><ScoreCard label="Resume strength" score={analysis.strengthScore} accent="score-blue" /><ScoreCard label="Role alignment" score={analysis.matchScore} accent="score-violet" /></div>
      <section className="panel artifact-panel">
        <div className="panel-heading"><div><span className="eyebrow">MAKE THIS MATCH EVEN STRONGER</span><h2>Resume edits & cover letter</h2></div><span className="artifact-private"><Icon name="shield" size={14} /> Private</span></div>
        <p className="artifact-intro">Create role-specific suggestions using your resume and this job description. Review each change for accuracy before using it.</p>
        <div className="artifact-actions"><button type="button" className="button button-primary" onClick={() => generate('optimization')} disabled={!!busy}>{busy === 'optimization' ? <><span className="button-spinner" /> Writing edits…</> : <><Icon name="sparkle" size={15} /> {analysis.resumeOptimization ? 'Refresh resume edits' : 'Optimize my resume'}</>}</button><button type="button" className="button button-ghost" onClick={isFreePlan ? onUpgrade : () => generate('cover-letter')} disabled={!!busy}>{busy === 'cover-letter' ? <><span className="button-spinner artifact-spinner" /> Drafting…</> : <><Icon name={isFreePlan ? 'arrowUp' : 'mail'} size={15} /> {isFreePlan ? 'Upgrade for cover letters' : analysis.coverLetter ? 'Regenerate cover letter' : 'Generate cover letter'}</>}</button></div>
      </section>
      {analysis.resumeOptimization && <section className="panel artifact-result">
        <div className="panel-heading"><div><span className="eyebrow">TAILORED TO {analysis.jobTitle.toUpperCase()}</span><h2>Suggested resume edits</h2></div><span className="artifact-date">Generated {new Date(analysis.resumeOptimization.generatedAt).toLocaleDateString()}</span></div>
        <div className="optimization-highlight"><span>HEADLINE</span><strong>{analysis.resumeOptimization.headline}</strong><p>{analysis.resumeOptimization.professionalSummary}</p></div>
        {analysis.resumeOptimization.bulletRewrites?.length > 0 && <div className="rewrite-list">{analysis.resumeOptimization.bulletRewrites.map((bullet, index) => <article className="rewrite-item" key={`${bullet.section}-${index}`}><span className="rewrite-section">{bullet.section}</span><div><small>YOUR ORIGINAL</small><p>{bullet.before}</p></div><div><small>SUGGESTED</small><p>{bullet.after}</p></div><div className="rewrite-reason"><Icon name="sparkle" size={14} />{bullet.reason}</div></article>)}</div>}
        {analysis.resumeOptimization.keywordsToConsider?.length > 0 && <div className="keyword-row"><span>KEYWORDS TO CONSIDER</span><div>{analysis.resumeOptimization.keywordsToConsider.map((keyword) => <span className="keyword-chip" key={keyword}>{keyword}</span>)}</div></div>}
        {analysis.resumeOptimization.accuracyNotes?.length > 0 && <div className="accuracy-note"><Icon name="help" size={15} /><div><strong>Check these details</strong>{analysis.resumeOptimization.accuracyNotes.map((note, index) => <p key={index}>{note}</p>)}</div></div>}
      </section>}
      {analysis.coverLetter && <section className="panel cover-letter-panel">
        <div className="panel-heading"><div><span className="eyebrow">A FIRST DRAFT, IN YOUR VOICE</span><h2>Cover letter</h2></div><button type="button" className="button button-ghost cover-download" onClick={isFreePlan ? onUpgrade : () => onDownloadCoverLetter(letterDraft)}><Icon name={isFreePlan ? 'arrowUp' : 'download'} size={14} /> {isFreePlan ? 'Upgrade to download' : 'Download PDF'}</button></div>
        <p className="artifact-intro">Edit this draft to make it sound like you. The PDF download includes your edits.</p>
        <label className="cover-letter-editor"><span className="visually-hidden">Edit cover letter</span><textarea value={letterDraft} onChange={(event) => setLetterDraft(event.target.value)} rows={12} maxLength={6000} /></label>
        <div className="letter-length">{letterDraft.length.toLocaleString()} / 6,000 characters · Review every detail before sending.</div>
      </section>}
      <div className="result-content-grid">
        {sections.map(([key, title, variant]) => (
          <section className={`panel result-list-panel ${variant}`} key={key}>
            <div className="panel-heading"><div><span className="eyebrow">{key === 'recommendations' ? 'MAKE YOUR NEXT EDIT COUNT' : 'FROM YOUR RESUME AND THIS ROLE'}</span><h2>{title}</h2></div><span className="result-count">{analysis[key]?.length || 0}</span></div>
            {analysis[key]?.length ? <ul>{analysis[key].map((item, index) => <li key={`${key}-${index}`}><span className="result-bullet"><Icon name={variant === 'is-positive' ? 'check' : 'chevron'} size={14} /></span>{item}</li>)}</ul> : <p className="result-empty">No gaps surfaced in this area.</p>}
          </section>
        ))}
      </div>
      <div className="detail-footer-note"><Icon name="shield" size={16} /> This analysis is private to your workspace. AI suggestions are a starting point; review them for accuracy before applying.</div>
    </div>
  )
}
