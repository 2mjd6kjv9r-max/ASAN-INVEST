# Phase 1 backend notes

Implements TZ v4.0 Mərhələ 1 as REST under `server/src`, on top of the canonical Prisma schema owned by the Database Specialist (`server/prisma/`, `server/src/db/`). The API does not rewrite that schema.

Locked behaviour:

- Case `internalStatus` is the only stored workflow status (Z-03). Investor/stage views use `server/src/db/status-mapping.ts`.
- Application `snapshot` is written once at submit and is immutable (FR-APP-04). Draft answers live on the investor profile `contacts` JSON until submit.
- Rule results store `ruleSetId` + `ruleVersion` (Z-05).
- Roles are `UserRoleAssignment` rows, not a `users.roles[]` column.
- Auth tokens (refresh, email verify, password reset, 2FA challenge) are signed JWTs — those tables are not in the canonical schema.
- Extra-info requests (WF-05) are `Task` rows with `status=extra_info`.
- Saved ROUTE/INC results are stored on `profiles.contacts` (no separate result tables).
- ASAN Login, email, SMS, and sanctions lists are adapters; no live government client.
- Company registration is a configured DVX URL, not an in-app registrar.
