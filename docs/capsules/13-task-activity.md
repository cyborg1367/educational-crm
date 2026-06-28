# Capsule 13 — Task & Activity (+ the central log helper)

```yaml
microSkill:
  id: "core.task_activity"
  domain: "backend/app/**/(task|activity)*"
  depends_on: ["person.crud", "auth.user"]
  signature: |
    models:  Task, Activity
    schemas: Task*/Activity* (Activity read-only)
    service: log_activity(db, person_id, type, payload=None, actor_id=None)  # THE one helper
             create_task, list_tasks(assignee_id?, status?), complete_task
    router:  /tasks (CRUD), /people/{id}/activities (read-only)
  constraints:
    - "Task.type enum [follow_up_registration, pre_enroll_unpaid, post_course_consultation, dormant_followup, installment_overdue, referral, custom]"
    - "Task.status enum [open, done, cancelled]; assignee_id -> User nullable; due_date; completed_at nullable"
    - "related_entity_type / related_entity_id are nullable plain columns (a light link, NOT an FK)"
    - "Activity is APPEND-ONLY: no update or delete endpoints; payload is JSON; actor_id -> User nullable"
    - "log_activity is the ONLY way Activity rows are written, anywhere in the codebase"
```

> **Tenancy:** add `org_id` -> Organization to every table in this capsule, and scope all queries by the current org via the tenancy helper from capsule 01 (see /docs/spec.md §8).
