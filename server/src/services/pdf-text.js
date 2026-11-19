import { PDFParse } from 'pdf-parse'
import { HttpError } from '../errors/http-error.js'

export async function extractPdfText(buffer) {
  let parser
  try {
    parser = new PDFParse({ data: new Uint8Array(buffer) })
    const result = await parser.getText()
    const text = String(result?.text || '').replace(/\u0000/g, '').replace(/[ \t]+/g, ' ').trim()
    if (text.length < 80) {
      throw new HttpError(422, 'PDF_HAS_NO_TEXT', 'This PDF does not contain enough selectable text. Try an exported or OCR-processed resume PDF.')
    }
    return text.slice(0, 30000)
  } catch (error) {
    if (error instanceof HttpError) throw error
    throw new HttpError(422, 'PDF_PARSE_FAILED', 'We could not read this PDF. Please upload a valid, text-based resume PDF.')
  } finally {
    await parser?.destroy().catch(() => undefined)
  }
}
