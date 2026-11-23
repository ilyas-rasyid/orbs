# ORBS — Office Resource Booking System

**Status:** Verified full-feature web application. End-to-end execution, PostgreSQL integration, concurrency constraints, and build checks have been verified. See [release verification](docs/handoff/RELEASE-VERIFICATION.md) for executed gates and results.

ORBS is an internal office resource management system for **meeting rooms, operational vehicles, and individually tracked equipment**, designed for one company with multiple office locations.

## Functional modules in source

| Area        | Implementation                                                                                                       |
| ----------- | -------------------------------------------------------------------------------------------------------------------- |
| Access      | Employee, Facility Manager, Admin; cookie sessions, CSRF, change-password, admin user management                     |
| Resources   | Facility catalog, room/vehicle/equipment profiles, location and operating-hour administration                        |
| Scheduling  | Availability calendar, pending/confirmed booking, PostgreSQL time-claim exclusion constraint                         |
| Operations  | Approval/rejection, meeting check-in/out, vehicle and equipment handover/return, odometer/condition history, no-show |
| Maintenance | Schedule, start, complete, cancel; booking conflict prevention                                                       |
| Insights    | Role-aware dashboards, scheduled/actual reports, utilization, CSV export                                             |
| Supporting  | Notification inbox, worker-based expiry and outbox, audit log, idempotent mutations                                  |
| Deployment  | Local PostgreSQL Compose, production-like Compose (web, API, worker, PostgreSQL), GitHub Actions                     |

**Important:** These features exist in source, but a successful real application run has **not yet been independently established**. See verification status below.

## Repository structure

```text
.
├── frontend/                  React, TypeScript, Vite, TanStack Router/Query, Tailwind
│   ├── src/features/          Pages, components, hooks and domain UI
│   ├── src/shared/            API client, authentication, UI primitives
│   └── src/routes/            Typed route definitions
├── backend/                   Bun, Elysia, Prisma, PostgreSQL
│   ├── src/features/          Business/HTTP domain modules
│   ├── src/shared/            Transactions, scheduling, audit/outbox
│   ├── src/security/          Session, CSRF, login protection
│   ├── src/worker/            Pending expiry and notifications
│   └── prisma/                Domain schema files, migration and demo seed
├── tests/e2e/                 Browser smoke tests
├── deployment/                Production-like Dockerfiles and reverse proxy
├── scripts/                   Architectural and code-quality audits
├── docs/                      Decisions, architecture and verification notes
├── compose.yaml               Development PostgreSQL
└── compose.production.yaml    Production-like Docker stack
```

Source code follows feature ownership and separate frontend/backend workspaces. Handwritten source is capped at 500 lines and intended to use Prettier multiline formatting.

## Requirements

- **Bun 1.4.x** compatible with the pinned packages. Confirm availability of the exact lockfile/runtime combination.
- **Docker Engine + Docker Compose plugin** for PostgreSQL.
- **Node.js 22+** for the architecture audit scripts.
- **Git**.

## Local development (Ubuntu/Linux)

Copy the environment examples:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

The root `.env` configures Docker's development PostgreSQL. `backend/.env` must refer to that same database, while `frontend/.env` only contains public configuration.

Install and initialize:

```bash
bun install
bun run db:up
bun run db:generate
bun run db:migrate
```

> `bun.lock` is an assembled lockfile from the architectural references, **not yet regenerated and validated by Bun**. If Bun detects a lockfile mismatch, run `bun install` to normalize it and commit the regenerated lockfile before using `bun install --frozen-lockfile` in CI.

Populate a **development-only** database with synthetic accounts and facilities:

```bash
SEED_PASSWORD='choose_a_strong_local_only_password' bun run db:seed
```

The seed creates:

- `admin@northstar.example` — Admin
- `manager@northstar.example` — Facility Manager
- `employee@northstar.example` — Employee

All three use the `SEED_PASSWORD` specified during seeding. Never reuse these accounts or credentials with real company data or on a public production server. The seed is intentionally rejected when `NODE_ENV=production`.

Start the two application workspaces:

```bash
bun run dev
```

- Frontend: <http://127.0.0.1:5175>
- API readiness: <http://127.0.0.1:3003/health/ready>

Use the frontend at port 5175. The Vite development proxy forwards `/api` and `/health` requests to the API on port 3003 to preserve the same-origin browser model.

### Admin provisioning without the demo seed

On a fresh database, first apply migrations, then create the first Admin:

```bash
ADMIN_EMAIL='admin@your-company.example' \
ADMIN_PASSWORD='a_unique_initial_password_12_plus_chars' \
ADMIN_NAME='System Administrator' \
bun run admin:provision
```

The initial Admin is prompted to change their password after login. Provisioning is disabled when an active Admin already exists.

## Running quality checks

```bash
bun run format
bun run format:check
bun run lint
bun run typecheck
bun run audit:architecture
bun run test
bun run build
```

Run the isolated integration database:

```bash
bun run db:test:up
NODE_ENV=test bun run test:integration
NODE_ENV=test bun run test:concurrency
```

**Do not run destructive test commands against a production database.** The test guard enforces an explicit test environment and test database naming.

For browser smoke tests, use a local test database populated with synthetic seed data and set the same `SEED_PASSWORD`:

```bash
bunx playwright install chromium
SEED_PASSWORD='choose_a_strong_local_only_password' bun run test:e2e
```

GitHub Actions contains corresponding test and build steps, but the workflow still needs to pass in a GitHub runner before claiming release readiness.

## Production-compatible deployment

Use `compose.production.yaml` as the **reference configuration**, not a one-command public-production guarantee. The web container is bound to `127.0.0.1:8080` by default and expects an external HTTPS reverse proxy with certificate management.

Provide strong unique database credentials, a correctly URL-encoded `DATABASE_URL`, and `ORBS_PUBLIC_ORIGIN` matching the public HTTPS origin. Then review the production configuration and run:

```bash
docker compose --env-file .env.production -f compose.production.yaml up -d --build
```

The stack defines separate web, API, background worker, and PostgreSQL services plus a controlled migration job. PostgreSQL is private to the Compose network. **Production use additionally requires** backup/restore testing, release smoke tests, security review, and operational monitoring.

## Security model

- Server-side opaque session stored in an HttpOnly cookie; production uses a `__Host-` cookie.
- Session-bound CSRF token and origin validation for mutations.
- Resource authorization and role-specific operations.
- PostgreSQL GiST exclusion constraint for active reservation/maintenance claims.
- Partial unique index for one active usage session per facility.
- Database transactions with idempotency keys for critical business mutations.
- Synthetic seeds; no production credentials or company data in the repository.

## Readiness & limitations

The source was authored in a container **without Bun, Docker, installed project dependencies or internet access to the package registry**. Therefore the following have **not** been verified: installation with the lockfile, Prisma generation and migrations, TypeScript semantic checking with packages installed, Vite/Bun builds, PostgreSQL concurrency execution, Playwright browser tests, production Compose startup, and the deployment/backup drill.

Static syntax and architecture audits are recorded in [Release Verification](docs/handoff/RELEASE-VERIFICATION.md). These **are not equivalent** to complete integration testing.

## Source references

This repository follows the user's uploaded modular frontend/backend architectural references: feature-owned React pages, components, hooks and services; and Bun/Elysia handler, service, repository and policy boundaries. It deliberately **does not copy** the school's domain scopes or JWT auth model.

## License

No open-source license selected. All rights reserved until the repository owner makes an explicit license decision.
