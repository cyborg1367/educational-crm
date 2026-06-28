# Educational Institute CRM — v1 Specification

A learner-relationship system for an institute with multiple **departments** and **courses**.
A person comes in, gets a **consultation**, may **enroll**, **pays**, attends a **class**, finishes, and may come back. Everything attaches to one **Person** record.

**Design rule for v1: keep it simple.** Plain CRUD, a single PostgreSQL database, clean modules. No DDD bounded contexts, no event sourcing, no rule engine. Those can be added later without breaking anything.

> **Money rule (read once, applies everywhere):** every monetary field is an **integer in Toman** (no decimals). The *commercial truth* lives on the `Enrollment` (price, discount, final). The `Invoice` is the billing document that **mirrors and freezes** those numbers when issued. Money is never modeled twice as an independent source.

---

## 1. Roles (User.role)

- `admin`
- `admission` — intake, registrations, follow-up calls
- `department_manager` — runs consultations, owns a department, approves completions
- `finance` — invoices, installments, payments
- `teacher` — records attendance, marks class completion, suggests next steps

---

## 2. Core Principles

1. **One `Person` per human**, with a lifecycle `status`. Lead, Student, Alumni are the *same* record in different states (see §4a).
2. **No case is dropped.** Every consultation produces a structured `outcome` + `next_action`, and every outcome routes to a concrete next step (enrollment, task, referral, or close).
3. **Price is snapshotted at enrollment.** Never read live price from `Course` for an existing enrollment. Once an `Invoice` is issued, the enrollment's money fields are frozen.
4. **`Activity` table = the Timeline.** A simple append-only log of everything that happens to a person, written through **one central helper** so it is never forgotten.
5. **`Journey` groups a person's path inside one department** (consultations + enrollments, an owner, an optional roadmap, a status). It stays a *thin* table — no rule engine behind it.
6. Automation = a few small scheduled jobs, **not** a rule engine.

---

## 3. Data Model (18 entities — incl. `Organization`, see §8)

### Person
- `id`, `full_name`, `phone` (nullable, **unique where not null**), `email` (nullable)
- `status`: enum `[prospect, lead, student, dormant, alumni]` (default `prospect`) — transitions in §4a
- `source` (nullable), `notes` (text, nullable)
- `created_at`, `updated_at`

> Decision: `phone` is **unique only when present**, so a missing phone or a parent's shared phone never blocks a record.

### User (staff)
- `id`, `name`, `email` (unique), `password_hash`
- `role`: enum (see §1)
- `department_id` → Department (nullable)
- `is_active`, `created_at`, `updated_at`

### Department
- `id`, `name`, `manager_id` → User (nullable), `is_active`, `created_at`, `updated_at`

### Journey
A person's path inside one department. One per `(person_id, department_id)`.
- `id`, `person_id` → Person, `department_id` → Department
- `owner_id` → User (nullable) — the department owner who keeps the case
- `roadmap_id` → Roadmap (nullable) — the track this person follows in the department
- `status`: enum `[active, on_hold, completed, dropped]` (default `active`)
- `created_at`, `updated_at`
- unique (`person_id`, `department_id`)
- Consultations and Enrollments link to it via `journey_id`.

### Course (template)
- `id`, `department_id` → Department
- `title`, `description` (nullable), `level` (nullable)
- `current_price` (integer Toman) — live price, snapshotted on enrollment
- `duration_sessions` (int, nullable), `is_active`, `created_at`, `updated_at`

### Roadmap (per department)
- `id`, `department_id` → Department, `name`, `is_active`, `created_at`, `updated_at`

### RoadmapItem (a step in a roadmap)
- `id`, `roadmap_id` → Roadmap, `title`, `sequence` (int)
- `course_id` → Course (nullable) — links a step to the course that completes it
- `created_at`, `updated_at`
- *Progress is **computed**, not stored: a step is done when the person has a `completed` enrollment for its `course_id`. Which roadmap a person is on comes from `Journey.roadmap_id`.*

### Class (a course offering)
- `id`, `course_id` → Course, `teacher_id` → User
- `name` (e.g. "Python — Mon/Wed 18:00")
- `start_date`, `end_date` (nullable)
- `status`: enum `[planned, active, completed, cancelled]`
- `created_at`, `updated_at`

### Consultation
- `id`, `person_id` → Person, `department_id` → Department, `consultant_id` → User
- `journey_id` → Journey (nullable)
- `current_level`, `need`, `goal` (text, nullable) — the assessment
- `decision` (text, nullable), `recommended_course_id` → Course (nullable)
- `outcome`: enum `[pre_enroll, follow_up, refer_other_dept, not_suitable, closed, continue]`
- `refer_to_department_id` → Department (nullable)
- `next_action` (text, nullable), `next_action_date` (date, nullable)
- `notes` (text), `created_at`, `updated_at`

### Enrollment — *commercial source of truth for money*
- `id`, `person_id` → Person, `class_id` → Class (course derivable via class)
- `consultation_id` → Consultation (nullable), `journey_id` → Journey (nullable)
- `status`: enum `[pre_enroll, active, completed, dropped]`
- `price_snapshot` (integer Toman), `discount_snapshot` (integer Toman, default 0)
- `final_amount` (integer Toman = `price_snapshot − discount_snapshot`)
- `start_date` (nullable), `created_at`, `updated_at`
- unique (`person_id`, `class_id`) **where status != `dropped`** (one live enrollment per class; re-enroll allowed after a drop)

### Attendance
- `id`, `enrollment_id` → Enrollment, `session_date` (date)
- `status`: enum `[present, absent, late, excused]`
- `recorded_by` → User, `note` (nullable), `created_at`, `updated_at`
- unique (`enrollment_id`, `session_date`)

### Invoice — *billing document, mirrors the enrollment*
- `id`, `enrollment_id` → Enrollment (1:1)
- `total_amount` (integer Toman) — frozen copy of `enrollment.final_amount` at issue (no separate discount field here)
- `status`: enum `[open, partially_paid, paid, void]` — **derived** from installments/payments
- `issued_at`, `created_at`, `updated_at`
- **Invariant:** `sum(installments.amount where status != cancelled) == total_amount`

### Installment
- `id`, `invoice_id` → Invoice, `sequence` (int: 1,2,3…)
- `amount` (integer Toman), `due_date` (date)
- `status`: enum `[pending, partially_paid, paid, overdue, cancelled]` — **derived** from payments
  - `paid` when `sum(payments) >= amount`; `partially_paid` when `0 < sum(payments) < amount`; `overdue` when past `due_date` and not fully paid; `cancelled` set on enrollment drop
  - remaining balance = `amount − sum(payments)`
- `created_at`, `updated_at`

### Payment
- `id`, `installment_id` → Installment
- `amount` (integer Toman), `paid_at` (datetime)
- `method`: enum `[cash, card, transfer]`
- `recorded_by` → User, `reference` (nullable), `created_at`

### Communication — *contact log (calls, messages, visits)*
- `id`, `person_id` → Person, `journey_id` → Journey (nullable)
- `channel`: enum `[phone, whatsapp, sms, email, in_person]`
- `direction`: enum `[inbound, outbound]`
- `summary` (text), `outcome` (text, nullable)
- `next_action_date` (date, nullable)
- `created_by` → User, `created_at`

### Task (follow-up)
- `id`, `person_id` → Person
- `type`: enum `[follow_up_registration, pre_enroll_unpaid, post_course_consultation, dormant_followup, installment_overdue, referral, custom]`
- `title`, `description` (nullable), `due_date` (date)
- `assignee_id` → User (nullable)
- `status`: enum `[open, done, cancelled]`
- `related_entity_type` / `related_entity_id` (nullable) — light link to source record
- `created_at`, `completed_at` (nullable)

### Activity (timeline log)
- `id`, `person_id` → Person
- `type` (string): e.g. `person_created`, `consultation_done`, `enrollment_created`,
  `payment_received`, `attendance_recorded`, `course_completed`, `communication_logged`, `task_created`
- `payload` (JSON), `actor_id` → User (nullable), `created_at`

---

## 4. Key Workflows

1. **Intake → consultation.** Person created (`prospect`). The first consultation in a department auto-creates that person's `Journey`. Running the consultation moves the person to `lead`. The `department_manager` sets the `outcome`.
2. **Outcome routing** (every branch lands somewhere concrete):
   - `pre_enroll` → create `Enrollment` (`pre_enroll`) + `Invoice` + `Installment`s.
   - `follow_up` → create `Task` (`follow_up_registration`, `due_date = next_action_date`).
   - `refer_other_dept` → set `refer_to_department_id`, **create the target-department `Journey`**, and create a `Task` (`referral`) for it so the referral can't be dropped.
   - `not_suitable` / `closed` → no enrollment; the journey is closed (`Journey.status = dropped/completed`).
   - `continue` → for returning students (a new consultation on an existing journey).
3. **Activation.** When the first `Payment` settles (fully or partially starts) the first `Installment`, `Enrollment.status = active` and `Person.status = student`.
4. **Attendance.** Teacher records `Attendance` per session for active enrollments.
5. **Completion.** Teacher marks `Class.status = completed` → its enrollments → `completed` → auto-create `Task` (`post_course_consultation`) for the department manager. Teacher *suggests* next steps; manager *decides* via a new consultation.
6. **Finance rules.**
   - Installment and invoice statuses are **always derived** from payments (never set by hand).
   - **On enrollment `dropped`:** all `pending` / `partially_paid` installments → `cancelled`; the invoice's invariant re-checks against non-cancelled installments. **Refunds of money already received are handled manually / out of v1 scope** (record a note; no automated refund ledger).
7. **Scheduled jobs** (small cron functions, not a rule engine):
   - Installment past `due_date` and not fully paid → mark `overdue` + `Task` (`installment_overdue`) for finance.
   - Enrollment stuck in `pre_enroll` with no payment after *N* days → `Task` (`pre_enroll_unpaid`) for admission (this is the conversion-rate safety net).
   - No `Activity` for *M* days → `Person.status = dormant` + `Task` (`dormant_followup`).
8. **Timeline.** Every meaningful action writes one `Activity` row, always through the central activity helper.

### 4a. Person lifecycle (transitions)

| From | Event | To |
|---|---|---|
| — | created at intake | `prospect` |
| `prospect` | first consultation | `lead` |
| `lead` | first enrollment activated (payment) | `student` |
| `student` | no activity for *M* days | `dormant` |
| `dormant` | any new activity (call, consultation, enrollment) | `student` |
| `student` | all journeys completed, none active (optional, manual) | `alumni` |

> "Returning student" is not a separate state — a `dormant` person who comes back simply becomes `student` again; the timeline shows the return.

---

## 5. v1 Scope

**In:** all 17 entities + workflows above, JWT auth with role-based access, derived finance statuses + the money invariant, the scheduled jobs, computed roadmap progress, the contact log, and the Action / Command Center frontend pages (§6).

**Out (add later, non-breaking — heavy patterns only):** a generic Rule Engine, event-driven / event-sourcing architecture, Case Management framework, automated "Journey Health" scoring, a formal refund/accounting ledger, a separate Session/scheduling entity, and attendance-rate analytics.

---

## 6. Tech Stack

- **Backend:** FastAPI · SQLAlchemy 2.x · PostgreSQL · Alembic (migrations) · Pydantic · JWT auth (role-based)
- **Frontend:** Next.js / React, RTL + Persian UI

### Frontend key pages (no new tables — just queries over the model)
- **Action Center** — each user's home: their open `Task`s, queried by `assignee_id` + `status`, grouped by `type` / `due_date`.
- **Command Center** — the person's profile page: left = `Activity` timeline, center = their `Journey`s (consultations, enrollments, roadmap progress, communications), right = summary, top = pending `Task`s. ~90% of daily work happens here.

---

## 7. Suggested Build Order (for Cursor)

1. SQLAlchemy models + Alembic migrations for all 17 entities (money fields as integers).
2. Auth + tenancy: Organization, User, JWT (token carries org_id), the scoping helper, seed one org + admin.
3. CRUD routers per module: people, departments, journeys, courses, roadmaps, classes, consultations, enrollments, communications.
4. Finance module: invoice + installments + payments, with **derived** statuses, the sum-invariant, partial-payment handling, and drop → cancel logic.
5. Attendance module + computed roadmap progress.
6. Workflow glue: auto-create Journey on first consultation; outcome routing (incl. referral task + target journey); scheduled jobs (overdue, pre-enroll-unpaid, dormant); central Activity logging on key events.
7. Frontend — starting with the Action Center and Command Center pages.

---

## 8. Multi-tenancy (SaaS-ready from day one)

The product launches for one institute but is built so multiple institutes can share one system later, with **zero cross-tenant data leakage**. We add the tenant dimension now (cheap) instead of retrofitting it later (brutal).

**Strategy:** shared tables with an `org_id` column (the standard SaaS default). No schema-per-tenant, no database-per-tenant — those add operational weight we don't need.

- **`Organization`** (new core entity): `id`, `name`, `is_active`, `created_at`, `updated_at`. Seed exactly one row for your institute.
- **`User.org_id`** → Organization. A user belongs to one organization. Login establishes the **current org** from the user's token.
- **`org_id` on every tenant-owned table.** Tenant-owned = Person, Department, Journey, Course, Roadmap, RoadmapItem, Class, Consultation, Enrollment, Attendance, Invoice, Installment, Payment, Communication, Task, Activity. (Organization and User carry it implicitly / directly.)
- **Tenant-scoped queries are structural, not manual.** All reads go through a base helper / dependency that **always** filters by the current org. A developer must never have to remember to add the filter on each endpoint — forgetting once is the leak.
- For v1 with one org, `org_id` is set automatically to that org. Nothing in the UI changes; the column and the scoping are just *there*, ready.

> This is the only SaaS work done now. Billing, onboarding, per-tenant config, and tenant-aware roles are **later** — non-breaking, because `org_id` and scoped queries are already in place.
