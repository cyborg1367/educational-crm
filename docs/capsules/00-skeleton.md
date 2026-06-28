# Capsule 00 — Skeleton

```yaml
microSkill:
  id: "core.skeleton"
  domain: "backend/app/, backend/alembic/"
  depends_on: []
  signature: |
    app/main.py            -> FastAPI app + GET /health
    app/core/config.py     -> Settings (pydantic-settings, reads .env)
    app/core/db.py         -> engine, SessionLocal, Base (DeclarativeBase), get_db dependency
    alembic/               -> initialized, env.py target_metadata = Base.metadata
  constraints:
    - "FastAPI + SQLAlchemy 2.x (DeclarativeBase, Mapped) + Pydantic v2 settings + Alembic"
    - "NO models yet — only the plumbing"
    - "DATABASE_URL and SECRET_KEY come from .env via Settings; nothing hardcoded"
    - "get_db yields a session and always closes it"
    - "Base lives in app/core/db.py and is what Alembic env.py imports for autogenerate"
  boilerplate: |
    # app/core/db.py
    from sqlalchemy import create_engine
    from sqlalchemy.orm import DeclarativeBase, sessionmaker
    from app.core.config import settings

    class Base(DeclarativeBase): ...
    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def get_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
```

**Goal of this capsule:** the app boots, `/health` returns ok against Postgres, and `alembic revision --autogenerate` runs. No business entities.
