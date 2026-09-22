# ASAN Invest

ASAN Invest is the investor’s single contact point with Azerbaijani institutions (TZ v4.0). It does **not** replace those institutions and does **not** decide permits, incentives, or bank accounts.

**Phases 1, 2, and 3 are implemented and merged into `main`.** Phase 3 identity and leftover §22 integrations are **PLAN-flagged shells**: UI and data exist, adapters are `Available=false`, and no government or bank decision is faked.

| Doc | Purpose |
| --- | --- |
| [`ASAN_Invest_TZ_v4.0.md`](ASAN_Invest_TZ_v4.0.md) | Product source of truth |
| [`docs/PLAN.md`](docs/PLAN.md) | Phase 1 implementation plan |
| [`docs/PLAN-PHASE2.md`](docs/PLAN-PHASE2.md) | Phase 2 implementation plan |
| [`docs/PLAN-PHASE3.md`](docs/PLAN-PHASE3.md) | Phase 3 implementation plan |
| [`docs/api.md`](docs/api.md) | Frozen `/api/v1` HTTP contract (Phase 1 routes) |
| [`AGENTS.md`](AGENTS.md) | Agent / contributor rules |

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | React + TypeScript, Vite, Tailwind CSS, React Router, i18next (`client/`) |
| Backend | ASP.NET Core Web API, `net8.0` (`server/AsanInvest.sln`) |
| Database | PostgreSQL 16. Prisma migrations apply the schema; EF Core maps the same tables |
| Auth | Email/password is live (identification level 1). Short-lived access JWT in memory; httpOnly `refresh_token` cookie. Internal roles require 2FA. ASAN Login / e-qeyri-rezident / foreign e-sign are PLAN providers |

The Express/Node API has been removed. Do not start `server/src` or `tsx watch`.

## Run locally

Requires **Node.js 20+**, the **.NET 8 SDK**, and **PostgreSQL 16**.

### 1. Environment

```bash
cp .env.example .env
```

`DATABASE_URL` defaults to `postgresql://asan:asan_dev_password@127.0.0.1:5432/asan_invest`. Prisma also reads `server/.env`; copy `DATABASE_URL` there if you run migrate from `server/`.

### 2. PostgreSQL

Docker (recommended):

```bash
docker compose up -d postgres
```

Or a local cluster (user `asan`, database `asan_invest`, password matching `.env`). If this machine previously ran the retired Express schema, drop and recreate the database before migrating:

```bash
dropdb asan_invest && createdb -O asan asan_invest
```

### 3. Install, migrate, seed

```bash
npm install
npm run db:migrate:deploy
npm run db:generate
npm run db:seed
npm run db:verify
```

### 4. Start API and SPA

Two processes:

```bash
# terminal 1 — Kestrel on http://localhost:4000
npm run dev
# equivalent: dotnet run --project server/AsanInvest.Api

# terminal 2 — Vite on http://localhost:5173
npm run dev:client
```

Vite proxies `/api` and `/health` to port 4000.

- Health: `GET http://localhost:4000/health` → `{ "data": { "status": "ok", "service": "asan-invest-api", "phase": 3 } }`
- Web: http://localhost:5173

API tests: `dotnet test server/AsanInvest.sln`.  
Client production build: `npm run build:client`.

Phase 2 and Phase 3 feature flags in `.env` / `appsettings.json` default to **false**. Leave them off unless a real adapter spec is in-repo.

## What each phase added

### Phase 1 — Əsas platforma

**Public portal**

- Home, Why Azerbaijan, investor guide, about (CMS pages)
- Investment opportunities catalogue (CMS + seeded zones/parks)
- Route calculator, incentive eligibility, Know Your Approvals (in-process rule engine)
- Honesty flags: AUTO / ONLINE / PHYSICAL / PLANNED
- Register, sign in, forgot/reset password, email verify
- Company registration CTA to the existing DVX URL

**Investor cabinet** (`/cabinet`)

- Dashboard with next step
- Projects (create / passport / suspend)
- Applications (validate, submit, withdraw)
- Profile, representations, documents, notifications

**Back-office** (`/backoffice`, staff roles)

- Case desk (transition, assign, extra-info, complaint, SLA tick)
- Evaluations
- Admin (users/roles, classifications, procedures, CMS, rule sets)
- Analytics overview (public KPI strip stays off unless `publicKpisApproved` is true)

**Platform**

- REST `/api/v1` as in [`docs/api.md`](docs/api.md)
- Audit records on mutating auth and case events
- Seeded Standart workflow, classifications, procedures, rule sets, CMS, notification templates
- Locales: AZ (default), EN, RU, TR, AR

### Phase 2 — Əməliyyat inteqrasiyaları

Modules from TZ §25.1. Live DVX / bank / payment adapters stay off until a protocol exists; missing APIs degrade to back-office tasks and the correct honesty flag.

- **Company registration:** in-app document package; electronic submit to DVX when `DVX_SUBMIT_ENABLED` and the adapter are configured; otherwise redirect + `INSTITUTION_REP` records the outcome
- **Two-bank KYC pilot:** shared KYC packet; send to at most two pilot banks as müraciət + case; bank staff are `INSTITUTION_REP` scoped to that bank. Platform does not open accounts
- **Ombudsman:** application type + OMB workflow, extra statuses, systemic-problem catalogue. Public go-live stays gated (`OMBUDSMAN_ENABLED`, TZ §25.3 item 5)
- **Aftercare:** application type + AFT workflow (never labelled «sorğu»); next-contact planning; expansion starts a new KYA
- **State fees:** in-app checkout when `PAYMENTS_ENABLED`; receipts in Sənədlərim; never mixed with partner fees
- **Partner catalogue:** accredited partners; investor selects; contract is off-platform
- **Public reporting:** anonymous aggregated KPIs only after approval (`publicKpisApproved`)

### Phase 3 — Tam uzaqdan model

Product shells from TZ §25.1 plus leftover §22 APIs. **Live** without a new government API:

- Admin procedure flag change PLAN → ONLINE / AUTO / PHYSICAL (FR-FLAG-03): refresh **open** passports, leave completed stages unchanged, notify owners
- Passport / route flag summary «N iş günü · M fiziki təmas» (FR-FLAG-02)
- Provider chooser, PLAN notices, and `/integrations/:code/status`

**PLAN-flagged (not yet live — pending real external adapters or legislation).** UI, catalogue, drafts, and case/task creation work; adapters return `Available=false` and `flag=PLANNED`. Completing these paths must **not** mint a FİN, raise identification to `LEGAL`, grant e-residency, issue a visa, or mark a bank case completed.

| Feature | Seed / flag | Stay PLAN until |
| --- | --- | --- |
| Live ASAN Login / SİMA | `ASAN_LOGIN_ENABLED` | In-repo protocol. Email remains identification level 1 |
| e-qeyri-rezident + virtual FİN | `E_NONRESIDENT_ENABLED` | Coordinator + e-qeyri-rezident protocol. Virtual FİN does **not** change non-resident status (TZ §2). Video-ID + NFC is §22.1 legislation |
| Foreign e-sign | `FOREIGN_ESIGN_ENABLED` | Mutual-recognition act + trust list. Unlisted issuers never raise `LEGAL` |
| Remote bank (`REMOTE_ESIGN`) | `REMOTE_BANK_ENABLED`; «Bank hesabı» stays `PHYSICAL` | Mərkəzi Bank + banks accept e-imza as the signature specimen |
| E-residency | `E_RESIDENCY_ENABLED`; procedure `e_residency` | Law. Interest form only; `GRANTED` is sysadmin-only after legislation is recorded |
| ASAN Viza | `VISA_ENABLED`; procedure `visa` | DXA API spec |
| Customs incentive | `CUSTOMS_ENABLED`; procedure `customs_incentive` | DGK spec |
| Utilities (electricity, gas, water) | `ELECTRICITY_ENABLED` / `GAS_ENABLED` / `WATER_ENABLED`; all seeded `PLANNED` | Utility / Vahid İS spec |
| Work / residence permits | `work_permit`, `temporary_residence` | Migration spec; biometrics stay `PHYSICAL` until TZ §25.3 item 6 |
| E-notary, construction/zoning, cadastre | `e_notary`, `construction_permit`, `zoning_prequery` | Institution specs. No invented FAR/height numbers or fake extracts |

## Demo accounts

Seeded **local only**. Change the password before any shared deployment.

| Role | Email | Password | Notes |
| --- | --- | --- | --- |
| SYSADMIN | `sysadmin@asaninvest.local` | `ChangeMe_Sysadmin_123` | Internal role → 2FA challenge on login |
| OMBUDSMAN_OFFICER | `ombudsman@asaninvest.local` | `ChangeMe_Ombudsman_123` | Internal role → 2FA |
| INVESTOR | *(none seeded)* | — | Register via `/register` (password ≥ 10 chars, letter + digit) |

There is no seeded investor. A newly registered account can sign in without 2FA.

## Known limitations

- **2FA OTP is not visible in dev.** Internal-role login emails a six-digit code through `LoggingEmailSender`, which logs only recipient and subject — not the code body. Use a registered investor for a password-only session, or temporarily inspect/log the OTP in the email adapter if you need sysadmin in the UI.
- **Email and SMS are stubs.** Outbound messages are logged, not delivered.
- **No live government, bank, payment, visa, customs, utility, or e-sign APIs.** Phase 2/3 flags default off. Missing integrations stay as back-office work with the correct honesty flag (`PLAN` / `PHYSICAL` / `ONLINE`). Adapters must not map a stub to `COMPLETED`, `LEGAL`, or `GRANTED`.
- **ASAN Login / SİMA, e-qeyri-rezident, and foreign e-sign** are PLAN providers. `POST /auth/asan-login` does not create a session. Completing PLAN start endpoints does not raise identification to `LEGAL`.
- **Company registration** still falls back to `DVX_COMPANY_REGISTRATION_URL` until `DVX_SUBMIT_ENABLED` and a real DVX adapter exist.
- **Bank accounts** are never opened by the platform. Remote e-sign channel is PLAN; a bank `INSTITUTION_REP` decision is still required.
- **E-residency is not in force.** The public page is an expression of interest (`/e-residency`); status `GRANTED` cannot come from a stub.
- **Public Ombudsman button** and public KPI strip stay off until `OMBUDSMAN_ENABLED` / `publicKpisApproved` (TZ §25.3 item 5, FR-HOME-04).
- **Local disk uploads** in development. Malware scanning is required before production (NFR-02).
- **Production data residency (NFR-01):** PostgreSQL that holds real investor data must be hosted in Azerbaijan. Local Docker is for development only.
- **Secrets in `.env.example` / `appsettings.json`** are development placeholders. Never use them outside local machines.

## Out of scope

GraphQL, extra microservices, a second database schema, replacing institution systems, simulating video-NFC identity proofing or a wet-ink signature, and inventing request/response payloads for APIs that have no spec in this repository.
