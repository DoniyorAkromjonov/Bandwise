# Day 1 — Foundation, design, and authentication

Status legend: **Done** = implemented and checked where possible; **Partial** = implementation exists, but a required runtime check is still missing; **Not done** = work remains.

| Status | To-do item | Result |
| --- | --- | --- |
| Done | Create the GitHub repository | Bandwise repository exists; project is pushed to `main`. |
| Done | Set up Next.js, TypeScript, and Tailwind | App Router project is configured. |
| Partial | Set up PostgreSQL and Prisma | User schema, PostgreSQL adapter, Compose service, and initial migration are present. Migration has not been applied because PostgreSQL/Docker was unavailable in the build environment. |
| Done | Add `.env.example` and `.gitignore` | Example variables and exclusions are committed; `.env.local` is not tracked. |
| Done | Create the base folder structure and UI components | App routes, layout/auth/landing/dashboard components, and shadcn UI components are in place. |
| Done | Build the Landing Page | Responsive Bandwise landing page is implemented. |
| Done | Implement registration, login, and logout | Auth.js Credentials flow, server-side registration, bcrypt password hashing, and logout are implemented. |
| Done | Protect private pages | Dashboard checks the server session and redirects signed-out visitors to `/login`; this redirect was checked in the browser. |
| Partial | Build the Dashboard | Personalized dashboard and honest empty states are implemented. A real signed-in user view still needs database-backed verification. |
| Partial | Test registration, login, logout, and user data access | TypeScript, ESLint, production build, Prisma generation, form validation, and signed-out redirect passed. End-to-end account scenarios could not be run without PostgreSQL. |
| Done | Check responsiveness | Desktop, tablet, and mobile layouts were inspected; no horizontal overflow was found. |
| Done | Create a Git commit | Commit `38c9a3b` was pushed to `main`. |

## Security requirements

- **Done:** Passwords are hashed with bcrypt; session and authorization checks run on the server.
- **Done:** Secrets are read from environment variables; `.env.local` is ignored by Git.
- **Done:** No production/demo users or fabricated learner data are seeded.

## Readiness criterion

**Partial:** The application code is ready, but the acceptance flow is not yet verified end to end. Start PostgreSQL, apply the migration with `npm run db:migrate`, then test registration, duplicate email rejection, login, logout, and the personalized dashboard.
