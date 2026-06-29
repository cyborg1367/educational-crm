# Architecture — System Design & Data Model

This document describes how the Educational CRM backend is structured: tenancy, entities, money rules, workflows, and cross-cutting concerns. The authoritative business specification lives in [`/docs/spec.md`](../docs/spec.md); this file explains how the code implements it.

---

## 1. System Overview

The Educational CRM is a **multi-tenant SaaS** application for educational institutes. Each tenant is an **Organization**; all business data is partitioned by `org_id`. v1 runs a single organization in practice, but the data model and query layer are multi-tenant from day one.

**Architecture choices (v1):**

- **Single PostgreSQL database** — no microservices, no event sourcing, no rule engine
- **Layering:** `router → service → model` (HTTP thin; business logic in services only)
- **JWT authentication** with **role-based access** for staff users
- **APScheduler** for a small set of cron jobs (not a workflow engine)

**Staff roles** (`User.role`):

| Role | Typical scope |
|---|---|
| `admin` | Full access; user management |
| `admission` | Person intake, journeys, follow-ups |
| `department_manager` | Consultations, department tasks, completions |
| `finance` | Invoices, installments, payments, refunds |
| `teacher` | Classes, attendance, class completion |

A **Person** is the learner/contact record; everything in the learner lifecycle (consultations, enrollments, payments, communications, tasks, timeline) hangs off that single record.

---

## 2. Entity Relationship Diagram

High-level relationships (cardinality). Every entity below also carries `org_id → Organization`.

```
Organization (1)
    │
    ├── Person (N) ─────────────────────────────────────────────────┐
    │       │                                                        │
    │       ├── Journey (N)     unique (person_id, department_id)   │
    │       ├── Enrollment (N)  unique (person_id, class_id) live   │
    │       ├── Communication (N)   append-only contact log         │
    │       ├── Activity (N)        append-only timeline              │
    │       └── Task (N)          follow-up work items              │
    │                                                                │
    ├── Department (N) ── manager_id → User                         │
    │       │                                                        │
    │       ├── User (N)      staff accounts                        │
    │       ├── Course (N)    template + current_price              │
    │       ├── Roadmap (N)                                           │
    │       └── Consultation (N)                                      │
    │                                                                │
    ├── Course (1) ── Class (N) ── Enrollment (N) ──────────────────┘
    │                      │
    └── Roadmap (1) ── RoadmapItem (N) ── course_id? → Course
                              (progress computed from completed enrollments)

Consultation
    └── outcome routing (workflow) ──► Enrollment / Task / Journey

Enrollment (1) ── Invoice (1) ── Installment (N) ── Payment (N) ── Refund (N)

Attendance (N) ── enrollment_id → Enrollment   (per session_date, unique)
```

**Key constraints:**

- **Journey:** one active path per `(person_id, department_id)` within an org
- **Enrollment:** one *live* enrollment per `(person_id, class_id)`; re-enroll allowed after `dropped`
- **Invoice:** 1:1 with enrollment; installment amounts must sum to `total_amount`
- **Roadmap progress:** not stored — a step is complete when the person has a `completed` enrollment for the step's `course_id`

---

## 3. Development Capsules

Features are built in isolated **capsules** (see [`/docs/capsules/`](../docs/capsules/)). Each capsule owns one domain module and must not edit other domains.

| # | Module | Key class / entrypoint | Purpose |
|---|---|---|---|
| **00** | `app/core/`, `alembic/` | `Base`, `get_db`, `/health` | Project skeleton: FastAPI app, settings, DB session, migrations |
| **01** | `auth`, `user`, `organization`, `tenancy` | `Organization`, `User`, `scoped()` | JWT login, bcrypt passwords, org scoping helper, seed admin |
| **02** | `person` | `Person` | Learner/contact CRUD, lifecycle status field |
| **03** | `department` | `Department` | Departments and manager assignment |
| **04** | `journey` | `Journey` | Person path inside a department (owner, roadmap, status) |
| **05** | `course` | `Course` | Course templates and live `current_price` |
| **06** | `roadmap` | `Roadmap`, `RoadmapItem` | Department learning tracks and ordered steps |
| **07** | `course_class` | `CourseClass` | Class offerings (teacher, dates, status) |
| **08** | `consultation` | `Consultation` | Assessments and `outcome` enum |
| **09** | `enrollment` | `Enrollment` | Commercial truth: price snapshots, status, drop |
| **10** | `finance` | `Invoice`, `Installment` | Billing document, installment plan, money invariant |
| **11** | `attendance` | `Attendance` | Per-session attendance for active enrollments |
| **12** | `task`, `activity` | `Task`, `Activity`, `log_activity()` | Follow-up tasks and append-only person timeline |
| **13** | `workflow`, `scheduler` | `on_consultation_outcome`, jobs | Outcome routing, activation, class completion, cron |
| **14** | `finance` (payments) | `Payment`, `record_payment()` | Payment recording, status recomputation, first-payment activation |
| **15** | `finance` + `enrollment` | `Refund`, `drop_enrollment()` | Refunds, auto-refund on drop, task cancellation |

> **Note:** `app/communication/` implements the append-only **Communication** contact log (phone, WhatsApp, visits). It is documented as capsule `10-communication` in `/docs/capsules/`; finance invoice/installment logic is capsule `11-finance` in that tree.

---

## 4. Key Flows

### Consultation → Enrollment

When a consultation **outcome** is set, `workflow.on_consultation_outcome()` routes the case:

```
Consultation saved with outcome
        │
        ├─► pre_enroll
        │       create Enrollment (status=pre_enroll)
        │       snapshot price from Course.current_price
        │       issue Invoice + 2 installments (50% / 50%, due today + 30 days)
        │
        ├─► follow_up
        │       create Task(type=follow_up_registration)
        │
        ├─► refer_other_dept
        │       get_or_create Journey in target department
        │       create Task(type=referral) for target dept manager
        │
        ├─► not_suitable | closed
        │       Journey.status → completed
        │
        └─► continue
                no-op (returning student on existing journey)
```

Side effects on every outcome: ensure `Journey` exists, promote `Person` from `prospect` → `lead` on first consultation, write `Activity` (`consultation_done`).

### Payment → Status

```
record_payment(installment_id, amount)
        │
        ├─► Payment row created
        ├─► Installment.paid_amount += amount
        ├─► recompute_installment_status()
        │       pending | partially_paid | paid | overdue | cancelled
        ├─► recompute_invoice_status()
        │       open | partially_paid | paid | void
        ├─► log_activity("payment_recorded")
        └─► on_first_payment() if first payment on invoice
                Enrollment: pre_enroll → active
                Person: lead → student
```

Statuses are **always derived** from `paid_amount` and `due_date`; they are never set arbitrarily by API callers.

### Drop

`enrollment.drop_enrollment()` executes a coordinated rollback:

1. `Enrollment.status` → `dropped`
2. All non-cancelled **Installments** → `cancelled`
3. For each installment with `paid_amount > 0`, **auto-refund** full remaining balance on each `Payment` via `refund_payment()`
4. `recompute_invoice_status()` (typically → `void` or `partially_paid` depending on state)
5. Related **Tasks** (`related_entity_type=enrollment`) → `cancelled`
6. `log_activity("enrollment_dropped")`

---

## 5. Tenancy Model

Multi-tenancy is **structural**, not optional:

1. Every tenant-owned table has `org_id → organizations.id` (indexed).
2. Every read/write uses `scoped(select(...), Model, org_id)` from `app/tenancy/scoping.py`:

```python
def scoped(stmt: Select[T], model: type, org_id: int) -> Select[T]:
    return stmt.where(model.org_id == org_id)
```

3. Each **User** belongs to exactly one `org_id`.
4. JWT payload carries `sub` (user id) and `org_id`; `get_current_user()` loads the user only when both match.
5. `get_current_org()` resolves the active organization from the token (validates `is_active`).

Routers obtain `org_id` from `current_user.org_id` and pass it into every service call. Cross-org access is impossible without a valid token for that org.

---

## 6. Money Invariant

All monetary values are **integers in Toman** (no floats, no `Decimal`).

| Field | Rule |
|---|---|
| `Enrollment.price_snapshot` | Frozen from `Course.current_price` at creation |
| `Enrollment.discount_snapshot` | Set at creation (default 0) |
| `Enrollment.final_amount` | `price_snapshot − discount_snapshot` (immutable after create) |
| `Invoice.total_amount` | Copy of `enrollment.final_amount` at issue time |
| `Installment.amount` | Plan line items; **sum of non-cancelled installments must equal `invoice.total_amount`** (`validate_invariant()` before commit) |
| `Installment.paid_amount` | Running total; incremented on payment, decremented on refund |
| Refund cap | `refund_amount ≤ payment.amount − sum(existing refunds)` |

The **Enrollment** is the commercial source of truth; the **Invoice** is the billing document that mirrors and freezes those numbers.

---

## 7. Scheduled Jobs

APScheduler runs five cron jobs (server local time) from `app/scheduler.py`, implemented in `app/workflow/jobs.py`:

| Job | Schedule | Behavior |
|---|---|---|
| `job_class_start_reminder` | Daily **07:00** | Classes starting today → notify relevant enrollees |
| `job_check_pre_enroll_unpaid` | Daily **08:00** | `pre_enroll` enrollments older than `PRE_ENROLL_FOLLOWUP_DAYS` (default 3) with no payment → `Task(pre_enroll_unpaid)` |
| `job_check_installment_overdue` | Daily **09:00** | Installments past `due_date` not fully paid → mark overdue + `Task(installment_overdue)` for finance |
| `job_check_dormant_followup` | Daily **10:00** | Persons with no recent activity → `dormant` status + `Task(dormant_followup)` |
| `job_archive_inactive_journeys` | **Sunday 00:00** | Journeys inactive beyond threshold → archive / status update |

Jobs iterate per organization and use `scoped()` for all queries. When running multiple API replicas, be aware each process starts its own scheduler instance (see [DEPLOYMENT.md](DEPLOYMENT.md)).

---

## 8. Activity Logging

The **Activity** table is an append-only **person timeline** — not a full audit trail.

| Column | Purpose |
|---|---|
| `action` | Event name string (e.g. `enrollment_created`, `payment_recorded`) |
| `payload` | JSONB context (ids, amounts, outcomes) |
| `actor_id` | Staff user who triggered the event (nullable) |
| `created_at` | Timestamp (no `updated_at` — never mutated) |

**Single write path:** all Activity inserts go through:

```python
log_activity(db, org_id, person_id, action, payload=None, actor_id=None)
```

in `app/activity/service.py`. Services across workflow, finance, enrollment, and tasks call this helper. There are no update/delete endpoints for activities.

Representative actions: `consultation_done`, `enrollment_created`, `enrollment_activated`, `payment_recorded`, `payment_refunded`, `enrollment_dropped`, `task_created`, `course_completed`.

---

## 9. Authentication & Authorization

### JWT

Tokens are HS256-signed with `SECRET_KEY`. Payload:

```json
{ "sub": "<user_id>", "org_id": <org_id>, "exp": <unix_timestamp> }
```

Issued by `POST /auth/login`; validated on every protected route via `HTTPBearer`.

### Authorization

`require_role(*roles)` in `app/auth/deps.py` returns a FastAPI dependency that raises **403** when `user.role` is not in the allowed set. Example: `/users` CRUD requires `admin`.

RBAC is **basic in v1** — most endpoints only require a valid authenticated user; role checks are applied where needed and can be extended per endpoint over time. Intended mapping:

| Role | Domains |
|---|---|
| `admin` | All endpoints, user management |
| `admission` | People, journeys, consultations, communications |
| `finance` | Invoices, installments, payments, refunds |
| `teacher` | Classes, attendance |
| `department_manager` | Department tasks, consultation outcomes, reviews |

Passwords are hashed with **bcrypt** (`passlib`); hashes are never returned in API responses.

---

## 10. Performance & Scaling

| Mechanism | Detail |
|---|---|
| **Pagination** | Default page size **50**, hard cap **500** (`PaginationParams`, `paginate_query`) |
| **Indexes** | `org_id` on all tenant tables; foreign keys; partial unique on `enrollments (person_id, class_id)` where not dropped |
| **Connection pooling** | SQLAlchemy engine + `psycopg2`, `pool_pre_ping=True` |
| **Rate limiting** | SlowAPI: **100/min** default per IP; **10/min** on sensitive routes (enrollment drop, payment, refund); **5/min** on login (per IP + email) |
| **Caching** | None in v1; for **>10k enrollments**, consider caching read-heavy `Course` / `Class` lookups |

Horizontal scaling: point `RATE_LIMIT_STORAGE_URI` to Redis so rate-limit counters are shared across replicas (see [DEPLOYMENT.md](DEPLOYMENT.md)).

---

## 11. Security

| Control | Implementation |
|---|---|
| **HTTPS** | Required in production; terminate TLS at reverse proxy |
| **CORS** | Development: `localhost:3000`, `localhost:5173`; production: `CORS_ORIGINS` env var only |
| **Security headers** | `SecurityHeadersMiddleware`: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Content-Security-Policy`; **HSTS** when `ENVIRONMENT=production` |
| **Rate limiting** | SlowAPI with `memory://` (dev) or `redis://` (prod multi-instance) |
| **Secrets** | `DATABASE_URL`, `SECRET_KEY` via environment / secret manager only |
| **Password storage** | bcrypt via `passlib`; minimum practice: strong `SECRET_KEY`, rotate seed admin password |

Request tracing: each HTTP request gets an `X-Request-ID` header; structured JSON logs include `request_id`, `user_id`, and `org_id` when authenticated.

---

## Layer Diagram

```
┌─────────────────────────────────────────────────────────┐
│  Client (browser / mobile / integration)                │
└───────────────────────────┬─────────────────────────────┘
                            │ HTTPS + Bearer JWT
┌───────────────────────────▼─────────────────────────────┐
│  FastAPI routers          CORS · Rate limit · Logging   │
│  (thin: validate, status codes, call service)           │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│  Services               org_id on every call              │
│  workflow · finance · enrollment · person · …           │
│  log_activity() · scoped() · money invariant              │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│  SQLAlchemy models        PostgreSQL                    │
│  APScheduler (in-process cron jobs)                     │
└─────────────────────────────────────────────────────────┘
```

---

## Related documentation

- [README.md](README.md) — API overview, local development, test suite
- [DEPLOYMENT.md](DEPLOYMENT.md) — Docker, production env vars, health checks
- [`/docs/spec.md`](../docs/spec.md) — full v1 specification and person lifecycle
- [`/docs/capsules/`](../docs/capsules/) — per-capsule constraints and domains
