# HomeIQ — Environment & Configuration Strategy (`docs/ENVIRONMENT.md`)

## 1. Design Principles

1. **Minimal Required Surface**: HomeIQ requires only **two true secrets** (`GEMINI_API_KEY` for live Gemini API calls and `SECRET_KEY` for JWT signing in staging/production), plus infrastructure connection credentials in staging/production. Everything else has safe, deterministic defaults in `backend/app/core/config.py`.
2. **Automatic Connection String Derivation**: Instead of forcing operators to maintain duplicate `POSTGRES_*`, `DATABASE_URL`, `ALEMBIC_DATABASE_URL`, `RABBITMQ_DEFAULT_*`, and `RABBITMQ_URL` values manually, `Settings` (`backend/app/core/config.py`) automatically derives `DATABASE_URL`, `ALEMBIC_DATABASE_URL`, and `RABBITMQ_URL` from the underlying host/port/user/password settings whenever explicit override URLs are not set.
3. **Fail-Fast Production Validation**: If `APP_ENV` is `staging` or `production` and `SECRET_KEY` is still set to the local development placeholder, the service refuses to boot at startup.
4. **Zero-Secret Repository**: `.env.example` documents every active variable with safe local defaults or empty secret placeholders. Real `.env` files and credentials are strictly git-ignored.

---

## 2. Secret Source Architecture Across Environments

| Environment | Compute Runtime | Where Secrets Live | How Secrets Are Injected |
| :--- | :--- | :--- | :--- |
| **Local Development (`development`)** | Docker Compose / Local CLI | Developer's git-ignored `.env` file | Loaded automatically by Pydantic `SettingsConfigDict(env_file=".env")` and `docker-compose.yml` variable interpolation |
| **Automated Tests / CI (`test`)** | GitHub Actions Runner (`ubuntu-latest`) | `.github/workflows/ci.yml` ephemeral env (`APP_ENV=test`, ephemeral `SECRET_KEY`) | Deterministic test mode uses SQLite/in-memory adapters and `DeterministicEvaluationGeminiAnalyzer` (zero live external secrets needed for PR CI) |
| **Staging & Production (`staging` / `production`)** | Google Cloud Run (`homeiq-backend`, `homeiq-worker`) | **Google Cloud Secret Manager** (`homeiq-prod-db-url`, `homeiq-prod-gemini-api-key`, `homeiq-prod-jwt-secret`) | Mounted directly into Cloud Run containers via `secret_key_ref` in `infra/terraform/main.tf` and authenticated via **Workload Identity Federation** in `.github/workflows/cd.yml` (zero static JSON service account keys) |

---

## 3. Complete Active Environment Variable Reference

### 3.1 Application Runtime & Security (`backend/app/core/config.py`)

| Variable | Classification | Default | Required Where | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `APP_ENV` | `OPTIONAL_WITH_DEFAULT` | `development` | All environments | Runtime tier (`development`, `test`, `staging`, `production`) |
| `DEBUG` | `LOCAL_DEV_ONLY` | `false` | Optional local | Enables SQL echo and verbose debug diagnostics |
| `LOG_LEVEL` | `OPTIONAL_WITH_DEFAULT` | `INFO` | All environments | Structlog filtering threshold (`DEBUG`, `INFO`, `WARNING`, `ERROR`) |
| `SEED_DEV_DATA` | `LOCAL_DEV_ONLY` | `false` | Local dev only | Seeds development household fixtures on `python -m app.db.init_db` (hard-blocked in `staging`/`production`) |
| `SECRET_KEY` | `REQUIRED_SECRET` | `dev-only-secret-key-...` | Required in `staging`/`production` | 256-bit HMAC-SHA256 signing key for JWT access/refresh tokens |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `OPTIONAL_WITH_DEFAULT` | `60` | Optional override | Access token lifetime in minutes |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `OPTIONAL_WITH_DEFAULT` | `30` | Optional override | Refresh token lifetime in days |
| `CORS_ALLOWED_ORIGINS` | `OPTIONAL_WITH_DEFAULT` | `http://localhost:3000,http://127.0.0.1:3000` | Override in prod | Comma-separated list of allowed browser origins |

### 3.2 PostgreSQL 16 + `pgvector` (`backend/app/core/config.py`, `docker-compose.yml`, `backend/migrations/env.py`)

| Variable | Classification | Default | Required Where | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `POSTGRES_HOST` | `OPTIONAL_WITH_DEFAULT` | `localhost` (`postgres` in Docker) | Local / Docker | PostgreSQL hostname |
| `POSTGRES_PORT` | `OPTIONAL_WITH_DEFAULT` | `5432` | Local / Docker | PostgreSQL port |
| `POSTGRES_USER` | `OPTIONAL_WITH_DEFAULT` | `homeiq` | Local / Docker | PostgreSQL user |
| `POSTGRES_PASSWORD` | `REQUIRED_SECRET` (prod) | `homeiq_local_dev_password` | Local / Docker / Prod | PostgreSQL password |
| `POSTGRES_DB` | `OPTIONAL_WITH_DEFAULT` | `homeiq_core` | Local / Docker | PostgreSQL database name |
| `DATABASE_URL` | `OPTIONAL_WITH_DEFAULT` (auto-derived) | Derived from `POSTGRES_*` | Cloud Run Secret Manager | Full async SQLAlchemy URL (`postgresql+asyncpg://...`) |
| `ALEMBIC_DATABASE_URL` | `OPTIONAL_WITH_DEFAULT` (auto-derived) | Derived from `DATABASE_URL` | Optional override | Synchronous Psycopg 3 URL (`postgresql+psycopg://...`) for Alembic |

### 3.3 Redis 7 & RabbitMQ 3.13 (`backend/app/core/config.py`, `docker-compose.yml`)

| Variable | Classification | Default | Required Where | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `REDIS_URL` | `OPTIONAL_WITH_DEFAULT` | `redis://localhost:6379/0` | Override in Docker/Prod | Redis connection URL |
| `RABBITMQ_DEFAULT_USER` | `OPTIONAL_WITH_DEFAULT` | `homeiq` | Local / Docker | RabbitMQ broker username |
| `RABBITMQ_DEFAULT_PASS` | `REQUIRED_SECRET` (prod) | `homeiq_mq_password` | Local / Docker / Prod | RabbitMQ broker password |
| `RABBITMQ_URL` | `OPTIONAL_WITH_DEFAULT` (auto-derived) | Derived from `RABBITMQ_DEFAULT_*` | Override in Docker/Prod | AMQP connection string |

### 3.4 Object Storage & Upload Security (`backend/app/core/config.py`, `backend/app/intelligence/document_pipeline.py`)

| Variable | Classification | Default | Required Where | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `GCS_BUCKET_DOCUMENTS` | `OPTIONAL_WITH_DEFAULT` | `homeiq-household-documents-local` | Override in Prod | Target bucket / namespace for household document blobs |
| `LOCAL_STORAGE_ROOT` | `OPTIONAL_WITH_DEFAULT` | `/tmp/homeiq-storage` | Local / Test | Local filesystem path for document blob persistence |
| `MAX_UPLOAD_BYTES` | `OPTIONAL_WITH_DEFAULT` | `15728640` (15 MB) | Optional override | Hard ceiling on uploaded document byte size |

### 3.5 Google Gemini API (`backend/app/core/config.py`, `backend/app/intelligence/document_pipeline.py`)

| Variable | Classification | Default | Required Where | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | `REQUIRED_SECRET` | `""` | Required for live Gemini OCR/embeddings | Google GenAI SDK (`google-genai`) server-side API key |
| `GEMINI_PRO_MODEL` | `OPTIONAL_WITH_DEFAULT` | `gemini-2.5-pro` | Optional override | Complex multi-domain reasoning model |
| `GEMINI_FLASH_MODEL` | `OPTIONAL_WITH_DEFAULT` | `gemini-2.5-flash` | Optional override | Schema-constrained multimodal extraction & routing model |
| `GEMINI_EMBEDDING_MODEL` | `OPTIONAL_WITH_DEFAULT` | `text-embedding-004` | Optional override | 768-D embedding model for `pgvector` |
| `GEMINI_EMBEDDING_DIMENSIONS` | `OPTIONAL_WITH_DEFAULT` | `768` | Optional override | Vector dimensionality matching `Vector(768)` column |
| `GEMINI_TIMEOUT_SECONDS` | `OPTIONAL_WITH_DEFAULT` | `25.0` | Optional override | Per-call timeout before retry/failure classification |
| `GEMINI_MAX_RETRIES` | `OPTIONAL_WITH_DEFAULT` | `2` | Optional override | Retry attempts for transient timeouts/503s |

### 3.6 OpenTelemetry & Observability (`backend/app/core/config.py`, `backend/app/core/observability.py`)

| Variable | Classification | Default | Required Where | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `OTEL_SERVICE_NAME` | `OPTIONAL_WITH_DEFAULT` | `homeiq-backend` | Optional override | OpenTelemetry resource `service.name` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `OPTIONAL_WITH_DEFAULT` | `http://localhost:4317` | Override in Docker/Prod | OTLP collector endpoint |

---

## 4. Redundant / Dead Variables Removed During Cleanup

The following 22 previously listed `.env.example` variables were audited and removed because they were either unreferenced anywhere in the codebase, hardcoded constants, or redundant duplicates:
- **Hardcoded / Unnecessary Constants**: `APP_NAME`, `APP_VERSION`, `API_V1_PREFIX`, `BACKEND_HOST`, `JWT_ALGORITHM`
- **Duplicate Database Pool Knobs**: `DB_POOL_SIZE`, `DB_MAX_OVERFLOW`, `DB_ECHO`
- **Duplicate Redis / RabbitMQ Knobs**: `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB`, `RABBITMQ_HOST`, `RABBITMQ_PORT`, `RABBITMQ_MANAGEMENT_PORT`, `RABBITMQ_EXCHANGE_EVENTS`, `RABBITMQ_QUEUE_DLQ`
- **Unused GCP Static Key / Emulator Vars**: `GCP_PROJECT_ID`, `GCP_REGION`, `GOOGLE_APPLICATION_CREDENTIALS`, `STORAGE_EMULATOR_HOST` (Cloud Run uses keyless Workload Identity Federation; local storage uses `LOCAL_STORAGE_ROOT`)
- **Unused Frontend / Grafana Env Vars**: `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_APP_ENV`, `OTEL_TRACES_SAMPLER`, `PROMETHEUS_MULTIPROC_DIR`, `GRAFANA_ADMIN_USER`, `GRAFANA_ADMIN_PASSWORD`
