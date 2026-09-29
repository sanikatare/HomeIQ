# HomeIQ — Environment Variable Audit & Configuration Specification

This document records the complete audit of environment variables across the HomeIQ repository (`backend/`, `src/`, `docker-compose.yml`, and `.env.example`).

---

## 1. Design Principles

1. **Single Gemini API Credential**: HomeIQ uses a single secret (`GEMINI_API_KEY`) for all Gemini capabilities (document extraction via `gemini-2.5-flash`, complex reasoning via `gemini-2.5-pro`, and vector embeddings via `text-embedding-004`). Separate API keys per model are never required.
2. **Model Names Are Configuration, Not Secrets**: `GEMINI_FLASH_MODEL`, `GEMINI_PRO_MODEL`, and `GEMINI_EMBEDDING_MODEL` have safe defaults in code (`backend/app/core/config.py`) and only need to be set when overriding model versions.
3. **Zero Unused Infrastructure Variables**: Variables for unconfigured external brokers or collectors (`REDIS_URL`, `RABBITMQ_URL`, `GCS_BUCKET_DOCUMENT_VAULT`, `OTEL_EXPORTER_OTLP_ENDPOINT`) have been removed so `.env.example` reflects only active runtime configuration.
4. **Sensible Localhost Defaults**: Developers can run the platform locally without manual configuration; when `GEMINI_API_KEY` is omitted, the document pipeline and evaluation runner operate in deterministic schema-constrained fallback mode.

---

## 2. Complete Environment Variable Inventory

| Variable | Classification | Used By | Secret? | Required? | Default | Purpose | Where Value Comes From |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | `SECRET` | `backend/app/core/config.py`, `src/server/apiMiddleware.ts`, `vite.config.ts` | Yes | Optional (Required for live Gemini API mode) | `""` | Single Google GenAI API key used across Gemini Flash, Pro, and Embeddings | Google AI Studio / GCP Secret Manager |
| `JWT_SECRET_KEY` | `SECRET` | `backend/app/core/config.py`, `backend/app/core/auth.py`, `src/server/apiMiddleware.ts` | Yes | Optional in dev, Required in prod | `"dev-only-jwt-secret-replace-Via-secret-manager-in-prod-32b"` | HMAC-SHA256 signing key for bearer authentication tokens | `.env` / GCP Secret Manager |
| `DATABASE_URL` | `CONFIGURATION` | `backend/app/core/config.py`, `backend/app/core/database.py`, `docker-compose.yml` | Partial (contains DB password) | Optional in dev | `"postgresql+asyncpg://homeiq:homeiq_local_dev_pw@localhost:5432/homeiq_core"` | Async SQLAlchemy connection URI for PostgreSQL 16 (`pgvector`) or SQLite | `.env` / `docker-compose.yml` |
| `POSTGRES_USER` | `DEVELOPMENT DEFAULT` | `docker-compose.yml`, `.env.example` | No | Optional | `"homeiq"` | PostgreSQL container database user | `.env` / `docker-compose.yml` |
| `POSTGRES_PASSWORD` | `SECRET` | `docker-compose.yml`, `.env.example` | Yes | Optional in dev | `"homeiq_local_dev_pw"` | PostgreSQL container password | `.env` / `docker-compose.yml` |
| `POSTGRES_DB` | `DEVELOPMENT DEFAULT` | `docker-compose.yml`, `.env.example` | No | Optional | `"homeiq_core"` | PostgreSQL database name | `.env` / `docker-compose.yml` |
| `APP_ENV` | `CONFIGURATION` | `backend/app/core/config.py` | No | Optional | `"development"` | Runtime environment (`development`, `staging`, `production`, `test`) | `.env` |
| `LOG_LEVEL` | `CONFIGURATION` | `backend/app/core/config.py`, `backend/app/core/logging.py` | No | Optional | `"INFO"` | Structured JSON logger verbosity (`DEBUG`, `INFO`, `WARNING`, `ERROR`) | `.env` |
| `ALLOWED_ORIGINS` | `CONFIGURATION` | `backend/app/core/config.py`, `backend/app/main.py` | No | Optional | `["http://localhost:3000", "http://127.0.0.1:3000"]` | Comma-separated CORS origin allowlist | `.env` |
| `DOCUMENT_STORAGE_DIR` | `CONFIGURATION` | `backend/app/core/config.py`, `backend/app/intelligence/document_pipeline.py` | No | Optional | `"/tmp/homeiq_document_vault"` | Local filesystem directory for SHA-256 content-addressed document storage | `.env` |
| `GEMINI_FLASH_MODEL` | `CONFIGURATION` | `backend/app/core/config.py`, `src/server/apiMiddleware.ts` | No | Optional | `"gemini-2.5-flash"` | Model identifier for low-latency document extraction and routing | Code default / `.env` |
| `GEMINI_PRO_MODEL` | `CONFIGURATION` | `backend/app/core/config.py` | No | Optional | `"gemini-2.5-pro"` | Model identifier for multi-domain synthesis | Code default / `.env` |
| `GEMINI_EMBEDDING_MODEL` | `CONFIGURATION` | `backend/app/core/config.py` | No | Optional | `"text-embedding-004"` | Model identifier for 768-dim document chunk embeddings | Code default / `.env` |
| `RAG_TOP_K_CHUNKS` | `CONFIGURATION` | `backend/app/core/config.py` | No | Optional | `5` | Maximum number of grounded chunks retrieved per query | Code default / `.env` |
| `RAG_MIN_SIMILARITY_SCORE` | `CONFIGURATION` | `backend/app/core/config.py` | No | Optional | `0.72` | Minimum relevance score threshold for grounded RAG retrieval | Code default / `.env` |
| `REQUIRE_HUMAN_APPROVAL_FOR_CONSEQUENTIAL_TOOLS` | `CONFIGURATION` | `backend/app/core/config.py` | No | Optional | `True` | Enforces mandatory Human-in-the-Loop sign-off for `EXTERNAL_CONSEQUENTIAL` tools | Code default / `.env` |
