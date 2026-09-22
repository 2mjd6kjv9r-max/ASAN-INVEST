# ASAN Invest

ASAN Invest is the investor’s single contact point with Azerbaijani institutions (TZ v4.0). It does **not** replace those institutions and does **not** decide permits, incentives, or bank accounts.

Phase 1 (Mərhələ 1 — Əsas platforma) is implemented and has been verified end-to-end on `main`.

| Doc | Purpose |
| --- | --- |
| [`ASAN_Invest_TZ_v4.0.md`](ASAN_Invest_TZ_v4.0.md) | Product source of truth |
| [`docs/PLAN.md`](docs/PLAN.md) | Phase 1 implementation plan |
| [`docs/api.md`](docs/api.md) | Frozen `/api/v1` HTTP contract |
| [`AGENTS.md`](AGENTS.md) | Agent / contributor rules |

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | React + TypeScript, Vite, Tailwind CSS, React Router, i18next (`client/`) |
| Backend | ASP.NET Core Web API, `net8.0` (`server/AsanInvest.sln`) |
| Database | PostgreSQL 16. Prisma migrations apply the schema; EF Core maps the same tables |
| Auth | Email/password; short-lived access JWT in memory; httpOnly `refresh_token` cookie. Internal roles require 2FA |

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

- Health: `GET http://localhost:4000/health` → `{ "data": { "status": "ok", "service": "asan-invest-api", "phase": 1 } }`
- Web: http://localhost:5173

API tests: `dotnet test server/AsanInvest.sln`.  
Client production build: `npm run build:client`.

## What Phase 1 includes

**Public portal**

- Home, Why Azerbaijan, investor guide, about (CMS pages)
- Investment opportunities catalogue (CMS + seeded zones/parks)
- Route calculator, incentive eligibility, Know Your Approvals (in-process rule engine)
- Honesty flags: AUTO / ONLINE / PHYSICAL / PLANNED
- Register, sign in, forgot/reset password, email verify
- Company registration CTA to the existing DVX URL (no in-app company create)
- Investment Ombudsman placeholder page (no OMB module)

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

## Demo accounts

Seeded **local only**. Change the password before any shared deployment.

| Role | Email | Password | Notes |
| --- | --- | --- | --- |
| SYSADMIN | `sysadmin@asaninvest.local` | `ChangeMe_Sysadmin_123` | Internal role → 2FA challenge on login |
| INVESTOR | *(none seeded)* | — | Register via `/register` (password ≥ 10 chars, letter + digit) |

There is no seeded investor. A newly registered account can sign in without 2FA.

## Known limitations

- **2FA OTP is not visible in dev.** Internal-role login emails a six-digit code through `LoggingEmailSender`, which logs only recipient and subject — not the code body. Use a registered investor for a password-only session, or temporarily inspect/log the OTP in the email adapter if you need sysadmin in the UI.
- **Email and SMS are stubs.** Outbound messages are logged, not delivered.
- **ASAN Login / SİMA is a stub.** The button explains that the provider is not connected; there is no live government client.
- **No live institution, bank, or payment APIs.** Missing integrations stay as back-office work with the correct honesty flag. PAY, OMB, and AFT modules are Phase 2+.
- **Company registration** only returns `DVX_COMPANY_REGISTRATION_URL`; the platform does not submit to DVX.
- **Local disk uploads** in development. Malware scanning is required before production (NFR-02).
- **Production data residency (NFR-01):** PostgreSQL that holds real investor data must be hosted in Azerbaijan. Local Docker is for development only.
- **Secrets in `.env.example` / `appsettings.json`** are development placeholders. Never use them outside local machines.

## Out of scope (Phase 1)

PAY, OMB, AFT, DVX submit, bank APIs, in-app payments, live ASAN Login, GraphQL, extra microservices.
