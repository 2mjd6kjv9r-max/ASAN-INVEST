# ASAN Invest API (`/api/v1`)

Phase 1 contract for the Frontend Specialist. Errors: `{ error: { code, message, details? } }`. Success: `{ data, meta? }`. Money fields are decimal strings. Enums match the Prisma schema (SCREAMING_SNAKE).

Auth: `Authorization: Bearer <accessToken>` plus httpOnly cookie `refresh_token` on `/api/v1/auth`.

Investor-visible status is mapped from `cases.internal_status` (Z-03). Investor DTOs never include internal messages (`isInternal: true`) (GİR-03).

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
| PATCH | `/guest-sessions/:token` | no | FR-AUTH-04 |
| GET | `/pages/:slug` | no | FR-ADM-05 |
| GET | `/opportunities` | no | FR-OPP (CMS pageKey OPP + zone classifications) |
| GET | `/classifications` | no | FR-ADM-02 |
| GET | `/procedures` | no | FR-ADM-08 |
| GET | `/company-registration` | no | DVX redirect |
| POST | `/route/calculate` `/route/save` | save: yes | FR-ROUTE |
| POST | `/incentives/evaluate` `/incentives/save` | save: yes | FR-INC |
| POST | `/kya/evaluate` `/kya/save` | save: yes | FR-KYA |
| GET/PUT | `/me/profile` | yes | FR-PROF |
| POST | `/me/consents` | yes | FR-PROF-03 |
| GET/POST | `/me/representations` | yes | FR-PROF-04 |
| GET | `/cabinet/dashboard` | yes | FR-CAB-01 |
| GET/POST | `/projects` | yes | FR-PROJ |
| GET/POST | `/applications` | yes | FR-APP |
| POST | `/applications/:id/validate` | yes | FR-APP-02 |
| POST | `/applications/:id/submit` | yes | FR-APP-03, 04 |
| POST | `/applications/:id/withdraw` | yes | FR-APP-05 |
| GET | `/cases` | staff | FR-CASE |
| POST | `/cases/:id/transition` `/assign` `/close` `/reopen` `/extend` | staff / supervisor | WF, FR-CASE-07 |
| POST | `/cases/:id/extra-info` | staff | WF-05 |
| POST | `/cases/:id/complaint` | investor | Phase 1 Şikayət et |
| POST | `/cases/sla/tick` | supervisor | WF-03 |
| GET | `/evaluations` | evaluator | FR-EVAL |
| GET/POST | `/documents` | yes | FR-CAB-04 |
| GET | `/notifications` | yes | FR-NOT |
| * | `/admin/*` | sysadmin / content_manager | FR-ADM-01…09, 11 |
| GET | `/analytics/overview` | analyst | FR-REP-01…08, 11 |

Roles: `INVESTOR`, `CASE_MANAGER`, `SUPERVISOR`, `INSTITUTION_REP`, `EVALUATOR`, `CONTENT_MANAGER`, `ANALYST`, `SYSADMIN`. Guest is unauthenticated.

Case `internalStatus` values: `DRAFT`, `SUBMITTED`, `REGISTERED`, `IN_EVALUATION`, `WAITING_ADDITIONAL_INFO`, `ASSIGNED_FOR_EXECUTION`, `UNDER_REVIEW`, `INTER_AGENCY_COORDINATION`, `RESULT_BEING_PREPARED`, `COMPLETED`, `REJECTED`, `WITHDRAWN`, `ARCHIVED`.
