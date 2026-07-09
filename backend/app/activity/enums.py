from enum import Enum


class ActivityChannel(str, Enum):
    consultation = "consultation"
    enrollment = "enrollment"
    payment = "payment"
    task = "task"
    status_change = "status_change"
    communication = "communication"
    custom = "custom"
