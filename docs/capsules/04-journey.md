# Capsule 04 — Journey

```yaml
microSkill:
  id: "journey.crud"
  domain: "backend/app/**/journey*"
  depends_on: ["person.crud", "department.crud"]
  signature: |
    model:   Journey
    schemas: JourneyCreate, JourneyRead, JourneyUpdate
    service: CRUD + get_or_create_journey(person_id, department_id)
    router:  /journeys
  constraints:
    - "UNIQUE (person_id, department_id) — one journey per person per department"
    - "status enum [active, on_hold, completed, dropped], default 'active'"
    - "owner_id -> User nullable; roadmap_id -> Roadmap nullable (FK added when Roadmap exists)"
    - "created_at + updated_at"
    - "auto-creation on first consultation is wired in capsule 14, NOT here; expose get_or_create_journey for it to call"
```

> **Tenancy:** add `org_id` -> Organization to every table in this capsule, and scope all queries by the current org via the tenancy helper from capsule 01 (see /docs/spec.md §8).
