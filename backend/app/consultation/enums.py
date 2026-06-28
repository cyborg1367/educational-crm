from enum import Enum


class ConsultationOutcome(str, Enum):
    pre_enroll = "pre_enroll"
    follow_up = "follow_up"
    refer_other_dept = "refer_other_dept"
    not_suitable = "not_suitable"
    closed = "closed"
    continue_ = "continue"
