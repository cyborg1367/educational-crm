# Educational Institute CRM

A learner-relationship system (FastAPI · PostgreSQL · Next.js) built slice-by-slice
with the MicroSkill method. **Read `START_HERE.md` first.**

- `docs/spec.md` — the single source of truth.
- `docs/capsules/` — bounded build slices.
- `.cursor/rules/` — how the AI agent must work.

## Quick start (backend)

Requires [uv](https://docs.astral.sh/uv/), Docker, and PostgreSQL (via `docker compose up -d`).

```bash
cd backend
uv venv && source .venv/bin/activate
uv sync
cp .env.example .env   # edit SECRET_KEY
docker compose run --rm api uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```
