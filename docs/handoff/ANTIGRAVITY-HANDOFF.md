# ORBS — Antigravity Completion Handoff

**Status:** Full-feature source candidate; **not** a verified working or production-ready application.

## Scope

Complete and verify the existing Office Resource Booking System (ORBS) from this repository. This is a **single GitHub/Bun monorepo with strictly separated `frontend/` and `backend/` workspaces**. Features drafted in source include cookie-session login and roles, facility management, availability calendar, bookings, approvals, meeting check-in/out, vehicle/equipment handover/return, maintenance, notification/worker, reports, audit, and admin management. **Do not replace the repository with a generic dashboard or begin a new project.**

## Non-negotiable standards

- Keep `frontend/` and `backend/` implementation separate; business logic is authoritative on backend.
- Modular feature ownership: frontend pages/components/hooks/services/schemas/types; backend handlers/payloads/services/repositories/policies/mappers as needed.
- Readable Prettier multiline code; no compressed one-line JSX/TypeScript. No handwritten source over 500 lines, prefer under 300.
- No mock success, dead buttons, fake charts, security bypasses, or unimplemented business actions presented as complete.
- Preserve server-side opaque cookie sessions, CSRF and Origin protection, RBAC/ownership, idempotency, transactional bookings, and PostgreSQL exclusion/unique constraints.
- Do **not** delete or reset existing migration history just to make tests green. Protect databases and secrets.
- Avoid new dependencies unless necessary and document why.

## Validation order — run and fix actual errors

1. Inspect `README.md`, `docs/handoff/RELEASE-VERIFICATION.md`, root `package.json`, and workspace packages. Check installed Bun, Node, Docker; regenerate **and verify** `bun.lock` if necessary.
2. Create local env copies: `cp .env.example .env`; `cp backend/.env.example backend/.env`; `cp frontend/.env.example frontend/.env`. Never commit real `.env` files.
3. `bun install` (resolve invalid versions or incompatibilities), then `bun install --frozen-lockfile` after recording the canonical lockfile.
4. `bun run db:up`; `bun run db:generate`; validate Prisma schema and `bun run db:migrate` against a **fresh development PostgreSQL instance**. Verify each of the modular Prisma model files and all native migration constraints.
5. `bun run format`; `bun run format:check`; `bun run lint`; `bun run typecheck`; `bun run audit:architecture`; `bun run build`. Fix root causes, keep architecture boundaries.
6. `bun run test`; `bun run db:test:up`; `NODE_ENV=test bun run test:integration`; `NODE_ENV=test bun run test:concurrency`. Add missing tests where needed; verify no overlapping confirmed claims and no double active usage.
7. Seed **development-only synthetic data** with `SEED_PASSWORD='<local-test-password>' bun run db:seed`; run `bun run dev` and test all roles and workflow actions in actual browser. Never use production data.
8. Install Playwright Chromium and run `SEED_PASSWORD='<same-password>' bun run test:e2e`; fix all failing tests. Expand coverage to maintenance, admin, role permissions, report export, overdue, no-show, security, and accessibility when tests are missing.
9. Verify Docker production-like compose, API/worker/DB startup, safe migration job, HTTP/HTTPS cookie behavior behind an appropriate reverse proxy, and backup/restore procedure. Do not claim production readiness without executing those checks.
10. Re-run full checks. Update `README.md` and `docs/handoff/RELEASE-VERIFICATION.md` to show **actual executed commands and results**. Record unresolved blockers and do not label them passed.

## High-risk integration details to inspect carefully

- Prisma 7 generated client location (`backend/src/generated/prisma`), Bun adapter configuration, modular schema generation, and migration compatibility.
- `bun.lock` was assembled during authoring and has **not** been verified by a Bun install. Dependencies and imported type definitions may require resolution.
- Database connection and transaction semantics, exclusion constraint interval ranges, partial unique active-usage index, capacity/operating windows, claim release on early completion, late-return physical availability, and idempotent retry vs ETag.
- Cookie SameSite/Secure/Origin/CSRF behavior on local Vite proxy and production reverse proxy.
- Return/handover forms, approval self-approval guard, role-based navigation and resource visibility; server-side authorization must be enforced independent of UI.
- Root scripts, Playwright config, CI workflow, and Dockerfile build arguments; ensure the deployment truly starts and the worker is healthy.

## Expected delivery from Antigravity

A complete working application from this codebase, with no critical broken workflows. Provide a concise final verification report: implemented modules, every executed command and pass/fail status, DB migration result, API/browser test result, security findings, actual changed files, any remaining limitations, and commands to run locally. Preserve the layout and code quality standards above.
