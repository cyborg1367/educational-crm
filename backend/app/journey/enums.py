from enum import Enum


class JourneyStatus(str, Enum):
    active = "active"
    on_hold = "on_hold"
    completed = "completed"
    dropped = "dropped"
