# Capsule 09 — Enrollment (commercial source of truth)

```yaml
microSkill:
  id: "enrollment.crud"
  domain: "backend/app/**/enrollment*"
  depends_on: ["person.crud", "class.crud", "consultation.crud", "journey.crud"]
  signature: |
    model:   Enrollment
    schemas: EnrollmentCreate, EnrollmentRead, EnrollmentUpdate
    service: create_enrollment (snapshots price), update_status
    router:  /enrollments
  constraints:
    - "money is INTEGER Toman: price_snapshot, discount_snapshot (default 0), final_amount"
    - "on create, price_snapshot = the Course's current_price AT THAT MOMENT (snapshot, then never re-read)"
    - "final_amount = price_snapshot - discount_snapshot (computed at write, stored)"
    - "status enum [pre_enroll, active, completed, dropped]"
    - "partial UNIQUE (person_id, class_id) WHERE status != 'dropped' (one live enrollment per class)"
    - "consultation_id, journey_id nullable; start_date nullable; timestamps"
    - "invoice creation and status transitions are wired in capsules 11 & 14, not here"
```

> **Tenancy:** add `org_id` -> Organization to every table in this capsule, and scope all queries by the current org via the tenancy helper from capsule 01 (see /docs/spec.md §8).
