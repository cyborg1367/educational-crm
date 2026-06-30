# UI Kit — Educational CRM

**Phase 7 of 10 — Frontend Design & Build Roadmap**
**Status:** Draft v1.0
**Depends on:** `05-component-library.md` (Phase 6), `01-frontend-architecture.md` §4 (Layout Shell Assignment)
**Feeds into:** Phase 8 (Screen Templates — these skeletons get filled with real entity content), Phase 10 (Cursor Prompt Library)

---

## 0. Purpose

Phase 6 specified *what components exist*. This phase specifies *how they assemble into page skeletons* — the structural layer between "components" and "screens." A skeleton defines named zones and which components occupy them; Phase 8 then drops specific entities (Person, Invoice, Class) into a skeleton rather than each screen inventing its own structure. This is the layer that makes 9 sitemap route groups (Phase 1 §3) buildable from roughly 8 skeletons, not 9+ bespoke layouts.

---

## 1. Zone Naming Convention

Used consistently across every skeleton below, so Phase 8 and Phase 10 can reference zones by name rather than re-describing layout each time.

| Zone | Meaning |
|---|---|
| **Header** | Page title, primary action button, status/breadcrumb context |
| **Primary** | Main content column |
| **Secondary** | Supporting column (relationship cards, metadata) — only present on T1 detail pages |
| **Action-bar** | Sticky footer or inline bar holding Wizard/form navigation actions |
| **Filter-bar** | Sits between Header and Primary on list screens |

---

## 2. Gap Found During Assembly: Stepper Component

Composing the Wizard skeleton (§3.4) surfaced a component Phase 6 didn't account for: a **step/progress indicator** for multi-step flows (Enrollment creation: class selection → price review → installment split; Consultation outcome: type selection → conditional fields per outcome). This is exactly the kind of gap assembly work is supposed to catch before Phase 8.

**Resolution:** add `Stepper` to the Phase 6 component inventory (Domain Composite tier, since its steps are content-defined per flow, not generic). **Component count is now 32, not 31.** No other changes required to Phase 6's existing entries.

| Component | Purpose | Variants | Rule reference |
|---|---|---|---|
| **Stepper** | Step indicator for Wizard skeleton flows | Horizontal (desktop), compact dot-indicator (tablet width) | Phase 5 §10 (responsive breakpoint) | Read-only indicator — never independently clickable to jump steps, since both wizard flows in this product have sequential validation dependencies (you can't review installment split before a class is chosen) |

---

## 3. Page Skeletons

### 3.1 List Page Skeleton
**Used by:** `/people`, `/enrollments`, `/invoices`, `/classes`, `/courses`, `/roadmaps`, `/departments`, `/users` — every T1/T2 list route from Phase 1 §3.

| Zone | Contents |
|---|---|
| Header | Title + primary action button (e.g., "Add Person") — omitted for entities created only via workflow, never directly (no "Add Invoice" button; invoices are system-issued) |
| Filter-bar | `FilterBar` component, facet config varies per entity |
| Primary | `DataTable`, full width |

Responsive: below tablet breakpoint, `DataTable` rows degrade to stacked `EntitySummaryCard`s (Phase 5 §10) — same skeleton, different Primary-zone renderer at narrow widths.

---

### 3.2 T1 Detail Page Skeleton (Tabbed Master-Detail)
**Used by:** `/people/:id`, `/enrollments/:id`, `/invoices/:id`, `/classes/:id` — every Tier-1 entity per Phase 1 §1.

| Zone | Contents |
|---|---|
| Header | Entity name/title + `StatusAction` (the actionable status badge) + `PermissionBanner` if the viewing role is read-only here |
| (below Header) | `EntityTabs` |
| Primary | Tab content — varies: Overview tab = key-value summary; Timeline tab = `Timeline` component; Invoice tab (on Enrollment) = `FinancialTable` |
| Secondary | `RelationshipCard`s (e.g., Person's enrolled classes, Enrollment's linked Consultation) — 320px column per Phase 5 §10, collapses below the Primary column on tablet width |

This is the single most-used skeleton in the product — 4 of the 5 T1 entities route through it identically, varying only in which tabs and which components fill the Primary zone per tab.

---

### 3.3 T2 Detail Page Skeleton (Single-Pane)
**Used by:** `/roadmaps/:id` (the one T2 entity with a detail route, per Phase 1 §3 — Department/Course/User are list+drawer only and never reach this skeleton).

| Zone | Contents |
|---|---|
| Header | Title + edit action |
| Primary | Single-pane content — for Roadmap, an embedded `FinancialTable`-style table (actually `DataTable` in compact/embedded mode) listing `RoadmapItem` rows |

No `EntityTabs`, no Secondary column — deliberately simpler than §3.2, per the Tier model's whole point (Phase 1 §1).

---

### 3.4 Wizard Skeleton
**Used by:** Enrollment creation flow, Consultation outcome routing.

| Zone | Contents |
|---|---|
| Header | Flow title + `Stepper` (§2) |
| Primary | Single-column form content for the current step — `FormField`-wrapped controls only, no tables, no secondary column |
| Action-bar | Back (inline-start) / Next-or-Submit (inline-end) buttons — placement convention matches Phase 5 §9's dialog button rule, applied here to wizards for the same consistency reason |

**Conditional branching note:** Consultation outcome routing isn't strictly linear (the fields shown depend on which outcome is selected — `pre_enroll` shows class selection, `refer_other_dept` shows a department picker). The Stepper still shows "Step 2 of 2" rather than trying to visualize branching paths — branching is handled by conditionally rendering the Primary zone's content, not by the Stepper component itself.

---

### 3.5 Split View Skeleton
**Used by:** `/tasks`.

| Zone | Contents |
|---|---|
| Filter-bar | `FilterBar` (facets: type, assignee, due date) |
| Primary (left pane, ~40% width) | `DataTable` in row-selectable mode |
| Secondary (right pane, persistent — **not** the overlay `Drawer`) | Selected task's detail content, rendered directly in-layout |

**Clarification worth flagging explicitly:** the right pane here is a **persistent layout region**, not an invocation of the `Drawer` component from Phase 6. `Drawer` is an overlay that opens/closes over content; this pane is structurally always present (showing an empty state when nothing's selected). Conflating the two during implementation would produce confusing transition behavior — worth stating now rather than discovering during Phase 8.

---

### 3.6 Dashboard Skeleton (Role-Composed)
**Used by:** `/dashboard` — same skeleton, five different widget compositions (Phase 1 §2).

| Zone | Contents |
|---|---|
| Header | Greeting/date context (no primary action — dashboards are read-first) |
| Primary | 12-column responsive grid of widgets (§5) |

Widget inventory (reusing Phase 6 components, per Design Principle 3 — "one pattern, many contexts," not new components):
- **KPI widget** = `StatCard`
- **Trend/breakdown widget** = `AnalyticsChart`
- **Action-Needed widget** = `DataTable` in a constrained "widget mode" (fixed row cap, e.g. 5 rows, no pagination controls, a single "View all →" link instead) — **this is not a new component**; it's the existing `DataTable` with a compact configuration, which is exactly the kind of reuse this whole roadmap exists to produce instead of inventing an "ActionNeededList" component that would duplicate 90% of `DataTable`'s behavior
- **Mini-calendar widget** = `CalendarAgenda` in agenda-list mode rather than full month-grid mode

See §4 for which widgets each role's dashboard actually uses.

---

### 3.7 Settings Layout Skeleton
**Used by:** `/settings/*`, and reused for `/users`, `/departments` per Phase 1 §4.

| Zone | Contents |
|---|---|
| (left) Sub-nav | Vertical tab list |
| Primary | Panel content — `FormField` groups for settings; `DataTable` + `Drawer` (create/edit mode) for Users/Departments |

---

### 3.8 Calendar/Agenda Page Skeleton
**Used by:** `/calendar`.

| Zone | Contents |
|---|---|
| Header | Month/Agenda view toggle |
| Primary | `CalendarAgenda`, full month-grid mode, fed by three data sources (Class start dates, Installment due dates, Task due dates) per Phase 1's original calendar-component recommendation |

---

### 3.9 Decision/Timeline Detail Skeleton
**Used by:** `/people/:id/consultations/:id` — the one deliberate exception to the Tier model (Phase 1 §3).

| Zone | Contents |
|---|---|
| Header | Person context (name, breadcrumb back to Person) |
| Primary | The outcome-routing Wizard skeleton (§3.4) embedded directly — this route is functionally a Wizard with its own URL, not a sixth skeleton type |

---

## 4. Dashboard Composition Table

The concrete per-role widget arrangement, demonstrating that 5 "different" dashboards (Phase 1 §2) are really one skeleton with reordered/filtered widget instances:

| Role | Widgets shown (in priority order) |
|---|---|
| **Admin** | Org-wide KPI row (StatCard ×4: total students, active enrollments, MTD revenue, collection rate) → Revenue trend (AnalyticsChart) → Enrollment trend (AnalyticsChart) |
| **Admission** | New leads this week (StatCard) → Conversion funnel (AnalyticsChart) → Pending consultations (Action-Needed widget) → Stale-lead flagged list (Action-Needed widget, per Phase 2/3 §1.5) |
| **Finance** | Collection rate (StatCard + gauge) → Overdue installments (Action-Needed widget) → Revenue by course (AnalyticsChart) |
| **Teacher** | Today's classes (Action-Needed widget, filtered to assigned classes) → Mini-calendar (CalendarAgenda, agenda mode) |
| **Department Manager** | Open tasks by type (Action-Needed widget, faceted) → Department enrollment trend (AnalyticsChart, scoped to their department) |

---

## 5. Grid Specifications

- **Dashboard widget grid:** 12-column, with `StatCard` typically spanning 3 columns (4 per row), `AnalyticsChart` spanning 6–12 depending on content, Action-Needed widgets spanning 6–12. Gutter: `space.6` (24px) per Phase 4 §3.
- **T1 Detail two-column zone:** Primary 960px + Secondary 320px, per Phase 5 §10 — fixed, not grid-fractional, so detail pages don't visually resize awkwardly on very wide monitors.
- **List page:** single-column, `content max-width: 1280px` per Phase 5 §10, `DataTable` fills the full available width within that constraint.

---

## 6. What This Document Deliberately Excludes

No real entity field mappings (which exact Person fields appear in the Overview tab — that's Phase 8). No copy/microcopy. No widget-level data-fetching specifics. This is structural scaffolding only — Phase 8 fills it with the actual domain content.

---

## 7. Next Step

**Phase 8 — Screen Templates**: concrete screens (Person detail, Invoice detail, Finance dashboard, Teacher attendance grid, Consultation outcome wizard, etc.), each built by selecting a skeleton from this document and populating its zones with real entity fields and Phase 6 components.
