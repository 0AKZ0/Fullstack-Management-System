# ForgeOps — Multi-tenant Operations Platform

> A production-minded SaaS foundation for teams that need projects, access control and a trustworthy audit trail.

ForgeOps is intentionally built as a **modular monolith**: clear domain boundaries and independently testable modules without distributed-system complexity before it is justified.

## Engineering goals

- Tenant isolation enforced on the server, never trusted from client-side filters alone.
- Explicit membership roles and authorization policies.
- Argon2id password hashing and short-lived signed access tokens.
- Audit events written atomically with important business mutations.
- PostgreSQL as the source of truth; Redis provides shared rate limiting and readiness checks.
- Typed configuration, structured logs, health/readiness checks and repeatable local infrastructure.
- Automated type-checking, tests and CI validation.

## Architecture

```text
HTTP / OpenAPI
     |
Fastify application
     |
Authentication -> Tenant context -> Authorization policy
     |
Modules: Identity | Organizations | Projects | Audit
     |
Prisma data access
     |
PostgreSQL              Redis (rate limiting / readiness)
```

### Why a modular monolith?

The current product boundaries share transactions and a common authorization model. Keeping them in one deployable unit makes consistency, debugging and delivery simpler. Modules have explicit responsibilities so high-load workloads can be extracted later when metrics justify it.

## Stack

| Concern | Choice |
| --- | --- |
| Runtime | Node.js 22 + TypeScript |
| HTTP | Fastify 5 |
| Persistence | PostgreSQL 16 + Prisma |
| Authentication | JWT access tokens + Argon2id password hashes |
| API contract | JSON Schema + OpenAPI |
| Observability | Pino structured logs + health endpoints |
| Tests | Vitest |
| Local infrastructure | Docker Compose |

## Run locally

Requirements: Node.js 22+, npm 10+ and Docker Compose.

```bash
cd platform
cp .env.example .env
docker compose up --build
```

Open the web workspace at `http://localhost:8080`; the API and OpenAPI UI are available at `http://localhost:4000` and `http://localhost:4000/docs`.

For a source-based development loop, start PostgreSQL and Redis with `docker compose up -d postgres redis`. Then, in the API directory:

```bash
npm install
npm run prisma:generate
npm run db:migrate
npm run db:seed
npm run dev
```

In a second terminal:

```bash
cd platform/web
cp .env.example .env
npm install
npm run dev
```

Web app: `http://localhost:5173`  
Liveness: `http://localhost:4000/health/live`  
Readiness: `http://localhost:4000/health/ready`

## API surface

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/v1/auth/login` | Public | Exchange credentials for an access token |
| GET | `/v1/organizations` | User | List organizations the authenticated user belongs to |
| GET | `/v1/projects` | User + tenant | List projects in the active organization |
| POST | `/v1/projects` | Owner / admin / manager | Create a project |
| PATCH | `/v1/projects/:projectId/status` | Owner / admin / manager | Apply a valid project lifecycle transition |
| GET | `/v1/audit-events` | Owner / admin | Inspect organization audit history |

Every tenant-scoped request must provide `x-organization-id`. The API verifies that the authenticated user is a member of that organization before accessing tenant data.

## Security model

- Passwords are verified against Argon2id hashes; plaintext passwords are never stored.
- JWT secrets are mandatory environment configuration and are never committed.
- Organization membership is resolved from the database on each tenant-scoped request.
- Queries for tenant-owned resources include the resolved tenant ID.
- Project creation and status changes emit audit events in the same database transaction.
- Request bodies have explicit schemas and payload limits.
- Security headers and rate limiting are enabled by default.

This is an engineering portfolio project, not a claim of production certification. Before a real deployment, configure TLS, managed secrets, backups and restore drills, alerting, retention policies, a threat model, and an independent security review.

## Engineering decisions

See [docs/architecture/decisions](docs/architecture/decisions) for Architecture Decision Records, including the modular-monolith and tenant-isolation choices.

## Roadmap

- [x] Modular API foundation, tenant context, role checks and audit trail
- [x] Project lifecycle state machine with optimistic concurrency control
- [x] Local PostgreSQL / Redis infrastructure and CI checks
- [x] React application with tenant-aware project workspace and responsive UI
- [ ] Refresh-token rotation and session revocation
- [ ] Background jobs with idempotency and retry policies
- [ ] Organization lifecycle, invitations and member administration
- [ ] Tasks, milestones and richer project activity timeline
- [ ] OpenTelemetry traces, metrics and load-test baselines

## Status

**Active development — foundation implemented; not production-ready.**

## License

MIT. See [LICENSE](../LICENSE).
