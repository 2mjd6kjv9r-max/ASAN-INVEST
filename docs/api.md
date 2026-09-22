# ASAN Invest API (`/api/v1`)

Phase 1 contract for the Frontend Specialist. Errors: `{ error: { code, message, details? } }`. Success: `{ data, meta? }`. Money fields are decimal strings.

Auth: `Authorization: Bearer <accessToken>` plus httpOnly cookie `refresh_token` on `/api/v1/auth`.

| Method | Path | Auth | TZ |
| --- | --- | --- | --- |
| GET | `/health` | no | liveness |
| POST | `/auth/register` | no | FR-AUTH-01, 04 |
| POST | `/auth/login` | no | FR-AUTH-03 |
| POST | `/auth/2fa/verify` | no | NFR-02 |
| POST | `/auth/refresh` | cookie | FR-AUTH-03 |
| POST | `/auth/logout` | cookie | FR-AUTH-03 |
| GET | `/auth/me` | yes | |
| POST | `/auth/forgot-password` | no | FR-AUTH-03 |
| POST | `/auth/reset-password` | no | FR-AUTH-03 |
| POST | `/auth/verify-email` | no | FR-AUTH-01 |
| POST | `/auth/asan-login` | no | FR-AUTH-02 stub |
| POST | `/guest-sessions` | no | FR-AUTH-04 |
| GET | `/pages/:slug` | no | FR-ADM-05 |
| GET | `/opportunities` | no | FR-OPP |
| GET | `/classifications` | no | FR-ADM-02 |
| GET | `/company-registration` | no | DVX redirect |
| POST | `/route/calculate` `/route/save` | save: yes | FR-ROUTE |
| POST | `/incentives/evaluate` `/incentives/save` | save: yes | FR-INC |
| POST | `/kya/evaluate` `/kya/save` | save: yes | FR-KYA |
| GET/PUT | `/me/profile` | yes | FR-PROF |
| GET/POST | `/me/representations` | yes | FR-PROF-04 |
| GET | `/cabinet/dashboard` | yes | FR-CAB-01 |
| GET/POST | `/projects` | yes | FR-PROJ |
| GET/POST | `/applications` | yes | FR-APP |
| POST | `/applications/:id/submit` | yes | FR-APP-03, 04 |
| POST | `/applications/:id/withdraw` | yes | FR-APP-05 |
| GET | `/cases` | staff | FR-CASE |
| POST | `/cases/:id/close` `/reopen` `/extend` | staff / supervisor | WF, FR-CASE-07 |
| POST | `/cases/:id/complaint` | investor | Phase 1 Şikayət et |
| GET | `/evaluations` | evaluator | FR-EVAL |
| GET/POST | `/documents` | yes | FR-CAB-04 |
| GET | `/notifications` | yes | FR-NOT |
| * | `/admin/*` | sysadmin / content_manager | FR-ADM |
| GET | `/analytics/overview` | analyst | FR-REP-01…08, 11 |

Investor DTOs never include `internalNotes` or `internal` messages (GİR-03).
