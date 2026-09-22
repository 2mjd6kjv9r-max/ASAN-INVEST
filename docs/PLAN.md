# ASAN Invest — Phase 1 (MVP) Implementation Plan

**Source of truth:** [`ASAN_Invest_TZ_v4.0.md`](../ASAN_Invest_TZ_v4.0.md) (v4.0).  
If this plan and the TZ disagree, the TZ wins.

This document covers only **Mərhələ 1 — Əsas platforma** (TZ §25.1). It does not authorise Phase 2 or Phase 3 work.

Phase 1 already has a PostgreSQL schema and an Express API on `main`. **New backend work targets ASP.NET Core Web API (C#) + EF Core**, not further Express features. The HTTP contract from that Express work is frozen in [`docs/api.md`](api.md) and must be preserved (routes, `/api/v1` prefix, JSON shapes). Do not invent new tables, government APIs, or environment variables beyond what `.env.example` and `docs/api.md` already document.

---

## 1. Technology stack

The TZ does not prescribe languages or frameworks. The stack below is chosen to implement TZ modules as a **modular monolith** (open portal + cabinet + back-office), with REST as the integration style until institution APIs exist.

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | **React + TypeScript** (Vite) | Three environments share one component system (UI-01): açıq portal, şəxsi kabinet, back-office. TypeScript keeps role, status, bayraq, and identification-level contracts aligned with the API. React Router maps the site map in TZ §4.2. |
| Styling | **Tailwind CSS** | ASAN Invest brand language is a dark navy palette, white surfaces, and a strict government look (TZ §24.1). Utility tokens can encode AVTO / ONLAYN / FİZİKİ / PLAN colours (UI-03) without a second design runtime. |
| i18n | **i18next** (or equivalent) | UI-04 requires Azərbaycan (default), English, Russian, Turkish, Arabic with RTL for Arabic. Legal texts stay Azerbaijani. |
| Backend | **ASP.NET Core Web API (C#)** | Same modular monolith as TZ §4.1 and shared services (TZ §21), without microservices. Filters/middleware cover authn/authz (GİR-01…04), validation, and audit. Controllers expose the frozen REST contract in [`docs/api.md`](api.md). Phase 1 has **no state API dependency** (TZ §25.1). |
| Database | **PostgreSQL** | TZ §4.3 is a relational model (1:1, 1:N, N:M, versioned snapshots, immutable audit). PostgreSQL supports `NUMERIC` amounts, `JSONB` snapshots, row-level constraints, and data residency in Azerbaijan (NFR-01) on a local or in-country host. The existing Phase 1 schema (tables, enums, checks) stays canonical. |
| ORM / migrations | **Entity Framework Core** (Npgsql) | Maps C# entities onto the existing PostgreSQL tables (snake_case). EF Core migrations are the schema change path going forward; do not introduce a second parallel schema. |
| API | **REST**, `/api/v1` | Unchanged from the Phase 1 Express API. See §1.1 and [`docs/api.md`](api.md). |
| Auth (Phase 1) | **Email + one-time code / password**; session as **httpOnly refresh cookie + short-lived access JWT** | FR-AUTH-01 and identification level 1. Internal roles require 2FA (NFR-02, TZ §5). **ASAN Login / SİMA** is listed in Phase 1 (TZ §25.1) but is a level-2 integration (TZ §22): implement a provider interface and email path first; do not call a government API that is not specified in this repo. |
| Files | Local disk in development; object storage adapter behind the sənəd servisi | FR-CAB-04 / TZ §21. Malware scan is required before production (NFR-02). |
| Email / SMS | Provider adapters (level 1, TZ §22) | Bildirişlər (FR-NOT-01…06). MVP may log outbound messages if credentials are absent; the adapter stays. |
| Rule engine | In-process, versioned rules in PostgreSQL | Z-06: KYA, təşviq, risk, marşrut, bayraq, and case assignment share one engine. Rules are edited only in İnzibatçılıq (FR-ADM-07, FR-ADM-08). |
| SI (KYA free text) | Optional adapter | FR-KYA-01…02. Phase 1 must work with the **structured form** even if no model provider is configured. The model must not decide procedures (NFR-03); the rule engine does. |

Out of scope for the runtime in Phase 1: GraphQL, Kafka, Kubernetes, a separate CMS product, live payment acquiring, DVX/bank APIs. Do not extend the Express `server/src` tree; replace it with the ASP.NET solution below.

### 1.1. Frozen REST contract

The ASP.NET API **must** keep the conventions already documented from the Phase 1 backend PR ([`docs/api.md`](api.md), [`docs/backend.md`](backend.md)). Frontend and QA treat that file as the contract, not controller class names.

| Convention | Required value |
| --- | --- |
| Prefix | `/api/v1` (health also at `GET /health` and `GET /api/v1/health`) |
| Success body | `{ data, meta? }` |
| Error body | `{ error: { code, message, details? } }` with the same `code` strings (`UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `INTERNAL_ERROR`, `WORKFLOW_PHASE2`, …) |
| JSON names | `camelCase` (`identificationLevel`, `internalStatus`, `publicNumber`) |
| Enums | Prisma/schema names, `SCREAMING_SNAKE` (`INVESTOR`, `BASIC`, `AUTO`, `DRAFT`, …) — not numeric, not PascalCase |
| Money | Decimal **strings** (`"1000.00"`), never JSON numbers |
| Dates | ISO-8601 UTC |
| Auth | `Authorization: Bearer <accessToken>` plus httpOnly cookie `refresh_token` on `/api/v1/auth` |
| Register | `201` + `{ data: { accessToken, user } }` |
| Login | `{ data: { accessToken, user } }` or `{ data: { twoFactorRequired: true, challengeId } }` |
| Logout / reset-password / verify-email | `204` empty body |
| Roles | `INVESTOR`, `CASE_MANAGER`, `SUPERVISOR`, `INSTITUTION_REP`, `EVALUATOR`, `CONTENT_MANAGER`, `ANALYST`, `SYSADMIN` |
| Case `internalStatus` | `DRAFT`, `SUBMITTED`, `REGISTERED`, `IN_EVALUATION`, `WAITING_ADDITIONAL_INFO`, `ASSIGNED_FOR_EXECUTION`, `UNDER_REVIEW`, `INTER_AGENCY_COORDINATION`, `RESULT_BEING_PREPARED`, `COMPLETED`, `REJECTED`, `WITHDRAWN`, `ARCHIVED` |
| Listen | Port **4000** in development (`CLIENT_ORIGIN` CORS + credentials) |

Route table (do not rename or nest differently): see [`docs/api.md`](api.md). That includes `/auth/*`, `/guest-sessions`, `/pages/:slug`, `/opportunities`, `/classifications`, `/procedures`, `/company-registration`, `/route/calculate|save`, `/incentives/evaluate|save`, `/kya/evaluate|save`, `/me/profile`, `/me/consents`, `/me/representations`, `/cabinet/dashboard`, `/projects`, `/application-types`, `/applications` (+ `validate` / `submit` / `withdraw`), `/cases` (+ `transition` / `assign` / `close` / `reopen` / `extend` / `extra-info` / `complaint` / `sla/tick`), `/evaluations`, `/documents`, `/notifications`, `/admin/*`, `/analytics/overview`.

---

## 2. Folder structure

Target layout for the ASP.NET backend (replaces the Express `server/src` + Prisma tree). `client/` is unchanged.

```text
ASAN-INVEST/
  AGENTS.md
  ASAN_Invest_TZ_v4.0.md
  README.md
  docs/
    PLAN.md
  docker-compose.yml
  .env.example
  client/                         # React SPA — Frontend Specialist
    src/
      app/                        # router, providers, i18n, auth gate
      pages/
        public/                   # açıq portal (HOME, WHY, OPP, GUIDE, TRN, ABOUT, ROUTE, INC, KYA, AUTH)
        cabinet/                  # şəxsi kabinet (CAB, PROJ, APP, PROF)
        backoffice/               # CASE, EVAL, WF, ADM, REP
      features/                   # one folder per TZ module prefix
        auth/
        profile/
        route/
        incentive/
        kya/
        cabinet/
        projects/
        applications/
        cases/
        evaluations/
        notifications/
        admin/
        analytics/
      components/                 # shared UI: bayraq, status, layout, forms
      lib/                        # API client, session, flags, copy
      styles/
  server/                         # ASP.NET solution — Backend + Database Specialists
    AsanInvest.sln
    AsanInvest.Api/               # Web API host (controllers, middleware, Program.cs)
      Controllers/                # one controller area per TZ module / docs/api.md route group
        AuthController.cs
        GuestSessionsController.cs
        PortalController.cs
        ToolsController.cs        # route, incentives, kya
        ProfileController.cs
        CabinetController.cs
        ProjectsController.cs
        ApplicationsController.cs
        CasesController.cs
        EvaluationsController.cs
        DocumentsController.cs
        NotificationsController.cs
        AdminController.cs
        AnalyticsController.cs
        HealthController.cs
      Middleware/
      appsettings.json
    AsanInvest.Application/       # use-cases, DTOs matching docs/api.md, FluentValidation
    AsanInvest.Domain/            # entities, enums, workflow/KYA/route rules (no I/O)
    AsanInvest.Infrastructure/    # EF Core, Npgsql, adapters
      Persistence/                # DbContext, configurations, migrations, seed — Database Specialist
      Integrations/               # asanLogin, email, sms, aiKya stubs — Backend
    AsanInvest.Api.Tests/         # xUnit / WebApplicationFactory — QA + authors
  packages/shared/                # optional later: OpenAPI client for the React app
```

**Ownership:** see `AGENTS.md`. Do not add Phase 2 module folders (`ombudsman`, `aftercare`, `payments`) in Phase 1 except where TZ §25.1 requires a fallback (e.g. «Şikayət et» → nəzarətçi tapşırığı).

---

## 3. Data model (TZ §4.3)

Developer skeleton from the TZ. Each object has one owner module; other modules **read** it and do not mutate it (TZ §4.3).

Status of a müraciət / mərhələ / kabinet view has a **single source**: Case Management (Z-03). Cabinet, passport, and notifications display that status; they do not store a parallel copy.

### 3.1. Relationships

```text
users 1 ── 1 profiles
profiles 1 ── N representations
profiles 1 ── N projects
profiles 1 ── N kya_results
profiles 1 ── N applications          # only when Z-02 “layihə olmayan ümumi hal”

projects 1 ── N stages
projects 1 ── N applications
projects 1 ── N kya_results           # 0..1 bound when project is created
projects 1 ── N payments              # Phase 2 processing; object exists in §4.3

applications 1 ── 1 cases
applications N ── 1 projects | profiles
cases 1 ── N tasks
cases 1 ── N evaluations
evaluations N ── 1 users              # identity/PEP check target

documents N ── M profiles, projects, applications
messages N ── 1 applications
notifications N ── 1 users
systemic_problems N ── M applications # Phase 2 (Ombudsman)
rule_sets 1 ── N versioned results (KYA, incentive, route, evaluation)
audit_records ── all objects
```

### 3.2. Objects (as specified)

Table names are English snake_case for code. TZ names stay in comments and in this document.

#### `users` — İstifadəçi (owner: Giriş və profil)

| Field (proposed) | TZ attribute |
| --- | --- |
| `id` | identity |
| `roles[]` | Rol(lar) — TZ §5: qonaq is unauthenticated; investor / case_manager / supervisor / institution_rep / evaluator / ombudsman_officer / content_manager / analyst / sysadmin |
| `identification_level` | 1 Əsas \| 2 Hüquqi (TZ §7.2) |
| `locale` | Dil (UI-04) |
| `consents` + `consent_version` + `consented_at` | Razılıqlar (FR-PROF-03) |
| `auth_provider` | email \| asan_login (adapter) |
| `email`, `password_hash`, `email_verified_at` | FR-AUTH-01, FR-AUTH-03 |
| `two_factor_enabled` | mandatory for internal roles (NFR-02) |
| `status` | active / disabled (FR-ADM-01) |
| `institution_id` | qurum mənsubiyyəti (GİR-02, FR-ADM-01) |

Relation: **1:1 Profil**.

#### `profiles` — Profil (owner: Giriş və profil)

| Field (proposed) | TZ attribute |
| --- | --- |
| `user_id` | 1:1 İstifadəçi |
| `country` | Ölkə |
| `sector` | Sektor |
| `activity_area` | Fəaliyyət sahəsi |
| `contacts` | Əlaqə |
| `company_name`, `company_country`, `company_reg_id`, `tax_id`, `company_activity` | Şirkət rekvizitləri |
| `ubo_structure` | UBO |
| `version` + history table `profile_versions` | Versiya tarixçəsi (FR-PROF-02) |
| guest-session answers copied at register | FR-AUTH-04 |

Relation: **1:N Layihə**.

#### `representations` — Nümayəndəlik (owner: Giriş və profil)

| Field (proposed) | TZ attribute |
| --- | --- |
| `profile_id` | N:1 Profil |
| `representative_user_id` | Nümayəndə istifadəçi |
| `authority` | baxış \| hazırlama \| imza (FR-PROF-04) |
| `power_of_attorney_document_id` | Etibarnamə |
| `valid_from`, `valid_to`, `revoked_at` | Müddət; istənilən vaxt ləğv |

#### `projects` — Layihə (owner: Layihə pasportu)

| Field (proposed) | TZ attribute |
| --- | --- |
| `name` | Ad |
| `sector` | Sahə |
| `territory` | Ərazi |
| `volume_amount`, `volume_currency` | Həcm |
| `size_category` | kiçik \| böyük (hədd FR-ADM-07) |
| `company_ref` | Şirkət (profile company / VÖEN when known) |
| `permanent_case_manager_id` | Təyin edilmiş case manager (FR-PROJ-05) |
| `status` | Hazırlıq → İcra → İstismar → Dayandırılıb / Bağlanıb (FR-PROJ-08) |

Relations: **1:N Mərhələ, Müraciət, KYA nəticəsi, Ödəniş**.

#### `stages` — Mərhələ (owner: Layihə pasportu)

| Field (proposed) | TZ attribute |
| --- | --- |
| `project_id` | N:1 Layihə |
| `procedure_id` | Prosedur (kataloq FR-ADM-08) |
| `flag` | AVTO \| ONLAYN \| FİZİKİ \| PLAN |
| `sort_order` | Sıra |
| `status` | **Derived** from linked case (TZ §10.2, Z-03): Kilidli, Açıq, İcrada, Cavabınız gözlənilir, Tamamlandı, Problemli, Tətbiq edilmir |
| `expected_duration`, `actual_started_at`, `actual_completed_at` | Gözlənilən və faktiki müddət |
| `application_id` | 0..1 Müraciət |

Do not persist a writable copy of mərhələ status that can diverge from the case.

#### `kya_results` — KYA nəticəsi (owner: KYA)

| Field (proposed) | TZ attribute |
| --- | --- |
| `profile_id` | N:1 Profil |
| `project_id` | 0..1 Layihə (bound when project is created, FR-PROJ-01) |
| `input_parameters` (json, investor-confirmed) | Giriş parametrləri (FR-KYA-02: unconfirmed params never go to rules) |
| `procedures[]` | Prosedur siyahısı + explanation (FR-KYA-07) |
| `rule_set_id` + `rule_version` | Qayda versiyası (Z-05) |

#### `applications` — Müraciət (owner: Vahid Müraciət)

| Field (proposed) | TZ attribute |
| --- | --- |
| `public_number` | Nömrə (FR-APP-03), e.g. INV-2026-00412 |
| `type_id` | Növ (TZ §11.1; configured FR-ADM-03) |
| `workflow` | Standart \| Ombudsman \| Aftercare — Phase 1 implements **Standart** only |
| `snapshot` (jsonb, immutable at submit) | Təqdim nüsxəsi (FR-APP-04) |
| `investor_status` | Investor görünüşü — **display of case status** (TZ §14.1 mapping), not a second state machine |
| `project_id` / `profile_id` | N:1 Layihə **və ya** Profil (Z-02) |
| `case_id` | 1:1 Case (created at submit, FR-CASE-01) |
| `source` | pasport mərhələsi \| imkan kartı \| yeni müraciət (FR-APP-06) |

Phase 1 application types from TZ §11.1 that use Standart workflow and do not require Phase 2 modules: investisiya niyyəti, konkret layihəyə maraq, konsultasiya, tərəfdaşlıq təklifi, pasport mərhələsi müraciəti. Ombudsman and Aftercare types wait for Phase 2; «Şikayət et» in Phase 1 creates a **nəzarətçi tapşırığı** (TZ §25.1).

#### `cases` — Case (owner: Case Management)

| Field (proposed) | TZ attribute |
| --- | --- |
| `internal_status` | Daxili status (TZ §14.1) |
| `case_manager_id` | Case manager |
| `sla_due_at` and related timestamps | Müddətlər (WF-01) |
| `final_result` | Yekun nəticə (FR-CASE-06, WF-06) |
| `category` | növ, sahə, region, qurum (FR-CASE-01) |

Relations: **1:N Tapşırıq; 0..N Qiymətləndirmə**.

#### `tasks` — Tapşırıq (owner: Case Management)

| Field (proposed) | TZ attribute |
| --- | --- |
| `case_id` | N:1 Case |
| `institution_id` | Qurum |
| `assignee_user_id` | İcraçı |
| `due_at` | Son tarix |
| `status` | Status |
| `opinion` | Rəy |
| `document_ids[]` | Sənədlər |

Institution representatives see only their institution’s tasks (GİR-02).

#### `evaluations` — Qiymətləndirmə (owner: İlkin qiymətləndirmə)

| Field (proposed) | TZ attribute |
| --- | --- |
| `case_id` | N:1 Case |
| `user_id` | N:1 İstifadəçi (identity / PEP check, FR-EVAL-01) |
| `route` | Marşrut: avtomatik sanksiya/PEP; and/or ekspert, səfirlik, ticarət nümayəndəliyi |
| `evaluator_id` | Qiymətləndirici |
| `opinion` | Rəy |
| `criteria_used` | İstifadə edilmiş meyarlar |
| `list_version` | Siyahı versiyası |
| `started_at`, `due_at`, `status` | FR-EVAL-03 |

Automatic PEP/sanctions result is stored on the **user** and reused; it is not repeated per application (FR-EVAL-01).

#### `documents` — Sənəd (owner: Sənəd servisi)

| Field (proposed) | TZ attribute |
| --- | --- |
| `type_id` | Növ |
| `version` | Versiya |
| `valid_until` | Etibarlılıq müddəti (30-day notice: FR-CAB-04, FR-NOT-01) |
| `source` | yüklənib \| generasiya |
| M:N links | Profil, Layihə, Müraciət |

#### `messages` — Mesaj (owner: Kabinet — Mesajlar)

| Field (proposed) | TZ attribute |
| --- | --- |
| `application_id` | N:1 Müraciət |
| `sender_user_id` | Göndərən |
| `body` | Mətn |
| `attachment_ids` | Əlavələr |
| `created_at` | Tarix |

#### `notifications` — Bildiriş (owner: Bildirişlər)

| Field (proposed) | TZ attribute |
| --- | --- |
| `user_id` | N:1 İstifadəçi |
| `event_type` | Hadisə (FR-NOT-01 list) |
| `channel` | portal \| email \| sms |
| `delivery_result` | Göndəriş nəticəsi |
| `read_at` | Oxunma |
| `body` | No PII in channel copy (FR-NOT-06) |

#### `systemic_problems` — Sistemli problem (owner: Ombudsman)

TZ §4.3 object. **Do not implement behaviour in Phase 1** (Ombudsman is Phase 2). Schema may be reserved or deferred; no Phase 1 API.

| Field (proposed) | TZ attribute |
| --- | --- |
| `category`, `institution_id`, `cause`, `reform_status` | Kateqoriya, qurum, səbəb, islahat statusu |
| M:N applications | N:M Müraciət |

#### `rule_sets` — Qayda dəsti (owner: İnzibatçılıq)

| Field (proposed) | TZ attribute |
| --- | --- |
| `kind` | KYA, təşviq, risk, marşrut, bayraq, case təyinatı, ölçü həddi, passivlik həddi, … (FR-ADM-07) |
| `version` | Versiya |
| `effective_at` | Qüvvəyəminmə tarixi |
| `approved_by` | Təsdiq edən |
| `body` | Versioned rules payload |

All KYA / incentive / route results store the `rule_set` version they used (Z-05).

#### `payments` — Ödəniş (owner: Ödənişlər)

TZ §4.3 object. **No payment processing in Phase 1** (state fees are paid on existing e-services, TZ §25.1). Keep state fee vs partner fee unmixed if the table is created (FR-PAY, TZ §20).

| Field (proposed) | TZ attribute |
| --- | --- |
| `kind` | dövlət rüsumu \| tərəfdaş xidməti |
| `amount`, `currency` | Məbləğ |
| `status` | Status |
| `receipt_document_id` | Qəbz |
| `project_id` / `application_id` | N:1 Layihə və ya Müraciət |

#### `audit_records` — Audit qeydi (owner: Audit servisi)

| Field (proposed) | TZ attribute |
| --- | --- |
| `actor_user_id` | Kim |
| `action` | Nə |
| `occurred_at` | Nə vaxt |
| `before`, `after` | Əvvəlki və yeni dəyər |
| `object_type`, `object_id` | Bütün obyektlər |

Immutable (TZ §21.1). Events listed in TZ §21.1 must be written. Search only for authorised users.

### 3.3. Supporting configuration (not extra §4.3 business objects)

Required so that §4.3 attributes have somewhere to live in Phase 1 İnzibatçılıq:

| Table | Purpose | TZ |
| --- | --- | --- |
| `classifications` | sahə, fəaliyyət, region, ölkə, zona/park, qurum, sənəd növü | FR-ADM-02 |
| `procedures` | prosedur kataloqu: qurum, sənədlər, müddət, ödəniş, hüquqi əsas, asılılıq, e-xidmət keçidi, bayraq | FR-ADM-08 |
| `application_types` | form fields, required documents, workflow, identification level | FR-ADM-03, §11.1 |
| `workflow_statuses` / transitions | Standart workflow in Phase 1 (TZ §14.1) | FR-ADM-03, WF-* |
| `cms_content` | açıq portal pages, FAQ, files; draft → approval → publish → archive | FR-ADM-05, FR-ADM-06 |
| `notification_templates` | event × role × locale × channel | FR-ADM-09, FR-NOT-02 |
| `guest_sessions` | route / KYA / incentive answers before register | FR-AUTH-04, FR-ROUTE-05 |

### 3.4. Integrity rules from the TZ (must be enforced in the schema or transactions)

| ID | Rule |
| --- | --- |
| Z-01 | Never re-ask data already on profile, project, or documents. |
| Z-02 | Every application links to a project, or to a profile when there is no project. Unlinked applications are invalid. |
| Z-03 | Case `internal_status` is the only stored status; investor and stage views are mappings (TZ §14.1 and §10.2). |
| Z-05 | Results stay bound to the rule version that produced them. |
| FR-APP-04 | Submit snapshot is immutable. |
| FR-CASE-07 | Re-open of a closed case: supervisor only, with reason. |
| GİR-03 | Internal notes, inter-agency correspondence, and service documents are never exposed on investor screens. |

---

## 4. Phase 1 (MVP) modules

From TZ §25.1. Phase 1 **does not depend on any government API**. If an integration is not ready, the institution representative completes tasks in the back-office UI and the step shows the correct bayraq (PLAN / FİZİKİ / ONLAYN).

### In scope

| TZ module | Prefix | Phase 1 meaning |
| --- | --- | --- |
| Açıq portal məzmunu | HOME, WHY, OPP, GUIDE, TRN, ABOUT | CMS-backed public pages (§6.1). Indicators on the home strip only if analytics has **approved** figures (FR-HOME-04); otherwise omit numbers. |
| Marşrut kalkulyatoru | ROUTE | Four questions, estimated result, save via email (§6.2). |
| Təşviq uyğunluğu | INC | Same engine everywhere; criteria only as rule sets (§6.3). |
| Know Your Approvals | KYA | Structured form + rules; optional SI adapter; guest can view, investor can save (§6.4). |
| Giriş və profil | AUTH, PROF | Email registration (level 1); ASAN Login as interface/stub; profile, consents, representatives (§7). |
| Şəxsi kabinet | CAB | Dashboard “Növbəti addımınız”, applications, documents, messages, notifications — **read model over case status** (§8). |
| Layihə pasportu | PROJ | Timeline of stages from KYA; size category; statuses derived from cases (§10). Project may be created by the investor for an existing company (FR-PROJ-01). Full DVX company registration is **not** a Phase 1 module. |
| Vahid Müraciət | APP | Dynamic form, draft, validate, submit, number, snapshot, withdraw (§11). Standart workflow types only. |
| İlkin qiymətləndirmə | EVAL | Automatic sanctions/PEP at first legally significant step for non-residents; manual evaluator queue when rules require it (§12). Provider lists are level 1 (TZ §22). |
| Case Management | CASE | Create case on submit, assign, tasks, desk, consolidate, close (§13). Institutions work in the UI (no API). |
| Statuslar və müddətlər | WF | Standart workflow statuses, SLA, warnings, escalation, extra-info requests (§14). |
| Bildirişlər | NOT | Event-driven portal + email/SMS adapters (§17). |
| İnzibatçılıq | ADM | Users/roles, classifications, application types, workflow, CMS, rule sets, procedures, notification templates (§19). Partner fees and live payment tables: configure later; do not build the payments product. |
| Əsas analitika | REP | Internal dashboards for applications, institutions, case managers, KYA, funnel (FR-REP-01…08, 11). **İctimai hesabat** (FR-REP-09 public dataset, Şəffaflıq live stats) is Phase 2. |

### Phase 1 fallbacks (not full modules)

| Topic | TZ §25.1 behaviour |
| --- | --- |
| Şirkət qeydiyyatı | Redirect to DVX’s **existing** e-service. Do not build FR-REG-* generation/submit. |
| Dövlət rüsumları | Paid on existing e-services, not in-app (no FR-PAY-01). |
| Bank hesabı stage | Tracked as the investor’s direct work with the bank (**FİZİKİ**). No bank API. |
| «Şikayət et» | Until Ombudsman (Phase 2): create a task for the **nəzarətçi** and show the institution’s existing complaint channel (Z-04). |
| Qeyri-rezident | May follow **Marşrut D** in all phases; that route needs no new integration. |

### Out of scope (Phase 2 / 3)

Şirkət qeydiyyatının DVX API ötürülməsi, bank pilotu, Ombudsman workflow, Aftercare, in-app rüsum ödənişi, tərəfdaş kataloqu, ictimai hesabat, qeyri-rezident e-imza, e-rezidentlik (TZ §25.1).

### Shared services required in Phase 1 (TZ §21)

Qayda mühərriki, autentifikasiya, avtorizasiya, sənəd servisi, uyğunluq yoxlaması (sanksiya/PEP), axtarış (basic), audit log, bildiriş göndərişi, inteqrasiya adapter stubs (ASAN Login, email, SMS, optional SI). Ödəniş servisi is Phase 2.

---

## 5. Agent task lists (Phase 1 only)

Each agent works only in the folders named in `AGENTS.md` and only on Phase 1. Backend implementation is the ASP.NET port of the frozen `docs/api.md` contract.

### 5.1. Database Specialist

Folders: `server/AsanInvest.Infrastructure/Persistence/`, EF Core entity configurations and migrations. May read `server/AsanInvest.Domain/` entities; does not add REST controllers.

1. Map EF Core to the **existing** PostgreSQL tables from the Phase 1 schema (English snake_case, TZ names in comments). Preserve column names, enums, JSONB, `NUMERIC(18,2)`, and SQL checks already in the database (Z-02, snapshot/audit triggers).
2. Replace Prisma as the migration tool with EF Core migrations. Do not create a second set of table names.
3. Enums from the TZ only, matching current schema members: identification levels, bayraqlar, project statuses (FR-PROJ-08), case internal statuses (TZ §14.1), investor-visible status mapping, representation authority, document source, notification channels, rule-set kinds.
4. Keep constraints: Z-02 (exactly one of `project_id`, `profile_id`); unique `applications.public_number`; unique `users.email`; 1:1 user↔profile; 1:1 application↔case at submit.
5. `applications.snapshot` and `audit_records` remain append-only (no update of snapshot; no update/delete of audit rows).
6. Money as `numeric(18,2)` / `decimal`; never float. Currencies AZN / USD / EUR (FR-ROUTE-01).
7. Indexes for cabinet and case desk: applications by user/status, cases by assignee/due date/status, tasks by institution and due date, notifications by user unread.
8. Seed (EF or SQL): sysadmin user, Standart workflow statuses and transitions, sample classifications, sample procedures with bayraqlar, one KYA/incentive/route rule-set version, sample CMS pages for HOME/WHY/OPP/GUIDE/ABOUT, notification templates for FR-NOT-01 events that exist in Phase 1.
9. Do **not** seed or migrate Ombudsman/Aftercare extra statuses (TZ §14.2) except a comment that they arrive in Phase 2.
10. `.env.example`: `DATABASE_URL` (Npgsql connection string) only for values this agent owns. Do not invent government API keys.
11. Document data-residency assumption: PostgreSQL host must be in Azerbaijan for production (NFR-01). Dev may use Docker locally.

### 5.2. Backend API Specialist

Folders: `server/AsanInvest.Api/`, `server/AsanInvest.Application/`, `server/AsanInvest.Domain/`, `server/AsanInvest.Infrastructure/Integrations/`. May read the EF model; does not rewrite migrations unilaterally. Implement the **same routes and JSON** as [`docs/api.md`](api.md) — do not invent a new URL scheme while porting off Express.

1. Scaffold ASP.NET Core Web API (`net8.0` or current LTS), MapControllers / minimal hosting in `Program.cs`, `/api/v1` prefix, health checks, FluentValidation, `{ error: { code, message, details? } }` exception handler, request-id, audit. JSON: camelCase, enum strings as in Prisma, money as decimal strings. Listen on port 4000 in development.
2. **Auth:** register/login/verify/logout/refresh/password reset (FR-AUTH-01, 03, 05) on the paths in `docs/api.md`. Session: httpOnly `refresh_token` cookie + access JWT. Identification level 1 on email verify. Keep `201` / `204` / 2FA challenge shapes from §1.1.
3. **ASAN Login / SİMA:** interface + stub that can attach FIN/VÖEN later (FR-AUTH-02). No live government client. `POST /api/v1/auth/asan-login`.
4. **RBAC** (TZ §5, GİR-01…04): every action declares roles; institution_rep scoped by `institutionId`; investor scoped to self; never return internal case notes on investor DTOs (`isInternal: true`).
5. Internal roles: 2FA required (NFR-02); `POST /api/v1/auth/2fa/verify`.
6. **Profile + representations** (FR-PROF-01…04) including version history and consent audit — `GET/PUT /me/profile`, `POST /me/consents`, `GET/POST /me/representations`.
7. Copy **guest session** answers into profile on register (FR-AUTH-04) via `POST/PATCH /guest-sessions`.
8. **Rule engine** in Domain/Application: versioned evaluation for ROUTE, INC, KYA, EVAL routing, case assignment, flags (Z-06). Admin CRUD for rule sets (FR-ADM-07) without breaking old results (Z-05).
9. **ROUTE / INC / KYA** public endpoints (guest) and save-to-cabinet (investor) at `/route/calculate|save`, `/incentives/evaluate|save`, `/kya/evaluate|save`. KYA rejects unconfirmed SI parameters (FR-KYA-02). Structured form works without SI.
10. **Compliance:** sanctions/PEP on first legally significant step for non-residents; store on user (FR-EVAL-01). Adapter for a list provider; stub with explicit “not configured” behaviour. Mismatch → polite stop + human contact (FR-EVAL-05), never an accusation.
11. **Projects + stages** from selected KYA result (FR-PROJ-01, 02). Stage status computed from case (TZ §10.2). Size category from rule threshold (FR-PROJ-05).
12. **Applications:** dynamic fields from `application_types`, draft, validate, submit with number + snapshot + case creation (FR-APP-01…06). Withdrawal with reason (FR-APP-05). Capital-step blocker if incentive preview missing (FR-APP-07) — even if payments are not in Phase 1, do not open a capital step that violates the order.
13. **Evaluations queue** and evaluator opinions (FR-EVAL-02…04).
14. **Cases + tasks:** assignment rules, parallel/sequential tasks, extra-info requests (WF-05), close only when mandatory result fields and all tasks are done (FR-CASE-06), supervisor re-open (FR-CASE-07). Paths: `/cases/:id/transition|assign|close|reopen|extend|extra-info|complaint`, `/cases/sla/tick`.
15. **Workflow engine:** TZ §14.1 transitions, working-day SLAs (WF-01), pause behaviour configurable (WF-02), warn and escalate (WF-03), supervisor-only extend/reassign (WF-04), completion payload (WF-06). Phase 1 «Şikayət et»: supervisor task + external complaint URL, not Ombudsman workflow.
16. **Cabinet read APIs** aggregate; do not duplicate status (FR-CAB-01…06, Z-03).
17. **Documents + messages** services.
18. **Notifications:** emit FR-NOT-01 events; templates by role/locale/channel; log each send attempt; no PII in email/SMS body (FR-NOT-03, 06).
19. **Admin APIs:** FR-ADM-01…09, 11 (not 10 payments/partners product). CMS lifecycle draft → approve → publish → archive. Keep `/admin/*` as in the Express app.
20. **Analytics read APIs** for internal dashboards (FR-REP-01…08, 11). No public unapproved KPIs (FR-HOME-04, FR-REP-09 is Phase 2).
21. **Company registration:** `GET /company-registration` returns the configured DVX URL; no REG document-generation API.
22. Rate-limit auth and public forms; bot protection hook on open forms (NFR-02).
23. Do not implement PAY, OMB, AFT modules, DVX submit, or bank KYC packet APIs.
24. Do not keep adding Express routes. Once the ASP.NET host serves `/api/v1`, retire `server/src` rather than running two APIs.

### 5.3. Frontend Specialist

Folders: `client/`.

1. Vite + React + TypeScript + Tailwind + i18n. Brand: dark navy, white surfaces, no emoji, no forbidden promises (TZ §1.2, UI-07).
2. Shared components: bayraq (colour + icon + text, UI-03), status, forms, skeleton/empty/error (TZ §23), language switch including RTL stub for Arabic (Phase 1 may ship `az` + `en` first if copy is missing, but the i18n framework must support all five UI-04 languages).
3. **Açıq portal** routes per UI-02 and §4.2 / §6.1. Home: two primary actions (FR-HOME-01); registration is secondary. CMS-driven content.
4. **Marşrut kalkulyatoru:** one question per screen (FR-ROUTE-01); result marked «təxmini»; fees as separate lines never summed into one headline number (FR-ROUTE-03); save/PDF requires email (FR-ROUTE-05).
5. **Təşviq uyğunluğu:** Uyğundur / Şərti uyğundur / Uyğun deyil with legal act citation (FR-INC-01, 02).
6. **KYA:** structured form; if SI adapter returns params, show confirm/edit before rules run (FR-KYA-02, 07). Guest can view; login to persist.
7. **Auth screens:** email register/login/verify; «Marşrutum» when a level-2 action is attempted without e-signature (TZ §7.2) — do not show a dead error. ASAN Login button calls stub/interface only.
8. **Kabinet:** “Növbəti addımınız”, application list grouped by investor-visible status (FR-CAB-02), application timeline without internal notes (GİR-03), documents, messages, notifications, profile, representations.
9. **Layihə pasportu:** single timeline; stage cards with bayraq and derived status; locked stages explain why (FR-APP-07 / dependencies).
10. **Vahid Müraciət:** dynamic fields, draft, validation with a concrete fix path (FR-APP-02), snapshot confirmation, withdrawal.
11. **Back-office:** case desk (FR-CASE-05), supervisor queue (escalations, assignment, extend, re-open, Phase 1 complaints), evaluator queue, institution task inbox (own institution only), admin (users, rules, CMS, application types, procedures, templates).
12. Responsive 380–1920px (UI-05). Keyboard access and contrast toward WCAG 2.1 AA (UI-06). `prefers-reduced-motion`.
13. Loading / empty / error / session-expired restore guest answers (TZ §23 items 1–3, 7).
14. Do not build Ombudsman desk, Aftercare desk, partner catalogue, payment checkout, or live public KPI strip with unapproved numbers.
15. Honest copy for company registration: redirect to DVX, never “şirkət avtomatik qeydiyyatdan keçir”.

### 5.4. QA Security Reviewer

Folders: `server/AsanInvest.Api.Tests/` (xUnit) and frontend tests under `client/` as agreed; reviews all diffs. Does not own product features. Contract tests must hit the paths and JSON in [`docs/api.md`](api.md), independent of Express vs ASP.NET.

1. Write a Phase 1 test matrix from TZ: guest value in 60 seconds (portal); resident vs non-resident (TZ §5.2 participants) through register → KYA save → project → application → case → institution task → extra-info → complete.
2. Assert Z-01…Z-06, GİR-01…04, WF-01…06 Phase 1 fallback for «Şikayət et».
3. Auth tests: email verification; session expiry without losing drafts (TZ §23.7); 2FA gate for internal roles; ASAN Login stub cannot be used to escalate to level 2 without a real provider.
4. Authorisation tests: investor cannot read another investor’s data; institution_rep cannot see other institutions; investor DTOs exclude internal notes (GİR-03); field-level denial where marked (GİR-04).
5. Status mapping tests: cabinet, passport, and notifications always match case `internal_status` (Z-03, TZ §14.1 / §10.2).
6. Snapshot immutability after submit (FR-APP-04); profile edit does not change submitted copy.
7. Rule versioning: changing FR-ADM-07 does not rewrite old KYA results; user is offered recalculation (Z-05, TZ §23.12).
8. PEP/sanctions: stored once per user; polite stop UI (FR-EVAL-05).
9. SLA / escalation: warning before due, escalate after due, supervisor-only extend (WF-03, WF-04). Working-day calendar as configured.
10. Notification tests: no PII in email/SMS fixtures (FR-NOT-06); mandatory service notifications cannot be disabled (FR-NOT-05).
11. Security review: secrets only in env; cookies `Secure`/`HttpOnly`/`SameSite`; password hashing; rate limits; file type/size limits; no invented government endpoints; audit trail for TZ §21.1 events; SQL injection / XSS / CSRF on cookie session.
12. NFR checks that can be automated now: open portal pages aim < 3s in a local prod build (NFR-06); no storage of SI training data (NFR-03).
13. Regression list for forbidden UI promises (TZ §1.2).
14. Explicitly **not** testing Phase 2: DVX API submit, bank APIs, Ombudsman/Aftercare workflows, in-app payments, public transparency KPIs.

---

## Document control

| Item | Value |
| --- | --- |
| Based on | ASAN_Invest_TZ_v4.0.md |
| Scope | Mərhələ 1 only (§25.1) |
| HTTP contract | [`docs/api.md`](api.md) (Phase 1 backend PR) — do not break |
| Backend runtime | ASP.NET Core Web API (C#) + EF Core + PostgreSQL |
