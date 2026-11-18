# System context

ForgeOps is a browser-based workspace for organizations managing operational projects.

## Actors

- **Workspace member:** signs in and works within organizations they belong to.
- **Workspace administrator:** manages access and reviews audit history.
- **Platform operator:** deploys and observes the service but should not gain implicit access to customer business data.

## Core request flow

```mermaid
sequenceDiagram
  participant B as Browser
  participant A as Fastify API
  participant P as PostgreSQL
  B->>A: POST /v1/auth/login
  A->>P: Find user by normalized email
  P-->>A: User + Argon2id hash
  A-->>B: Short-lived access token
  B->>A: GET /v1/projects + Bearer + organization ID
  A->>A: Verify JWT
  A->>P: Resolve user/organization membership
  P-->>A: Persisted role
  A->>P: Query projects scoped to organization ID
  P-->>A: Tenant-owned records
  A-->>B: Project list
```

## Mutation consistency

Project creation and its audit event are committed atomically. The API never accepts an actor ID or tenant role from the browser; both are derived from the authenticated identity and persisted membership.
