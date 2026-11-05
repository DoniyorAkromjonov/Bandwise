# Bandwise

Bandwise is a responsive IELTS preparation platform built with Next.js App Router, TypeScript, Tailwind CSS, Auth.js, PostgreSQL, and Prisma.

## Requirements

- Node.js 20.9 or newer
- PostgreSQL 16 or newer, or Docker Desktop for the included local database

## Run locally

1. Install dependencies with `npm install`.
2. Start the local PostgreSQL service with `docker compose up -d postgres`, or create an empty PostgreSQL database named `ielts_prep` yourself.
3. Copy `.env.example` to `.env.local`, set `DATABASE_URL` to your database URL, and generate a random value for `AUTH_SECRET` (for example, run `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` and paste the output into `.env.local`). Keep `NEXTAUTH_URL` set to your app's URL.
4. Apply the initial database migration with `npm run db:migrate`.
5. Start the development server with `npm run dev` and open `http://localhost:3000`.

The sample PostgreSQL credentials in `.env.example` and `compose.yaml` are only for local development. Replace them for any hosted environment. Never commit `.env.local` or production secrets.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma Client and migrations |
| `AUTH_SECRET` | Secret used by Auth.js to sign and encrypt session tokens |
| `NEXTAUTH_URL` | Canonical site URL used by NextAuth, such as `http://localhost:3000` locally |

## Available commands

- `npm run dev` — start Next.js in development mode
- `npm run lint` — run ESLint
- `npx tsc --noEmit` — check TypeScript
- `npm run prisma:generate` — generate the Prisma Client
- `npm run db:migrate` — create and apply a development migration
- `npm run db:deploy` — apply committed migrations in a deployed environment
- `npm run build` — create a production build

## Day 1 scope

The public landing page, registration and login flows, protected personal dashboard, and account sign-out are implemented. Listening, Reading, Writing, and Speaking practice activities are represented as honest empty states until those learning features are built. The dashboard does not claim scores, activity, or progress that the platform has not collected.

The Day 1 implementation checklist, including completed, partial, and unverified items, is in [DAY-1-CHECKLIST.md](./DAY-1-CHECKLIST.md). The project is published at [github.com/DoniyorAkromjonov/Bandwise](https://github.com/DoniyorAkromjonov/Bandwise).
