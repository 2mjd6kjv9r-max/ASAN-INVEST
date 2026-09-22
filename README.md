# ASAN-INVEST

ASAN Invest is the investor’s single contact point with Azerbaijani institutions (TZ v4.0). It does not replace those institutions and does not decide permits or incentives.

Phase 1 plan: [`docs/PLAN.md`](docs/PLAN.md). Agent rules: [`AGENTS.md`](AGENTS.md).

## Database (Phase 1)

PostgreSQL 16 + Prisma. Production data **must stay in Azerbaijan** (NFR-01). Local Docker is allowed for development.

```bash
cp .env.example .env
docker compose up -d postgres
npm install
npm run db:migrate:deploy
npm run db:generate
npm run db:seed
npm run db:verify
```

Details: [`server/src/db/README.md`](server/src/db/README.md).

Demo sysadmin (local seed only): `sysadmin@asaninvest.local` / `ChangeMe_Sysadmin_123`. Change this password before any shared deployment.

## API (Phase 1)

REST JSON under `/api/v1` (`server/src`). Session: short-lived access JWT + httpOnly refresh cookie. Internal roles require 2FA (NFR-02). ASAN Login / SİMA is an interface + stub only.

```bash
cp .env.example .env
npm install
npm run db:migrate:deploy
npm run db:generate
npm run db:seed
npm run dev
```

Health: `GET http://localhost:4000/health`.

Contract: [`docs/api.md`](docs/api.md).

## Out of scope (Phase 1)

PAY, OMB, AFT modules, DVX submit, bank APIs, in-app payments. Company registration returns the existing DVX e-service URL.
