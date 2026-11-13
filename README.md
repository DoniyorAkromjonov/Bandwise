# Bandwise

Bandwise is a responsive IELTS preparation platform built with Next.js App Router, TypeScript, Tailwind CSS, Auth.js, PostgreSQL, and Prisma.

## Requirements

- Node.js 20.9 or newer
- PostgreSQL 16 or newer, or Docker Desktop for the included local database

## Run locally

1. Install dependencies with `npm install`.
2. Start the local PostgreSQL service with `docker compose up -d postgres`, or create an empty PostgreSQL database named `ielts_prep` yourself.
3. Copy `.env.example` to `.env.local`, set `DATABASE_URL` to your database URL, and generate a random value for `AUTH_SECRET` (for example, run `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` and paste the output into `.env.local`). Keep `NEXTAUTH_URL` set to your app's URL.
4. Apply all database migrations with `npm run db:migrate`.
5. Load 24 original Reading articles, five original Listening recordings and three curated mock-test templates with `npm run db:seed` (safe to run again).
6. Start the development server with `npm run dev` and open `http://localhost:3000`.

The sample PostgreSQL credentials in `.env.example` and `compose.yaml` are only for local development. Replace them for any hosted environment. Never commit `.env.local` or production secrets.
Password recovery requires SMTP settings; without them the endpoint reports that recovery is unavailable rather than pretending to send a message.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma Client and migrations |
| `AUTH_SECRET` | Secret used by Auth.js to sign and encrypt session tokens |
| `NEXTAUTH_URL` | Canonical site URL used by NextAuth, such as `http://localhost:3000` locally |
| `SMTP_HOST`, `SMTP_PORT` | SMTP server used to send expiring password-reset links |
| `SMTP_USER`, `SMTP_PASSWORD` | Optional SMTP credentials; set both or neither |
| `SMTP_FROM` | Verified sender address for recovery messages |
| `BACKUP_ENCRYPTION_KEY` | Base64-encoded random 32-byte key used to encrypt database backups |
| `ADMIN_EMAIL` | Optional email promoted to the `ADMIN` role when `npm run db:seed` runs; the account must already exist |

Generate `AUTH_SECRET` and `BACKUP_ENCRYPTION_KEY` independently with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Store production values in the hosting provider's secret manager, not in Git.

## MVP features

The dashboard includes 24 original Reading articles with answer explanations, five original Listening recordings with transcripts and answer reviews, and three timed Reading/Listening mock tests with saved progress. Registration, credential login and email-based password recovery are supported. Reading and Listening attempts, vocabulary, XP, daily streaks and six achievements are stored in PostgreSQL. Administrators can manage articles, questions, Listening materials and mock-test templates at `/dashboard/admin`. Audio uploads accept supported formats up to 25 MB and are stored under `public/uploads/audio`.

Writing and Speaking remain honest MVP placeholders. No IELTS-owned or third-party test material is included.

To grant administrator access, register the account first, set `ADMIN_EMAIL` to that account's email, then run `npm run admin:promote`. This changes only the role; it does not reseed or overwrite content. The role is stored in PostgreSQL and checked on every protected server request.

## Available commands

- `npm run dev` — start Next.js in development mode
- `npm run lint` — run ESLint
- `npm test` — validate Reading/Listening content and backup encryption
- `npx tsc --noEmit` — check TypeScript
- `npm run prisma:generate` — generate the Prisma Client
- `npm run db:seed` — add or refresh the original learning library and mock tests
- `npm run db:migrate` — create and apply a development migration
- `npm run db:deploy` — apply committed migrations in a deployed environment
- `npm run db:backup` — create an AES-256-GCM encrypted PostgreSQL backup under `backups/`
- `npm run db:restore -- "backups\bandwise-<timestamp>.bwbackup" --confirm-restore` — restore an encrypted backup in a single transaction
- `npm run build` — create a production build

Backups require PostgreSQL's `pg_dump` and `pg_restore` utilities on `PATH`. Restore does not drop existing objects; use an empty target database. Keep the encryption key separately from the backup files. Losing the key makes backups unrecoverable. Do not run restore or production migrations without an explicit operational review and approval.
The backup commands load `.env.local` and `.env` for local use; variables already provided by the process environment take precedence.

Nodemailer is pinned to a security-fixed release because the optional SMTP peer range in the current Credentials-only Auth.js setup includes vulnerable versions. Re-evaluate this override before enabling the Auth.js Email provider.

The Day 1 implementation checklist, including completed, partial, and unverified items, is in [DAY-1-CHECKLIST.md](./DAY-1-CHECKLIST.md). The project is published at [github.com/DoniyorAkromjonov/Bandwise](https://github.com/DoniyorAkromjonov/Bandwise).
