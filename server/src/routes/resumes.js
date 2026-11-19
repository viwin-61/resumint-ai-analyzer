import { createHash } from 'node:crypto'
import { Router } from 'express'
import multer from 'multer'
import { ObjectId } from 'mongodb'
import { getDatabase } from '../config/mongodb.js'
import { HttpError } from '../errors/http-error.js'
import { createRequireAuth } from '../middleware/require-auth.js'
import { extractPdfText as defaultExtractPdfText } from '../services/pdf-text.js'
import { reserveUsage, releaseUsage } from '../config/plans.js'

function publicResume(record) {
  return { id: String(record._id), name: record.name, createdAt: record.createdAt, updatedAt: record.updatedAt, textLength: record.resumeText?.length || 0 }
}

export function createResumesRouter({ databaseProvider = getDatabase, extractPdfText = defaultExtractPdfText, requireAuth = createRequireAuth(databaseProvider), maxPdfBytes = 4 * 1024 * 1024 } = {}) {
  const router = Router()
  router.use(requireAuth)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxPdfBytes, files: 1, fields: 0 },
    fileFilter: (req, file, callback) => {
      if (!file.originalname.toLowerCase().endsWith('.pdf')) return callback(new HttpError(415, 'PDF_REQUIRED', 'Upload a PDF resume to continue.'))
      callback(null, true)
    },
  })

  router.get('/', async (req, res) => {
    const database = await databaseProvider(req.app.locals.config)
    const resumes = await database.collection('resumes').find({ userId: req.user._id }).sort({ updatedAt: -1 }).limit(100).toArray()
    res.json({ data: { resumes: resumes.map(publicResume) } })
  })

  router.post('/', upload.single('resume'), async (req, res) => {
    if (!req.file) throw new HttpError(400, 'RESUME_REQUIRED', 'Choose a PDF resume to add to your library.')
    if (req.file.buffer.subarray(0, 5).toString('ascii') !== '%PDF-') throw new HttpError(415, 'INVALID_PDF', 'This file is not a valid PDF. Please choose another file.')
    const database = await databaseProvider(req.app.locals.config)
    let reserved = false
    try {
      await reserveUsage(database, req.user, 'uploads')
      reserved = true
      const resumeText = await extractPdfText(req.file.buffer)
      if (resumeText.trim().length < 80) throw new HttpError(422, 'RESUME_TEXT_TOO_SHORT', 'We could not extract enough readable text. Try a text-based PDF.')
      const fingerprint = createHash('sha256').update(resumeText.trim().replace(/\s+/g, ' ').toLowerCase()).digest('hex')
      const now = new Date()
      const record = { userId: req.user._id, name: req.file.originalname.slice(0, 180), resumeText, fingerprint, createdAt: now, updatedAt: now }
      const saved = await database.collection('resumes').insertOne(record)
      record._id = saved.insertedId
      res.status(201).json({ data: { resume: publicResume(record) } })
    } catch (error) {
      if (reserved && error.code !== 'PLAN_LIMIT_REACHED') await releaseUsage(database, req.user, 'uploads').catch(() => undefined)
      throw error
    }
  })

  router.get('/:resumeId', async (req, res) => {
    if (!ObjectId.isValid(req.params.resumeId)) throw new HttpError(404, 'RESUME_NOT_FOUND', 'This resume could not be found.')
    const database = await databaseProvider(req.app.locals.config)
    const resume = await database.collection('resumes').findOne({ _id: new ObjectId(req.params.resumeId), userId: req.user._id })
    if (!resume) throw new HttpError(404, 'RESUME_NOT_FOUND', 'This resume could not be found.')
    res.json({ data: { resume: publicResume(resume) } })
  })
  return router
}
