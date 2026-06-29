from pydantic import BaseModel, Field


class RevenueMonth(BaseModel):
    month: str = Field(description="Month label (YYYY-MM).")
    amount: int = Field(description="Revenue in Toman for the month.")


class RevenueCourse(BaseModel):
    course_id: int = Field(description="Course identifier.")
    course_name: str = Field(description="Course title.")
    amount: int = Field(description="Revenue in Toman for the course.")


class RevenueSummary(BaseModel):
    total_revenue: int = Field(description="Total revenue in Toman for the year.")
    by_month: list[RevenueMonth] = Field(description="Revenue grouped by month.")
    by_course: list[RevenueCourse] = Field(description="Revenue grouped by course.")


class EnrollmentMonth(BaseModel):
    month: str = Field(description="Month label (YYYY-MM).")
    count: int = Field(description="Number of enrollments created in the month.")


class EnrollmentCourse(BaseModel):
    course_id: int = Field(description="Course identifier.")
    course_name: str = Field(description="Course title.")
    count: int = Field(description="Number of enrollments for the course.")


class EnrollmentTrends(BaseModel):
    total_enrollments: int = Field(description="Total enrollments created in the year.")
    by_month: list[EnrollmentMonth] = Field(
        description="Enrollment counts grouped by month."
    )
    by_course: list[EnrollmentCourse] = Field(
        description="Enrollment counts grouped by course."
    )


class CollectionRate(BaseModel):
    total_invoiced: int = Field(description="Sum of invoice totals in Toman (non-void).")
    total_paid: int = Field(description="Sum of payment amounts in Toman.")
    collection_rate_percent: float = Field(
        description="Percentage of invoiced amount collected."
    )
    pending_amount: int = Field(description="Uncollected amount in Toman.")
