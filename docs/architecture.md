# ASAN INVEST architecture

This document is the implementation spec for the ASAN INVEST web application.

ASAN INVEST is a **demo** portal that lets individuals (Azerbaijani citizens and foreign citizens) browse government projects and record a funded investment commitment. It is **not** an official ASAN xidmət, e-gov, AZPROMO, or Ministry of Economy system, and it is **not** a licensed brokerage or securities exchange.

## Locked assumptions

These were open in the architecture plan and are locked for this MVP:

| Question | Decision |
|---|---|
| Official product vs demo | Demo / portfolio. Persistent UI disclaimer. |
| Investment instrument | Option B: recorded monetary commitment. No shares, bonds, or crowdfunding units. |
| Who publishes | Admin publishes. Operators create/edit drafts and review KYC + investments. |
| After stub payment | Investment moves to `pending_review`. Operator/admin must confirm. |
| Currency | AZN only. |
| Languages | Azerbaijani and English. |
| Overfunding | Not allowed. `funded_amount + amount ≤ target_amount`. |
| Investors | Individuals only. No companies / VÖEN. |
| Email | Log-only stub. Register auto-verifies unless `REQUIRE_EMAIL_VERIFICATION=true`. |
| File storage | Local disk (`UPLOAD_DIR`). |
| ORM | Prisma. |
| Payments | Stub provider + simulated webhook. No real bank. |
| ASAN İmza / e-gov | Stub module exists and is unused. |

## Shape

Two deployable apps, one PostgreSQL database:

```
Browser (React SPA)
        |
        | HTTPS, JSON, /api/v1
        v
   Express API  ---- PostgreSQL
        |
        +-- email stub
        +-- local file storage
        +-- payment stub
```

- `client/` — Vite + React 18 + TypeScript + Tailwind CSS
- `server/` — Node.js + Express + TypeScript + Prisma
- Layers: `routes → controllers → services → Prisma`
- Money is `NUMERIC(18,2)` in the database and **decimal strings** in JSON (`"1000.00"`). Never IEEE floats.

## Auth

- Password: bcrypt cost 12.
- Short-lived access JWT (15 min) returned in JSON; client keeps it in memory only.
- Refresh token (7 days) in an httpOnly, Secure (production), SameSite=Lax cookie. Stored hashed in `refresh_tokens`.
- JWT in `localStorage` is not used.
- Roles: `investor`, `operator`, `admin`.
- Rate-limit `/auth/login` and `/auth/register`.

## Roles

| Role | Access |
|---|---|
| guest | Browse published projects |
| investor | Profile, KYC upload, invest if KYC approved, own investments |
| operator | Draft projects, review KYC and investments |
| admin | Publish/close projects, suspend users, all operator rights |

Investing requires `user.status = active` and `kyc_status = approved`. The project must be `published` or `funding` and inside its funding window.

## API

Base path `/api/v1`. Success bodies: `{ data, meta? }`. Errors: `{ error: { code, message, details? } }`. Pagination: `?page=1&limit=20`.

See route modules under `server/src/modules/` for the live list. Notable endpoints:

- `GET /health`
- `GET /projects`, `GET /projects/:slug`, `GET /sectors`, `GET /agencies`
- `POST /auth/register|login|refresh|logout`, `GET /auth/me`
- `GET/PUT /me/profile`, `POST /me/kyc-documents`, `GET /me/investments`
- `POST /projects/:id/investments` (header `Idempotency-Key`)
- `POST /investments/:id/cancel`, `POST /investments/:id/pay-stub`
- Admin: projects CRUD + publish, investment confirm/reject, users, KYC approve/reject

## Out of scope for this MVP

Live bank rails, licensed brokerage, securities trading, real ASAN İmza, EHİS, real acquiring bank, SMS/email beyond the stub, mobile app, analytics, live FX, secondary market.
