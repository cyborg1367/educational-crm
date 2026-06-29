# Educational CRM — Backend API

**Multi-tenant SaaS CRM for educational institutes**

A FastAPI backend that tracks the full learner lifecycle — from first contact through consultation, enrollment, billing, attendance, and follow-up. Built as incremental **capsules** (bounded domains) with strict layering: **router → service → model**.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Project Structure](#project-structure)
5. [API Overview](#api-overview)
6. [Testing](#testing)
7. [Configuration](#configuration)
8. [Development](#development)
9. [Production Deployment](#production-deployment)
10. [License & Contact](#license--contact)

---

## Project Overview

### Features

- **Person management** — prospects, leads, students, alumni; lifecycle status transitions
- **Multi-department journeys** — a person's path inside each department, with optional roadmaps
- **Consultations & outcome routing** — structured assessments that trigger enrollments, tasks, or referrals
- **Course catalog & class offerings** — templates plus scheduled class instances with teachers
- **Enrollment & drop** — price snapshot at enrollment time; commercial source of truth for money
- **Finance** — invoices, installments, payments, refunds; derived statuses and sum invariants
- **Attendance** — per-session records tied to active enrollments
- **Communications** — contact log (calls, messages, visits)
- **Tasks & activities** — follow-up queue and append-only person timeline
- **Workflow orchestration** — consultation outcome handlers and APScheduler background jobs
- **JWT authentication** — role-based staff access with org-scoped multi-tenancy
- **Rate limiting** — login and sensitive-endpoint protection via slowapi

### Typical flow

```
Person → Journey → Consultation → Enrollment → Invoice → Installments → Payments
                              ↘ Task / Referral
Class ← Course          Attendance → Completion → Follow-up Task
```

### Tech stack

| Layer | Technology |
|---|---|
| API framework | [FastAPI](https://fastapi.tiangolo.com/) |
| Database | [PostgreSQL](https://www.postgresql.org/) |
| ORM | [SQLAlchemy](https://www.sqlalchemy.org/) 2.x (typed `Mapped[...]`) |
| Migrations | [Alembic](https://alembic.sqlalchemy.org/) |
| Validation | [Pydantic](https://docs.pydantic.dev/) v2 |
| Auth | JWT (`python-jose`) + bcrypt password hashing |
| Scheduler | [APScheduler](https://apscheduler.readthedocs.io/) |
| Rate limiting | [slowapi](https://github.com/laurentS/slowapi) |
| Package manager | [uv](https://docs.astral.sh/uv/) |

The authoritative data model and business rules live in [`/docs/spec.md`](../docs/spec.md).

---

## Quick Start

### Prerequisites

- **Python 3.14+** (3.11+ minimum per `pyproject.toml`)
- **PostgreSQL** 14+ (local install or Docker)
- **[uv](https://docs.astral.sh/uv/)** package manager

### Clone and install

```bash
git clone https://github.com/your-org/educational-crm.git
cd educational-crm/backend
uv sync
cp .env.example .env
```

Edit `.env` and set at minimum `DATABASE_URL` and `SECRET_KEY`.

### Database setup

Create the PostgreSQL database, then run migrations:

```bash
uv run alembic upgrade head
```

### Run the server

```bash
uv run uvicorn app.main:app --reload
```

The API starts at **http://localhost:8000**.

| Endpoint | Description |
|---|---|
| http://localhost:8000/docs | Swagger UI (interactive API docs) |
| http://localhost:8000/redoc | ReDoc alternative docs |
| http://localhost:8000/health | Health check (includes DB ping) |

---

## Architecture

### Layering

Every domain module follows the same pattern:

```
HTTP request → Router (validation, status codes)
            → Service (business logic, invariants)
            → Model (SQLAlchemy ORM)
            → PostgreSQL
```

Cross-cutting concerns live in `app/core/` (config, database session, auth helpers, pagination, logging, errors, rate limits). All tenant-owned reads and writes go through the shared **org scoping helper** in `app/tenancy/`.

### Development capsules

The backend is built in bounded slices defined in [`/docs/capsules/`](../docs/capsules/). Each capsule owns one domain and must not leak into others.

| # | Capsule | Domain module | Responsibility |
|---|---|---|---|
| 00 | Skeleton | `core/`, `tenancy/` | Project scaffold, DB session, pagination, errors, org scoping |
| 01 | Auth & Users | `auth/`, `user/`, `organization/` | JWT login, staff users, roles, multi-tenant `org_id` |
| 02 | Person | `person/` | Prospect/lead/student CRUD and lifecycle status |
| 03 | Department | `department/` | Institute departments and managers |
| 04 | Journey | `journey/` | Per-person, per-department case tracking |
| 05 | Course | `course/` | Course templates and live pricing |
| 06 | Roadmap | `roadmap/` | Department roadmaps and ordered steps |
| 07 | Class | `course_class/` | Scheduled course offerings with teachers |
| 08 | Consultation | `consultation/` | Intake assessments and outcome fields |
| 09 | Enrollment | `enrollment/` | Commercial truth: price snapshot, activate, drop |
| 10 | Communication | `communication/` | Contact log (phone, WhatsApp, email, in-person) |
| 11 | Finance | `finance/` | Invoice, installment, payment, refund |
| 12 | Attendance | `attendance/` | Session attendance and roadmap progress |
| 13 | Task & Activity | `task/`, `activity/` | Follow-up queue and person timeline |
| 14 | Workflow | `workflow/`, `scheduler.py` | Outcome routing, scheduled jobs, glue logic |

### Entity relationships

```
Organization
    └── User (staff)
    └── Department
            ├── Journey ── Person
            │       ├── Consultation
            │       └── Enrollment ── Class ── Course
            │               └── Invoice
            │                       └── Installment ── Payment ── Refund
            └── Roadmap ── RoadmapItem ── Course

Person ── Communication / Task / Activity (timeline)
```

**Key links:**

- A **Journey** groups one person's path inside one department.
- A **Consultation** may create an **Enrollment** (`pre_enroll`) and an **Invoice** with **Installments**.
- **Enrollment** snapshots `Course.current_price` at creation — never re-read live price.
- **Class** is the offering; enrollment is always to a class, not directly to a course.

### Workflow orchestration

**Consultation outcome routing** (`PATCH /consultations/{id}/outcome`) is handled by `workflow/service.py`:

| Outcome | Action |
|---|---|
| `pre_enroll` | Create enrollment + invoice + installments |
| `follow_up` | Create follow-up task for admission |
| `refer_other_dept` | Create target journey + referral task |
| `not_suitable` / `closed` | Close journey, no enrollment |
| `continue` | Returning student — new consultation on existing journey |

**Scheduled jobs** (APScheduler, started in app lifespan):

| Job | Schedule | Purpose |
|---|---|---|
| `job_check_pre_enroll_unpaid` | Daily 08:00 | Flag unpaid pre-enrollments past `PRE_ENROLL_FOLLOWUP_DAYS` |
| `job_check_installment_overdue` | Daily 09:00 | Mark overdue installments, create finance tasks |
| `job_check_dormant_followup` | Daily 10:00 | Mark dormant persons after `DORMANT_DAYS` of inactivity |
| `job_class_start_reminder` | Daily 07:00 | Remind teachers of classes starting soon |
| `job_archive_inactive_journeys` | Weekly (Sun 00:00) | Archive journeys with no recent activity |

### Money invariant

All monetary values are **integers in Toman** — no floats, no decimals.

1. **Price snapshot** — `Enrollment.price_snapshot`, `discount_snapshot`, and `final_amount` are set at enrollment creation from the course's live price. Existing enrollments never pick up price changes.
2. **Invoice mirror** — `Invoice.total_amount` freezes `enrollment.final_amount` when issued.
3. **Installment sum** — `sum(installments.amount where status != cancelled) == invoice.total_amount`
4. **Derived statuses** — installment and invoice statuses are always computed from payments, never set manually.
5. **Drop behavior** — dropping an enrollment cancels pending/partially-paid installments; refunds are recorded explicitly against payments.

---

## Project Structure

```
backend/
├── app/
│   ├── main.py             # FastAPI app, router registration, scheduler lifespan
│   ├── scheduler.py        # APScheduler job wiring
│   ├── core/               # Config, DB, auth deps, pagination, logging, errors, rate limits
│   ├── tenancy/            # Org-scoped query helper
│   ├── auth/               # JWT login
│   ├── user/               # Staff user CRUD
│   ├── organization/       # Tenant model
│   ├── person/             # Person CRUD and lifecycle
│   ├── department/         # Department CRUD
│   ├── journey/            # Journey CRUD
│   ├── course/             # Course template CRUD
│   ├── roadmap/            # Roadmap and roadmap items
│   ├── course_class/       # Class (course offering) CRUD
│   ├── consultation/       # Consultation CRUD
│   ├── enrollment/         # Enrollment, activate, drop
│   ├── communication/      # Contact log
│   ├── finance/            # Invoice, installment, payment, refund
│   ├── attendance/         # Session attendance
│   ├── task/               # Follow-up tasks
│   ├── activity/           # Person timeline
│   └── workflow/           # Outcome routing and background jobs
├── alembic/                # Database migrations
│   └── versions/
├── tests/                  # pytest suite (50 tests, ~85% coverage)
├── alembic.ini
├── conftest.py             # Shared test fixtures
├── pyproject.toml
├── uv.lock
└── .env.example
```

---

## API Overview

All endpoints except `/auth/login` and `/health` require a **Bearer JWT** obtained from login.

### Authentication

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/login` | Email + password → access token |

### Core entities

| Prefix | Description |
|---|---|
| `/people` | Person CRUD |
| `/departments` | Department CRUD |
| `/journeys` | Journey CRUD |
| `/courses` | Course template CRUD |
| `/roadmaps` | Roadmap CRUD (+ nested `/items`) |
| `/classes` | Class offering CRUD |
| `/consultations` | Consultation CRUD |
| `/enrollments` | Enrollment CRUD, drop (`PATCH …/drop`) |
| `/communications` | Contact log |
| `/attendances` | Attendance records |

### Finance

| Prefix | Description |
|---|---|
| `/invoices` | Invoice CRUD (+ nested `/installments`) |
| `/payments` | Record and list payments |
| `/refunds` | Record and list refunds |

### Workflow

| Prefix | Description |
|---|---|
| `/tasks` | Follow-up task CRUD, complete (`POST …/complete`) |
| `/activities` | Person timeline (list, manual log) |
| `/consultations/{id}/outcome` | Set outcome and trigger workflow routing |

### Admin

| Prefix | Description |
|---|---|
| `/users` | Staff user CRUD |
| `/departments` | Department management |

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | API and database connectivity check |

**Full interactive documentation:** http://localhost:8000/docs

List endpoints support pagination via `limit` and `offset` query parameters.

---

## Testing

The test suite uses **pytest** with an in-memory or test-database setup (see `conftest.py`).

```bash
# Run all tests
uv run pytest

# Run with coverage report
uv run pytest --cov=app

# Run a specific module verbosely
uv run pytest tests/test_finance.py -v

# Run a single test
uv run pytest tests/test_workflow.py::test_consultation_pre_enroll -v
```

| Metric | Value |
|---|---|
| Tests | 50 |
| Coverage | ~85% |

Test modules:

| File | Focus |
|---|---|
| `test_finance.py` | Invoices, installments, payments, refunds, invariants |
| `test_workflow.py` | Consultation outcomes, enrollment activation |
| `test_scheduled_jobs.py` | Background job behavior |
| `test_pagination.py` | Paginated list endpoints |
| `test_tenancy.py` | Org isolation |

---

## Configuration

Copy `.env.example` to `.env` and configure:

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string (`postgresql+psycopg2://user:pass@host:port/db`) |
| `SECRET_KEY` | Yes | — | JWT signing secret (use a long random string in production) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `480` | JWT token lifetime in minutes |
| `PRE_ENROLL_FOLLOWUP_DAYS` | No | `3` | Days before a pre-enroll unpaid task is created |
| `DORMANT_DAYS` | No | `365` | Days of inactivity before a person is marked dormant |
| `ENVIRONMENT` | No | `development` | `development` or `production` — controls logging and security headers |
| `CORS_ORIGINS` | Prod | — | Comma-separated allowed origins (e.g. `https://app.example.com`) |
| `RATE_LIMIT_STORAGE_URI` | No | `memory://` | Rate-limit backend; use `redis://host:6379` in production |

Example `.env`:

```env
DATABASE_URL=postgresql+psycopg2://crm:crm@localhost:5432/crm
SECRET_KEY=change-me-to-a-long-random-string
ACCESS_TOKEN_EXPIRE_MINUTES=480
PRE_ENROLL_FOLLOWUP_DAYS=3
DORMANT_DAYS=365
ENVIRONMENT=development
# CORS_ORIGINS=https://app.example.com
# RATE_LIMIT_STORAGE_URI=redis://localhost:6379
```

---

## Development

### Capsule workflow

Each feature is implemented inside a single capsule:

1. **Branch** — create a feature branch for the capsule
2. **Implement** — model → schemas → service → router → migration (inside the capsule domain only)
3. **Test** — add or extend tests in `tests/`
4. **Commit** — small, focused commits
5. **Merge** — after review and green CI

Capsule constraints are defined in [`/docs/capsules/`](../docs/capsules/) and enforced by project rules in [`.cursor/rules/`](../.cursor/rules/). Never edit files outside the active capsule's domain.

### Adding a new entity

1. Create a module under `app/<domain>/` with:
   - `model.py` — SQLAlchemy model (`org_id`, `created_at`, `updated_at`)
   - `schemas.py` — Pydantic v2 read/create/update schemas
   - `service.py` — business logic (use org scoping helper)
   - `router.py` — FastAPI routes (thin — delegate to service)
   - `enums.py` — if the entity has status/type enums
2. Register the router in `app/main.py`
3. Generate and review a migration:

```bash
uv run alembic revision --autogenerate -m "add_widget_crud"
uv run alembic upgrade head
```

4. Write tests in `tests/test_<domain>.py`

### Migrations

```bash
# Apply all pending migrations
uv run alembic upgrade head

# Roll back one revision
uv run alembic downgrade -1

# Create a new migration (review the generated file before committing)
uv run alembic revision --autogenerate -m "describe_change"
```

### Conventions

- **Money:** integers in Toman everywhere
- **Timeline:** all `Activity` writes go through the central `log_activity` helper
- **Tenancy:** every tenant-owned query uses the scoping helper — never filter `org_id` ad hoc per endpoint
- **Layering:** routers stay thin; business logic lives in services only

---

## Production Deployment

See **[DEPLOYMENT.md](../DEPLOYMENT.md)** for the full production guide covering:

- Docker image build and run
- Environment variable checklist
- PostgreSQL setup and connection pooling
- Redis for rate-limit storage
- CORS and `ENVIRONMENT=production` hardening
- Health checks and logging

Quick checklist:

- Set `ENVIRONMENT=production`
- Use a strong, unique `SECRET_KEY`
- Point `RATE_LIMIT_STORAGE_URI` to Redis
- Configure `CORS_ORIGINS` for your frontend domain
- Run migrations before starting the app: `uv run alembic upgrade head`
- Use a production ASGI server (e.g. `uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4`)

---

## License & Contact

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2026 Educational CRM Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is furnished
to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

**Questions or contributions?** Open an issue or pull request on the repository. For architecture and business-rule questions, start with [`docs/spec.md`](../docs/spec.md).
