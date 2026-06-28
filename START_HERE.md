# START HERE — building the CRM with Cursor (MicroSkill method)

You build the **rails** (Phase 0). Cursor fills the **body**, one capsule at a time.
Golden rule: *one capsule per prompt → read the whole diff → run → test → commit.*

---

## What's in this kit
```
docs/spec.md                  # the source of truth (data model + workflows)
docs/capsules/00..14.md       # one bounded "skill capsule" per build slice
.cursor/rules/
  00-operating-manual.mdc      # always-on: how the agent must work
  10-finance.mdc               # auto-attaches when touching money files
docker-compose.yml             # Postgres
backend/.env.example           # config template
backend/pyproject.toml         # python deps (uv)
backend/uv.lock                  # locked dependency versions
backend/app/{core,models,schemas,services,routers}/   # empty layered skeleton
```

---

## Phase 0 — set up the rails (you, ~30 min, no AI codegen yet)

1. **Make the repo**
   ```bash
   git init
   git add . && git commit -m "chore: project skeleton + spec + capsules"
   ```
2. **Start Postgres**
   ```bash
   docker compose up -d
   ```
3. **Python env + deps** ([uv](https://docs.astral.sh/uv/))
   ```bash
   cd backend
   uv venv && source .venv/bin/activate   # WSL/Ubuntu
   uv sync
   cp .env.example .env        # then edit SECRET_KEY
   ```
4. **Open the folder in Cursor.** Confirm Cursor sees the rules:
   - Settings → Rules: `00-operating-manual` shows as *Always*.
   - Work in **normal/agent-with-review** mode, not the "apply to everything" auto mode.
     You want to approve diffs file by file.

---

## Phase 1 — the build loop

Run capsules **in order** (00 → 14). For each one, paste this prompt, swapping the file:

> Implement capsule **`<id>`** from `/docs/capsules/<file>.md`, following `/docs/spec.md`
> and the operating manual. Stay strictly inside the capsule's `domain`. Touch no other
> entity. Generate the Alembic migration for any schema change. Show me the full diff.

Then, every single time:
1. **Read the whole diff.** If you don't understand a line, ask Cursor to explain or simplify — don't accept it.
2. **Run the migration:** `uv run alembic revision --autogenerate -m "<thing>"` then `uv run alembic upgrade head`.
3. **Test the endpoints** (Swagger at `/docs`, or `uv run pytest` / a quick `httpx` check). Run the app with `uv run uvicorn app.main:app --reload`.
4. **Commit:** `git commit -am "feat(<id>): ..."`. Small commit = cheap undo.

If a capsule says a constraint can't be met, Cursor must **stop and tell you**, not work around it. That's by design.

---

## The order (and why)

| # | Capsule | Why here |
|---|---------|----------|
| 00 | skeleton | app boots, DB connects, Alembic works |
| 01 | auth | you need login + roles before protected routes |
| 02 | person | the spine everything attaches to |
| 03 | department | |
| 04 | journey | needs person + department |
| 05 | course | |
| 06 | roadmap | needs course; then wires Journey.roadmap_id |
| 07 | class | the teachable offering (model name `CourseClass`) |
| 08 | consultation | plain CRUD only |
| 09 | enrollment | snapshots money |
| 10 | communication | contact log |
| 11 | **finance** | ⚠ the money — go slow, add tests |
| 12 | attendance | + computed roadmap progress |
| 13 | task + activity | the timeline helper everything else calls |
| 14 | **workflow** | glue: routing, jobs, lifecycle — the system comes alive |

> Capsules 00–10 are mostly boilerplate — skim them. Capsules **11 and 14** are where the real
> logic and the real bugs live — read those diffs closely and write a few tests.

---

## Three disciplines that keep this safe
- **Tiny commits, feature branches.** An AI mistake on a branch is a `git checkout` away from gone.
- **The spec wins.** If output contradicts `spec.md`, either the spec is right or you change it *on purpose* — no silent drift. Update `spec.md` first, then code.
- **Tests where it matters.** A handful for finance (capsule 11) and workflow (capsule 14). They let you refactor later without re-reading everything.

---

## When you finish the backend
Frontend comes last (spec §6): start with the **Action Center** (each user's open tasks) and the
**Command Center** (the person profile: timeline + journeys + tasks). Both are just queries over the
model you already built — no new tables.

You've got a clean path. Go capsule by capsule, and ping me with any diff you're unsure about — I'll review it with you.
