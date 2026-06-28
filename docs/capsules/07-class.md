# Capsule 07 — Class (course offering)

```yaml
microSkill:
  id: "class.crud"
  domain: "backend/app/**/course_class*"
  depends_on: ["course.crud", "auth.user"]
  signature: |
    model:   CourseClass        # NOTE: not "Class" (reserved-ish); table = "classes"
    schemas: CourseClassCreate, CourseClassRead, CourseClassUpdate
    service: CRUD
    router:  /classes
  constraints:
    - "Use model name CourseClass, table name 'classes', module course_class.py — avoid the keyword `class`"
    - "course_id -> Course required; teacher_id -> User required (expected role: teacher)"
    - "status enum [planned, active, completed, cancelled]"
    - "start_date required; end_date nullable; created_at + updated_at"
    - "marking status='completed' triggers completion side-effects — but that wiring is capsule 14, not here"
```

> **Tenancy:** add `org_id` -> Organization to every table in this capsule, and scope all queries by the current org via the tenancy helper from capsule 01 (see /docs/spec.md §8).
