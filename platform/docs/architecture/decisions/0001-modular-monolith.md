# ADR 0001: Start with a modular monolith

- Status: Accepted
- Date: 2026-11-18

## Context

Identity, organization membership, project management and audit history share transactions and authorization rules. Splitting them into network services now would add operational cost without evidence of independent scaling needs.

## Decision

Deploy one API process with explicit modules and shared infrastructure adapters. Modules own their routes and business policies. Cross-module behavior is expressed through application services and database transactions, not ad-hoc imports of persistence details.

## Consequences

- Atomic project creation and audit recording are straightforward.
- Local development and deployment remain simple.
- Module boundaries can be extracted later if throughput, team ownership or reliability requirements justify it.
- The codebase must resist turning the modular monolith into a collection of tightly coupled route handlers.
