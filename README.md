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
