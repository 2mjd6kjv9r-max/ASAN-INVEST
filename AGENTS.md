# AGENTS.md

Shared rules for every agent working on ASAN Invest.

**Source of truth:** `ASAN_Invest_TZ_v4.0.md` (v4.0).  
**Phase 1 plan:** `docs/PLAN.md`.  
If an agent instruction, this file, and the TZ disagree, the TZ wins.

Do not write application code until implementation is explicitly requested. Phase 1 only until the TZ’s Mərhələ 2 is opened.

---

## 1. What we are building

ASAN Invest is the investor’s single contact point with institutions. It does **not** replace those institutions and does **not** decide permits, incentives, or bank accounts (TZ §1.2, §1.4).

Every procedure step shows a honesty flag: **AVTO / ONLAYN / FİZİKİ / PLAN** (TZ §1.3). Never promise automation the platform cannot perform.

---

## 2. Tech stack

Use this stack only (justification in `docs/PLAN.md`):

| Area | Standard |
| --- | --- |
| Frontend | React + TypeScript, Vite, Tailwind CSS, React Router, i18next |
| Backend | Node.js + Express + TypeScript |
| API | REST JSON, prefix `/api/v1` |
| Database | PostgreSQL, Prisma migrations |
| Auth (Phase 1) | Email + verification; httpOnly refresh cookie + short-lived access JWT; 2FA for internal roles |
| ASAN Login / SİMA | Interface + stub; no live government client until a real spec exists in-repo |
| Validation | Zod on the server (and on forms) |
| Dates | UTC in the database; display in Asia/Baku unless the user locale implies otherwise |
| Money | `NUMERIC` / decimal strings; never IEEE floats |

Do not add GraphQL, extra microservices, Redis, Kafka, or a second CMS product in Phase 1 without an explicit change to this file and the TZ plan.

---

## 3. Coding style

- TypeScript `strict`. No `any` except at a documented integration boundary.
- ESM, named exports, one module per TZ prefix under `server/src/modules/` and `client/src/features/`.
- Business rules live in services (especially the **qayda mühərriki**), not in React components or Express routers.
- Controllers validate input, call one service, map the DTO. No SQL in controllers.
- Every mutating endpoint writes an **audit** record when the event is in TZ §21.1.
- Errors: `{ error: { code, message, details? } }`. Messages tell the user what happened and how to fix it (UI-07, TZ §23.3). No emoji. No forbidden phrases from TZ §1.2.
- Comments in English. Requirement IDs from the TZ stay in comments when a rule is implemented, e.g. `// FR-APP-04 snapshot immutable`.
- Format with Prettier (default). ESLint with the TypeScript parser.
- Tests next to the behaviour they lock (or under `server/src/modules/<name>/__tests__` and `client/src/features/<name>/`).

### Honesty and product rules (all agents)

- Z-01 One question once — never re-collect profile/project/document data.
- Z-02 Every application is linked to a project or, if none, to a profile.
- Z-03 Case Management is the only status source. UI and notifications only display it.
- Z-04 There is always a next step (alternative, escalation, complaint, or correction).
- Z-05 Results stay on the rule version that produced them.
- Z-06 One rule engine; rules change only via İnzibatçılıq.
- GİR-03 Internal notes and inter-agency files never appear on investor screens.
- Phase 1 does not call government APIs. Missing integrations → back-office task UI + correct bayraq (TZ §25.1).

---

## 4. Naming conventions

| Kind | Convention | Example |
| --- | --- | --- |
| Source files / folders | `kebab-case` or TZ prefix folder | `server/src/modules/kya/` |
| TypeScript types | `PascalCase` | `KyaResult`, `CaseInternalStatus` |
| Functions, variables | `camelCase` | `submitApplication` |
| React components | `PascalCase` | `FlagBadge`, `ProjectPassport` |
| REST paths | plural nouns, kebab if needed | `GET /api/v1/projects/:id/stages` |
| JSON attributes | `camelCase` | `identificationLevel` |
| Database tables / columns | `snake_case` | `kya_results.rule_version` |
| Prisma models | `PascalCase` matching the English table | `model KyaResult` |
| Enums | match TZ vocabulary in English | `AUTO`, `ONLINE`, `PHYSICAL`, `PLANNED` for bayraqlar |
| Application numbers | TZ format | `INV-2026-00412` |
| Requirement IDs | unchanged from TZ | `FR-KYA-04`, `WF-03`, `NFR-02` |
| Env vars | `SCREAMING_SNAKE_CASE` | `DATABASE_URL`, `JWT_ACCESS_SECRET` |

### Domain glossary (do not invent synonyms)

The TZ forbids synonyms (TZ §2). Use these English identifiers in code; UI copy uses the Azerbaijani (or other locale) term.

| TZ term | Code name |
| --- | --- |
| İstifadəçi | `User` |
| Profil | `Profile` |
| Nümayəndəlik | `Representation` |
| Layihə | `Project` |
| Mərhələ | `Stage` |
| KYA nəticəsi | `KyaResult` |
| Müraciət | `Application` |
| Case | `Case` |
| Tapşırıq | `Task` |
| Qiymətləndirmə | `Evaluation` |
| Sənəd | `Document` |
| Mesaj | `Message` |
| Bildiriş | `Notification` |
| Qayda dəsti | `RuleSet` |
| Ödəniş | `Payment` |
| Audit qeydi | `AuditRecord` |
| Bayraq | `Flag` |
| Ombudsman / Aftercare | same words; **no Phase 1 modules** |

Do not name Aftercare tickets “sorğu”. Do not name cases “ticket” in the UI.

---

## 5. Who works where

| Agent | Owns | May read | Must not |
| --- | --- | --- | --- |
| **Database Specialist** | `server/prisma/`, `server/src/db/` | TZ §4.3, `docs/PLAN.md` §3 | Product UI; new REST routes; invent tables not in PLAN §3 |
| **Backend API Specialist** | `server/src/` (except rewriting Prisma unilaterally) | Prisma schema, TZ modules 6–21, 25.1 | `client/` UI; Phase 2 APIs (PAY, OMB, AFT, DVX submit, bank) |
| **Frontend Specialist** | `client/` | API DTOs, TZ UI-01…09, §4.2, §6–8, §10–14, §19, §23–24 | New tables; server business rules; calling APIs that are not implemented |
| **QA Security Reviewer** | Tests, security notes, CI test scripts | Entire repo | Shipping features; weakening auth “to make tests pass”; adding production secrets |

Shared files (`docs/`, `AGENTS.md`, `README.md`, `docker-compose.yml`, `.env.example`): coordinate in the PR. Database Specialist owns `DATABASE_URL`; Backend owns auth/app secrets; nobody commits real secrets.

`.env.example` lists only variables the code actually reads. Do not invent government API keys, table names, or business rules that are not in the TZ.

---

## 6. Phase 1 folder map

Create folders when implementation starts, not before.

```text
client/src/pages/public/**          Frontend
client/src/pages/cabinet/**         Frontend
client/src/pages/backoffice/**      Frontend
client/src/features/**              Frontend (by TZ prefix)
client/src/components/**            Frontend

server/prisma/**                    Database Specialist
server/src/db/**                    Database Specialist
server/src/modules/**               Backend API Specialist
server/src/services/**              Backend API Specialist
server/src/middleware/**            Backend API Specialist
server/src/services/integrations/** Backend (stubs only in Phase 1)

**/*.test.ts / **/*.spec.ts         QA Security Reviewer (plus authors add tests with their code)
```

Do not add `server/src/modules/ombudsman`, `aftercare`, or `payments` in Phase 1. The Phase 1 «Şikayət et» fallback is a **task** on the supervisor in Case Management (`modules/cases`), not an Ombudsman module.

---

## 7. Cross-agent contract

1. Database Specialist merges schema before Backend depends on new columns.
2. Backend publishes DTO types (or OpenAPI) before Frontend binds screens.
3. Frontend never stores a second copy of case status.
4. QA reviews authz, audit, snapshots, and forbidden copy on every PR that touches those areas.
5. Guest session answers survive registration (FR-AUTH-04) — Backend + Frontend share one session-key design.
6. Public home KPIs render only from **approved** analytics data (FR-HOME-04); otherwise omit the strip.

---

## 8. Pull requests

- Branch names: `cursor/<topic>-e62a` (existing Cloud Agent convention).
- One concern per PR when possible (schema, then API, then UI).
- PR description lists TZ requirement IDs covered (`FR-…`, `WF-…`, `NFR-…`).
- No generated `node_modules`, no real `.env`, no ID scans or production dumps.
