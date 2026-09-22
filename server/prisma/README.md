# Database layer (Phase 1)

Owned by the Database Specialist (`server/prisma/`). EF Core maps the same tables from `AsanInvest.Infrastructure/Persistence`.

Source of truth: `ASAN_Invest_TZ_v4.0.md` §4.3 and `docs/PLAN.md` §3. The TZ wins on disagreement.

## Data residency (NFR-01)

Production PostgreSQL **must be hosted in Azerbaijan**. Personal data is processed under Azerbaijani personal-data and state information-system rules.

Local development may use Docker (`docker-compose.yml` Postgres 16) or an equivalent local cluster. Dev hosts are not a residency control.

Do not point `DATABASE_URL` at a foreign-region cloud database for any environment that holds real investor data.

## Apply schema

Prisma migrations remain the current apply path for the existing PostgreSQL schema. The ASP.NET API does not call `EnsureCreated` and does not fork table names.

```bash
cp .env.example .env          # DATABASE_URL only from this agent
docker compose up -d postgres # optional
npm install
npm run db:migrate:deploy
npm run db:generate
npm run db:seed
npm run db:verify
```

## Integrity the database enforces

| ID | Mechanism |
| --- | --- |
| Z-02 | `applications_z02_link` CHECK: exactly one of `project_id`, `profile_id` |
| Z-03 | Case `internal_status` is the only stored workflow status. Investor/stage views are mappings in `workflow_statuses` and `AsanInvest.Domain.StatusMapping`. `stages` has no status column. |
| Z-05 | `kya_results.rule_set_id` + `rule_version` |
| FR-APP-04 | Trigger: `applications.snapshot` cannot change once set |
| FR-CASE-01 | Deferred trigger: a submitted application must have a `cases` row |
| TZ §21.1 | Triggers: `audit_records` cannot be updated or deleted |
| FR-ROUTE-01 | `NUMERIC(18,2)` money; `currency` enum AZN / USD / EUR |

Ombudsman / Aftercare extra statuses (TZ §14.2) are **not** migrated in Phase 1. See the comment on `WorkflowStatus` in `schema.prisma`.

## Seed login (demo only)

| Role | Email | Password |
| --- | --- | --- |
| SYSADMIN | `sysadmin@asaninvest.local` | `ChangeMe_Sysadmin_123` |

Change this password before any shared or production deployment. 2FA is flagged enabled on the sysadmin row (NFR-02); the API still has to enforce the challenge.
