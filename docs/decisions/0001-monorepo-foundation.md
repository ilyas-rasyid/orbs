# ADR-0001: Two-workspace Bun monorepo

**Status:** Approved in frozen Master PRD and M0 handoff.

## Decision

Use a single GitHub repository with independent `frontend/` and `backend/` Bun workspaces and one root `bun.lock`. The frontend uses React/Vite and TanStack Router/Query. The backend uses Bun/Elysia; PostgreSQL development infrastructure is provided through Docker Compose. Business modules will be feature-oriented and maintain clear responsibility boundaries.

## Consequences

- Independent frontend/backend builds.
- No duplicated lockfiles or nested Git repositories.
- No premature microservices, external monorepo framework or shared domain package.
- Source-length and dependency audits are mandatory.
- Frontend never imports backend database implementations.
- Production auth will use server-side sessions, **not JWT copied from reference**.
