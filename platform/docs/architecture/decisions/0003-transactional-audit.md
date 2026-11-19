# ADR 0003: Persist audit events in the business transaction

- Status: Accepted
- Date: 2026-11-18

## Context

An audit record that is written after a business operation can be lost if the process crashes between the two writes. That creates a state change with no corresponding accountability record.

## Decision

For operations that require an audit event, write the business record and the audit event in the same PostgreSQL transaction. If either write fails, the entire transaction is rolled back.

## Consequences

- Business state and its audit event remain consistent.
- Audit writes add latency to the transaction and must remain small.
- External side effects must not run inside the transaction. Future notifications and webhooks should use a transactional outbox.
- Audit metadata must be structured and must not contain credentials, tokens or unnecessary personal data.
