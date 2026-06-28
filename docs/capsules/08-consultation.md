# Capsule 08 — Consultation

```yaml
microSkill:
  id: "consultation.crud"
  domain: "backend/app/**/consultation*"
  depends_on: ["person.crud", "department.crud", "course.crud", "journey.crud"]
  signature: |
    model:   Consultation
    schemas: ConsultationCreate, ConsultationRead, ConsultationUpdate
    service: CRUD
    router:  /consultations
  constraints:
    - "person_id, department_id, consultant_id (-> User) required; journey_id -> Journey nullable"
    - "assessment fields current_level / need / goal (text, nullable); decision text nullable"
    - "recommended_course_id -> Course nullable; refer_to_department_id -> Department nullable"
    - "outcome enum [pre_enroll, follow_up, refer_other_dept, not_suitable, closed, continue]"
    - "next_action text nullable; next_action_date date nullable; notes text; timestamps"
    - "THIS CAPSULE IS PLAIN CRUD ONLY. The outcome side-effects (create enrollment / task / referral / journey) are wired in capsule 14."
```

> **Tenancy:** add `org_id` -> Organization to every table in this capsule, and scope all queries by the current org via the tenancy helper from capsule 01 (see /docs/spec.md §8).
