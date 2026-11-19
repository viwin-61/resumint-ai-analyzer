import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import PDFDocument from 'pdfkit'

const here = path.dirname(fileURLToPath(import.meta.url))
const output = path.resolve(here, '../../../client/public/sample-ats-resume.pdf')
fs.mkdirSync(path.dirname(output), { recursive: true })

const document = new PDFDocument({ size: 'LETTER', margins: { top: 54, right: 58, bottom: 54, left: 58 }, info: { Title: 'Resumint fictional ATS resume sample', Author: 'Resumint' } })
document.pipe(fs.createWriteStream(output))
document.fillColor('#272536').font('Helvetica-Bold').fontSize(21).text('JORDAN LEE')
document.moveDown(0.25).font('Helvetica').fontSize(9).fillColor('#565365').text('Product Designer  |  jordan.lee@example.test  |  portfolio.example.test  |  Bengaluru, India')
document.moveDown(0.55).moveTo(58, document.y).lineTo(554, document.y).lineWidth(1).strokeColor('#8b78e8').stroke()

const section = (heading, body) => {
  document.moveDown(0.8).font('Helvetica-Bold').fontSize(10).fillColor('#5f50b5').text(heading.toUpperCase(), { characterSpacing: 1 })
  document.moveDown(0.24).font('Helvetica').fontSize(9).fillColor('#373544').text(body, { lineGap: 3, paragraphGap: 4 })
}

section('Professional Summary', 'Product designer with 6 years of experience shaping accessible digital products from research through launch. Skilled in user research, interaction design, prototyping, design systems, usability testing, and cross-functional delivery. Known for translating complex workflows into clear experiences and measuring the outcomes of product decisions.')
section('Experience', 'Senior Product Designer | Northstar Health | 2022–Present\n• Led research and interaction design for a patient onboarding redesign used by 40,000 monthly users.\n• Partnered with product and engineering to simplify account setup, reducing support requests by 22%.\n• Built reusable Figma components and accessibility guidance adopted by four product teams.\n\nProduct Designer | Fieldnote Software | 2019–2022\n• Planned 18 moderated interviews and usability sessions to identify friction across a reporting workflow.\n• Redesigned dashboard navigation and prototyped new information architecture with engineering partners.\n• Improved task completion by 17% in follow-up usability testing.')
section('Selected Project', 'Accessible Insights Dashboard | Northstar Health\nDefined product requirements with analytics and customer success, mapped workflows, created tested prototypes, and delivered an accessible component library. Used product analytics and customer feedback to prioritize follow-up improvements.')
section('Skills', 'Product design, user research, interaction design, prototyping, usability testing, Figma, design systems, WCAG accessibility, information architecture, product analytics, SQL fundamentals, agile collaboration, presentation, written communication')
section('Education', 'Bachelor of Design, Interaction Design | Srishti Institute of Art, Design and Technology | 2019')
document.moveDown(0.8).font('Helvetica-Oblique').fontSize(7.5).fillColor('#777486').text('Fictional resume created for Resumint product demonstrations. All people, organizations, and contact details are invented.', { align: 'center' })
document.end()
