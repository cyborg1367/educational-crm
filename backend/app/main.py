from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.auth.router import router as auth_router
from app.core.db import get_db
from app.department.router import router as departments_router
from app.person.router import router as people_router
from app.user.router import router as users_router

app = FastAPI()

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(users_router, prefix="/users", tags=["users"])
app.include_router(people_router, prefix="/people", tags=["people"])
app.include_router(departments_router, prefix="/departments", tags=["departments"])


@app.get("/health")
def health(db: Session = Depends(get_db)) -> dict[str, str]:
    db.execute(text("SELECT 1"))
    return {"status": "ok"}
