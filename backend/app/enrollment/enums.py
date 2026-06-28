from enum import Enum


class EnrollmentStatus(str, Enum):
    pre_enroll = "pre_enroll"
    active = "active"
    completed = "completed"
    dropped = "dropped"
