from enum import Enum


class PersonStatus(str, Enum):
    prospect = "prospect"
    lead = "lead"
    student = "student"
    dormant = "dormant"
    alumni = "alumni"
