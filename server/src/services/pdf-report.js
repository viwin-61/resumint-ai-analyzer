import PDFDocument from 'pdfkit'

function safePdfText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[^\x20-\x7E\n\r\t]/g, '?')
}

function addSection(doc, title, items) {
  if (!items?.length) return
  doc.moveDown(0.65).font('Helvetica-Bold').fontSize(12).fillColor('#322c61').text(safePdfText(title))
  doc.moveDown(0.25).font('Helvetica').fontSize(9.5).fillColor('#4a4a5c')
  items.forEach((item) => doc.text(`-  ${safePdfText(item)}`, { indent: 8, paragraphGap: 4, lineGap: 2 }))
}

function createPdfResponse(res, filename, draw) {
  res.status(200)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.setHeader('Cache-Control', 'private, no-store')
  const doc = new PDFDocument({ size: 'A4', margin: 54, info: { Title: 'Resumint career document', Author: 'Resumint' } })
  doc.on('error', () => res.destroy())
  doc.pipe(res)
  draw(doc)
  doc.end()
}

export function sendAnalysisReport(res, analysis) {
  createPdfResponse(res, `resumint-analysis-${String(analysis._id).slice(-8)}.pdf`, (doc) => {
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#7868d1').text('RESUMINT  /  CAREER WORKSPACE')
    doc.moveDown(0.8).fontSize(24).fillColor('#27263a').text('Resume match report')
    doc.moveDown(0.25).font('Helvetica-Bold').fontSize(14).fillColor('#413a73').text(safePdfText(analysis.jobTitle))
    doc.font('Helvetica').fontSize(10).fillColor('#737386').text(`${safePdfText(analysis.company || 'Company not specified')}  |  ${new Date(analysis.createdAt).toLocaleDateString()}`)
    doc.moveDown(1)
    const scoreLine = `Match ${analysis.matchScore}/100     ATS ${analysis.atsScore}/100     Resume strength ${analysis.strengthScore}/100`
    doc.roundedRect(54, doc.y, 487, 43, 9).fill('#f2efff')
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#413a73').text(safePdfText(scoreLine), 68, doc.y + 15, { width: 455 })
    doc.y += 55
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#322c61').text('Summary')
    doc.moveDown(0.3).font('Helvetica').fontSize(9.5).fillColor('#4a4a5c').text(safePdfText(analysis.summary), { lineGap: 3 })
    addSection(doc, 'Skills that align', analysis.matchedSkills)
    addSection(doc, 'Skills to surface', analysis.missingSkills)
    addSection(doc, 'Resume strengths', analysis.strengths)
    addSection(doc, 'Opportunity areas', analysis.skillGaps)
    addSection(doc, 'ATS compatibility', analysis.atsIssues)
    addSection(doc, 'Recommended next steps', analysis.recommendations)
    if (analysis.coverLetter?.letter) {
      doc.addPage().font('Helvetica-Bold').fontSize(10).fillColor('#7868d1').text('RESUMINT  /  GENERATED COVER LETTER')
      doc.moveDown(1).font('Helvetica').fontSize(10).fillColor('#353544').text(safePdfText(analysis.coverLetter.letter), { lineGap: 5 })
    }
    doc.moveDown(1).fontSize(8).fillColor('#9292a1').text('AI-assisted guidance based on the resume and job description you provided. Review for accuracy before using. This report is private to your Resumint account.')
  })
}

export function sendCoverLetterPdf(res, analysis, letter) {
  createPdfResponse(res, `resumint-cover-letter-${String(analysis._id).slice(-8)}.pdf`, (doc) => {
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#7868d1').text('RESUMINT  /  COVER LETTER DRAFT')
    doc.moveDown(1).font('Helvetica-Bold').fontSize(21).fillColor('#27263a').text(safePdfText(analysis.jobTitle))
    doc.moveDown(0.4).font('Helvetica').fontSize(10).fillColor('#737386').text(safePdfText(analysis.company || 'Application'))
    doc.moveDown(1.5).fontSize(10).fillColor('#353544').text(safePdfText(letter), { lineGap: 5 })
    doc.moveDown(2).fontSize(8).fillColor('#9292a1').text('AI-assisted draft. Review all details and personalize before sending.')
  })
}
