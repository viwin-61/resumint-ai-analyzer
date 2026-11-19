# Resumint development accounts

Development-only credentials for the idempotent MongoDB seed script. These accounts are not created automatically and must never be seeded into a production database.

Run from the repository root after configuring a development MongoDB URI:

```powershell
$env:ENABLE_DEMO_ACCOUNTS = 'true'
$env:DEMO_FREE_PASSWORD = 'choose-a-unique-local-password'
$env:DEMO_BASIC_PASSWORD = 'choose-a-unique-local-password'
$env:DEMO_PREMIUM_PASSWORD = 'choose-a-unique-local-password'
pnpm seed:demo
```

The script refuses to run when `NODE_ENV=production` and requires the explicit opt-in above. Keep these values in the ignored `.env.local` file or your local shell; never commit them. Passwords are hashed with the same scrypt flow as normal account registration.

| Plan | Username | Email | Password variable | Status |
| --- | --- | --- | --- | --- |
| Free | `resumint_free` | free@resumint.example.com | `DEMO_FREE_PASSWORD` | Active |
| Basic | `resumint_basic` | basic@resumint.example.com | `DEMO_BASIC_PASSWORD` | Active |
| Premium | `resumint_premium` | premium@resumint.example.com | `DEMO_PREMIUM_PASSWORD` | Active |

The Basic and Premium plan labels are development fixtures. A real user cannot activate a paid plan until payment integration is added.
