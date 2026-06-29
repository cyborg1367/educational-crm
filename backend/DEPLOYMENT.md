# Production Deployment Guide

This document describes how to deploy the Educational CRM FastAPI backend in production using Docker, PostgreSQL, and optional Redis for horizontal scaling.

---

## 1. Prerequisites

Before deploying, ensure the following are available on the host (or orchestration platform):

| Requirement | Notes |
|---|---|
| **Docker** (20.10+) | Builds and runs the API container image |
| **Docker Compose** (v2+) | Orchestrates API, database, and optional Redis |
| **PostgreSQL 14+** | Required whether you use the bundled Compose service or a managed instance (RDS, Cloud SQL, etc.) |
| **Python 3.14+** | Only needed if you run the app **outside** a container (bare-metal or systemd); the Docker image ships its own runtime via `uv` |

For multi-replica deployments you will also need **Redis 6+** so rate-limit counters are shared across API instances.

---

## 2. Docker Setup

### Dockerfile

The image is defined in [`Dockerfile`](Dockerfile):

- **Base:** `python:3.14-slim`
- **Package manager:** `uv` (installed from the official image)
- **Dependencies:** `uv sync --frozen --no-dev` from `pyproject.toml` and `uv.lock`
- **Application code:** `app/`, `alembic/`, and `alembic.ini`
- **Process user:** non-root `app` user
- **Entrypoint:** `uv run uvicorn app.main:app --host 0.0.0.0 --port 8000`
- **Health check:** HTTP probe against `/health`

Build the image locally:

```bash
cd backend
docker build -t educational-crm-api .
```

### Docker Compose

[`docker-compose.yml`](docker-compose.yml) defines two services:

| Service | Image | Ports | Purpose |
|---|---|---|---|
| `api` | Built from `Dockerfile` | `8000` | FastAPI application |
| `postgres` | `postgres:16-alpine` | `5432` | Primary database |

The API waits for PostgreSQL to pass its health check before starting. Persistent data is stored in the `postgres_data` volume.

For production overrides (multiple workers, `env_file`, no exposed DB port), use [`docker-compose.prod.yml`](docker-compose.prod.yml).

---

## 3. Environment Setup (Production)

All configuration is read from environment variables (see `app/core/config.py` and `app/core/security.py`). **Never commit secrets to version control.**

### Required variables

| Variable | Example | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql+psycopg2://user:pass@host:5432/crm_prod` | SQLAlchemy connection string (must use `postgresql+psycopg2://`) |
| `SECRET_KEY` | *(generated)* | JWT signing secret — must be unique per environment |
| `ENVIRONMENT` | `production` | Enables production logging level and security headers |
| `CORS_ORIGINS` | `https://app.example.com` | Comma-separated allowed browser origins (required in production) |

Generate a strong `SECRET_KEY`:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Optional variables

| Variable | Default | Description |
|---|---|---|
| `RATE_LIMIT_STORAGE_URI` | `memory://` | Use `redis://host:6379/0` when running multiple API replicas |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` | JWT lifetime |
| `PRE_ENROLL_FOLLOWUP_DAYS` | `3` | Workflow timer for unpaid pre-enrollments |
| `DORMANT_DAYS` | `365` | Inactivity threshold before dormant follow-up |

### Supplying configuration in Docker

**Option A — `.env.production` file** (referenced by `docker-compose.prod.yml`):

```env
DATABASE_URL=postgresql+psycopg2://crm:STRONG_PASSWORD@postgres:5432/crm_prod
SECRET_KEY=<output-from-secrets-command>
ENVIRONMENT=production
CORS_ORIGINS=https://app.example.com
RATE_LIMIT_STORAGE_URI=redis://redis:6379/0
```

**Option B — orchestrator secrets:** inject the same keys via Kubernetes Secrets, AWS ECS task definitions, or your platform's secret manager. Prefer this over checked-in files in real production.

**Option C — Compose interpolation:** export variables in the shell before `docker compose up`; Compose substitutes `${SECRET_KEY}` in `docker-compose.yml`.

---

## 4. Database Setup

### Run migrations

Apply the schema before serving traffic:

```bash
docker compose run --rm api uv run alembic upgrade head
```

Alembic reads `DATABASE_URL` from the API container environment. Review generated revisions under `alembic/versions/` before applying in production.

### Initial organization and admin user

The `auth_user_organization` migration seeds a default organization (**Educational Institute**) and an admin account (`admin@example.com`). **Change this password immediately** after first login, or create additional staff via `POST /users` (admin role required).

For a greenfield deployment without the seed data, insert an organization and admin user manually in PostgreSQL, or use the authenticated Users API once a bootstrap admin exists.

### Backups

Automate logical backups (`pg_dump`) or use your cloud provider's snapshot schedule. Test restore procedures regularly.

---

## 5. Running

### Development (local Compose)

```bash
cd backend
docker compose up --build
```

API: http://localhost:8000  
OpenAPI docs: http://localhost:8000/docs

### Production (detached, with overrides)

```bash
cd backend
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

The production override runs **four Uvicorn workers**, loads `.env.production`, and does not publish PostgreSQL to the host. Place a TLS-terminating reverse proxy (nginx, Caddy, Traefik, or a cloud load balancer) in front of port 8000.

### Bare-metal (no Docker)

```bash
cd backend
uv sync --frozen
export DATABASE_URL=... SECRET_KEY=... ENVIRONMENT=production
uv run alembic upgrade head
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## 6. Health Check

### HTTP endpoint

```http
GET /health
```

Returns `200` with body `{"status": "ok"}` when the API process is up **and** PostgreSQL accepts a query (`SELECT 1`). No authentication required. Use this for load-balancer and orchestrator probes.

```bash
curl -f http://localhost:8000/health
```

### Docker HEALTHCHECK

The [`Dockerfile`](Dockerfile) includes a built-in health check that curls `/health` every 30 seconds. Compose and Kubernetes can reuse the same probe path.

---

## 7. Logs

The application writes **structured JSON** log lines to **stdout** via `app/core/logging_config.py`. Each entry includes `timestamp`, `level`, `message`, and request context (`request_id`, `user_id`, `org_id` when available).

In production (`ENVIRONMENT=production`), the root log level is `WARNING`; development uses `INFO`.

Collect stdout/stderr from the container and ship to your log platform:

- **ELK** (Elasticsearch + Logstash/Filebeat + Kibana)
- **Datadog** (Docker log collection agent)
- **AWS CloudWatch Logs** (via `awslogs` driver or Fluent Bit)
- **Grafana Loki** (Promtail sidecar)

Correlate API logs with reverse-proxy access logs using the `request_id` field set by `LoggingMiddleware`.

---

## 8. Security Checklist

Before going live, verify:

- ✅ **HTTPS only** — terminate TLS at a reverse proxy; never expose plain HTTP to the public internet
- ✅ **SECRET_KEY** — long, random, stored in a secret manager (not in source code or committed `.env` files)
- ✅ **CORS_ORIGINS** — restricted to your production frontend domain(s); wildcards are not used in production mode
- ✅ **Rate limiting enabled** — default `100/minute` per IP; sensitive finance routes `10/minute`; login `5/minute` per IP+email (`app/core/rate_limit.py`). Point `RATE_LIMIT_STORAGE_URI` to Redis when scaling beyond one replica
- ✅ **Database backups** — automated and tested restores
- ✅ **Secrets in environment** — inject via orchestrator or secret manager; avoid baking credentials into images
- ✅ **Seed admin** — rotate or disable the migration-seeded admin credentials
- ✅ **PostgreSQL** — strong password, private network only, least-privilege DB user

---

## 9. Scaling

### Multiple API replicas

1. Run **Redis** and set `RATE_LIMIT_STORAGE_URI=redis://redis:6379/0` on every API instance so SlowAPI shares counters.
2. Scale the `api` service: `docker compose up -d --scale api=3` (with a load balancer in front), or replicate pods in Kubernetes.
3. **APScheduler** runs inside each API process. For a single cron owner, run one "scheduler" replica or migrate jobs to an external worker later; until then, jobs are idempotent but may duplicate work across replicas.

### Load balancer

Place **nginx**, **HAProxy**, or a cloud load balancer in front of the API tier. Configure:

- TLS termination
- `GET /health` as the backend health probe
- `X-Forwarded-For` / `X-Real-IP` so rate limits see client IPs (ensure trusted proxy configuration)

### Database

For read-heavy growth, consider PostgreSQL read replicas or a managed service (**AWS RDS**, **Google Cloud SQL**, **Azure Database for PostgreSQL**) with automated failover and backups.

---

## 10. Monitoring

| Signal | How |
|---|---|
| **Availability** | Poll `GET /health` every 30–60 s from your uptime monitor (Pingdom, UptimeRobot, Datadog Synthetics) |
| **Error rate** | Alert on HTTP 5xx ratio from proxy logs or APM (Sentry, Datadog APM, OpenTelemetry) |
| **Latency** | p95/p99 from reverse-proxy or APM traces |
| **Database** | Connection pool saturation, slow queries, disk usage |
| **Scheduled jobs** | APScheduler jobs in `app/workflow/jobs.py` log via `get_logger`; watch for ERROR lines around 07:00–10:00 UTC (cron triggers in `app/scheduler.py`) |
| **Rate limits** | Monitor HTTP 429 responses on `/auth/login` and payment endpoints |

Recommended alerts: health check failures, migration drift, backup failures, elevated 5xx or 429 rates, and PostgreSQL connection errors.

---

## Quick reference

```bash
# Build and start (development)
docker compose up --build

# Migrate
docker compose run --rm api uv run alembic upgrade head

# Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Health
curl -f http://localhost:8000/health
```

For API usage and endpoint documentation, see [README.md](README.md).
