# Security model and threat boundaries

## Assets

- User credentials and access tokens
- Organization membership and role assignments
- Tenant-owned project data
- Audit history used for accountability

## Trust boundaries

1. Browser to API: all headers, identifiers and payloads are untrusted.
2. API authentication: a valid JWT identifies a user; it does not grant organization access by itself.
3. Tenant resolution: organization membership is loaded from PostgreSQL for the authenticated principal.
4. Persistence: tenant-owned queries must include the server-resolved organization ID.

## Controls implemented

| Threat | Control |
| --- | --- |
| Credential disclosure | Argon2id password hashes; no plaintext password persistence |
| Token forgery | Signed JWT with required server-side secret and short expiry |
| Cross-tenant object access | Membership lookup plus tenant-scoped database predicates |
| Privilege escalation | Role policies evaluated from persisted membership |
| Injection through request data | Fastify JSON Schema validation and Prisma parameterized queries |
| Excessive request volume | API rate limiting and request body size limit |
| Missing accountability | Audit event written in the same transaction as project creation |
| Browser-based attacks | Helmet security headers and explicit CORS origin |

## Operational requirements before production

- Store secrets in a managed secret store and rotate them.
- Terminate TLS at a trusted edge and configure proxy trust precisely.
- Add refresh-token rotation, revocation and session inventory.
- Add MFA and account recovery with abuse-resistant workflows.
- Add organization-level quotas and abuse controls.
- Encrypt and test database backups; run restore drills.
- Define audit retention, export and deletion policies with legal review.
- Add dependency scanning, container scanning, SAST and secret scanning.
- Add structured redaction rules before logging personal or business data.
- Perform a threat-model review and independent penetration test.

## Known limitations

The current implementation is an early portfolio foundation. It does not yet provide refresh-token rotation, MFA, invitations, full account lifecycle, database row-level security, or a production deployment topology. The local seed credential is public by design and must never be reused outside local development.
