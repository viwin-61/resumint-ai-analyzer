import { Router } from 'express'
import { createHash } from 'node:crypto'
import multer from 'multer'
import { ObjectId } from 'mongodb'
import { getDatabase } from '../config/mongodb.js'
import { HttpError } from '../errors/http-error.js'
import { analyzeResume as defaultAnalyzeResume } from '../services/openai-analysis.js'
import { extractPdfText as defaultExtractPdfText } from '../services/pdf-text.js'
import { createRequireAuth } from '../middleware/require-auth.js'
import { optimizeResume as defaultOptimizeResume, generateCoverLetter as defaultGenerateCoverLetter } from '../services/openai-writing.js'
import { sendAnalysisReport, sendCoverLetterPdf } from '../services/pdf-report.js'
import { getPlan, getPlanSnapshot, reserveUsage, releaseUsage } from '../config/plans.js'

function publicAnalysis(record, includeArtifacts = false) {
  const { _id, resumeText, jobDescription, userId, resumeOptimization, coverLetter, ...visible } = record
  if (includeArtifacts) {
    if (resumeOptimization) visible.resumeOptimization = resumeOptimization
    if (coverLetter) visible.coverLetter = coverLetter
  }
  return { ...visible, id: String(_id) }
}

export function createAnalysesRouter({ databaseProvider = getDatabase, analyze = defaultAnalyzeResume, extractPdfText = defaultExtractPdfText, optimize = defaultOptimizeResume, generateLetter = defaultGenerateCoverLetter, requireAuth = createRequireAuth(databaseProvider), maxPdfBytes = 4 * 1024 * 1024 } = {}) {
  const router = Router()
  router.use(requireAuth)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxPdfBytes, files: 1, fields: 3, fieldSize: 20000 },
    fileFilter: (req, file, callback) => {
      if (!file.originalname.toLowerCase().endsWith('.pdf')) {
        callback(new HttpError(415, 'PDF_REQUIRED', 'Upload a PDF file to continue.'))
        return
      }
      callback(null, true)
    },
  })

  router.post('/', upload.single('resume'), async (req, res) => {
    const selectedResumeId = typeof req.body?.resumeId === 'string' ? req.body.resumeId.trim() : ''
    if (!req.file && !selectedResumeId) throw new HttpError(400, 'RESUME_REQUIRED', 'Choose a saved resume or upload a PDF to continue.')
    if (req.file && req.file.buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
      throw new HttpError(415, 'INVALID_PDF', 'This file is not a valid PDF. Please choose another file.')
    }
    const jobTitle = typeof req.body?.jobTitle === 'string' ? req.body.jobTitle.trim() : ''
    const jobDescription = typeof req.body?.jobDescription === 'string' ? req.body.jobDescription.trim() : ''
    const company = typeof req.body?.company === 'string' ? req.body.company.trim().slice(0, 100) : ''
    if (jobTitle.length < 2 || jobTitle.length > 120 || jobDescription.length < 80 || jobDescription.length > 16000) {
      throw new HttpError(400, 'INVALID_JOB_DETAILS', 'Enter a role title and a job description between 80 and 16,000 characters.')
    }

    const config = req.app.locals.config
    const database = await databaseProvider(config)
    let analysesReserved = false
    let uploadsReserved = false
    let resumeStored = false
    try {
      await reserveUsage(database, req.user, 'analyses')
      analysesReserved = true
      let resume
      if (req.file) {
        await reserveUsage(database, req.user, 'uploads')
        uploadsReserved = true
        const resumeText = await extractPdfText(req.file.buffer)
        if (resumeText.trim().length < 80) throw new HttpError(422, 'RESUME_TEXT_TOO_SHORT', 'We could not extract enough readable text. Try a text-based PDF.')
        const fingerprint = createHash('sha256').update(resumeText.trim().replace(/\s+/g, ' ').toLowerCase()).digest('hex')
        const existingResume = await database.collection('resumes').findOne({ userId: req.user._id, fingerprint })
        if (existingResume) {
          resume = existingResume
          await releaseUsage(database, req.user, 'uploads').catch(() => undefined)
          uploadsReserved = false
        } else {
          const savedResume = await database.collection('resumes').insertOne({ userId: req.user._id, name: req.file.originalname.slice(0, 180), resumeText, fingerprint, createdAt: new Date(), updatedAt: new Date() })
          resume = { _id: savedResume.insertedId, name: req.file.originalname.slice(0, 180), resumeText }
          resumeStored = true
        }
      } else {
        if (!ObjectId.isValid(selectedResumeId)) throw new HttpError(404, 'RESUME_NOT_FOUND', 'This resume could not be found.')
        resume = await database.collection('resumes').findOne({ _id: new ObjectId(selectedResumeId), userId: req.user._id })
        if (!resume) throw new HttpError(404, 'RESUME_NOT_FOUND', 'This resume could not be found.')
      }
      const resumeText = resume.resumeText
      const aiResult = await analyze({ config, resumeText, jobTitle, jobDescription })
      const planKey = req.user.subscription?.plan || 'free'
      const result = planKey === 'free' ? {
        ...aiResult,
        matchedSkills: aiResult.matchedSkills.slice(0, 6),
        missingSkills: aiResult.missingSkills.slice(0, 3),
        strengths: aiResult.strengths.slice(0, 3),
        skillGaps: aiResult.skillGaps.slice(0, 3),
        atsIssues: aiResult.atsIssues.slice(0, 3),
        recommendations: aiResult.recommendations.slice(0, 3),
      } : aiResult
      const record = {
        userId: req.user._id,
        resumeId: resume._id,
        createdAt: new Date(),
        jobTitle,
        company,
        resumeName: resume.name,
        analysisTier: planKey,
        resumeText,
        jobDescription,
        ...result,
      }
      await database.collection('resumes').updateOne({ _id: resume._id, userId: req.user._id }, { $set: { updatedAt: new Date() } })
      const updatedUser = await database.collection('users').findOne({ _id: req.user._id })
      const saved = await database.collection('analyses').insertOne(record)
      record._id = saved.insertedId
      res.status(201).json({ data: { analysis: publicAnalysis(record), subscription: getPlanSnapshot(updatedUser || req.user) } })
    } catch (error) {
      if (uploadsReserved && !resumeStored) await releaseUsage(database, req.user, 'uploads').catch(() => undefined)
      if (analysesReserved) await releaseUsage(database, req.user, 'analyses').catch(() => undefined)
      throw error
    }
  })

  router.get('/', async (req, res) => {
    const database = await databaseProvider(req.app.locals.config)
    const plan = getPlan(req.user.subscription?.plan)
    const query = { userId: req.user._id }
    if (Number.isFinite(plan.limits.historyDays)) query.createdAt = { $gte: new Date(Date.now() - plan.limits.historyDays * 24 * 60 * 60 * 1000) }
    const cursor = database.collection('analyses').find(query).sort({ createdAt: -1 })
    const records = await (Number.isFinite(plan.limits.historyCount) ? cursor.limit(plan.limits.historyCount) : cursor).toArray()
    res.json({ data: { analyses: records.map((record) => publicAnalysis(record, true)) } })
  })

  router.post('/:analysisId/optimize', async (req, res) => {
    if (!ObjectId.isValid(req.params.analysisId)) throw new HttpError(404, 'ANALYSIS_NOT_FOUND', 'This analysis could not be found.')
    const database = await databaseProvider(req.app.locals.config)
    const collection = database.collection('analyses')
    const record = await collection.findOne({ _id: new ObjectId(req.params.analysisId), userId: req.user._id })
    if (!record) throw new HttpError(404, 'ANALYSIS_NOT_FOUND', 'This analysis could not be found.')
    const reserved = await reserveUsage(database, req.user, 'optimizations')
    try {
      const optimization = await optimize({ config: req.app.locals.config, resumeText: record.resumeText, jobTitle: record.jobTitle, jobDescription: record.jobDescription, analysis: record })
      const generated = { ...optimization, generatedAt: new Date() }
      await collection.updateOne({ _id: record._id, userId: req.user._id }, { $set: { resumeOptimization: generated } })
      res.json({ data: { optimization: generated } })
    } catch (error) { if (reserved.reserved) await releaseUsage(database, req.user, 'optimizations').catch(() => undefined); throw error }
  })

  router.post('/:analysisId/cover-letter', async (req, res) => {
    if (!ObjectId.isValid(req.params.analysisId)) throw new HttpError(404, 'ANALYSIS_NOT_FOUND', 'This analysis could not be found.')
    const database = await databaseProvider(req.app.locals.config)
    const collection = database.collection('analyses')
    const record = await collection.findOne({ _id: new ObjectId(req.params.analysisId), userId: req.user._id })
    if (!record) throw new HttpError(404, 'ANALYSIS_NOT_FOUND', 'This analysis could not be found.')
    const reserved = await reserveUsage(database, req.user, 'coverLetters')
    try {
      const generated = await generateLetter({ config: req.app.locals.config, resumeText: record.resumeText, jobTitle: record.jobTitle, company: record.company, jobDescription: record.jobDescription, analysis: record })
      const coverLetter = { ...generated, generatedAt: new Date() }
      await collection.updateOne({ _id: record._id, userId: req.user._id }, { $set: { coverLetter } })
      res.json({ data: { coverLetter } })
    } catch (error) { if (reserved.reserved) await releaseUsage(database, req.user, 'coverLetters').catch(() => undefined); throw error }
  })

  router.get('/:analysisId/report.pdf', async (req, res) => {
    if (!ObjectId.isValid(req.params.analysisId)) throw new HttpError(404, 'ANALYSIS_NOT_FOUND', 'This analysis could not be found.')
    const database = await databaseProvider(req.app.locals.config)
    const record = await database.collection('analyses').findOne({ _id: new ObjectId(req.params.analysisId), userId: req.user._id })
    if (!record) throw new HttpError(404, 'ANALYSIS_NOT_FOUND', 'This analysis could not be found.')
    const reserved = await reserveUsage(database, req.user, 'pdfReports')
    try { sendAnalysisReport(res, record) }
    catch (error) { if (reserved.reserved) await releaseUsage(database, req.user, 'pdfReports').catch(() => undefined); throw error }
  })

  router.post('/:analysisId/cover-letter.pdf', async (req, res) => {
    if (!ObjectId.isValid(req.params.analysisId)) throw new HttpError(404, 'ANALYSIS_NOT_FOUND', 'This analysis could not be found.')
    const database = await databaseProvider(req.app.locals.config)
    const record = await database.collection('analyses').findOne({ _id: new ObjectId(req.params.analysisId), userId: req.user._id })
    if (!record) throw new HttpError(404, 'ANALYSIS_NOT_FOUND', 'This analysis could not be found.')
    if (!record.coverLetter?.letter) throw new HttpError(409, 'COVER_LETTER_NOT_READY', 'Generate a cover letter before downloading it.')
    const letter = typeof req.body?.letter === 'string' ? req.body.letter.trim() : record.coverLetter.letter
    if (letter.length < 300 || letter.length > 6000) throw new HttpError(400, 'INVALID_COVER_LETTER', 'The cover letter must be between 300 and 6,000 characters.')
    const reserved = await reserveUsage(database, req.user, 'pdfReports')
    try { sendCoverLetterPdf(res, record, letter) }
    catch (error) { if (reserved.reserved) await releaseUsage(database, req.user, 'pdfReports').catch(() => undefined); throw error }
  })

  router.get('/:analysisId', async (req, res) => {
    if (!ObjectId.isValid(req.params.analysisId)) throw new HttpError(404, 'ANALYSIS_NOT_FOUND', 'This analysis could not be found.')
    const database = await databaseProvider(req.app.locals.config)
    const record = await database.collection('analyses').findOne({ _id: new ObjectId(req.params.analysisId), userId: req.user._id })
    if (!record) throw new HttpError(404, 'ANALYSIS_NOT_FOUND', 'This analysis could not be found.')
    res.json({ data: { analysis: publicAnalysis(record, true) } })
  })

  return router
}
