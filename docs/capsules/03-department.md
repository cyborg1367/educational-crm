# Capsule 03 — Department

```yaml
microSkill:
  id: "department.crud"
  domain: "backend/app/**/department*"
  depends_on: ["auth.user"]
  signature: |
    model:   Department
    schemas: DepartmentCreate, DepartmentRead, DepartmentUpdate
    service: CRUD
    router:  /departments
  constraints:
    - "name required; manager_id -> User nullable"
    - "is_active flag; created_at + updated_at"
    - "plain CRUD; router HTTP only"
```

> **Tenancy:** add `org_id` -> Organization to every table in this capsule, and scope all queries by the current org via the tenancy helper from capsule 01 (see /docs/spec.md §8).
