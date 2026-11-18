# ADR 0002: Resolve tenant membership on every scoped request

- Status: Accepted
- Date: 2026-11-18

## Context

A multi-tenant SaaS must prevent one organization from reading or mutating another organization's data. A client-provided organization ID is an untrusted selector, not proof of access.

## Decision

Authenticate the user first, resolve the requested organization through the composite membership key, then attach the verified organization ID and role to the request context. Every tenant-owned query includes that server-resolved ID. Authorization policies operate on the verified membership role.

## Consequences

- A forged or guessed organization ID cannot grant access.
- Tenant context is explicit in route handlers and data access.
- Database row-level security can be added as defense in depth if deployment requirements warrant it.
- Integration tests must cover cross-tenant access and role escalation attempts.
