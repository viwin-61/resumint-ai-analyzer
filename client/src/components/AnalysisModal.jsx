import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon.jsx'

export function AnalysisModal({ open, onClose, onSubmit, isAuthenticated }) {
  const [file, setFile] = useState(null)
  const [jobTitle, setJobTitle] = useState('')
  const [company, setCompany] = useState('')
  const [description, setDescription] = useState('')
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKeyDown)
    document.body.classList.add('modal-open')
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.classList.remove('modal-open')
    }
  }, [open, onClose])

  if (!open) return null

  const acceptFile = (candidate) => {
    if (!candidate) return
    if (candidate.type !== 'application/pdf' && !candidate.name.toLowerCase().endsWith('.pdf')) {
      setError('Please choose a PDF file to continue.')
      return
    }
    if (candidate.size > 4 * 1024 * 1024) {
      setError('This file is a little too large. Please choose a PDF under 4 MB.')
      return
    }
    setError('')
    setFile(candidate)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!file) {
      setError('Add your resume PDF to continue.')
      return
    }
    if (jobTitle.trim().length < 2 || description.trim().length < 80) {
      setError('Add the role title and a job description with at least 80 characters.')
      return
    }
    if (!isAuthenticated) {
      setError('Sign in to upload and analyze your resume in your private workspace.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await onSubmit({ file, jobTitle: jobTitle.trim(), company: company.trim(), jobDescription: description.trim() })
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="analysis-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-heading">
          <div className="modal-heading-icon"><Icon name="sparkle" size={19} /></div>
          <button className="icon-button modal-close" type="button" onClick={onClose} aria-label="Close dialog"><Icon name="close" /></button>
          <span className="eyebrow">A NEW OPPORTUNITY</span>
          <h2 id="modal-title">Let’s find your fit.</h2>
          <p>Share your resume and the role you have in mind. We’ll take it from there.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-section-label"><span>01</span><div><strong>Your resume</strong><small>PDF format · up to 4 MB</small></div></div>
          <input ref={inputRef} className="visually-hidden" type="file" accept="application/pdf,.pdf" onChange={(event) => acceptFile(event.target.files?.[0])} aria-label="Upload your resume PDF" />
          <button
            type="button"
            className={`upload-zone ${dragging ? 'is-dragging' : ''} ${file ? 'has-file' : ''}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => { event.preventDefault(); setDragging(false); acceptFile(event.dataTransfer.files?.[0]) }}
          >
            <span className="upload-zone-icon"><Icon name={file ? 'check' : 'upload'} size={19} /></span>
            <span className="upload-zone-copy"><strong>{file ? file.name : 'Drop your resume here'}</strong><small>{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB · Ready to analyze` : <>or <u>browse files</u> on your device</>}</small></span>
            <span className="upload-format">PDF</span>
          </button>

          <div className="form-section-label job-label"><span>02</span><div><strong>The opportunity</strong><small>Tell us a little about the role</small></div></div>
          <label className="form-field"><span>Job title</span><input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} placeholder="e.g. Product Designer" maxLength={120} /></label>
          <label className="form-field"><span>Company <small>(optional)</small></span><input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="e.g. Northstar Studio" maxLength={100} /></label>
          <label className="form-field"><span>Job description</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Paste the job description here…" rows={4} maxLength={16000} /></label>
          {error && <div className="form-error" role="alert"><Icon name="help" size={16} /> {error}</div>}
          <div className="modal-footer-note"><Icon name="shield" size={15} /> Extracted text goes to OpenAI for analysis. The PDF is discarded; text stays with your private result.</div>
          <div className="modal-actions"><button className="button button-ghost" type="button" onClick={onClose} disabled={submitting}>Maybe later</button><button className="button button-primary" type="submit" disabled={submitting}>{submitting ? <><span className="button-spinner" /> Analyzing…</> : <>Analyze my resume <Icon name="arrowUp" size={15} /></>}</button></div>
        </form>
      </section>
    </div>
  )
}
