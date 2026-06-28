# Capsule 02 — Person

```yaml
microSkill:
  id: "person.crud"
  domain: "backend/app/**/person*"
  depends_on: ["auth.user"]
  signature: |
    model:   Person
    schemas: PersonCreate, PersonRead, PersonUpdate
    service: create_person, get_person, list_people, update_person
    router:  /people  (GET list, POST, GET /{id}, PATCH /{id})
  constraints:
    - "status enum [prospect, lead, student, dormant, alumni], default 'prospect'"
    - "phone is nullable and UNIQUE ONLY WHERE NOT NULL (partial unique index)"
    - "email nullable; source nullable; notes text nullable"
    - "created_at + updated_at"
    - "status transitions are NOT done here — they happen via workflow (capsule 14). This is plain CRUD."
    - "router does HTTP only; logic in service; touch no other entity"
  boilerplate: |
    class Person(Base):
        __tablename__ = "people"
        id: Mapped[int] = mapped_column(primary_key=True)
        full_name: Mapped[str]
        phone: Mapped[str | None] = mapped_column(unique=False, nullable=True)
        # partial unique index on phone where phone is not null (in migration)
        status: Mapped[str] = mapped_column(default="prospect")
```

> **Tenancy:** add `org_id` -> Organization to every table in this capsule, and scope all queries by the current org via the tenancy helper from capsule 01 (see /docs/spec.md §8).
