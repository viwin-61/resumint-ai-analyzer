# Resumint — AI Resume Analyzer

Resumint is a private career workspace for comparing a resume with a role, understanding ATS compatibility, and preparing application materials. The existing pnpm workspace uses React/Vite/Tailwind for the client and a separate Express API that is also exposed through a Netlify Function.

**Tagline:** Your Resume. Smarter. Your Career. Stronger.

## Current implementation

- Public Home, About, Services, and Support pages with a responsive four-column footer, pricing section, legal pages, and light/dark theme.
- Username/email authentication, scrypt password hashing, HttpOnly sessions, profile updates, and protected account routes.
- Account dashboard with exactly three account metrics, PDF/job-description intake, real saved analyses, history, resume references, AI optimization and cover-letter entry points, and a separate fictional sample ATS resume/result.
- OpenAI structured resume analysis and writing workflows; PDF extraction and downloadable analysis/letter reports.
- Free, Basic, and Premium plan definitions; monthly usage counters and API-side quota checks; plan requests are recorded for future billing integration.
- Support request API with field validation and optional PDF/PNG/JPEG attachment storage in MongoDB.
- Centralized API errors, request IDs, Helmet headers, origin checks, MongoDB indexes, and Netlify SPA/API routing.

The account features require MongoDB Atlas, `OPENAI_API_KEY`, and `SESSION_SECRET`. Paid plans are not charged or activated because no payment gateway is connected. Forgot-password requests currently direct users to Support; an email delivery/reset-token service is not configured. Legal pages contain launch placeholders and need jurisdiction-specific review.

## Architecture

```text
client/                           React + Vite + Tailwind application
  src/components/                 shared brand, navigation, auth, upload, and result UI
  src/pages/                      dashboard, profile, and plan pages
  src/lib/api.js                  credentialed API client
server/                           Express 5 API workspace
  src/config/                     validated environment, MongoDB, plan limits
  src/middleware/                 auth, request IDs, and centralized errors
  src/routes/                     auth, analysis, plan, support, and health APIs
  src/services/                   sessions, PDF parsing/reports, OpenAI workflows
  src/scripts/                    sample PDF generator and guarded demo-account seed
  test/                            API and document workflow tests
netlify/functions/api.mjs          shared Express app adapter
e2e/                               Playwright browser flows
netlify.toml                       Netlify build, function, SPA routing, and headers
```

## Requirements

- Node.js 22.12 or newer
- pnpm 11
- MongoDB Atlas database
- OpenAI API key

## Local development

```powershell
pnpm install
Copy-Item .env.example .env
```

Set `MONGODB_URI` and a random `SESSION_SECRET` of at least 32 characters in `.env`. Keep `OPENAI_API_KEY` in the ignored `.env.local` file (or `.env`); server scripts load both, with `.env.local` taking precedence. Keep server credentials out of all `VITE_*` variables. Run the API and client in separate terminals:

```powershell
pnpm dev:server
pnpm dev:client
```

Open <http://localhost:5173>. The API listens on <http://localhost:4000>. You can build the fictional sample resume with `pnpm generate:sample-resume`; the generated file is checked into `client/public/sample-ats-resume.pdf` and is safe to publish.

Development-only test accounts and the guarded seed procedure are documented in [server/README.development.md](server/README.development.md). Seeding requires a non-production environment and the explicit `ENABLE_DEMO_ACCOUNTS=true` flag.

## API routes

All API routes use `/api` and JSON error envelopes unless downloading a PDF or sending support multipart data.

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | Public | Dependency readiness |
| POST | `/auth/register` | Public | Register full name, username, email, password |
| POST | `/auth/login` | Public | Sign in with username or email |
| GET | `/auth/me` | Session | Current profile and plan snapshot |
| PATCH | `/auth/profile` | Session | Update full name and username |
| POST | `/auth/logout` | Session | Clear the session cookie |
| GET | `/plans` | Public | Plan catalog |
| GET | `/plan` | Session | Plan and monthly usage |
| POST | `/plan/change-request` | Session | Immediate Free downgrade or pending paid-plan request |
| POST | `/support` | Public | Submit validated support request and optional attachment |
| POST | `/resumes` | Session | Validate a PDF, extract text, and save it to the user's resume library |
| GET | `/resumes` | Session | List the signed-in user's saved resumes |
| POST | `/analyses` | Session | Upload PDF and analyze against a job description |
| GET | `/analyses` | Session | Read plan-limited analysis history |
| GET | `/analyses/:id` | Session | Read one owned analysis |
| POST | `/analyses/:id/optimize` | Session | Generate resume suggestions |
| POST | `/analyses/:id/cover-letter` | Session | Generate a cover-letter draft |
| GET | `/analyses/:id/report.pdf` | Session | Download an analysis report (paid plans) |
| POST | `/analyses/:id/cover-letter.pdf` | Session | Download an edited cover letter (paid plans) |

## Verification

```powershell
pnpm build
pnpm test:api
pnpm exec playwright install chromium
pnpm test:e2e
```

The API tests use isolated in-memory database and AI adapters; they do not need production credentials. The browser tests cover account access, dashboard navigation, themes, upload/analysis, and responsive layout. If Playwright workers are blocked by local process policy, use the attached browser session or run the tests in an environment that permits browser worker processes.

## Data and privacy

Resume PDFs are held in memory for extraction and are not stored as uploaded files. Extracted resume text and job descriptions are stored alongside the owner-scoped analysis, sent to OpenAI for the requested operation with `store: false`, and excluded from API error logs. Support attachments are stored as binary data in private MongoDB support records. Passwords are scrypt hashes; sessions use signed HttpOnly, SameSite cookies. Sample results are frontend-only and never enter user analytics, quotas, or history.

## Environment variables

- `VITE_API_BASE_URL` — browser API base, normally `/api`.
- `PORT` — local API port (default `4000`).
- `NODE_ENV` — environment; production behavior disables demo seeding.
- `CLIENT_ORIGIN` — allowed browser origin (default `http://localhost:5173`).
- `MAX_PDF_BYTES` — resume PDF limit, up to 4 MB.
- `MONGODB_URI` — MongoDB Atlas connection string.
- `MONGODB_DATABASE` — database name (default `reframe`, retained for existing project data).
- `OPENAI_API_KEY` — server-only OpenAI API credential.
- `OPENAI_MODEL` — model ID used for structured analysis (default `gpt-6-astra`).
- `SESSION_SECRET` — random signing secret of at least 32 characters.
- `ENABLE_DEMO_ACCOUNTS` — must be explicitly `true` to run the development-only seed script; never enable in production.

## Netlify deployment

Production site: <https://resumint-ai-analyzer.netlify.app/>.

The site is published on Netlify Free. The root `netlify.toml` builds the client, publishes `client/dist`, routes `/api/*` through the shared Express Function, and applies response headers. The current production deploy was uploaded through the Netlify API; connect a Git repository in Netlify to enable automatic deploys for future commits.

For Git-connected deploys, use `pnpm install --frozen-lockfile` as the install command, `pnpm --filter @resumint/client build` as the build command, and `client/dist` as the publish directory. Set `MONGODB_URI`, `MONGODB_DATABASE`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `SESSION_SECRET`, `CLIENT_ORIGIN`, and `MAX_PDF_BYTES` in the Netlify site's environment settings with the Functions scope enabled. Use the production site URL for `CLIENT_ORIGIN`, and ensure MongoDB Atlas allows Netlify runtime connections.

Demo accounts are disabled in production. New users should register on the site; demo credentials are for local development only.
