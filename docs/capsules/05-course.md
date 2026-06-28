# Capsule 05 — Course

```yaml
microSkill:
  id: "course.crud"
  domain: "backend/app/**/course*"
  depends_on: ["department.crud"]
  signature: |
    model:   Course
    schemas: CourseCreate, CourseRead, CourseUpdate
    service: CRUD
    router:  /courses
  constraints:
    - "department_id -> Department required"
    - "current_price is an INTEGER (Toman), >= 0 — never float/Decimal"
    - "duration_sessions int nullable; level nullable; description nullable"
    - "is_active; created_at + updated_at"
    - "current_price is the LIVE price; it is snapshotted by Enrollment (capsule 09), not read live afterwards"
```

> **Tenancy:** add `org_id` -> Organization to every table in this capsule, and scope all queries by the current org via the tenancy helper from capsule 01 (see /docs/spec.md §8).
