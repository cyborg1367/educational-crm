# Component Library — Educational CRM

**Phase 6 of 10 — Frontend Design & Build Roadmap**
**Status:** Draft v1.0
**Depends on:** `04-design-system.md` (Phase 5) — every component below cites a rule by section number rather than redefining behavior
**Feeds into:** Phase 7 (UI Kit — composing these into layouts), Phase 8 (Screen Templates), Phase 10 (Cursor Prompt Library — one prompt per component, referencing this spec)

---

## 0. How to Read This Catalog

Each component entry states: **purpose**, **variants/states**, and the **Design System rule it must follow** (cited as `§N` from Phase 5). A component spec that contradicts Phase 5 is a bug in this document, not a justified exception — the one deliberate exception already on record (numeric alignment, Phase 5 §3) is called out again where it applies, never silently.

Components are grouped into four tiers, mirroring how they'll actually be built: **Primitives** (no dependencies on other components) → **Composite** (built from primitives) → **Layout/Navigation** (structural) → **Domain Composites** (encode a CRM-specific rule, not just a visual pattern — these are the highest-leverage components in the whole system, since they're what makes Drop/Refund/Status-changes consistent everywhere they appear).

**Final count: 31 components.** Close to the original 25–30 estimate from the initial pattern analysis — slightly higher because Domain Composites (§4 below) earned standalone status rather than being folded into generic primitives, since they encode business rules that must never drift between screens.

---

## 1. Primitives

| Component | Purpose | Variants / States | Rule reference | Notes |
|---|---|---|---|---|
| **Button** | All clickable actions | `primary / secondary / ghost / destructive` × `sm / md / lg` | §2 (state model), §5 (sizing) | `destructive` variant only used inside Tier 2/3 confirm flows — never as a standalone list-row action; a destructive *intent* always routes through ConfirmDialog (§4) |
| **IconButton** | Icon-only action (table row actions, drawer close) | Same sizing as Button | §2, §4 (icon mirroring) | Always paired with a visually-hidden label for screen readers — never icon-only with zero accessible name |
| **Badge** | Generic label tag (non-status, e.g. role tag, count) | `neutral / brand` | §7 footprint (padding/radius/type), but **not** the statusMap lookup | Distinct from StatusBadge (§4) — Badge never encodes backend enum meaning |
| **Avatar** | Person/User initials or photo | `xs/sm/md` sizes | §5 sizing scale | Initials fallback uses `color.brand.100` background, `brand.700` text — consistent regardless of name |
| **Tooltip** | Contextual explanation (frozen-field info icon, truncated text) | Hover + focus-triggered | §2 (focus-visible only on keyboard) | Primary real use: Frozen Field info icon (§3 below) — this is not a decorative component, it carries real information |
| **Divider** | Visual separation within a section | `horizontal` only (no vertical variant needed at current screen density) | — | — |

---

## 2. Form Components

| Component | Purpose | Variants / States | Rule reference | Notes |
|---|---|---|---|---|
| **FormField** | Label + control + helper/error wrapper | Error / default / disabled | §2, §8 | Every form control in the system is wrapped by this — no standalone unlabeled input ever ships |
| **TextInput** | Free text entry | default / error / disabled | §2, §8 | — |
| **Textarea** | Multi-line text (notes, reason fields) | default / error | §2, §8 | Used for `Refund.reason`, `EnrollmentDrop.reason` — required-field styling must be obvious, since these reasons appear later in Tier 3 consequence summaries |
| **MoneyInput** | Toman amount entry | default / error / **frozen** (read-only) | §3 (right-align exception), §8 | Live thousands-separator formatting; frozen variant renders via Frozen Field treatment, not a disabled MoneyInput — these are visually distinct components in practice even though they share a base |
| **DatePicker** | Date selection | default / error | Phase 4 §7 (Jalali display, Gregorian storage) | Internally converts Jalali selection to Gregorian ISO before it ever reaches form state — components downstream never see Jalali strings |
| **Select** | Single choice from enumerated options (Department, Course, Role) | default / error / searchable variant for long lists (Course, Person) | §2, §8 | Searchable variant required once a list exceeds ~15 items (Course list will; Department/Role won't) |
| **SelectionControl** | Checkbox / Radio group | default / error | §2 | Used sparingly — most "choice" interactions in this domain are Select or StatusAction (§4), not raw checkboxes |
| **FrozenField** | Display of an immutable snapshot value | static only | Design Principle 1, Phase 2/3 §3.4, Phase 5 §8 | **Never** a disabled input — distinct visual treatment (`surface.subtle` background + info Tooltip), this is a hard rule carried from two prior phases into this one |

---

## 3. Data Display Components

| Component | Purpose | Variants / States | Rule reference | Notes |
|---|---|---|---|---|
| **DataTable** | Paginated entity list | Standard / with row-selection (for future bulk ops) | Phase 1 §5 (pagination contract) | One implementation consuming `{items, total_count, limit, offset, has_more}` — every T1/T2 list screen uses this exact component, never a bespoke table |
| **FinancialTable** | Installments, Payments, Refunds sub-tables | Embedded (no own pagination — these are bounded sub-resource lists) | §3 (numeric right-align exception) | Distinct from DataTable specifically because of the alignment exception — keeping it a separate component prevents the exception from leaking into generic tables by accident |
| **StatCard** | Single KPI on a dashboard | static value, optional trend indicator | §6 (elevation.1), §5 | Feeds Phase 1's four dashboard widgets (Part 2 §6 of the original analysis) |
| **EntitySummaryCard** | Compact entity preview (search results, card-view toggle) | Person / Enrollment / Class variants (same shell, different content slots) | §6 | One shell component, three content configs — not three components |
| **RelationshipCard** | Mini cross-entity reference embedded in a detail page (e.g. "Enrolled in: Python Basics" inside Person) | static, clickable through to the related T1 page | §6 | Deliberately smaller/quieter than EntitySummaryCard — it's context, not a primary result |
| **Timeline** | Merged Activity + Communication stream | Person-detail variant (primary use); reusable wherever a merged event stream is needed | Phase 2/3 §1.4 (frontend-only merge) | Fetches two paginated endpoints client-side and interleaves by `created_at` — the merge logic lives here once, not per-screen |
| **CalendarAgenda** | Date-driven view across Class starts / Installment due dates / Task due dates | Month view (primary), list/agenda view (secondary, better for dense days) | Phase 4 §7 (Jalali display) | One component, three data-source adapters — never three separate calendar implementations |
| **AnalyticsChart** | Revenue/enrollment trend & breakdown visualization | Line (trend over time) / Bar (breakdown by course) | §6 | Maps directly to the three `/reports` endpoints; gauge/percentage variant for Collection Rate is a fourth chart type, kept in this same component family rather than a bespoke one-off |

---

## 4. Domain Composite Components

**This is the highest-leverage section in the entire catalog.** These components don't just standardize visuals — they encode business rules from the backend (derived status, cascading consequences, role-scoped visibility) so that no individual screen can implement them incorrectly.

| Component | Purpose | Composition | Rule reference | Why it must be one component |
|---|---|---|---|---|
| **StatusBadge** | Renders any backend enum status as a colored badge | Badge primitive + `statusMap` lookup keyed by exact enum string | Phase 4 §1.2, Phase 5 §7 | Takes an enum value as its *only* color-determining input — a screen literally cannot render a status in the wrong color, because the component doesn't accept a color override prop at all |
| **StatusAction** | The badge-plus-action pairing for any backend-derived lifecycle field | StatusBadge + Button(s), composed per entity (Enrollment→"Drop", Invoice→"Record Payment", Consultation→"Set Outcome", Task→"Mark Complete") | Phase 2/3 §3.1 (status-as-action, the hard rule table) | This is the component that makes it structurally impossible to accidentally render a status as an editable dropdown — the lookup table from Phase 2/3 §3.1 is implemented *as this component's configuration*, not as a convention developers have to remember |
| **ConfirmDialog** | Tier 2 / Tier 3 confirmation per Phase 2/3 §3.2 | Dialog shell + Button(s) + (Tier 3 only) CascadeConsequenceList | Phase 5 §9 | Single component with a `tier` prop — guarantees Tier 3's wider width, danger-tinted surface, and consequence block are never accidentally omitted by someone reaching for a generic confirm |
| **CascadeConsequenceList** | The bulleted "here's what this action will do" block inside Tier 3 dialogs | Standalone list renderer, slotted into ConfirmDialog | Phase 2/3 §3.2 | Reused identically for Drop Enrollment ("cancels 2 installments, refunds 1,500,000 Toman, cancels 1 task") and Refund ("remaining refundable balance becomes X") — same renderer, different data |
| **Drawer** | Create/Edit panel (T2 entities) and Detail Preview panel (Task quick-view) | Shell + slot content | Phase 5 §6 (elevation/z-index) | One shell, two usage modes — not two components |
| **FilterBar** | Faceted filtering + saved views | Composed of Select/SelectionControl + a "Saved Views" dropdown | §2, §8 | Same component instance reused across Person/Task/Enrollment lists with different facet configs passed in — never a bespoke filter UI per entity |
| **PermissionBanner** | "View-only for your role" indicator on shared T1 pages | Static banner, role-aware visibility | Phase 2/3 §5 | Encodes Design Principle 5 (boundaries visible, not silent) as a single reusable element rather than ad-hoc text per screen |
| **EmptyState / Skeleton / ErrorState** | The three baseline content-absence states | Parametrized by entity name + (for ErrorState) `error_code` | Phase 2/3 §3.6, Phase 1 §5 | Grouped as one family because they share a layout shell (icon + message + optional action) and are always implemented together per screen — ErrorState specifically switches its rendering branch on the backend's `error_code` enum, never on parsed message text |
| **RateLimitNotice** | 429-specific inline/toast variant | Toast variant with a countdown-style message | Phase 1 §5 | Narrow-purpose, but specified separately from generic ErrorState because login and payment/refund/drop are the only paths that realistically hit it, and the messaging needs to be calmer/more specific than a generic error |
| **AISummaryPanel** | Generated summary block (Person detail, baseline only — full spec in Phase 9) | Card shell + a visually distinct "AI-generated" label treatment | Phase 2/3 §6 | Built now at the shell level so Phase 9 only needs to define content logic, not invent a new visual treatment for "this text was generated" |

---

## 5. Layout & Navigation Components

| Component | Purpose | Rule reference | Notes |
|---|---|---|---|
| **AppShell** | Sidebar + topbar wrapper | Phase 5 §10 (260px sidebar, 1024px collapse breakpoint) | Sidebar content is role-composed per Phase 1 §2 — AppShell itself is role-agnostic, it just renders whatever nav tree it's given |
| **EntityTabs** | Tab navigation within a T1 detail page | Phase 1 §1 (Tier model — only T1 entities get this) | Never applied to T2 entities (Department, Course) — those use single-pane layout per Phase 1 §4 |
| **Breadcrumb** | Deep-drill trail (Dept → Class → Enrollment) | Phase 1 §4 | Only appears where drill-down depth exceeds 2 levels — flat top-level lists never show a breadcrumb |
| **CommandPalette** | ⌘K cross-entity search/jump | Phase 2/3 §3.5 (role-scoped results) | Results never include entities outside the current user's permission scope — filtered silently, not shown-then-blocked |

---

## 6. Composition Examples (How These Combine)

Three worked examples, chosen because they're the patterns most likely to get reinvented inconsistently if Phase 6 stopped at a flat component list:

1. **Dropping an Enrollment:** `StatusAction` (Enrollment context) renders the current status badge + a "Drop Enrollment" `Button(destructive)` → click opens `ConfirmDialog(tier=3)` → which slots in `CascadeConsequenceList` populated from a pre-flight summary (installments to cancel, amount to refund, tasks to cancel) → on confirm, `Toast` reports success, and the page's `StatusBadge` re-renders to `dropped` (danger-strong, per the urgency rule).

2. **Recording a Payment:** Inside an Invoice's `FinancialTable` (right-aligned, per the alignment exception), each Installment row's `StatusAction` shows "Record Payment" when status is `pending`/`partially_paid`/`overdue` — opens a `Drawer` with a `MoneyInput` (validated against the remaining balance) — on submit, the row's `StatusBadge` updates and a `Toast` confirms.

3. **A Teacher Marking Attendance:** `CalendarAgenda` or a direct Class link → Class detail's attendance grid uses `control.lg` (48px) sized `SelectionControl`/`Button` toggles per Phase 5 §5's tablet-context rule — this is the one screen in the system where the `lg` control size is the *default*, not an exception, because of the role/device context established all the way back in Phase 1.

---

## 7. Example Prop Contracts (Illustrative, Not Final Code)

Two of the highest-leverage components, sketched at the interface level so Phase 10's Cursor prompts have something concrete to anchor to:

```ts
// StatusBadge — color is never a caller-supplied prop, by design
type StatusBadgeProps = {
  domain: "person" | "enrollment" | "invoice" | "installment" | "task" | "class" | "journey";
  value: string; // exact backend enum string, e.g. "partially_paid"
};

// ConfirmDialog — tier drives width, color, and whether consequences is required
type ConfirmDialogProps = {
  tier: 2 | 3;
  title: string;
  body: string;
  consequences?: string[]; // required by convention when tier === 3
  onConfirm: () => void;
  onCancel: () => void;
};
```

---

## 8. What This Document Deliberately Excludes

No exact pixel-level mockups (Phase 8). No full TypeScript prop interfaces for all 31 components (left to actual implementation — the two sketched above establish the pattern, not a complete contract). No state-management/data-fetching library choice (an implementation detail Phase 10's Cursor prompts can resolve directly against whatever stack the project settles on).

---

## 9. Next Step

**Phase 7 — UI Kit**, which composes these 31 components into the concrete layout patterns from Phase 1 §4 (App Shell, Split View, Wizard, Settings Layout) — the assembly layer between "components exist" and "screens exist."
