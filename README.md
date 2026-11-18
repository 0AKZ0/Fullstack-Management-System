# ForgeOps — Full-stack Operations Platform

A multi-tenant SaaS platform foundation designed to demonstrate production-minded engineering: tenant isolation, role-based access control, transactional audit events, typed APIs, PostgreSQL, automated quality gates and a clear modular architecture.

**The active flagship implementation lives in [`platform/`](platform/README.md).**

## What makes this project different

- **Tenant isolation by design:** organization context is resolved against persisted membership on every scoped request. A client-supplied organization ID is never treated as authorization.
- **RBAC:** explicit OWNER / ADMIN / MANAGER / MEMBER / VIEWER policies.
- **Transactional audit trail:** business mutations and their audit events are committed together.
- **Modular monolith:** domain boundaries without premature microservices.
- **Operational baseline:** Docker Compose, PostgreSQL, Redis, structured logs, health checks, OpenAPI and CI.
- **Security-minded defaults:** Argon2id password verification, short-lived JWT access tokens, request schemas, payload limits, security headers and rate limiting.

## Stack

TypeScript · Node.js 22 · Fastify 5 · PostgreSQL 16 · Prisma · Redis · Vitest · Docker · GitHub Actions

## Quick start

```bash
cd platform
cp .env.example .env
docker compose up -d
npm install
npm run prisma:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:4000/docs` for the API contract.

## Architecture at a glance

```text
Client
  └── Fastify API
       ├── Identity and JWT authentication
       ├── Organization membership and tenant context
       ├── Role policies
       ├── Projects
       └── Append-only audit events
             └── Prisma / PostgreSQL
```

See [platform documentation](platform/README.md) and the Architecture Decision Records for the reasoning behind key choices.

## Status

This is an actively developed portfolio project. The current branch establishes the backend foundation. The next milestones are refresh-token rotation, organization lifecycle, background processing, the React application, integration tests and deployment observability.

No production-readiness claim is made until the full security, operational and load-test gates are implemented and verified.

## Author

Samuel Aguiar · [Portfolio](https://samuelaguiar.discloud.app) · [GitHub](https://github.com/0AKZ0)

MIT License.
