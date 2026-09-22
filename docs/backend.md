# Phase 1 backend notes

Implements TZ v4.0 Mərhələ 1 as REST under `server/src`. Prisma schema follows `docs/PLAN.md` §3 because no Database Specialist schema for the TZ model was merged on this repository.

Locked behaviour:

- Case `internalStatus` is the only stored workflow status (Z-03).
- Application snapshots are immutable after submit (FR-APP-04).
- Rule results store `ruleSetId` + `ruleVersion` (Z-05).
- ASAN Login, email, SMS, and sanctions lists are adapters; no live government client.
- Company registration is a configured DVX URL, not an in-app registrar.
