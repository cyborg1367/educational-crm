from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.auth.router import router as auth_router
from app.core.db import get_db
from app.course.router import router as courses_router
from app.course_class.router import router as classes_router
from app.department.router import router as departments_router
from app.journey.router import router as journeys_router
from app.person.router import router as people_router
from app.roadmap.router import router as roadmaps_router
from app.user.router import router as users_router

app = FastAPI()

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(users_router, prefix="/users", tags=["users"])
app.include_router(people_router, prefix="/people", tags=["people"])
app.include_router(departments_router, prefix="/departments", tags=["departments"])
app.include_router(courses_router, prefix="/courses", tags=["courses"])
app.include_router(classes_router, prefix="/classes", tags=["classes"])
app.include_router(journeys_router, prefix="/journeys", tags=["journeys"])
app.include_router(roadmaps_router, prefix="/roadmaps", tags=["roadmaps"])


@app.get("/health")
def health(db: Session = Depends(get_db)) -> dict[str, str]:
    db.execute(text("SELECT 1"))
    return {"status": "ok"}
