import { Router } from 'express'
import multer from 'multer'
import { getDatabase } from '../config/mongodb.js'
import { HttpError } from '../errors/http-error.js'

const categories = new Set(['account', 'resume-upload', 'analysis', 'billing', 'other'])
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const allowedFiles = new Set(['application/pdf', 'image/png', 'image/jpeg'])

function validFileSignature(file) {
  const bytes = file.buffer
  if (file.mimetype === 'application/pdf') return bytes.subarray(0, 5).toString('ascii') === '%PDF-'
  if (file.mimetype === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  if (file.mimetype === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  return false
}

export function createSupportRouter({ databaseProvider = getDatabase } = {}) {
  const router = Router()
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 5, fieldSize: 6000 },
    fileFilter: (req, file, callback) => {
      if (!allowedFiles.has(file.mimetype)) return callback(new HttpError(415, 'ATTACHMENT_TYPE_INVALID', 'Attachment must be a PDF, PNG, or JPG file.'))
      callback(null, true)
    },
  })
  router.post('/support', upload.single('attachment'), async (req, res) => {
    const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : ''
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    const category = typeof req.body?.category === 'string' ? req.body.category : ''
    const subject = typeof req.body?.subject === 'string' ? req.body.subject.trim() : ''
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : ''
    if (fullName.length < 2 || fullName.length > 100 || !emailPattern.test(email) || email.length > 254 || !categories.has(category) || subject.length < 4 || subject.length > 140 || message.length < 20 || message.length > 5000) {
      throw new HttpError(400, 'INVALID_SUPPORT_REQUEST', 'Complete the name, valid email, issue category, subject, and a message of 20–5,000 characters.')
    }
    let attachment
    if (req.file) {
      if (!validFileSignature(req.file)) throw new HttpError(415, 'ATTACHMENT_INVALID', 'The attachment contents do not match the selected file type.')
      const originalName = req.file.originalname.replace(/[\\/\u0000-\u001f]/g, '').slice(-120) || 'attachment'
      attachment = { filename: originalName, mimeType: req.file.mimetype, size: req.file.size, content: req.file.buffer }
    }
    const database = await databaseProvider(req.app.locals.config)
    const saved = await database.collection('supportTickets').insertOne({ fullName, email, category, subject, message, ...(attachment ? { attachment } : {}), status: 'new', createdAt: new Date() })
    res.status(201).json({ data: { ticketId: String(saved.insertedId), status: 'received', message: 'Your request has been received.' } })
  })
  return router
}
