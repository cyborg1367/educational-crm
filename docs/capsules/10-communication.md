# Capsule 10 — Communication (contact log)

```yaml
microSkill:
  id: "communication.crud"
  domain: "backend/app/**/communication*"
  depends_on: ["person.crud", "journey.crud", "auth.user"]
  signature: |
    model:   Communication
    schemas: CommunicationCreate, CommunicationRead
    service: log_communication
    router:  /communications  (POST + GET list by person)
  constraints:
    - "person_id required; journey_id -> Journey nullable"
    - "channel enum [phone, whatsapp, sms, email, in_person]; direction enum [inbound, outbound]"
    - "summary text required; outcome text nullable; next_action_date date nullable"
    - "created_by -> User required; created_at (append-only log — no edit/delete endpoints)"
    - "creating a Communication should also write an Activity (via log_activity) — that call lives in the service"
```

> **Tenancy:** add `org_id` -> Organization to every table in this capsule, and scope all queries by the current org via the tenancy helper from capsule 01 (see /docs/spec.md §8).
