# AGENTS.md

Shared rules for every agent working on ASAN Invest.

**Source of truth:** `ASAN_Invest_TZ_v4.0.md` (v4.0).  
**Phase 1 plan:** `docs/PLAN.md`.  
If an agent instruction, this file, and the TZ disagree, the TZ wins.

Phase 1 only until the TZ’s Mərhələ 2 is opened. New backend work is **ASP.NET Core**, not further Express. Keep the HTTP contract in `docs/api.md`.

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
| Backend | ASP.NET Core Web API (C#), current LTS (`net8.0` or newer LTS) |
| API | REST JSON, prefix `/api/v1`, contract frozen in `docs/api.md` |
| Database | PostgreSQL, Entity Framework Core (Npgsql) |
| Auth (Phase 1) | Email + verification; httpOnly `refresh_token` cookie + short-lived access JWT; 2FA for internal roles |
| ASAN Login / SİMA | Interface + stub; no live government client until a real spec exists in-repo |
| Validation | FluentValidation on the API; Zod (or equivalent) on React forms |
| JSON | camelCase properties; enum **strings** matching schema members (`INVESTOR`, `DRAFT`, `AUTO`); money as decimal strings |
| Dates | UTC in the database; ISO-8601 in JSON; display in Asia/Baku unless the user locale implies otherwise |
| Money | PostgreSQL `NUMERIC` / C# `decimal`; JSON decimal strings; never IEEE floats |

Do not add GraphQL, extra microservices, Redis, Kafka, or a second CMS product in Phase 1 without an explicit change to this file and the TZ plan. Do not add new Express routes.

---

## 3. Coding style

### Frontend (React)

- TypeScript `strict`. No `any` except at a documented integration boundary.
- One feature folder per TZ prefix under `client/src/features/`.
- Format with Prettier. ESLint with the TypeScript parser.
- Tests under `client/src/features/<name>/`.

### Backend (ASP.NET Core)

- Nullable reference types on. Treat warnings as errors in CI.
- File-scoped namespaces, `PascalCase` types/methods, `camelCase` locals.
- Request/response DTOs are records whose JSON matches `docs/api.md` (camelCase via `JsonNamingPolicy.CamelCase`).
- Enum members keep schema names (`INVESTOR`, `WAITING_ADDITIONAL_INFO`) so `JsonStringEnumConverter` emits the frozen strings — not integers, not PascalCase.
- Decimal money custom converter: JSON strings (`"1000.00"`), not numbers.
- Business rules live in Domain/Application (especially the **qayda mühərriki**), not in controllers or React components.
- Controllers: authenticate/authorize, bind, call one service, return `{ data, meta? }`. No EF queries in controllers.
- Every mutating endpoint writes an **audit** record when the event is in TZ §21.1.
- Format with `dotnet format` (EditorConfig).
- Tests: xUnit + `WebApplicationFactory` in `server/AsanInvest.Api.Tests/`.

### All agents

- Errors: `{ error: { code, message, details? } }`. Messages tell the user what happened and how to fix it (UI-07, TZ §23.3). No emoji. No forbidden phrases from TZ §1.2.
- Comments in English. Requirement IDs from the TZ stay in comments when a rule is implemented, e.g. `// FR-APP-04 snapshot immutable`.
- HTTP paths, status codes, cookie name `refresh_token`, and DTO field names stay as in `docs/api.md`. Porting Express to ASP.NET is not a chance to restyle the API.

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
| C# projects / namespaces | `AsanInvest.<Layer>` | `AsanInvest.Api`, `AsanInvest.Domain` |
| C# types / controllers | `PascalCase` | `KyaResult`, `CasesController` |
| C# methods / locals | `PascalCase` / `camelCase` | `SubmitApplication`, `accessToken` |
| TypeScript types (client) | `PascalCase` | `KyaResult`, `CaseInternalStatus` |
| React components | `PascalCase` | `FlagBadge`, `ProjectPassport` |
| Client feature folders | kebab-case TZ prefix | `client/src/features/kya/` |
| REST paths | frozen in `docs/api.md` | `GET /api/v1/projects`, `POST /api/v1/applications/:id/submit` |
| JSON attributes | `camelCase` | `identificationLevel` |
| Database tables / columns | `snake_case` (existing schema) | `kya_results.rule_version` |
| EF Core entities | `PascalCase` matching the English table | `class KyaResult` → table `kya_results` |
| Enums (JSON + DB) | schema members, `SCREAMING_SNAKE` | `AUTO`, `ONLINE`, `PHYSICAL`, `PLANNED` |
| Application numbers | TZ format | `INV-2026-00412` |
| Requirement IDs | unchanged from TZ | `FR-KYA-04`, `WF-03`, `NFR-02` |
| Env vars | `SCREAMING_SNAKE_CASE` | `DATABASE_URL`, `JWT_ACCESS_SECRET`, `PORT=4000` |

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
| **Database Specialist** | `server/AsanInvest.Infrastructure/Persistence/` (DbContext, configurations, migrations, seed) | TZ §4.3, `docs/PLAN.md` §3, existing PostgreSQL tables | Product UI; new REST routes; invent tables not in PLAN §3; a second schema next to the current one |
| **Backend API Specialist** | `server/AsanInvest.Api/`, `Application/`, `Domain/`, `Infrastructure/Integrations/` | EF model, `docs/api.md`, TZ modules 6–21, 25.1 | `client/` UI; Phase 2 APIs (PAY, OMB, AFT, DVX submit, bank); changing URL paths or JSON names; new Express code |
| **Frontend Specialist** | `client/` | `docs/api.md` DTOs, TZ UI-01…09, §4.2, §6–8, §10–14, §19, §23–24 | New tables; server business rules; calling APIs that are not implemented |
| **QA Security Reviewer** | `server/AsanInvest.Api.Tests/`, frontend tests, security notes, CI | Entire repo | Shipping features; weakening auth “to make tests pass”; adding production secrets |

Shared files (`docs/`, `AGENTS.md`, `README.md`, `docker-compose.yml`, `.env.example`): coordinate in the PR. Database Specialist owns `DATABASE_URL`; Backend owns auth/app secrets; nobody commits real secrets.

`.env.example` lists only variables the code actually reads. Do not invent government API keys, table names, or business rules that are not in the TZ.

---

## 6. Phase 1 folder map

Create the ASP.NET projects in these folders. Do not add features to the legacy Express tree.

```text
client/src/pages/public/**                              Frontend
client/src/pages/cabinet/**                             Frontend
client/src/pages/backoffice/**                          Frontend
client/src/features/**                                  Frontend (by TZ prefix)
client/src/components/**                                Frontend

server/AsanInvest.Infrastructure/Persistence/**        Database Specialist
server/AsanInvest.Api/**                                Backend API Specialist
server/AsanInvest.Application/**                        Backend API Specialist
server/AsanInvest.Domain/**                             Backend (+ Database for entity shapes)
server/AsanInvest.Infrastructure/Integrations/**        Backend (stubs only in Phase 1)
server/AsanInvest.Api.Tests/**                          QA Security Reviewer (plus authors)

client/**/*.test.ts                                     QA + Frontend
```

Do not add Ombudsman, Aftercare, or Payments projects in Phase 1. The Phase 1 «Şikayət et» fallback is a **task** on the supervisor in Case Management (`CasesController`), not an Ombudsman module.

The Express tree under `server/src` and Prisma under `server/prisma` are legacy once the ASP.NET host is live. Do not add features there.

---

## 7. Cross-agent contract

1. Database Specialist merges EF mappings/migrations before Backend depends on new columns. Map to the existing PostgreSQL tables; do not fork the schema.
2. Backend keeps `docs/api.md` in sync if a field is added; Frontend binds only those paths. Prefer OpenAPI generated from ASP.NET for the React client.
3. Frontend never stores a second copy of case status.
4. QA reviews authz, audit, snapshots, and forbidden copy on every PR that touches those areas.
5. Guest session answers survive registration (FR-AUTH-04) — Backend + Frontend share one session-key design.
6. Public home KPIs render only from **approved** analytics data (FR-HOME-04); otherwise omit the strip.

---

## 8. Pull requests

- Branch names: `cursor/<topic>-e62a` (existing Cloud Agent convention).
- One concern per PR when possible (schema, then API, then UI).
- PR description lists TZ requirement IDs covered (`FR-…`, `WF-…`, `NFR-…`).
- No generated `node_modules`, `bin/`, `obj/`, no real `.env`, no ID scans or production dumps.
