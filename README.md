# ASAN INVEST

ASAN INVEST is a **demo** web platform that helps Azerbaijani citizens and foreign citizens browse Azerbaijani governmental projects and record an investment commitment.

This is **not** an official ASAN xidmət, e-gov, AZPROMO, or Ministry of Economy product. It does not move real money and is not a licensed financial service.

## Stack

- React 18 + TypeScript + Vite + Tailwind CSS
- Node.js + Express + REST
- PostgreSQL 16 + Prisma
- JWT access token (memory) + httpOnly refresh cookie

## Prerequisites

- Node.js 20+
- PostgreSQL 16 (local install or Docker)

## Quick start

```bash
cp .env.example .env
# If using Docker for the database:
docker compose up -d postgres

npm install
npm run db:migrate:deploy
npm run db:generate
npm run db:seed
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:4000/api/v1/health

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@asaninvest.demo` | `ChangeMe_Admin_123` |
| Operator | `operator@asaninvest.demo` | `ChangeMe_Operator_123` |
| Investor (AZ, KYC approved) | `investor.az@asaninvest.demo` | `ChangeMe_Investor_123` |
| Investor (foreign, KYC pending) | `investor.foreign@asaninvest.demo` | `ChangeMe_Investor_123` |

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | API + Vite together |
| `npm test` | API tests (uses `asan_invest_test`) |
| `npm run typecheck` | TypeScript for both apps |
| `npm run db:seed` | Sample sectors, agencies, projects, users |

## Architecture

See [docs/architecture.md](docs/architecture.md).
