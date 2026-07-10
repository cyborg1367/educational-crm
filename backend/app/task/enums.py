from enum import Enum


class TaskType(str, Enum):
    follow_up_registration = "follow_up_registration"
    consultation_follow_up = "consultation_follow_up"
    pre_enroll_unpaid = "pre_enroll_unpaid"
    post_course_consultation = "post_course_consultation"
    dormant_followup = "dormant_followup"
    installment_overdue = "installment_overdue"
    referral = "referral"
    custom = "custom"


class TaskStatus(str, Enum):
    open = "open"
    done = "done"
    cancelled = "cancelled"
