from enum import Enum


class InvoiceStatus(str, Enum):
    open = "open"
    partially_paid = "partially_paid"
    paid = "paid"
    void = "void"


class InstallmentStatus(str, Enum):
    pending = "pending"
    partially_paid = "partially_paid"
    paid = "paid"
    overdue = "overdue"
    cancelled = "cancelled"
