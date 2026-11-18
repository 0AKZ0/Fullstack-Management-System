# ForgeOps — Multi-tenant Operations Platform

> A production-minded SaaS foundation for teams that need projects, tasks, access control and a trustworthy audit trail.

ForgeOps is the flagship implementation in this repository. It is intentionally built as a **modular monolith**: clear domain boundaries and independently testable modules without distributed-system complexity before it is justified.

## Engineering goals

- Tenant isolation enforced on the server, never trusted from client-side filters alone.
- Explicit membership roles and authorization policies.
- Password hashing with Argon2id and short-lived signed access tokens.
- Append-only audit events for important business actions.
- PostgreSQL as the source of truth; Redis is reserved for caching and asynchronous workloads as those features are introduced.
- Typed configuration, structured logs, health/readiness checks and repeatable local infrastructure.
- Automated type-checking, tests and dependency auditing in CI.

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
PostgreSQL              Redis (reserved for workers/cache)
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
| Validation / API contract | JSON Schema + OpenAPI |
| Observability | Pino structured logs + health endpoints |
| Tests | Vitest |
| Local infrastructure | Docker Compose |

## Run locally

Requirements: Node.js 22+, npm 10+, Docker Compose.

```bash
cd platform
cp .env.example .env
docker compose up -d postgres redis
npm install
npm run prisma:generate
npm run db:migrate
npm run db:seed
npm run dev
```

API: `http://localhost:4000`  
OpenAPI UI: `http://localhost:4000/docs`  

In a second terminal, start the React workspace:

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
| GET | `/v1/projects` | User + tenant | List projects in the active organization |
| POST | `/v1/projects` | Admin / manager | Create a project |
| GET | `/v1/audit-events` | Admin | Inspect organization audit history |

Every tenant-scoped request must provide `x-organization-id`. The API verifies that the authenticated user is a member of that organization before accessing tenant data.

## Security model

- Passwords are verified against Argon2id hashes; plaintext passwords are never stored.
- JWT secrets are mandatory environment configuration and are never committed.
- Organization membership is resolved from the database on each tenant-scoped request.
- Database queries for tenant-owned resources include the resolved tenant ID.
- Project creation emits an audit event in the same database transaction.
- Request bodies have explicit schemas and payload limits.
- Security headers and rate limiting are enabled by default.

This repository is an engineering portfolio project, not a claim of production certification. Before a real deployment, configure TLS, managed secrets, backups and restore drills, alerting, retention policies, a threat model, and an independent security review.

## Engineering decisions

See [docs/architecture/decisions](docs/architecture/decisions) for Architecture Decision Records (ADRs), including the modular-monolith and tenant-isolation choices.

## Roadmap

- [x] Modular API foundation, tenant context, role checks and audit trail
- [x] Local PostgreSQL / Redis infrastructure and CI checks
- [ ] Refresh-token rotation and session revocation
- [ ] Background jobs with idempotency and retry policies
- [ ] Organization lifecycle, invitations and member administration
- [ ] Projects, tasks, milestones and activity timeline
- [x] React application with tenant-aware project workspace and responsive UI
- [ ] OpenTelemetry traces, metrics and load-test baselines

## License

MIT. See [LICENSE](../LICENSE).
