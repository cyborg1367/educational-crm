# Capsule 14 — Workflow glue (the part that makes it alive)

```yaml
microSkill:
  id: "core.workflow"
  domain: "backend/app/**/(workflow|jobs)*  + minimal edits to existing services to call into it"
  depends_on: ["ALL previous capsules"]
  signature: |
    service (workflow):
      on_consultation_saved(consultation):
        - ensure Journey exists (journey.get_or_create_journey)
        - move person prospect -> lead if still prospect
        - route by outcome:
            pre_enroll       -> create Enrollment(pre_enroll) + finance.issue_invoice(...)
            follow_up        -> create Task(follow_up_registration, due=next_action_date)
            refer_other_dept -> get_or_create_journey(target dept) + Task(referral, assignee=target manager)
            not_suitable|closed -> Journey.status = dropped/completed
            continue         -> no-op
      on_first_payment(enrollment): enrollment.status=active; person.status=student
      on_class_completed(course_class): its enrollments -> completed; Task(post_course_consultation) for dept manager
    jobs (callable functions, scheduled by APScheduler):
      mark_overdue_installments()           # -> Task(installment_overdue) for finance
      pre_enroll_unpaid_followups(days=N)   # N = settings.PRE_ENROLL_FOLLOWUP_DAYS
      dormant_sweep(days=M)                 # M = settings.DORMANT_DAYS -> person.status=dormant + Task(dormant_followup)
  constraints:
    - "ALL side-effects live in services, never in routers"
    - "ANY money operation goes through the finance service (capsule 11). Never inline money math here."
    - "EVERY state change writes an Activity via log_activity"
    - "jobs are plain functions a scheduler calls. NO rule engine, NO event bus."
    - "N and M come from Settings, not hardcoded"
    - "person lifecycle transitions follow /docs/spec.md §4a exactly"
```

After this capsule the system breathes: consultations create work, money is tracked, nothing is dropped, and every person has a full timeline.
