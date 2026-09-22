# ASAN Invest — Phase 3 (Mərhələ 3) Implementation Plan

**Source of truth:** [`ASAN_Invest_TZ_v4.0.md`](../ASAN_Invest_TZ_v4.0.md) §25.1 Mərhələ 3, §1.3 bayraqlar, §22 / §22.1.  
**Unchanged:** [`docs/PLAN.md`](PLAN.md), [`docs/PLAN-PHASE2.md`](PLAN-PHASE2.md), [`docs/api.md`](api.md). Phase 3 **adds** behaviour and routes; it does not rename Phase 1/2 paths or JSON shapes.

If this document and the TZ disagree, the TZ wins. Do not implement until this plan is approved.

Phase 1 and Phase 2 on `main` are complete. [`PLAN-PHASE2.md`](PLAN-PHASE2.md) listed this work as out of scope: virtual FİN, remote bank account opening, e-residency, and other §22 APIs not yet available (Visa, customs, utilities, live ASAN Login).

---

## 0. What TZ §25.1 actually assigns to Phase 3

Quoted: *Ehtiyac olarsa: qeyri-rezident e-imzası (ASAN İmza + virtual FİN) inteqrasiyası; uzaqdan bank hesabı, e-rezidentlik, xarici e-imzaların tanınması; müvafiq addımlar PLAN-dan ONLAYN/AVTO-ya keçir.*

Dependencies named in the TZ: **Koordinatorun qərarı**; **səviyyə 3 qanunvericilik dəyişiklikləri**.

§22.1 (legislation, not an API we can invent):

- e-Rezidentlik statusu
- Əcnəbi üçün uzaqdan gücləndirilmiş e-imza (video-identifikasiya + NFC)
- Bankın e-imzanı yaş imza nümunəsi kimi qəbul etməsi (Mərkəzi Bank)
- Xarici e-imzaların qarşılıqlı tanınması

TZ §2: **virtual FİN does not change** qeyri-rezident status. Identification may rise to səviyyə 2 (hüquqi); residency labelling stays non-resident.

TZ §25.1 also: when an integration is missing, **the platform does not stop** — back-office tasks + the correct bayraq. Phase 3 uses that rule for every live-API gap.

---

## 1. In scope vs PLAN-only

Two buckets. **Do not fake** a government or bank decision (TZ §1.2, §1.4). UI and data may exist while `flag = PLANNED`.

### 1.1. Core Phase 3 (TZ §25.1) — product shells now; go-live gated

| Feature | TZ | Realistically build now | Stay PLAN until |
| --- | --- | --- | --- |
| Qeyri-rezident e-imza + virtual FİN (`e-qeyri-rezident`) | §22 row, §7.2, §25.1 | Auth adapter interface beyond `POST /auth/asan-login` stub; store `virtualFin` on the user; route **Marşrutum** / level-2 gate that today sends investors to a representative | Coordinator decision + e-qeyri-rezident protocol. Video-ID + NFC is §22.1 legislation — never simulate a successful remote ID-proofing. |
| Uzaqdan bank hesabı | FR-REG-07, §9.2 D7, §22.1 | Keep Phase 2 two-bank KYC. Add a **channel** on bank submissions: `PHYSICAL_SIGNATURE` (today) vs `REMOTE_ESIGN` (`PLANNED`). Passport «Bank hesabı» flag stays `PHYSICAL` until the Central Bank agreement exists, then admin sets `ONLINE` (FR-FLAG-03) | Mərkəzi Bank + pilot banks accept e-imza as the signature specimen. Platform still **does not open accounts** (§1.4). |
| E-rezidentlik | §22.1 | Application type + procedure `e_residency` with `flag = PLANNED`; CMS explainer; no status that claims the person is an e-resident | Law + coordinator. |
| Xarici e-imzaların tanınması | §22.1 | `AuthProvider` / trust-list config; login attempt records `FOREIGN_ESIGN` + `PLANNED`; never elevate `identificationLevel` to `LEGAL` from an unlisted issuer | Mutual-recognition legal act + trust-list spec in-repo. |
| Flag promotion PLAN → ONLAYN / AVTO | FR-FLAG-01…03 | Admin already creates procedures with a flag. Phase 3 must **recalculate open passports**, refresh FR-FLAG-02 summary («N iş günü · M fiziki təmas»), and notify owners when a flag changes | N/A — this is implementable without a new government API. |

### 1.2. Deferred §22 operational APIs (from PLAN-PHASE2 out-of-scope)

These were **not** in the TZ Phase 3 sentence, but Phase 2 explicitly deferred them and the user asked to include them here. Until a protocol and request/response spec exist in this repository, they are **PLAN shells**: catalogue + müraciət + case + institution task, `flag = PLANNED`, adapter `Available = false`.

| Integration | TZ §22 | Shell to build | Do not |
| --- | --- | --- | --- |
| Live **ASAN Login / SİMA** | Level 2; Phase 1 listed it but shipped a stub | Replace “not connected” dead-end with a `PLANNED` provider screen; keep email level 1. When the spec lands, completing login sets `authProvider = ASAN_LOGIN` and `identificationLevel = LEGAL` (FR-AUTH-02, FR-AUTH-05) without dropping profile data | Invent OAuth/SAML payloads or mint a fake FIN |
| **ASAN Viza** (DXA) | Level 2 | Procedure `visa` + application type; redirect URL if one is configured; otherwise task to `INSTITUTION_REP` | Issue visas |
| **Gömrük** (idxal güzəşti) | Level 2, dəqiqləşdirilməlidir | Procedure `customs_incentive` linked to təşviq / avadanlıq idxalı stage | Confirm customs decisions |
| **Kommunal** (Azərişıq, Azəriqaz, Su Ehtiyatları / Vahid İS) | Level 2 | Electricity already exists as `ONLINE` in seed — that overstates live API. Phase 3: split or retag connection procedures; gas + water as `PLANNED` until adapters exist; back-office completion unchanged | Call a utility API that is not specified |
| Dövlət Miqrasiya Xidməti (iş / yaşayış) | Level 2; `temporary_residence` already `PLANNED` in seed | Keep PLAN; add `work_permit` procedure; TZ §25.3 item 6 (biometrics) stays `PHYSICAL` until answered | Claim remote biometrics |
| Elektron notariat | Level 2 | Procedure `e_notary` `PLANNED` | Generate a notarial act |
| Şəhərsalma / tikinti icazəsi + zonalaşdırma (FR-PROJ-06) | Level 2 | Map pin + “PLAN: digital plan not connected”; task to institution | Invent FAR/height numbers |
| ƏMDX / daşınmaz əmlak reyestri | Level 2 | Legal-address verify action `PLANNED` | Return a fake extract |
| İqtisadiyyat Nazirliyi daxili sistemlər | Level 2 | Out of Phase 3 **live** work; case manager UI already covers coordination | Duplicate ministry systems (§1.4) |

SI model for KYA free text (NFR-03, §22 level 1) may be wired if a provider is chosen; it still **must not decide** procedures. Optional, not a Phase 3 gate.

### 1.3. PLAN-flag implementation rules (TZ §1.3)

Every Phase 3 capability that lacks a live adapter follows the same pattern:

1. **Show the step** on the route, KYA result, and passport with bayraq **PLAN** (colour + icon + text, UI-03) — never hide it.
2. **Copy** explains that integration or legislation is pending; next action is “prepare documents / notify me / continue via representative / back-office task” (Z-04). Forbidden: «icazə alınacaq», «hesab avtomatik açılır» (§1.2).
3. **Data:** investor can save drafts, upload documents, and submit a müraciət. Submit creates a **case + tapşırıq** for the institution. Status source remains Case Management (Z-03).
4. **Adapter:** `IntegrationOutcome(Available: false, Flag: PLANNED, …)`. Persist `providerRef` only when a real provider returns one. No mocked “success” from DVX/bank/ASAN.
5. **Go-live:** sysadmin sets procedure `flag` PLAN → ONLAYN or AVTO (FR-ADM-08) **and** the matching feature flag. FR-FLAG-03: refresh **open** passports, leave completed stages unchanged (FR-PROJ-02), notify owners.
6. **FR-FLAG-02:** recompute passport/route summary «N iş günü · M fiziki təmas» after any flag change (remote bank dropping `PHYSICAL` reduces the contact count).

### 1.4. Out of Phase 3

- Replacing Phase 1/2 modules already on `main`
- GraphQL, extra microservices, a second schema
- Platform deciding permits, incentives, or bank accounts
- Simulating video-NFC identity proofing or a wet-ink signature

---

## 2. Data model changes

Build on the Phase 1+2 Prisma schema / EF Core mapping. Additive migrations only.

### 2.1. Existing pieces to reuse

| Already on `main` | Phase 3 use |
| --- | --- |
| `Flag.PLANNED` / `ONLINE` / `PHYSICAL` / `AUTO` on `procedures` and `stages` | FR-FLAG-01…03 |
| `AuthProvider.EMAIL`, `ASAN_LOGIN` | Live ASAN Login when specified |
| `IdentificationLevel.BASIC` / `LEGAL` | Elevate only after a **real** e-sign assertion |
| `integration_messages` (Phase 2) | ASAN Login, visa, customs, utilities, e-non-resident |
| Feature flags `DvxSubmitEnabled`, `BankPilotEnabled`, … | Add Phase 3 flags; same degrade-to-PLAN pattern |
| `bank_account` procedure `PHYSICAL`; `temporary_residence` `PLANNED` | Flag promotion |

### 2.2. Enum / column additions

| Change | Why |
| --- | --- |
| `auth_provider`: add `E_NONRESIDENT`, `FOREIGN_ESIGN` (keep `EMAIL`, `ASAN_LOGIN`) | §25.1 identity channels |
| `users.virtual_fin` text nullable | TZ §2: store if issued; **does not** flip resident/non-resident |
| `users.fin` text nullable | Resident ASAN Login / SİMA (FR-AUTH-02) when live |
| `users.esign_issuer` text nullable | Foreign e-sign trust-list code |
| `users.identification_upgraded_at` timestamptz | FR-AUTH-05: level 1 → 2 without losing data |
| `bank_channel` enum on bank submission/application: `PHYSICAL_SIGNATURE`, `REMOTE_ESIGN` | Remote account is PLAN until §22.1 |
| `e_residency_status` on profile: `NONE`, `APPLIED`, `PLAN_PENDING`, `GRANTED` — **GRANTED only via back-office after law**, never via stub | e-rezidentlik |
| `procedures.integration_code` text nullable | `asan_login`, `e_nonresident`, `visa`, `customs`, `electricity`, `gas`, `water`, `migration`, `notary`, `planning`, `cadastre`, `remote_bank` |
| `flag_change_events` table | FR-FLAG-03 audit: procedure_id, from_flag, to_flag, actor, notified_count |

Do not add a second status column on applications/cases (Z-03).

### 2.3. Seed / catalogue (PLAN procedures)

Add institutions + procedures if missing, all `flag = PLANNED` unless an adapter is enabled:

- `visa` (DXA — ASAN Viza)
- `customs_incentive` (DGK)
- `gas_connection`, `water_connection` (and retag `electricity_connection` to `PLANNED` until a live adapter exists — today’s `ONLINE` seed overclaims)
- `work_permit` (Miqrasiya)
- `e_notary`
- `construction_permit`, `zoning_prequery` (FR-PROJ-06)
- `e_residency`

Application types (Standart workflow, mostly level 1 except legal filings): `visa`, `customs_incentive`, `utility_connection`, `e_residency`. Reuse Vahid Müraciət.

### 2.4. Integrity

- Virtual FİN unique if present; never used as proof of residency.
- `LEGAL` identification requires `auth_provider ∈ {ASAN_LOGIN, E_NONRESIDENT}` **and** adapter `Available=true`, or a signed representative (`SIGN` + etibarnamə) as today.
- Flag history append-only.
- Money / snapshot / audit rules from Phase 1–2 unchanged.

---

## 3. API additions (`/api/v1` style)

Keep `{ data, meta? }`, `{ error: { code, message, details? } }`, camelCase, `SCREAMING_SNAKE` enums, decimal strings, Bearer + `refresh_token`.

**Do not edit `docs/api.md` until these routes are actually served.**

### 3.1. Changed existing endpoints

| Method | Path | Change |
| --- | --- | --- |
| POST | `/auth/asan-login` | Today: stub object, `available: false`. Phase 3: same envelope plus `flag: PLANNED` until the spec exists. When enabled: accept the **documented** assertion (not invented), set `fin`, `identificationLevel=LEGAL`, `authProvider=ASAN_LOGIN`. Never return a fake session that looks like a live ASAN Login. |
| GET | `/auth/me` | Include `virtualFin` (masked or present), `authProvider`, `identificationLevel`, `eResidencyStatus`. |
| GET | `/projects/:id` (passport) | Include `flagSummary: { workingDays, physicalContacts }` (FR-FLAG-02) and per-stage `flag`. |
| POST | `/projects/:id/bank-submissions` | Optional `channel: PHYSICAL_SIGNATURE \| REMOTE_ESIGN`. `REMOTE_ESIGN` allowed only as `flag: PLANNED` until remote-bank flag is ONLAYN; still creates cases (Z-04). |
| PATCH | `/admin/procedures/:id` | Allow `flag` update; triggers FR-FLAG-03 job. |
| GET | `/health` | `phase` may become `3` when this release ships. |

### 3.2. New endpoints

#### Identity (PLAN until specs exist)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/auth/providers` | no | List `{ code, available, flag, identificationLevelIfCompleted }` for `EMAIL`, `ASAN_LOGIN`, `E_NONRESIDENT`, `FOREIGN_ESIGN` |
| POST | `/auth/e-nonresident/start` | yes | Returns `{ flag: PLANNED, next: "representative" \| "wait" }` until coordinator enables; never a fake virtual FİN |
| POST | `/auth/e-nonresident/complete` | yes | Only when adapter available: set `virtualFin`, `identificationLevel=LEGAL`. If unavailable: `INTEGRATION_UNAVAILABLE` + keep level 1 |
| POST | `/auth/foreign-esign/start` | no | PLAN shell; does not upgrade legal level |

#### Flag promotion

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/admin/procedures/:id/flag` | sysadmin | `{ from, to, notify: true }` PLAN→ONLINE/AUTO/PHYSICAL; writes `flag_change_events`; enqueues passport refresh + FR-NOT-01 |
| GET | `/admin/flag-changes` | sysadmin | Audit list |

#### §22 shells (same Vahid Müraciət pattern)

Prefer `POST /applications` with new `typeCode` values over one-off controllers, plus:

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/integrations/:code/status` | no | `{ code, available, flag, message }` for visa, customs, electricity, gas, water, migration, notary, planning, cadastre, remote_bank, asan_login, e_nonresident |
| POST | `/projects/:id/stages/:stageId/external-submit` | investor | Forwards to adapter; if `Available=false` creates institution task and returns `flag: PLANNED` **200/201**, not a fake success body |

#### E-residency

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/e-residency` | no | CMS + `{ flag: PLANNED, legalStatus: "not_in_force" }` until law exists |
| POST | `/applications` `typeCode=e_residency` | level 1 | Expression of interest only; back-office; cannot set `GRANTED` via API except sysadmin **after** legislation is recorded in settings |

### 3.3. Error / honesty codes

Reuse `INTEGRATION_UNAVAILABLE`, `IDENTIFICATION_LEVEL`, `FORBIDDEN`. Add `LEGISLATION_PENDING` for e-residency grant attempts. Adapters must not map “stub” to `COMPLETED`.

---

## 4. Agent task lists

Same folder ownership as `AGENTS.md`.

### 4.1. Database Specialist

1. Additive migration: `users.virtual_fin`, `users.fin`, `users.esign_issuer`, `users.identification_upgraded_at`; `auth_provider` values; `e_residency_status`; `flag_change_events`; `procedures.integration_code`; bank `channel` on the bank-submission/application payload (json or column).
2. Unique index on `virtual_fin` where not null; unique `fin` where not null.
3. Seed PLAN procedures in §2.3; retag `electricity_connection` to `PLANNED` unless an adapter flag is on (do not silently claim `ONLINE` for a missing API).
4. Map new columns in `AsanInvestDbContext`. No parallel schema.
5. Comment TZ §2 on `virtual_fin`: does not change non-resident labelling.

### 4.2. Backend API Specialist

1. `GET /auth/providers`; extend ASAN Login stub with `flag: PLANNED`; interfaces `IENonresidentClient`, `IForeignEsignClient`, `IVisaClient`, `ICustomsClient`, `IUtilityClient` returning `IntegrationOutcome` like Phase 2 DVX/bank.
2. Feature flags: `AsanLoginEnabled`, `ENonresidentEnabled`, `RemoteBankEnabled`, `EResidencyEnabled`, `ForeignEsignEnabled`, plus per-utility/visa/customs. Default **false**.
3. FR-FLAG-03 job: on procedure flag change, update **open** stages’ flags (not completed), recompute FR-FLAG-02 summaries, notify (FR-NOT-01, no PII in channels).
4. Bank submissions: accept `channel`; `REMOTE_ESIGN` does not skip KYC case; bank decision still from `INSTITUTION_REP` (platform does not open the account).
5. Legal-level upgrade only from a successful adapter or existing representative `SIGN` path (TZ §7.2). Completing PLAN start endpoints must not set `LEGAL`.
6. `GET /integrations/:code/status` for honest client UX.
7. E-residency application type; grant path locked by settings + sysadmin, audited.
8. Do not invent OIDC/SAML/XML for ASAN Login, Visa, or customs. Opaque `rawPayload` until a spec is committed.
9. Keep GİR-02/03, snapshot immutability, 2FA for internal roles (including when testing ASAN Login).

### 4.3. Frontend Specialist

1. Provider chooser on login/register: email (live), ASAN Login / e-qeyri-rezident / foreign e-sign each with **PLAN** badge until `/auth/providers` says `available`.
2. «Marşrutum» after a level-2 action: representative **or** wait for e-imza — not a hard error (TZ §7.2). Show virtual FİN only if present; never imply residency.
3. Passport: flag on every stage; summary «N iş günü · M fiziki təmas»; PLAN stages still open a draft müraciət.
4. Bank step: physical visit vs remote e-sign (PLAN). Copy must not say the account will open.
5. E-residency public page: PLAN + legal-not-in-force. Interest form only.
6. Visa / customs / gas / water / notary / zoning: stage cards + forms; PLAN empty-state (TZ §23.1–3, 12). Zoning: no invented coefficients (FR-PROJ-06).
7. Admin: procedure flag editor + confirm PLAN→ONLAYN (notifies investors).
8. UI-03: PLAN = grey + icon + text. No emoji, no §1.2 promises.

### 4.4. QA Security Reviewer

1. Contract tests: new routes use the frozen envelope; PLAN adapters never return `identificationLevel=LEGAL` or `eResidencyStatus=GRANTED`.
2. Regression: Phase 1+2 HTTP tests and SPA flows.
3. Flag change: completed stages unchanged; open stages update; notification has no FIN/passport in email/SMS (FR-NOT-06).
4. Virtual FİN unique; does not change nationality/residency fields on profile.
5. Remote-bank channel cannot mark case `COMPLETED` without a bank `INSTITUTION_REP` decision.
6. ASAN Login enabled=false: POST remains honest stub, no session cookie.
7. Institution reps still scoped (GİR-02) for visa/customs/utility tasks.
8. No secrets for imaginary government clients in git.
9. Explicitly **not** testing live crypto of ASAN İmza, NFC chip read, or Central Bank settlement.

---

## 5. Risks (TZ §25.2 / §25.3)

| Item | Phase 3 handling |
| --- | --- |
| Integrations not ready | PLAN flag + back-office (already the TZ mitigation) |
| Bank PHYSICAL contact remains | Remote channel stays PLAN until §22.1 |
| Coordinator item 6 (biometrics for residence) | Keep `PHYSICAL` on residence/work permit until answered |
| Coordinator item 5 (Ombudsman) | Already Phase 2; do not re-scope |
| NFR-01…03 | E-sign assertions are personal data; store in AZ; do not send to SI training (NFR-03) |

There is **no** ASAN Login, e-qeyri-rezident, Visa, customs, or utility API spec in this repository. Adapters stay behind interfaces.

---

## Document control

| Item | Value |
| --- | --- |
| Based on | TZ v4.0 §25.1 Mərhələ 3, §1.3, §22–22.1; PLAN-PHASE2 out-of-scope list |
| Does not modify | `docs/PLAN.md`, `docs/PLAN-PHASE2.md`, `docs/api.md` |
| Code | Not in this change; plan only |
| Runtime | ASP.NET Core + EF Core + PostgreSQL (existing stack) |
