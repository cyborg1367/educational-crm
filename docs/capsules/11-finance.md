# Capsule 11 — Finance (Invoice · Installment · Payment)  ⚠ highest-risk

```yaml
microSkill:
  id: "finance.invoice_payment"
  domain: "backend/app/**/(invoice|installment|payment|finance)*"
  depends_on: ["enrollment.crud"]
  signature: |
    models:  Invoice, Installment, Payment
    service:
      issue_invoice(enrollment, installment_plan)   # creates invoice + installments
      record_payment(installment_id, amount, method, recorded_by, reference?)
      recompute_installment_status(installment)
      recompute_invoice_status(invoice)
      cancel_installments_on_drop(enrollment)
    routers: /invoices, /payments
  constraints:
    - "ALL money is INTEGER Toman. No float, no Decimal. Anywhere."
    - "Invoice.total_amount = enrollment.final_amount, frozen at issue. Once issued, enrollment money is frozen."
    - "INVARIANT (validate on create/update): sum(installments.amount where status != 'cancelled') == invoice.total_amount"
    - "Installment.status enum [pending, partially_paid, paid, overdue, cancelled] — ALWAYS DERIVED, never set by hand:"
    - "  paid: sum(payments) >= amount ; partially_paid: 0 < sum < amount ; overdue: past due_date and not fully paid ; cancelled: only via drop flow"
    - "Invoice.status enum [open, partially_paid, paid, void] — DERIVED: paid when all non-cancelled installments paid; partially_paid when any payment; void when enrollment dropped with no payments"
    - "record_payment writes the Payment, then recompute_installment_status, then recompute_invoice_status, then log_activity('payment_received')"
    - "on enrollment -> dropped: cancel_installments_on_drop sets pending/partially_paid installments to cancelled. Refunds of received money are OUT OF SCOPE (note only)."
    - "Payment.recorded_by required; reference nullable"
  boilerplate: |
    def recompute_installment_status(inst):
        paid = sum(p.amount for p in inst.payments)
        if inst.status == "cancelled":
            return
        if paid >= inst.amount:
            inst.status = "paid"
        elif paid > 0:
            inst.status = "partially_paid"
        elif inst.due_date < today() :
            inst.status = "overdue"
        else:
            inst.status = "pending"
```

This is the capsule where a quiet bug costs money. Read every line of its diff. Add a couple of tests (full payment, partial payment, drop → cancel, invariant violation rejected).

> **Tenancy:** add `org_id` -> Organization to every table in this capsule, and scope all queries by the current org via the tenancy helper from capsule 01 (see /docs/spec.md §8).
