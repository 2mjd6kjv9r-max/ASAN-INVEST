# ASAN Invest — Phase 2 (Mərhələ 2) Implementation Plan

**Source of truth:** [`ASAN_Invest_TZ_v4.0.md`](../ASAN_Invest_TZ_v4.0.md) §25.1 (and the module sections cited below).  
**Phase 1 plan (unchanged):** [`docs/PLAN.md`](PLAN.md).  
**HTTP contract style (unchanged):** [`docs/api.md`](api.md). Phase 2 **adds** routes; it does not rename Phase 1 paths or JSON shapes.

If this document and the TZ disagree, the TZ wins. Do not implement until this plan is approved.

Phase 1 on `main` is complete (README). This document only covers **Mərhələ 2 — Əməliyyat inteqrasiyaları**.

---

## 0. How Phase 2 relates to Phase 1

TZ §25.1: integrations are level-2 (protocol + API). **If a protocol is not signed, the platform does not stop** — the institution representative (or bank staff as `INSTITUTION_REP`) completes the work in back-office, and the step keeps the correct bayraq (`PLAN` / `PHYSICAL` / `ONLINE`).

Phase 1 fallbacks that Phase 2 **replaces**:

| Phase 1 fallback | Phase 2 behaviour |
| --- | --- |
| `GET /company-registration` returns DVX URL only | Electronic package submit to DVX when the adapter is configured; otherwise keep redirect + `PLAN` |
| State fees paid on external e-services | In-app state-fee checkout (FR-PAY-01) when a payment provider protocol exists |
| «Bank hesabı» tracked as investor’s private bank visit (`PHYSICAL`) | Two-bank KYC pilot: packet send + case per bank (FR-REG-05…07) |
| `POST /cases/:id/complaint` → supervisor task + external URL | Opens an **Ombudsman** application on the rejected case (WF-06, FR-OMB) |
| `analytics/overview.publicKpisApproved = false`; Ombudsman page is copy-only | Approved anonymous public dataset on Şəffaflıq / home (FR-REP-09, FR-TRN-02, FR-HOME-04) |

---

## 1. In-scope modules (TZ §25.1 only)

Quoted from the TZ Phase 2 row: *Şirkət qeydiyyatının DVX ilə elektron ötürülməsi, bank pilotu (2 bank), Ombudsman, Aftercare, dövlət rüsumlarının ödənişi, tərəfdaş kataloqu, ictimai hesabat.*

Dependencies named in the TZ: **səviyyə 2 protokolları və API-lər**; **Ombudsman mexanizminin institusional əsası** (§25.3 item 5 still open).

| Module | TZ | Prefix | What Phase 2 delivers |
| --- | --- | --- | --- |
| Şirkət qeydiyyatı — DVX electronic transfer | §9, FR-REG-01…04, §22 DVX | REG | Generate the document package (nizamnamə, qərar, ərizə, etibarnamə templates — Azerbaijani is the legally binding language). Submit electronically to DVX when the adapter is configured. Persist VÖEN / register extract onto the profile and create/bind the Layihə (FR-PROJ-01). If the API is absent, back-office `INSTITUTION_REP` (DVX) records the outcome; investor sees `PLAN` or `ONLINE` honestly. Company-name availability (FR-REG-03) uses the adapter or a manual task. |
| Bank pilot (exactly **2** banks) | FR-REG-05…07, §22 Mərkəzi Bank | REG / CASE | Shared KYC form (UBO, source of funds, FATCA/CRS, activity) filled once; send to at most two pilot banks in parallel. Each send is a **müraciət + case** on the passport «Bank hesabı» stage. Bank staff are `INSTITUTION_REP` scoped to that bank. Outcomes: opened / extra info / refused (bank may omit reason → offer the other bank). SLA text comes from the protocol (FR-REG-06). Remote account opening is **Phase 3** (TZ §22.1) — Phase 2 may still require one `PHYSICAL` signature visit. |
| Ombudsman | §15, §14.2, WF-06 | OMB | Public page + «Müraciət et»; cabinet type «Ombudsman»; back-office Ombudsman desk. Uses Vahid Müraciət (FR-APP-03) with **Ombudsman workflow**. Extra statuses (§14.2). Mediation notes, opinion draft, head approval (FR-OMB-05). Successful recommendation → supervisor re-opens the linked rejected case (FR-OMB-06, FR-CASE-07). Systemic-problem catalogue (FR-OMB-07). Identification level 1 (no e-imza). Production go-live of the public button is gated on TZ §25.3 item 5. |
| Aftercare | §16, §14.2 | AFT | Cabinet type «Aftercare» (never called «sorğu»). Categories FR-AFT-01. Next-contact planning (FR-AFT-02). Passivity warning from DVX activity feed when available (FR-AFT-03, default 60 days from `INACTIVITY_THRESHOLD` rule set — already a `RuleSetKind`). Expansion / reinvestment starts a new KYA + project (FR-AFT-04). Shares systemic-problem catalogue with Ombudsman. |
| Dövlət rüsumlarının ödənişi | §20 FR-PAY-01, FR-PAY-04 | PAY | Online state fees: international card, ASAN ödəniş, and other methods the **signed** provider supports. Local-card-only is forbidden. Receipts land in Sənədlərim. State fee lines never mixed with partner fees. |
| Tərəfdaş kataloqu | FR-PAY-02, FR-PAY-03, FR-ADM-10 | PAY | Accredited partners: service type, price, duration, rating, accreditation status. Investor selects; **contract is between investor and partner**, not ASAN Invest. Selected service binds to a passport stage. |
| İctimai hesabat | FR-REP-09, FR-TRN-02, FR-HOME-04, FR-REP-05 | REP | Anonymous, aggregated, **approved** public dataset: institution average response time and on-time %, generalised Ombudsman stats. Home indicator strip and Şəffaflıq page consume only this approved set. |

### Supporting work that is in Phase 2 because the modules above require it

- **Workflow engine:** add `WorkflowKind.OMBUDSMAN` and `AFTERCARE`, extra internal statuses (§14.2), mappings to investor-visible status (Z-03 still holds).
- **Vahid Müraciət:** allow Ombudsman and Aftercare types (lift `WORKFLOW_PHASE2` rejection). Same draft / validate / submit / number / snapshot / withdraw as Phase 1 (FR-APP-01…05).
- **Case Management:** Ombudsman officer as case actor on OMB workflow (FR-CASE-02 still applies). «Şikayət et» creates OMB application instead of a supervisor-only task.
- **İnzibatçılıq:** FR-ADM-10 (fee table + partners); application types and workflow transitions for OMB/AFT; notification templates for new events (FR-NOT-01: payment, passivity, rule/flag change already listed).
- **Document generation** for REG templates (FR-REG-01) — generated `DocumentSource.GENERATED`.
- **Integration adapters** (stubs until credentials exist): DVX submit + activity status; payment provider + ASAN ödəniş; 2 bank KYC endpoints. No invented request bodies: persist opaque `providerRef` + `rawPayload` until an integration spec is in-repo.

### Out of scope (Phase 3 or not in §25.1)

Do **not** pull these into Phase 2:

- Qeyri-rezident e-imza / virtual FİN / e-qeyri-rezident (TZ §25.1 Mərhələ 3, §22)
- Uzaqdan bank hesabı, e-rezidentlik, xarici e-imzaların tanınması (§22.1)
- Live ASAN Login / SİMA (still a stub unless a separate decision adds it; **not** in the Phase 2 module list)
- ASAN Viza, Miqrasiya, Gömrük, kommunal, notariat, tikinti icazəsi APIs (§22 “dəqiqləşdirilməlidir” — not in the Phase 2 row)
- GraphQL, extra microservices, a second database schema

---

## 2. Data model changes

Build on the **existing Prisma-derived PostgreSQL schema** (snake_case tables) as mapped by EF Core (`AsanInvestDbContext`). Prisma migrations remain the apply path until Database Specialist switches; **do not create a parallel table set**.

Phase 1 already has: `payments` (unused processing; `status` default `'external'`), `UserRole.OMBUDSMAN_OFFICER`, `RuleSetKind.INACTIVITY_THRESHOLD`. Missing: systemic problems, partners, OMB/AFT workflow kinds and extra statuses, payment provider fields, DVX/bank integration rows.

### 2.1. Enum extensions

| Enum | Add | TZ |
| --- | --- | --- |
| `workflow_kind` | `OMBUDSMAN`, `AFTERCARE` (keep `STANDARD`) | §2, §11.1 |
| `case_internal_status` | `UNDER_INVESTIGATION`, `IN_MEDIATION`, `OPINION_PREPARED`, `OPINION_PENDING_APPROVAL`, `NEXT_CONTACT_PLANNED`, `IN_MONITORING` | §14.2 (already noted on `WorkflowStatus` in `schema.prisma`) |
| `investor_visible_status` | Map new internals (proposed): investigation/mediation/opinion → `UNDER_CONSIDERATION`; opinion pending → `RESULT_BEING_PREPARED`; monitoring / next contact → `UNDER_CONSIDERATION` | Z-03 |
| Payment `status` | Replace free string with enum: `INITIATED`, `SUCCEEDED`, `FAILED`, `REFUNDED`, and keep `EXTERNAL` for fees still paid off-platform | FR-PAY-04 |

PostgreSQL enum alters must be additive (do not rename Phase 1 values).

### 2.2. New tables

#### `systemic_problems` — Sistemli problem (TZ §4.3, FR-OMB-07)

| Column | Notes |
| --- | --- |
| `id` uuid PK | |
| `category` text | |
| `institution_id` uuid FK classifications | qurum |
| `cause` text | |
| `reform_status` text/enum | e.g. `IDENTIFIED`, `PROPOSED`, `ACCEPTED`, `IMPLEMENTED` |
| `created_at` / `updated_at` | |

M:N `systemic_problem_applications (problem_id, application_id)`.

#### `partners` — akkreditə olunmuş tərəfdaş (FR-ADM-10, FR-PAY-02)

Not a §4.3 named object; required configuration.

| Column | Notes |
| --- | --- |
| `id` uuid PK | |
| `name` / `names` jsonb | i18n |
| `service_kind` text | hüquqi ünvan, tərcümə, notariat, hüquq, vergi, … |
| `price_amount` numeric(18,2), `price_currency` | separate from state fees |
| `duration_note` text | |
| `rating` numeric nullable | |
| `accreditation_status` enum | `PENDING`, `ACTIVE`, `SUSPENDED`, `REVOKED` |
| `is_active` bool | |

#### `partner_selections` (FR-PAY-03)

Investor choice binding a partner to a project stage (and optional application). Contract is off-platform; store `selected_at`, `stage_id`, `partner_id`, `user_id`.

#### `integration_messages` (optional but recommended)

Append-only outbound/inbound log for DVX and bank adapters: `provider`, `direction`, `object_type`, `object_id`, `provider_ref`, `payload` jsonb, `status`, `occurred_at`. Stops inventing per-provider tables before specs exist.

### 2.3. Columns on existing tables

| Table | Add | Why |
| --- | --- | --- |
| `payments` | `provider` text, `provider_ref` text, `raw_payload` jsonb, `failure_reason` text, `paid_at` timestamptz; tighten `status` | FR-PAY-01, 04, TZ §21 ödəniş servisi |
| `applications` | `linked_case_id` uuid nullable (rejected case that opened OMB) | FR-OMB-06, WF-06 |
| `profiles` | `voen` already as `tax_id`; add `dvx_registration_status`, `dvx_registered_at`, `company_legal_form` if missing | FR-REG submit result |
| `cases` | `workflow` already on application; no second status column | Z-03 |
| `tasks` | allow `status` values already used (`extra_info`); bank/DVX tasks stay tasks | FR-REG-07 |
| `documents` | no change required; GENERATED used for REG templates | FR-REG-01 |
| `workflow_statuses` / `workflow_transitions` | seed rows for OMB and AFT | §14.2 |
| `application_types` | seed `ombudsman`, `aftercare`, `company_registration`, `bank_kyc` | §11.1, §9 |

`OMBUDSMAN_OFFICER` must be treated as an **internal** role (2FA) in `Roles.Internal` — today the C# list omits it.

### 2.4. Integrity

- Z-02 still: every application has a project **or** a profile. Ombudsman/Aftercare may bind to a project (FR-PROJ-07) or profile.
- Z-03: cabinet/passport/notifications still derive from `cases.internal_status`.
- State-fee `payments.kind = STATE_FEE` and partner `PARTNER_SERVICE` never share a receipt or a summed UI total (TZ §20).
- Snapshot immutability (FR-APP-04) applies to OMB/AFT submits.
- Audit events include payment operations (TZ §21.1).

---

## 3. API additions (same `/api/v1` style)

Keep: `{ data, meta? }`, `{ error: { code, message, details? } }`, camelCase, `SCREAMING_SNAKE` enums, money as decimal strings, Bearer + `refresh_token` cookie, port 4000.

**Do not edit `docs/api.md` in the Phase 2 implementation PRs until the new rows are actually served.** This section is the intended additive contract.

### 3.1. Changed existing endpoints

| Method | Path | Change |
| --- | --- | --- |
| POST | `/cases/:id/complaint` | If Ombudsman workflow is enabled: create application type `ombudsman`, workflow `OMBUDSMAN`, `linkedCaseId` = this case, return `{ data: { applicationId, publicNumber, caseId } }` (`201`). If OMB is not enabled (institutional gate): keep Phase 1 supervisor-task behaviour so Z-04 never dead-ends. |
| POST | `/applications` | Allow `typeCode` for `ombudsman` / `aftercare` / `company_registration` / `bank_kyc`. Remove `WORKFLOW_PHASE2` for those types. |
| GET | `/company-registration` | Still returns DVX URL as fallback. Add `electronicSubmitAvailable: boolean`. |
| GET | `/analytics/overview` | May set `publicKpisApproved` when an analyst/sysadmin publishes the public dataset — not a silent default true. |
| GET | `/health` | `phase` may become `2` when this release ships. |

### 3.2. New endpoints

#### Company registration (REG)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/company-registration/packages` | investor, level 2 **or** representative with `SIGN` | Generate template documents (FR-REG-01) into Sənədlərim |
| GET | `/company-registration/packages/:id` | owner | Package contents + checklist (FR-REG-04) |
| POST | `/company-registration/packages/:id/submit` | same | DVX adapter; creates/updates application + case; `PLAN` if adapter missing |
| GET | `/company-registration/name-availability?name=` | yes | FR-REG-03; adapter or `501`/`PLAN` payload — do not invent a DVX response schema |

#### Bank pilot

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET/PUT | `/me/kyc-packet` | investor | Single KYC payload (FR-REG-05) |
| POST | `/projects/:id/bank-submissions` | investor | Body: `{ bankInstitutionIds: uuid[] }` max length **2**. Creates one application/case per bank |
| GET | `/projects/:id/bank-submissions` | investor / case manager | Status per bank |
| POST | `/tasks/:id/bank-decision` | `INSTITUTION_REP` of that bank | `{ outcome: OPENED \| EXTRA_INFO \| REFUSED, reason? }` (FR-REG-07) |

Reuse `POST /tasks/:id/complete` if the decision fits `opinion`; only add `/bank-decision` if the outcome enum must be first-class.

#### Ombudsman

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/ombudsman/page` | no | FR-OMB-01 content (CMS slug still OK; this is optional) |
| POST | `/applications` type `ombudsman` | level 1 | FR-OMB-02 fields in `formSchema` / snapshot |
| GET | `/ombudsman/desk` | `OMBUDSMAN_OFFICER`, supervisor | Desk queue |
| POST | `/cases/:id/mediation-notes` | `OMBUDSMAN_OFFICER` | FR-OMB-04 |
| POST | `/cases/:id/opinion` | `OMBUDSMAN_OFFICER` | Draft opinion |
| POST | `/cases/:id/opinion/approve` | supervisor or dedicated head role (TZ: Ombudsman rəhbəri — until a new role exists, **supervisor** + audit; do not invent `OMBUDSMAN_HEAD` unless the coordinator names it) | FR-OMB-05 |
| POST | `/systemic-problems` | `OMBUDSMAN_OFFICER` | FR-OMB-07 |
| GET | `/systemic-problems` | officer, analyst, sysadmin | Catalogue |
| POST | `/systemic-problems/:id/applications` | officer | Link applications |

#### Aftercare

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/applications` type `aftercare` | level 1 | FR-AFT-01 |
| GET | `/aftercare/desk` | case manager, supervisor | Desk |
| POST | `/cases/:id/next-contact` | case manager | FR-AFT-02 `{ at, purpose }` |
| POST | `/aftercare/inactivity/tick` | sysadmin / job | FR-AFT-03 scan (DVX adapter or stub) |
| POST | `/projects/:id/expansion` | investor + case manager confirm | FR-AFT-04 new KYA + project |

#### Payments and partners

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/fees` | no | State fee table (FR-ADM-10), amounts as strings |
| POST | `/payments` | investor | `{ kind: STATE_FEE, amount, currency, applicationId? , projectId? }` → `INITIATED` |
| POST | `/payments/:id/confirm` | webhook (provider HMAC) or staff | Success/fail; write receipt document |
| GET | `/me/payments` | investor | List; never mix kinds in one total |
| GET | `/partners` | no | Accredited catalogue (FR-PAY-02) |
| POST | `/projects/:id/stages/:stageId/partner` | investor | Bind selection (FR-PAY-03) |
| GET/POST | `/admin/partners` | sysadmin | FR-ADM-10 |
| GET/POST | `/admin/fees` | sysadmin | Fee table |

Webhook path should not require user JWT; authenticate the provider. Log attempts. No PII in payment notification bodies (FR-NOT-06).

#### Public reporting

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/public/transparency` | no | FR-REP-09 approved snapshot only |
| GET | `/pages/seffalq` (CMS) | no | Şəffaflıq copy + embed public stats |
| POST | `/admin/analytics/publish-public` | analyst + sysadmin | Sets approved snapshot; home strip may then render (FR-HOME-04) |

### 3.3. Error codes to reuse

`UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `INTERNAL_ERROR`. Add only when needed, e.g. `INTEGRATION_UNAVAILABLE` (honest PLAN — still return `200`/`201` with `flag: PLANNED` rather than failing the investor if back-office can continue), `PAYMENT_FAILED`, `BANK_LIMIT` (more than two banks).

---

## 4. Agent task lists

Same folder ownership as `AGENTS.md`. No Phase 3 folders. Do not weaken Phase 1 tests.

### 4.1. Database Specialist

Folders: `server/prisma/` (migrations) and `server/AsanInvest.Infrastructure/Persistence/` + entity enums in `AsanInvest.Domain`.

1. Additive PostgreSQL migration: `workflow_kind` and `case_internal_status` values listed in §2.1; investor-visible mappings.
2. Tables: `systemic_problems`, M:N link, `partners`, `partner_selections`; payment provider columns; `applications.linked_case_id`; optional `integration_messages`.
3. Seed: application types `ombudsman`, `aftercare`, `company_registration`, `bank_kyc`; OMB/AFT `workflow_statuses` + `workflow_transitions`; two bank `classifications` (`INSTITUTION`) for the pilot; DVX institution if missing; sample partners with `accreditation_status=ACTIVE`; state fee rows; Ombudsman CMS page replacing placeholder copy.
4. Include `OMBUDSMAN_OFFICER` in internal-role seed example (2FA).
5. Keep money `NUMERIC(18,2)`; JSONB snapshots; append-only `audit_records` and payment webhooks in audit.
6. Map all new tables in `AsanInvestDbContext` with snake_case names matching Prisma.
7. Do not drop Phase 1 checks (Z-02, snapshot trigger, audit immutability).
8. Document which enum alters need `ALTER TYPE ... ADD VALUE` (cannot run in a transaction on older Postgres — use the version in Docker Compose).

### 4.2. Backend API Specialist

Folders: `server/AsanInvest.Api/`, `Application/`, `Domain/`, `Infrastructure/Integrations/`.

1. Extend `WorkflowKind` and `CaseInternalStatus` in domain; workflow transition table for OMB/AFT; investor/stage mapping (Z-03). Put `OMBUDSMAN_OFFICER` in `Roles.Internal` (2FA).
2. Lift Phase 1 `WORKFLOW_PHASE2` for the four new application types; keep it for anything else.
3. **REG:** package generate + submit service; DVX adapter interface (stub returns `INTEGRATION_UNAVAILABLE` + creates back-office task). On success, write `tax_id` / VÖEN and project bind (FR-PROJ-01).
4. **Bank pilot:** KYC packet on profile; max two institutions; one case per bank; `INSTITUTION_REP` scoped by `institutionId` (GİR-02).
5. **Ombudsman:** complaint → OMB application when enabled; desk; mediation notes; opinion + approve; FR-OMB-06 reopen via existing `/cases/:id/reopen`.
6. **Aftercare:** categories, next-contact, inactivity tick using DVX activity adapter (stub: no false passivity on missing feed). Expansion clones KYA inputs into a new project (FR-AFT-04).
7. **Payments:** initiate / webhook / receipts as generated documents; never sum state + partner amounts. Provider adapter; no live keys in repo.
8. **Partners:** public list + stage bind + admin CRUD (FR-ADM-10).
9. **Public KPIs:** compute from operational data (FR-REP-11); publish snapshot; public GET returns only that snapshot.
10. Notifications for payment, passivity, OMB/AFT status, flag changes; no PII in email/SMS (FR-NOT-06).
11. Audit all of TZ §21.1 including payments.
12. Feature-flag / settings: `OmbudsmanEnabled`, `DvxSubmitEnabled`, `PaymentsEnabled`, `BankPilotEnabled` so missing protocols degrade to Phase 1 fallbacks (TZ §25.1, §25.2 first risk).
13. Do not implement Phase 3 e-imza, remote bank, or extra §22 APIs.

### 4.3. Frontend Specialist

Folders: `client/`. Same brand, flags, no TZ §1.2 promises.

1. Replace Ombudsman placeholder with FR-OMB-01 page + «Müraciət et» (login wall if guest). Hide live submit when `OmbudsmanEnabled` is false; still show honest copy.
2. Cabinet: application type filters include Ombudsman and Aftercare; «Şikayət et» on rejected case uses the new complaint result (application number, not only external URL).
3. Aftercare form + desk (back-office). Passivity modal with three choices (FR-AFT-03, TZ §23.10).
4. Company registration wizard: package, checklist, submit/pending DVX, VÖEN on success. Fees as **separate lines** (FR-ROUTE-03 / TZ §20). `0 ₼` when electronic registration is fee-free.
5. Bank KYC form + two-bank picker + per-bank status on passport «Bank hesabı».
6. Payments checkout for **state fees only**; partner catalogue and stage bind; receipts in Sənədlərim. Failed payment: reason + retry + alternative (FR-PAY-04, TZ §23.11).
7. Şəffaflıq + home strip: render public stats **only** if the public endpoint returns an approved snapshot (FR-HOME-04).
8. Back-office: Ombudsman desk, Aftercare desk, admin partners/fees. Institution task inbox already exists — show bank decision actions for bank reps.
9. Do not add e-residency or ASAN Login live UX beyond the existing stub.

### 4.4. QA Security Reviewer

1. Contract tests for every new `/api/v1` path: success envelope, camelCase, enum strings, decimal money strings.
2. Regression: all Phase 1 `HttpContractTests` and SPA flows still pass.
3. Complaint: rejected case → OMB application linkage; supervisor reopen (FR-OMB-06); feature-flag off → Phase 1 fallback still offers a next step (Z-04).
4. Bank: cannot submit to 3 banks; bank A rep cannot see bank B tasks (GİR-02).
5. Payments: state fee and partner amounts never aggregated; webhook cannot be called with a stolen user JWT nor without provider auth; receipts appear as documents.
6. Public transparency endpoint: no investor PII, no unapproved KPIs.
7. OMB/AFT investor DTOs exclude `isInternal` messages (GİR-03).
8. DVX/bank adapters: no secrets in git; timeouts; payload stored in audit/integration log not in notifications.
9. Passivity job: does not mark companies inactive when DVX feed is stubbed empty.
10. Explicitly **not** testing Phase 3 (virtual FİN, remote bank, e-residency).

---

## 5. Risks and open questions (from TZ §25)

| Risk (TZ §25.2) | Phase 2 handling |
| --- | --- |
| Qurumların inteqrasiyaya hazır olmaması | Feature flags + back-office + bayraq `PLAN` |
| Müddətlərə riayət etməmək | Existing SLA/escalation + **ictimai hesabat** (this phase) |
| Bank iştirakı məhdud | Hard cap of **2** pilot banks; `PHYSICAL` signature remains until Phase 3 |
| Məlumat təhlükəsizliyi | NFR-01…03; payment PCI via provider (no raw PAN in our DB) |

**Still waiting on the coordinator (TZ §25.3)** — do not invent answers:

| # | Blocks |
| --- | --- |
| 5 Ombudsman institutional status | Public «Müraciət et» go-live |
| 1 Electronic vs paper documents | REG bayraqlar |
| 7 Originals when using a representative | Marşrut D submit checklist |

Payment provider, DVX API, and the two bank APIs have **no spec in this repository**. Adapters must stay behind interfaces until those documents exist.

---

## Document control

| Item | Value |
| --- | --- |
| Based on | ASAN_Invest_TZ_v4.0.md §25.1 and modules 9, 14.2, 15, 16, 18, 20, 22 |
| Does not modify | `docs/PLAN.md`, `docs/api.md` |
| Code | Not in this change; plan only |
| Runtime | ASP.NET Core + EF Core + PostgreSQL (Phase 1 stack) |
