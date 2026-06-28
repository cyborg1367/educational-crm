from enum import Enum


class UserRole(str, Enum):
    admin = "admin"
    admission = "admission"
    department_manager = "department_manager"
    finance = "finance"
    teacher = "teacher"
