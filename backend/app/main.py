from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.activity.router import router as activities_router
from app.attendance.router import router as attendances_router
from app.auth.router import router as auth_router
from app.communication.router import router as communications_router
from app.consultation.router import router as consultations_router
from app.core.db import get_db
from app.course.router import router as courses_router
from app.course_class.router import router as classes_router
from app.department.router import router as departments_router
from app.enrollment.router import router as enrollments_router
from app.finance.router import payments_router, router as invoices_router
from app.journey.router import router as journeys_router
from app.person.router import router as people_router
from app.roadmap.router import router as roadmaps_router
from app.scheduler import shutdown_scheduler, start_scheduler
from app.task.router import router as tasks_router
from app.user.router import router as users_router

OPENAPI_DESCRIPTION = (
    "Multi-tenant SaaS CRM for educational institutes. Supports person management, "
    "course enrollment, invoicing, and automated workflow orchestration."
)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    start_scheduler()
    yield
    shutdown_scheduler()


app = FastAPI(
    title="Educational CRM API",
    version="1.0.0-alpha",
    description=OPENAPI_DESCRIPTION,
    lifespan=lifespan,
)

app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(users_router, prefix="/users", tags=["Users"])
app.include_router(people_router, prefix="/people", tags=["People"])
app.include_router(departments_router, prefix="/departments", tags=["Departments"])
app.include_router(courses_router, prefix="/courses", tags=["Courses"])
app.include_router(classes_router, prefix="/classes", tags=["Classes"])
app.include_router(journeys_router, prefix="/journeys", tags=["Journeys"])
app.include_router(roadmaps_router, prefix="/roadmaps", tags=["Roadmaps"])
app.include_router(
    consultations_router, prefix="/consultations", tags=["Consultations"]
)
app.include_router(
    enrollments_router, prefix="/enrollments", tags=["Enrollments"]
)
app.include_router(
    communications_router, prefix="/communications", tags=["Communications"]
)
app.include_router(
    invoices_router, prefix="/invoices", tags=["Invoices & Finance"]
)
app.include_router(
    payments_router, prefix="/payments", tags=["Invoices & Finance"]
)
app.include_router(
    attendances_router, prefix="/attendances", tags=["Attendance"]
)
app.include_router(tasks_router, prefix="/tasks", tags=["Tasks"])
app.include_router(activities_router, prefix="/activities", tags=["Activities"])


@app.get("/health", tags=["Health"])
def health(db: Session = Depends(get_db)) -> dict[str, str]:
    """Health check.

    Verifies API availability and database connectivity.
    """
    db.execute(text("SELECT 1"))
    return {"status": "ok"}
