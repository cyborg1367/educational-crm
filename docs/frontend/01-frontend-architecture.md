# Frontend Architecture Document — Educational CRM

**Phase 1 of 10 — Frontend Design & Build Roadmap**
**Status:** Draft v1.0
**Depends on:** Backend v1.0 (30 capsules), REST API (65+ endpoints), `ARCHITECTURE.md` (backend)
**Feeds into:** Phase 2/3 (UX Guidelines & Design Principles), Phase 10 (Cursor Prompt Library)

---

## 0. Purpose of This Document

This is the single source of truth for **how the frontend is structured**, before any visual design or component work begins. It answers: what screens exist, how they're reached, who can reach them, and how they map to backend entities. Every later phase (tokens, components, screens, AI specs, Cursor prompts) references this document by name rather than re-deriving structure.

**Product anchors:** Linear (task/queue UX), Stripe Dashboard (financial detail pages, audit-trail clarity), HubSpot (CRM record pages, timeline), Notion (flexible list/table views). Not anchoring to generic admin-panel templates — this product has real workflows, not just CRUD tables.

---

## 1. Entity Tier Model (Formal)

This tiering determines page weight, nav placement, and which CRUD pattern (Phase 1 of the prior pattern-analysis) applies. Every new entity added later must be slotted into one of these four tiers before a screen is designed.

| Tier | Definition | Entities | Page type |
|---|---|---|---|
| **T1 — Hub** | High relationship fan-out; multiple workflows converge; users spend real time here | Person, Enrollment, Invoice, Class, Consultation | Full-page, tabbed, master-detail |
| **T2 — Supporting** | Simple CRUD, low relationship complexity, mostly admin-maintained | Department, Course, Roadmap, User, RoadmapItem | List + drawer |
| **T3 — Sub-resource** | Never navigated to directly; always rendered inside a T1 parent | Journey, Installment, Attendance row, Payment, Refund | Embedded table/section, no own route (or a "shallow route" — see §4) |
| **T4 — Feed/log** | Append-only; read as a stream, never tabular, never edited | Activity, Communication, SMS log | Timeline component inside T1 parent |

**Rule:** A T3 or T4 entity never gets a sidebar nav entry. If a future entity doesn't clearly fit one tier, that's a signal to revisit the data model before building UI for it — not to invent a fifth tier.

---

## 2. Role Model & Primary Journeys

Navigation is **role-composed**, not entity-enumerated. The sidebar is not "one menu for everyone with permissions hiding items" — it's assembled from role-specific journey groups, with shared items where journeys overlap.

| Role | Primary loop (daily driver) | Secondary access | Dashboard focus |
|---|---|---|---|
| **Admin** | Org oversight, user/department/course management, reports | Everything (super-role, read+write across all tiers) | Org-wide KPIs, all reports |
| **Admission** | Person inbox → Consultation → Outcome decision | Journey review, follow-up task queue | New leads, consultations pending outcome, conversion funnel |
| **Finance** | Invoice/Installment queue → Record Payment / Refund | Collection report, overdue queue | Collection rate, overdue installments, revenue trend |
| **Teacher** | Class roster → Attendance grid | Read-only Person/Enrollment for their own classes | Today's classes, attendance completion |
| **Department Manager** | Task inbox (referrals, dormant follow-up, post-course review) | Journey oversight for their department | Open tasks by type, dept enrollment trend |

**Implication for IA:** there are 5 distinct "home screens" (dashboards), not 1. They share widget components (Part 2 of the prior analysis) but differ in composition and default filters.

---

## 3. Information Architecture (Sitemap)

```
/login
/dashboard                              → role-composed (see §2)

/people                                 → T1 list
/people/:id                             → T1 detail (tabs: Overview, Journeys, Enrollments,
                                            Timeline[Activity+Comms merged], Tasks)
/people/:id/consultations/:id           → decision/timeline detail (outcome routing)

/enrollments                            → T1 list (admission + finance view, filtered differently)
/enrollments/:id                        → T1 detail (tabs: Overview, Invoice & Installments,
                                            Attendance, Timeline)

/invoices                               → T1 list (finance only)
/invoices/:id                           → T1 detail (Installments table, Payments, Refunds)

/classes                                → T1 list
/classes/:id                            → T1 detail (Roster, Attendance grid, Schedule)

/courses                                → T2 list + drawer
/roadmaps                               → T2 list + drawer
/roadmaps/:id                           → T2 detail (embedded RoadmapItem table, T3)

/departments                            → T2 list + drawer
/users                                  → T2 list + drawer (admin only)

/tasks                                  → unified inbox (faceted by type, assignee, due)
/calendar                               → unified calendar (Class starts, Installment due,
                                            Task due — one component, three data sources)

/reports/revenue
/reports/enrollments
/reports/collection

/settings/org
/settings/profile
```

**Explicitly NOT in the sidebar** (per Tier model, §1): Journey, Installment, Payment, Refund, Attendance row, Activity, Communication. These surface only inside their T1 parent.

**Shallow routes exception:** `/people/:id/consultations/:id` gets its own URL (deep-linkable, shareable) even though Consultation is logically a sub-flow of Person — because outcome routing is a decision workflow worth bookmarking/returning to, not just a tab. This is the one deliberate exception to the tiering rule, and it should stay the *only* one.

---

## 4. Layout Shell Assignment

Maps the 4 layout patterns (from prior analysis) to the sitemap above:

| Shell | Routes |
|---|---|
| **App Shell** (sidebar + topbar) | All routes except `/login`, wizards |
| **Split View** (list + preview) | `/tasks`, `/people` (optional card-preview mode) |
| **Wizard / focused single-column** | Enrollment creation flow, Consultation outcome routing |
| **Settings Layout** (sub-nav + panel) | `/settings/*`, `/users`, `/departments` |

---

## 5. Data Flow Architecture (Frontend ↔ API Contract)

This section locks frontend assumptions to *actual* backend behavior — not idealized REST — so Cursor never has to guess.

- **Pagination:** every list screen consumes `{items, total_count, limit, offset, has_more}`. One `usePaginatedQuery`-style data hook, parametrized by endpoint. No screen invents its own pagination state shape.
- **Errors:** every error surface reads `{detail, error_code, timestamp, field?}`. Frontend error-state component switches on `error_code` (`NOT_FOUND`, `CONFLICT`, `VALIDATION_ERROR`, `PERMISSION_DENIED`, `AUTHENTICATION_ERROR`) — never on parsing `detail` strings.
- **Auth:** JWT `{sub, org_id, exp}` — org_id is never selectable in the UI (single-org session per login); role comes from `/users/me` or token claim, drives nav composition (§2) client-side, but **all real enforcement is server-side** — UI hiding is convenience, not security.
- **Rate limits:** 429 responses need a distinct toast/inline state (not the generic error state) on login and the three sensitive finance actions (payment, refund, drop) — these are the only client paths that can realistically hit a sensitive-action limit.
- **Status fields are never bound to editable form inputs.** Enrollment.status, Invoice.status, Installment.status, Consultation.outcome are rendered as badges and changed only via explicit action endpoints (`/drop`, `/outcome`, payment/refund creation). This is a hard architectural rule carried over from the backend's derived-status design — violating it in the frontend would let users attempt invalid state transitions the backend will reject, producing confusing error states instead of disabled/contextual actions.
- **Money fields:** always integers (Toman), formatted with thousands separators at render time, never floats anywhere in frontend state.

---

## 6. Cross-Cutting Architectural Decisions (Open → Must Resolve in Phase 2/3)

Carried forward from the pushback analysis — flagged here so they're decided before Phase 4 (tokens) locks formatting choices in:

1. **Calendar system:** Backend stores Gregorian. Resolve whether UI displays Jalali (Shamsi) as a *display-only* transform. (Strong recommendation: yes, given the user base — but this is a product decision, not mine to finalize unilaterally.)
2. **RTL direction:** Persian-first UI implies RTL layout direction as default, with logical CSS properties (not LTR-with-mirroring hacks).
3. **Digit rendering:** Persian numerals vs. Latin numerals for money/phone/dates — needs one consistent rule, not per-field judgment calls.
4. **Merged Activity+Communication timeline:** confirmed in prior analysis as a frontend-layer merge of two backend tables into one rendered stream.
5. **Stale-lead visual flag:** since Person lifecycle transitions are manual, the frontend needs a lightweight "no activity in N days while status=lead" indicator to compensate — this is a frontend mitigation for a backend gap, worth deciding now rather than retrofitting.

---

## 7. What This Document Deliberately Excludes

No colors, spacing, typography, or component visuals (Phase 4+). No state-management library choice or folder structure (Phase 6 territory, and frankly less important than getting IA/roles right first). No screen mockups (Phase 8). This document is structure only — it should be stable even if the visual design changes completely later.

---

## 8. Next Step

**Phase 2/3 — UX Guidelines & Design Principles**, starting from the 5 open decisions in §6 plus the interaction rules already identified (status-as-action, confirmation-depth tiers for Drop vs. Refund, money-input behavior).
