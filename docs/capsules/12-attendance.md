# Capsule 12 — Attendance & Roadmap Progress

```yaml
microSkill:
  id: "attendance.progress"
  domain: "backend/app/**/(attendance|progress)*"
  depends_on: ["enrollment.crud", "class.crud", "roadmap.crud"]
  signature: |
    model:   Attendance
    schemas: AttendanceCreate, AttendanceRead
    service: record_attendance, compute_roadmap_progress(person_id, roadmap_id)
    router:  /attendance, /people/{id}/progress
  constraints:
    - "Attendance: enrollment_id required; session_date date; status enum [present, absent, late, excused]"
    - "recorded_by -> User required; note nullable; timestamps"
    - "UNIQUE (enrollment_id, session_date)"
    - "compute_roadmap_progress is COMPUTED, not stored: a RoadmapItem counts as done when the person has a COMPLETED enrollment whose class.course_id == roadmap_item.course_id"
    - "recording attendance writes an Activity via log_activity"
```

> **Tenancy:** add `org_id` -> Organization to every table in this capsule, and scope all queries by the current org via the tenancy helper from capsule 01 (see /docs/spec.md §8).
