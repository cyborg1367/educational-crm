# Prompt Library for AI UI Generation — Educational CRM

**Phase 10 of 10 — Frontend Design & Build Roadmap**
**Status:** Draft v1.0
**Depends on:** All of Phases 1–9 (`01-frontend-architecture.md` through `08-ai-frontend-specification.md`, `tokens.json`)
**This is the final phase.** Its output is what you actually hand to Cursor.

---

## 0. Purpose & How This Connects to the Existing Workflow

The backend was built capsule-by-capsule: branch → Cursor prompt → diff review → test → commit → merge. The frontend should follow the **identical discipline** — this phase doesn't invent a new process, it extends the one already proven across 30 backend capsules. The prompts below assume that workflow exactly, including the `Show full diff` convention used throughout the backend build.

You've also already built this exact pattern once before, for Codex Desktop, via your `AGENTS.md` (patch-based edits, token efficiency, context persistence via `docs/current_task.md`). **§2 below is that same idea, applied to frontend Cursor sessions** — a constitution file Cursor reads before every capsule, so the rules from Phases 1–9 don't have to be re-explained in every prompt.

---

## 1. Document Index — Save These First

Before running any prompt below, place the eight Phase documents and `tokens.json` into the frontend repo at `docs/frontend/`:

```
docs/frontend/
├── 01-frontend-architecture.md
├── 02-ux-guidelines-design-principles.md
├── 03-design-tokens.md
├── tokens.json
├── 04-design-system.md
├── 05-component-library.md
├── 06-ui-kit.md
├── 07-screen-templates.md
└── 08-ai-frontend-specification.md
```

Every prompt in this phase references these by path — exactly the same `@docs/...` pattern used for backend capsule prompts.

---

## 2. The Frontend Constitution

Save as `docs/frontend/AGENTS.md` (or merge into an existing one, mirroring your Codex Desktop setup). Cursor should read this **once per session**, before the capsule-specific prompt:

```
You are building the frontend for the Educational CRM, against an existing,
fully-built FastAPI backend (see backend ARCHITECTURE.md for entities/endpoints).

Non-negotiable rules, sourced from docs/frontend/02 through 05 — never violate
these even if a capsule prompt doesn't restate them:

1. STATUS-AS-ACTION: Enrollment.status, Invoice/Installment.status,
   Consultation.outcome, Task.status are NEVER editable form fields. They
   render via StatusBadge and change only through explicit action components
   (StatusAction) calling real action endpoints. Exception: Person.status is
   directly editable (see docs/frontend/07 §1) — this is the ONLY exception.

2. FROZEN FIELDS: price_snapshot, discount_snapshot, Invoice.total_amount
   render via the FrozenField pattern (subtle background + info tooltip),
   never as a disabled-looking input with no explanation.

3. CONFIRMATION TIERS: cascading/financial actions (Drop Enrollment, Refund)
   use ConfirmDialog(tier=3) with a populated CascadeConsequenceList. Routine
   destructive actions use tier=2. Never a bare "Are you sure?" for tier 3.

4. RTL + JALALI: direction is RTL by default via logical CSS properties only
   (no -left/-right). Dates display in Jalali, store/transmit in Gregorian.
   EXCEPTION: numeric/money/date table columns are always right-aligned
   regardless of RTL flow (docs/frontend/04 §3) — this is intentional, not
   a bug to "fix" toward full RTL consistency.

5. PAGINATION/ERROR CONTRACT: every list consumes
   {items, total_count, limit, offset, has_more}. Every error response is
   {detail, error_code, timestamp, field?} — UI logic switches on error_code,
   never on parsed detail text.

6. STATUS COLOR SOURCE: StatusBadge takes a domain+enum-value pair and looks
   up color from tokens.json -> semantic.statusMap. It never accepts a
   direct color prop. Do not add one.

7. AI FEATURES (if/when building docs/frontend/08's touchpoints): AI suggests,
   never auto-executes. Every AI output is visibly labeled. No AI involvement
   in money math, ever.

When a capsule prompt conflicts with this file, STOP and flag it — don't
silently resolve the conflict either direction.
```

---

## 3. Capsule Sequence

Mirrors the backend's incremental approach: foundation → primitives → composites → skeletons → screens → AI (deferred). Each row is one Cursor session, one branch, one PR — exactly the backend's git discipline.

| Capsule | Name | Depends on | Produces |
|---|---|---|---|
| F00 | Project Setup & Theming | tokens.json | RTL config, font loading, CSS variables from tokens, theme provider |
| F01 | Primitives | F00 | Button, IconButton, Badge, Avatar, Tooltip, Divider |
| F02 | Form Components | F01 | FormField, TextInput, MoneyInput, DatePicker (Jalali), Select, SelectionControl, FrozenField |
| F03 | Data Display | F01 | DataTable, FinancialTable, StatCard, EntitySummaryCard, RelationshipCard |
| F04 | Domain Composites | F01–F03 | StatusBadge, StatusAction, ConfirmDialog + CascadeConsequenceList, Stepper |
| F05 | Feedback & Overlays | F01–F02 | Drawer, Toast, EmptyState/Skeleton/ErrorState, RateLimitNotice |
| F06 | Navigation & Layout | F01–F04 | AppShell, EntityTabs, Breadcrumb, CommandPalette, FilterBar |
| F07 | Timeline / Calendar / Analytics | F03–F04 | Timeline, CalendarAgenda, AnalyticsChart |
| F08 | Page Skeletons | F01–F07 | All 8 skeletons from `06-ui-kit.md` §3, wired to AppShell |
| F09 | Person Screens | F08 | People List, Person Detail (all 5 tabs) |
| F10 | Enrollment & Finance Screens | F08–F09 | Enrollment Detail, Invoice Detail, Enrollment Creation Wizard |
| F11 | Class & Consultation Screens | F08–F09 | Class Detail (incl. Attendance grid), Consultation Outcome Wizard |
| F12 | Tasks, Calendar, Dashboards | F08–F11 | Tasks Split View, Calendar page, all 5 role dashboards |
| F13 | Supporting Entity Screens | F08 | Courses, Roadmaps, Departments, Users, Settings (light specs, §3 of `07-screen-templates.md`) |
| F14 | AI Touchpoints | F09–F12 **+ a new backend capsule** | Summary Panel, outcome suggestion, NL command palette, task triage |

**F14 cannot start until the backend AI-proxy endpoints flagged in `08-ai-frontend-specification.md` §2 exist.** Don't let Cursor build the frontend half of this capsule against a mocked endpoint and call it done — flag it as blocked, the same way you'd block a backend capsule on a missing migration.

---

## 4. Capsule Prompts

### F00 — Project Setup & Theming

```
Set up the frontend project foundation.

1. Initialize [Next.js/Vite+React — confirm stack before running this].
2. Set <html dir="rtl"> as default; install Vazirmatn font per
   docs/frontend/03-design-tokens.md §2.1.
3. Generate CSS custom properties from docs/frontend/tokens.json — every
   primitive and semantic token becomes a --variable at :root. Do not
   hand-transcribe values; parse the JSON into the CSS output so the two
   stay in sync.
4. Set up a date utility module: Jalali display, Gregorian storage/transmit,
   per tokens.json -> locale.calendar / locale.calendarStorage.
5. Set up a number-formatting utility: Persian digit display, normalized
   Persian/Latin input parsing, Toman thousands-separator formatting —
   per tokens.json -> locale.digitsDisplay / digitsInput / currencyUnit.
6. Read docs/frontend/AGENTS.md and confirm you understand the 7 rules
   before proceeding to any later capsule.

Show full diff.
```

### F01 — Primitives

```
Implement capsule F01 — Primitive components, per
docs/frontend/05-component-library.md §1.

Build: Button (primary/secondary/ghost/destructive × sm/md/lg),
IconButton, Badge (generic, non-status), Avatar, Tooltip, Divider.

Follow the interactive state model exactly as specified in
docs/frontend/04-design-system.md §2 — hover/focus-visible/active/disabled/
loading. Disabled states use dedicated muted tokens, NEVER opacity.

Show full diff.
```

### F02 — Form Components

```
Implement capsule F02 — Form components, per
docs/frontend/05-component-library.md §2.

Build: FormField (wrapper), TextInput, Textarea, MoneyInput, DatePicker
(Jalali-displaying, Gregorian-emitting, using the date utility from F00),
Select (with searchable variant), SelectionControl, FrozenField.

MoneyInput and FrozenField are the two most important specs in this capsule —
read docs/frontend/04-design-system.md §3 (numeric right-align exception)
and §8 (form field contract) carefully before building either.

Show full diff.
```

### F03 — Data Display

```
Implement capsule F03 — Data display components, per
docs/frontend/05-component-library.md §3.

Build: DataTable (consumes {items, total_count, limit, offset, has_more}
exactly per docs/frontend/01-frontend-architecture.md §5), FinancialTable
(DataTable variant with forced right-alignment for numeric columns —
see docs/frontend/04-design-system.md §3), StatCard, EntitySummaryCard
(one shell, content-slot variants for Person/Enrollment/Class),
RelationshipCard.

Show full diff.
```

### F04 — Domain Composites

```
Implement capsule F04 — Domain composite components, per
docs/frontend/05-component-library.md §4. These are the highest-leverage
components in the system — read that section in full before starting.

Build:
1. StatusBadge — takes (domain, value), looks up color from
   docs/frontend/tokens.json -> semantic.statusMap. NO color prop.
2. StatusAction — StatusBadge + contextual action Button(s), configured
   per docs/frontend/02-ux-guidelines-design-principles.md §3.1's table
   (Enrollment->Drop, Invoice/Installment->Record Payment, Consultation->
   Set Outcome, Task->Mark Complete).
3. ConfirmDialog — tier 2 | tier 3 prop. Tier 3 requires a populated
   CascadeConsequenceList (build this as its own component, slotted in).
   Follow docs/frontend/04-design-system.md §9 exactly (widths, button
   placement via logical properties, tier-specific styling).
4. Stepper — read-only step indicator, per docs/frontend/06-ui-kit.md §2.

Show full diff.
```

### F05 — Feedback & Overlays

```
Implement capsule F05 — Feedback and overlay components, per
docs/frontend/05-component-library.md §4 (Drawer, EmptyState/Skeleton/
ErrorState/RateLimitNotice) and standard Toast.

ErrorState MUST switch its rendering on the backend's error_code field
({detail, error_code, timestamp, field?}) — never parse "detail" text.
See docs/frontend/01-frontend-architecture.md §5 for the full contract.

Show full diff.
```

### F06 — Navigation & Layout

```
Implement capsule F06 — Navigation and layout components, per
docs/frontend/05-component-library.md §5.

Build: AppShell (260px sidebar, collapses below 1024px per
docs/frontend/04-design-system.md §10), EntityTabs (T1 entities only —
never apply to T2), Breadcrumb, CommandPalette (structured search for now;
NL search is capsule F14), FilterBar.

Sidebar nav content must be role-composed per
docs/frontend/01-frontend-architecture.md §2 — five distinct nav
configurations (Admin, Admission, Finance, Teacher, Department Manager),
not one menu with items hidden by permission.

Show full diff.
```

### F07 — Timeline / Calendar / Analytics

```
Implement capsule F07, per docs/frontend/05-component-library.md §3.

1. Timeline — fetches Activity AND Communication endpoints client-side,
   interleaves by created_at into one merged stream. This merge logic
   lives here once. See docs/frontend/02-ux-guidelines-design-principles.md
   §1.4 for why this is a frontend-only composition.
2. CalendarAgenda — month-grid and agenda-list modes, parametrized by
   data-source adapter (Class start dates / Installment due dates /
   Task due dates) — one component, three adapters, not three calendars.
3. AnalyticsChart — line (trend) and bar (breakdown) variants, feeding
   the three /reports endpoints.

Show full diff.
```

### F08 — Page Skeletons

```
Implement capsule F08 — Page skeletons, per docs/frontend/06-ui-kit.md §3,
using only components from F01-F07. Build all 8: List Page, T1 Detail
(Tabbed Master-Detail), T2 Detail (Single-Pane), Wizard, Split View,
Dashboard, Settings, Calendar/Agenda.

Use the zone naming convention from docs/frontend/06-ui-kit.md §1
(Header/Primary/Secondary/Action-bar/Filter-bar) consistently — these
become the slot names every screen capsule (F09+) fills in.

No real entity content yet — these are structural shells only.

Show full diff.
```

### F09 — Person Screens

```
Implement capsule F09 — Person screens, per
docs/frontend/07-screen-templates.md §2.1 and §2.7.

Build: People List (using List Page skeleton + FilterBar + DataTable),
Person Detail (T1 Tabbed skeleton, 5 tabs: Overview/Journeys/Enrollments/
Timeline/Tasks).

IMPORTANT: Person.status is the one exception to status-as-action
(docs/frontend/07-screen-templates.md §1) — render via StatusBadge but
edit through a plain Select inside an edit Drawer, not StatusAction.

Wire to the real backend endpoints: GET/POST /people, GET/PATCH /people/{id},
GET /journeys (filtered), GET /enrollments (filtered), GET /activities +
GET /communications (for Timeline), GET /tasks (filtered).

Show full diff.
```

### F10 — Enrollment & Finance Screens

```
Implement capsule F10, per docs/frontend/07-screen-templates.md §2.2,
§2.3, §2.6.

Build: Enrollment Detail (StatusAction Drop flow with full
CascadeConsequenceList wired to real installment/task data), Invoice
Detail (Record Payment + Refund flows, both through tier-3 ConfirmDialog),
Enrollment Creation Wizard (with the live client-side installment-sum
validation described in §2.6 — mirror the backend invariant before
submission, don't just wait for a 422).

Wire to: POST/GET /enrollments, PATCH /enrollments/{id}/drop, GET
/invoices/{id}, POST /payments, POST /refunds.

Show full diff.
```

### F11 — Class & Consultation Screens

```
Implement capsule F11, per docs/frontend/07-screen-templates.md §2.4
and §2.5.

Build: Class Detail (Roster/Attendance/Schedule tabs — Attendance grid
uses control.lg (48px) sizing per docs/frontend/04-design-system.md §5's
tablet-context rule), Consultation Outcome Wizard (conditional Step 2
per outcome, tier-2 confirm specifically for pre_enroll before submit).

Wire to: GET /classes/{id}, POST/GET /attendances, PATCH
/consultations/{id}/outcome.

Show full diff.
```

### F12 — Tasks, Calendar, Dashboards

```
Implement capsule F12, per docs/frontend/07-screen-templates.md §2.8-2.10
and docs/frontend/06-ui-kit.md §4.

Build: Tasks Split View (persistent right pane — NOT the Drawer component,
see docs/frontend/06-ui-kit.md §3.5's explicit clarification), Calendar
page, and all 5 role dashboards using the Dashboard skeleton with the
widget composition table from docs/frontend/06-ui-kit.md §4.

Show full diff.
```

### F13 — Supporting Entity Screens

```
Implement capsule F13, per docs/frontend/07-screen-templates.md §3
(the light-spec table).

Build: Courses List, Roadmap Detail + List, Departments List, Users List,
Settings. These reuse List Page / T2 Detail / Settings skeletons with no
new component decisions — if you find yourself needing a new component
here, stop and flag it rather than inventing one ad hoc.

Show full diff.
```

### F14 — AI Touchpoints (Blocked — Confirm Backend Capsule Exists First)

```
Before running this prompt: confirm the backend AI-proxy endpoints
described in docs/frontend/08-ai-frontend-specification.md §2 exist
(e.g., POST /people/{id}/ai-summary). If they don't, this capsule is
blocked — go build that backend capsule first.

Implement capsule F14 — AI touchpoints, per
docs/frontend/08-ai-frontend-specification.md §3.

Build: AI Summary Panel (Person Detail, non-blocking, graceful
degradation per Rule 5), Consultation outcome suggestion (pre-fills
the existing Select, never a separate control, full dismissibility),
NL Command Palette extension (falls back to plain search on ambiguous
queries), Task-Queue Triage (reorders only, never mutates task data).

Every output must be visibly labeled as AI-generated. No exceptions.

Show full diff.
```

---

## 5. Frontend Git Workflow & Review Gate

Identical discipline to the backend, with one addition — a consistency check before merge:

1. `git checkout -b feat/f0X-capsule-name`
2. Run the capsule prompt in Cursor, review the diff
3. **Before merging:** run the screen/component against the checklist in `docs/frontend/07-screen-templates.md` §4 (status-as-action compliance, money alignment, frozen-field treatment, tier-3 dialogs, pagination contract, error_code switching, no T3/T4 nav entries)
4. Commit, push, merge, sync main
5. Move to the next capsule in the sequence (§3)

---

## 6. Full Roadmap Recap

| Phase | Document | Core deliverable |
|---|---|---|
| 1 | `01-frontend-architecture.md` | IA, role-based nav, entity tier model |
| 2/3 | `02-ux-guidelines-design-principles.md` | Resolved decisions (Jalali, RTL, digits), interaction rules |
| 4 | `03-design-tokens.md` + `tokens.json` | Color/type/space tokens, status-color mapping |
| 5 | `04-design-system.md` | State model, numeric exception, sizing/elevation rules |
| 6 | `05-component-library.md` | 32 components, fully specified |
| 7 | `06-ui-kit.md` | 8 page skeletons, dashboard composition |
| 8 | `07-screen-templates.md` | Concrete screen specs, consistency checklist |
| 9 | `08-ai-frontend-specification.md` | 4 AI touchpoints, guardrails, backend dependency flagged |
| 10 | This document | Capsule sequence, ready-to-paste Cursor prompts |

---

## 7. Immediate Next Action

```bash
mkdir -p docs/frontend
# copy the 8 markdown files + tokens.json into docs/frontend/
git checkout -b feat/f00-project-setup
```

Then run the **F00** prompt from §4. That's the actual starting line for this entire roadmap.
