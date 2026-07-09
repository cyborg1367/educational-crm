# Screen Templates — Educational CRM

**Phase 8 of 10 — Frontend Design & Build Roadmap**
**Status:** Draft v1.0
**Depends on:** `06-ui-kit.md` (Phase 7 skeletons), `05-component-library.md` (Phase 6), backend `ARCHITECTURE.md` (field names/enums)
**Feeds into:** Phase 9 (AI Frontend Specification), Phase 10 (Cursor Prompt Library — these specs become the per-screen prompt content)

---

## 0. How to Read This Document

Two depth levels, deliberately asymmetric:

- **Full specs (§2):** the ~10 screens that are either highest-traffic, highest-risk for inconsistency, or first-of-their-kind for a skeleton. Each gets a field-level breakdown.
- **Light specs (§3):** remaining screens, given as a table. These reuse a skeleton and component set *already proven* in §2 — restating full field-by-field detail for, say, the Department list would document a decision that was already made when the Person list was specified. This asymmetry is intentional, not incomplete coverage.

Every screen below cites its **Skeleton** (Phase 7 §3.x) and **Route** (Phase 1 §3) by reference, never re-describing layout structure.

---

## 1. One Reconciliation Worth Stating Up Front: Person.status

Phase 2/3 §3.1's status-as-action table (Enrollment, Invoice/Installment, Consultation, Task) **does not include Person.status** — correctly. Unlike those, `Person.status` (`prospect/lead/student/dormant/alumni`) is **not backend-derived**; it's directly settable, by design decision made during backend development (lifecycle automation deferred). So on the Person screen, status renders as `StatusBadge` (for consistent color/visual treatment) but is changed via a plain `Select` inside an edit `Drawer` — **not** through the locked `StatusAction` component, since there's no backend action endpoint to call, just a field update. This is the one place in the system where a status field is intentionally *not* routed through the otherwise-universal rule, and it's worth flagging precisely because it looks like it should follow the rule and doesn't.

---

## 2. Full Screen Specs

### 2.1 Person Detail
**Route:** `/people/:id` · **Skeleton:** Phase 7 §3.2 (T1 Tabbed Master-Detail)

| Zone | Content |
|---|---|
| Header | `full_name`, `StatusBadge` (status, per §1 above — edit via Drawer, not StatusAction), stale-lead indicator dot if applicable (Phase 2/3 §1.5) |
| Tabs | Overview · Journeys · Enrollments · Timeline · Tasks |
| Overview (Primary) | `phone`, `email`, key-value layout; `AISummaryPanel` baseline (full content logic is Phase 9) |
| Journeys (Primary) | `DataTable`: department, status, created_at — Journey is T3, never gets its own route, only ever appears here |
| Enrollments (Primary) | `DataTable`: class name, `StatusBadge`(enrollment.status), `final_amount`, click-through to Enrollment Detail (§2.2) |
| Timeline (Primary) | `Timeline` component — merged Activity+Communication stream (Phase 2/3 §1.4) |
| Tasks (Primary) | `DataTable` filtered to `related_entity_type=person, related_entity_id=:id` plus directly-assigned tasks |
| Secondary | `RelationshipCard`s: current Journey's department, most recent Enrollment |

---

### 2.2 Enrollment Detail
**Route:** `/enrollments/:id` · **Skeleton:** Phase 7 §3.2

| Zone | Content |
|---|---|
| Header | Class name + Person name, `StatusAction` (enrollment.status — "Drop Enrollment" button when status ∈ {pre_enroll, active}) |
| Tabs | Overview · Invoice & Installments · Attendance · Timeline |
| Overview (Primary) | `price_snapshot`, `discount_snapshot`, `final_amount` — **all three as `FrozenField`**, never editable inputs (Phase 2/3 §3.4); `status` as `StatusBadge` |
| Invoice & Installments (Primary) | `FinancialTable` of Installments: `amount`, `paid_amount`, `due_date`, `StatusAction`(installment.status — "Record Payment" when unpaid/partial/overdue) |
| Attendance (Primary) | `DataTable`: `session_date`, `present` (boolean badge), `notes` |
| Timeline (Primary) | `Timeline`, scoped to this enrollment's person |
| Secondary | `RelationshipCard`: linked Consultation (if created via outcome routing), linked Person |

**Drop Enrollment flow:** clicking "Drop" → `ConfirmDialog(tier=3)` with `CascadeConsequenceList` populated from a pre-flight read (installments to cancel, total refund amount, tasks to cancel) — per Phase 6 §6 worked example.

---

### 2.3 Invoice Detail
**Route:** `/invoices/:id` · **Skeleton:** Phase 7 §3.2 (used here without tabs — single Primary column, since Invoice's content doesn't naturally split into tabs the way Person/Enrollment do; this is a valid lighter use of the same skeleton, not a new one)

| Zone | Content |
|---|---|
| Header | Linked Enrollment/Person name, `StatusBadge`(invoice.status) |
| Primary | `total_amount` (`FrozenField`) → `FinancialTable` of Installments (same row-level `StatusAction` as §2.2) → below that, a `DataTable` of Payments (amount, payment_date, recorded_by) → a `DataTable` of Refunds (amount, reason, refund_date) |
| Secondary | `RelationshipCard`: Enrollment, Person |

**Record Payment flow:** `StatusAction` on an Installment row → `Drawer` with `MoneyInput` (validated ≤ remaining balance) → submit → row's `StatusBadge` updates, `Toast` confirms.
**Refund flow:** action on a Payment row → `ConfirmDialog(tier=3)` (refund is financial + irreversible-in-effect, even though narrower in blast radius than Drop) with `CascadeConsequenceList` showing remaining refundable balance after this refund.

---

### 2.4 Class Detail
**Route:** `/classes/:id` · **Skeleton:** Phase 7 §3.2

| Zone | Content |
|---|---|
| Header | Class `name`, `StatusBadge`(class.status), `start_date`–`end_date` (Jalali display) |
| Tabs | Roster · Attendance · Schedule |
| Roster (Primary) | `DataTable` of enrolled Persons, click-through to Person Detail |
| Attendance (Primary) | Grid: rows = enrolled students, columns = session dates; toggle controls at `control.lg` (48px) per Phase 5 §5's tablet-context rule — **this tab is the canonical "Teacher on a tablet" screen** referenced throughout Phases 1, 5, and 7 |
| Schedule (Primary) | `teacher_id` (resolved to name), session day/time pattern |
| Secondary | `RelationshipCard`: Course this class belongs to |

---

### 2.5 Consultation Outcome Wizard
**Route:** `/people/:id/consultations/:id` · **Skeleton:** Phase 7 §3.9 (Decision/Timeline Detail → embeds §3.4 Wizard)

| Step | Content |
|---|---|
| Step 1 | Read-only consultation context (`current_level`, `goal`, `recommended_course_id`) + outcome `Select` (the five `ConsultationOutcome` values, displayed via the terminology table, Phase 2/3 §4) |
| Step 2 (conditional on Step 1's choice) | `pre_enroll` → class `Select` (defaults to earliest open class for the recommended course, per backend's auto-pick behavior); `follow_up` → no extra fields, just confirms; `refer_other_dept` → department `Select`; `not_suitable`/`closed` → optional `Textarea` notes |
| Action-bar | Back / Submit, per Phase 7 §3.4's button placement convention |

**Submit behavior:** for `pre_enroll` specifically, submission triggers a `ConfirmDialog(tier=2)` first ("This will create an enrollment and issue an invoice for [amount]") — not tier 3, since nothing is being destroyed, but it is a real financial commitment worth one explicit confirm before the wizard fires the workflow. All other outcomes submit directly without an intermediate confirm.

---

### 2.6 Enrollment Creation Wizard (Direct Path)
**Route:** triggered from Person Detail's Enrollments tab ("New Enrollment" action, not consultation-routed) · **Skeleton:** Phase 7 §3.4

| Step | Content |
|---|---|
| Step 1 | Class `Select` (searchable, per Phase 6 §2) |
| Step 2 | Price review — `current_price` shown read-only as what `price_snapshot` will become, optional discount `MoneyInput`, computed `final_amount` shown live |
| Step 3 | Installment plan — default 50/50 two-installment split pre-filled, editable amounts/due-dates, live validation that the sum matches `final_amount` (mirroring the backend invariant client-side, before submission ever reaches the API) |

This is the screen where the backend's money invariant (price snapshot, installment sum) becomes most visible as a *UX* concern, not just a backend rule — the live client-side sum check exists specifically to avoid a user filling out three installment rows and getting a 422 only at the end.

---

### 2.7 People List
**Route:** `/people` · **Skeleton:** Phase 7 §3.1

`FilterBar` facets: status, department (via Journey). `DataTable` columns: `full_name`, `phone`, `StatusBadge`(status), stale-lead dot where applicable, last activity date. Header action: "Add Person" → `Drawer` with `full_name`/`phone`/`email` fields (phone nullable, per backend).

---

### 2.8 Tasks (Split View)
**Route:** `/tasks` · **Skeleton:** Phase 7 §3.5

Left pane `DataTable` columns: `type` (via terminology table), `title`, `due_date`, assignee avatar, `StatusBadge`(task.status). Right pane (persistent, not Drawer — per Phase 7 §3.5's explicit clarification): selected task's `title`, `notes`, `related_entity_type/id` rendered as a clickable `RelationshipCard` linking back to the originating Person/Enrollment/Installment, and `StatusAction` ("Mark Complete").

---

### 2.9 Finance Dashboard
**Route:** `/dashboard` (Finance role) · **Skeleton:** Phase 7 §3.6, composition per Phase 7 §4

Collection Rate `StatCard`+gauge (bound to `/reports/collection`), Overdue Installments Action-Needed widget (`DataTable`, widget mode, bound to installments where `status=overdue`), Revenue by Course `AnalyticsChart` (bound to `/reports/revenue?year=`, `by_course` breakdown).

---

### 2.10 Admission Dashboard
**Route:** `/dashboard` (Admission role) · **Skeleton:** Phase 7 §3.6

New Leads This Week `StatCard`, Conversion Funnel `AnalyticsChart` (prospect→lead→student counts), Pending Consultations Action-Needed widget (`DataTable`, consultations where `outcome IS NULL`), Stale-Lead Action-Needed widget (Phase 2/3 §1.5's flag, surfaced here as its own widget, not just a row-level dot) — **this is the dashboard where the stale-lead mitigation earns its keep**, giving Admission staff a direct worklist rather than relying on spotting dots while browsing the People list.

---

## 3. Light Specs (Remaining Screens)

| Screen | Route | Skeleton | Key fields/columns | Notes |
|---|---|---|---|---|
| Courses List | `/courses` | §3.1 | title, department, `current_price` (right-aligned per Phase 5 §3), is_active | "Add Course" Drawer |
| Roadmap Detail | `/roadmaps/:id` | §3.3 | embedded RoadmapItem table: sequence, course, edit/reorder | Inline sequence edit per Phase 1 pattern catalog |
| Roadmaps List | `/roadmaps` | §3.1 | name, item count | — |
| Departments List | `/departments` | §3.1 | name, manager (avatar+name), is_active | Drawer create/edit |
| Users List | `/users` | §3.7 (Settings) | name, email, role badge, is_active | Admin-only route |
| Calendar | `/calendar` | §3.8 | — | Three-source feed per Phase 7 §3.8 |
| Admin Dashboard | `/dashboard` (Admin) | §3.6 | Org-wide KPI row + two trend charts | Per Phase 7 §4 |
| Teacher Dashboard | `/dashboard` (Teacher) | §3.6 | Today's classes widget + mini-calendar | Per Phase 7 §4 |
| Dept. Manager Dashboard | `/dashboard` (Dept Mgr) | §3.6 | Open tasks by type + dept enrollment trend | Per Phase 7 §4 |
| Settings (Org/Profile) | `/settings/*` | §3.7 | Org name, user profile fields | Standard FormField groups |

---

## 4. Cross-Screen Consistency Checklist

Run against any screen — including ones added after this document, by Cursor or otherwise — before considering it complete. This is the practical, checkable distillation of Phases 2–7:

- [ ] Every status field renders via `StatusBadge`/`StatusAction` keyed to the exact backend enum — never a raw string, never a freeform color choice.
- [ ] Every money field is right-aligned where tabular, formatted per Phase 4 §1.3/§7 — no exceptions outside the documented numeric-alignment rule.
- [ ] Every backend-immutable field (`price_snapshot`, `total_amount`, etc.) uses `FrozenField`, never a disabled-looking input with no explanation.
- [ ] Every cascading/financial action (Drop, Refund) opens `ConfirmDialog(tier=3)` with a populated `CascadeConsequenceList` — never a bare "Are you sure?".
- [ ] Every list screen consumes the standard pagination contract (Phase 1 §5) via `DataTable` — no bespoke pagination state.
- [ ] Every error surface switches on `error_code`, never parses `detail` text.
- [ ] No T3/T4 entity (Journey, Installment, Activity, Communication) has its own sidebar nav entry or standalone list route (Phase 1 §1's one documented exception aside).

---

## 5. What This Document Deliberately Excludes

No pixel-precise mockups or visual comps — these are field-level structural specs, sufficient for Phase 10's Cursor prompts to generate real screens, but the exact visual polish is an implementation-time concern given the tokens/system already locked in Phases 4–5. No copywriting/microcopy pass beyond what's already fixed by the terminology table (Phase 2/3 §4).

---

## 6. Next Step

**Phase 9 — AI Frontend Specification**: where `AISummaryPanel` (referenced but not detailed in §2.1), AI-assisted outcome suggestions (referenced in §2.5's wizard), and the Command Palette's natural-language search actually get specified — building on the baseline guardrails already set in Phase 2/3 §6.
