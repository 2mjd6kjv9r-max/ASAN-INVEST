# Database layer

Owned by the Database Specialist (`server/prisma/`). EF Core maps the same tables from `AsanInvest.Infrastructure/Persistence`.

Source of truth: `ASAN_Invest_TZ_v4.0.md` §4.3, `docs/PLAN.md` §3, and Phase 2 additions in `docs/PLAN-PHASE2.md` §2. The TZ wins on disagreement.

Prisma migrations remain the apply path. Do not create a parallel table set.

## Data residency (NFR-01)

Production PostgreSQL **must be hosted in Azerbaijan**. Personal data is processed under Azerbaijani personal-data and state information-system rules.

Local development may use Docker (`docker-compose.yml` Postgres 16) or an equivalent local cluster. Dev hosts are not a residency control.

Do not point `DATABASE_URL` at a foreign-region cloud database for any environment that holds real investor data.

## Apply schema

```bash
cp .env.example .env          # DATABASE_URL only from this agent
docker compose up -d postgres # optional
npm install
npm run db:migrate:deploy
npm run db:generate
npm run db:seed
npm run db:verify
```

## `ALTER TYPE ... ADD VALUE` (Phase 2)

Phase 2 appends labels to existing PostgreSQL enums; it does not rename or drop Phase 1 values.

| Enum | Added labels |
| --- | --- |
| `workflow_kind` | `OMBUDSMAN`, `AFTERCARE` |
| `case_internal_status` | `UNDER_INVESTIGATION`, `IN_MEDIATION`, `OPINION_PREPARED`, `OPINION_PENDING_APPROVAL`, `NEXT_CONTACT_PLANNED`, `IN_MONITORING` |

New enums created in Phase 2 (not alters): `payment_status`, `reform_status`, `accreditation_status`.

PostgreSQL behaviour:

- **11 and earlier:** more than one `ADD VALUE` cannot run in a single transaction. Split migrations.
- **12–14:** `ADD VALUE` may run inside a transaction, but the new label cannot be *used* until after commit.
- **15+ (this repo):** Docker Compose uses `postgres:16-alpine`. New labels may be added and used in the same transaction. The Phase 2 migration therefore keeps a single transactional script.

`payments.status` is converted from free text (`'external'`) to `payment_status` with `USING` — the column is not dropped.

## Integrity the database enforces

| ID | Mechanism |
| --- | --- |
| Z-02 | `applications_z02_link` CHECK: exactly one of `project_id`, `profile_id` |
| Z-03 | Case `internal_status` is the only stored workflow status. Investor/stage views are mappings in `workflow_statuses` and `AsanInvest.Domain.StatusMapping`. `stages` has no status column. |
| Z-05 | `kya_results.rule_set_id` + `rule_version` |
| FR-APP-04 | Trigger: `applications.snapshot` cannot change once set |
| FR-CASE-01 | Deferred trigger: a submitted application must have a `cases` row |
| TZ §21.1 | Triggers: `audit_records` cannot be updated or deleted |
| TZ §21.1 | Triggers: `integration_messages` cannot be updated or deleted |
| FR-ROUTE-01 | `NUMERIC(18,2)` money; `currency` enum AZN / USD / EUR |
| TZ §20 | State-fee rows (`state_fees`, `payments.kind = STATE_FEE`) stay separate from partner prices |

`state_fees` is the FR-ADM-10 catalogue (in-app checkout). It is additive; `procedures.fee_amount` is unchanged.

## Seed logins (demo only)

| Role | Email | Password | 2FA flag |
| --- | --- | --- | --- |
| SYSADMIN | `sysadmin@asaninvest.local` | `ChangeMe_Sysadmin_123` | yes |
| OMBUDSMAN_OFFICER | `ombudsman@asaninvest.local` | `ChangeMe_Ombudsman_123` | yes (internal role) |

Change these passwords before any shared or production deployment. The API still has to enforce the 2FA challenge (NFR-02).
