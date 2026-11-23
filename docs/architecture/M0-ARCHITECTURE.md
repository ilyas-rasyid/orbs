# M0 Architecture and Ownership

## Process boundaries

```text
Browser
  │
  ├── frontend/ [React · Vite · TanStack Router · TanStack Query]
  │      │
  │      └── GET /health/ready (Vite reverse proxy in development)
  │                   │
  └───────────────────┤
                      ▼
               backend/ [Bun · Elysia]
                      │
                      ├── HTTP correlation ID and structured log
                      ├── error responses (Problem Details)
                      └── pg Pool → PostgreSQL [Docker Compose]
```

Frontend owns browser UI, routes and query cache. Backend owns HTTP and database access. Root owns workspace/CI/audits. No shared implementation package exists.

## Source file responsibilities

**Frontend:** `main.tsx` mounts React; `app/providers` composes Query provider; `router` creates typed TanStack router; `routes` are thin route definitions; `shared/components` renders the temporary foundation page; `shared/api` calls health endpoint; `shared/hooks` owns query logic; `styles` owns CSS tokens.

**Backend:** `index.ts` starts and gracefully stops the process; `app.ts` composes Elysia middleware and routes; `config` validates environment; `infrastructure/database` owns PG pool and readiness query; `middleware` owns correlation/logging/errors; `health` owns HTTP health handlers; `shared/errors` owns Problem Details shape.

## Health behavior

Liveness is independent of PostgreSQL. Readiness requires a successful PostgreSQL `SELECT 1`; application errors do not reveal secrets. In development, Vite proxies `/health` and `/api` requests to local backend port 3001. In future production, a same-origin reverse proxy will own those paths.

## M0 data model

Prisma configuration is present, **without business models**. M1 adds identity models, and M2+ adds Facility/Booking scheduling claims. This avoids premature migrations and duplicate domain structures.

## Generated files

TanStack Router generates `frontend/src/router/routeTree.gen.ts` using its Vite plugin. It is excluded from handwritten audits. The file is generated before typechecking by the frontend build/typecheck pipeline, and must not be manually edited.
