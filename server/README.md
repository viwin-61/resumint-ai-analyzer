# API service

The Express API is also exported through `netlify/functions/api.mjs`, so local development and Netlify use the same routes and services.

## Routes

- `GET /api/health` — configuration readiness without returning secret values.
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout` — account access and signed session cookies.
- `POST /api/analyses` — authenticated PDF extraction and resume/job analysis.
- `GET /api/analyses` and `GET /api/analyses/:id` — user-scoped saved history and details.
- `POST /api/analyses/:id/optimize` — evidence-preserving resume rewrite suggestions.
- `POST /api/analyses/:id/cover-letter` — cover letter generation.
- `GET /api/analyses/:id/report.pdf` and `POST /api/analyses/:id/cover-letter.pdf` — private PDF downloads.

## Implementation boundaries

- `src/config/` validates server settings and reuses the MongoDB client; account and analysis indexes are created on connection.
- `src/middleware/` handles request IDs, signed-in account lookup, and sanitized JSON errors.
- `src/routes/` validates uploads and scopes every analysis query to the authenticated user.
- `src/services/` handles scrypt password hashing, HMAC sessions, PDF parsing/rendering, and strict-schema OpenAI calls.
- `test/` uses injected database and AI adapters so API flows can be checked without Atlas or an API key.

Secrets stay server-side. The client receives only `VITE_API_BASE_URL` and must never receive the database URI, OpenAI key, or session secret.
