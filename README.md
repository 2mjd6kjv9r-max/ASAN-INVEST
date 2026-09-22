# ASAN-INVEST

ASAN Invest is the investor’s single contact point with Azerbaijani institutions (TZ v4.0). It does not replace those institutions and does not decide permits or incentives.

Phase 1 plan: [`docs/PLAN.md`](docs/PLAN.md). Agent rules: [`AGENTS.md`](AGENTS.md).

## Database (Phase 1)

PostgreSQL 16. Production data **must stay in Azerbaijan** (NFR-01). Local Docker is allowed for development. The canonical schema lives in `server/prisma/` (Database Specialist). The API maps those tables with Entity Framework Core and does not redesign them.

```bash
cp .env.example .env
docker compose up -d postgres
npm install
npm run db:migrate:deploy
npm run db:generate
npm run db:seed
npm run db:verify
```

Details: [`server/prisma/README.md`](server/prisma/README.md).

Demo sysadmin (local seed only): `sysadmin@asaninvest.local` / `ChangeMe_Sysadmin_123`. Change this password before any shared deployment.

## API (Phase 1)

ASP.NET Core Web API (`net8.0`) under `server/AsanInvest.sln`. REST JSON at `/api/v1` matching [`docs/api.md`](docs/api.md). Session: short-lived access JWT + httpOnly `refresh_token` cookie. Internal roles require 2FA (NFR-02). ASAN Login / SİMA is an interface + stub only.

Requires the .NET 8 SDK.

```bash
cp .env.example .env
docker compose up -d postgres
npm install
npm run db:migrate:deploy
npm run db:generate
npm run db:seed
dotnet run --project server/AsanInvest.Api
```

Health: `GET http://localhost:4000/health`.

Tests: `dotnet test server/AsanInvest.sln`.

Contract: [`docs/api.md`](docs/api.md).

## Out of scope (Phase 1)

PAY, OMB, AFT modules, DVX submit, bank APIs, in-app payments. Company registration returns the existing DVX e-service URL.
