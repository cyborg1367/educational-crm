# Capsule 06 — Roadmap & RoadmapItem

```yaml
microSkill:
  id: "roadmap.crud"
  domain: "backend/app/**/roadmap*"
  depends_on: ["department.crud", "course.crud"]
  signature: |
    models:  Roadmap, RoadmapItem
    schemas: Roadmap*/RoadmapItem* Create/Read/Update
    service: CRUD
    router:  /roadmaps  (with nested items)
  constraints:
    - "Roadmap: department_id required; name; is_active; timestamps"
    - "RoadmapItem: roadmap_id required; title; sequence int; course_id -> Course nullable"
    - "NO stored progress column — progress is computed later (capsule 12) from completed enrollments"
    - "after this exists, set Journey.roadmap_id FK (small migration is allowed within this capsule)"
```

> **Tenancy:** add `org_id` -> Organization to every table in this capsule, and scope all queries by the current org via the tenancy helper from capsule 01 (see /docs/spec.md §8).
