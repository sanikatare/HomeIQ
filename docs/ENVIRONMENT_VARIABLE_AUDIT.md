# HomeIQ — Minimal Environment Variable Specification

HomeIQ has been streamlined so that **only 3 environment variables** are surfaced in `.env.example`. All three have safe built-in defaults for local development, meaning the application runs out-of-the-box without requiring any manual `.env` setup or API keys upfront.

---

## 1. Essential Environment Variables (`.env.example`)

| Variable | Required Locally? | Default Value | Purpose |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | **No** (Add later when ready) | `""` (Empty — runs deterministic extraction & reasoning fallback) | Single Google Gemini API key shared across document extraction (`gemini-2.5-flash`), multi-domain synthesis (`gemini-2.5-pro`), and embeddings (`text-embedding-004`). |
| `DATABASE_URL` | **No** | `postgresql+asyncpg://homeiq:homeiq_local_dev_pw@localhost:5432/homeiq_core` | Database connection URL for PostgreSQL 16 (`pgvector`) or SQLite test/local runtime. |
| `JWT_SECRET_KEY` | **No** (Override in production) | `dev-only-jwt-secret-replace-Via-secret-manager-in-prod-32b` | HMAC-SHA256 signing secret for household owner authentication tokens. |

---

## 2. Why Other Variables Were Removed from `.env.example`

- **Internal Constants Kept in Code**: Model identifiers (`gemini-2.5-flash`, `gemini-2.5-pro`, `text-embedding-004`), retrieval thresholds (`RAG_TOP_K_CHUNKS=5`, `RAG_MIN_SIMILARITY_SCORE=0.72`), CORS defaults, and local storage paths (`/tmp/homeiq_document_vault`) are non-secret constants already defined with sensible defaults in `backend/app/core/config.py`.
- **Unused Infrastructure Variables Removed**: Variables for external services not required by the local architecture (`REDIS_URL`, `RABBITMQ_URL`, `GCS_BUCKET_DOCUMENT_VAULT`, `OTEL_EXPORTER_OTLP_ENDPOINT`) have been completely eliminated.
