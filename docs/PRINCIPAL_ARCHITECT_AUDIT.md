# HomeIQ — Principal Software Architect Final System Audit

**Audit Scope**: Full repository inspection across `backend/`, `infra/`, `.github/workflows/`, `docker-compose.yml`, and `docs/` covering all 18 evaluation dimensions.  
**Audit Posture**: No automatic destructive rewrites have been applied; this report documents real architectural and operational gaps found in the current implementation and awaits sign-off before executing structural refactors.

---

## 1. Executive Assessment across the 18 Dimensions

| # | Dimension | Current Grade | Summary Assessment |
| :- | :--- | :--- | :--- |
| **1** | **Architecture** | **A-** | Clean Modular Monolith boundary (`app/db`, `app/repositories`, `app/services`, `app/intelligence`, `app/events`). Avoids premature microservices while isolating domain responsibilities. |
| **2** | **Database Design** | **A-** | Normalized 20-table PostgreSQL schema with UUID PKs, minor-unit (`BigInteger`) monetary columns, explicit `CASCADE` vs `SET NULL` asset foreign keys, and deterministic naming conventions. However, `documents` lacks a dedicated `document_chunks` vector table with an HNSW index (see **AUD-01**). |
| **3** | **API Design** | **B+** | Thin FastAPI routers, RFC 7807 error envelopes, and Pydantic v2 validation. Missing `PATCH`/`DELETE` lifecycle endpoints on several secondary resources and optimistic concurrency control (`ETag` / `version_id`). |
| **4** | **AI Architecture** | **A-** | Strong separation between deterministic SQL/Python calculations and LLM reasoning; explicit `recorded_facts` vs `estimates_or_suggestions` schema contracts. |
| **5** | **RAG Grounding** | **C+** | **Significant Gap (AUD-01)**: `SharedRetrievalInterface` in `backend/app/intelligence/tool_registry.py` currently performs in-memory Python keyword matching over `documents.extracted_text` (`limit(25)`) instead of true PostgreSQL `pgvector` HNSW cosine similarity (`<=>`) + `tsvector` Reciprocal Rank Fusion. |
| **6** | **Agent Orchestration** | **B** | **Significant Gap (AUD-02)**: `HomeIQAgentOrchestrator` (`backend/app/intelligence/orchestrator.py`) executes a sequential loop over `PlannedStep` items rather than compiling a resumable `langgraph.graph.StateGraph` with a Redis/Postgres checkpointer, and `decide_human_approval` updates the DB status to `APPROVED_COMPLETED` without actually resuming and executing the suspended tool call! |
| **7** | **Event-Driven Workflows** | **B-** | **Significant Gap (AUD-03)**: `HomeIQEventBus` (`backend/app/events/bus.py`) and `app/worker.py` implement retry, DLQ, and idempotency in an in-memory Python process dictionary rather than binding live `aio_pika` AMQP durable queues/exchanges to RabbitMQ and using a transactional Outbox table. |
| **8** | **Security** | **B+** | Strong upload magic-byte verification, SSRF IP literal blocking, OWASP headers, and prompt-injection regex filters. However, authentication relies on unverified `X-HomeIQ-User-Id` headers instead of signed JWT bearer tokens + Argon2id password verification (**AUD-04**). |
| **9** | **Authorization** | **A-** | Multi-tenant `household_id` isolation in `TenantRepository` and RBAC checks on Human Approval (`OWNER`/`ADMIN` + `can_approve_agent_actions=True`). |
| **10** | **Reliability** | **B** | Synchronous `/documents/ingest` holds an open HTTP connection while awaiting Gemini multimodal extraction + retries (**AUD-05**). |
| **11** | **Idempotency** | **B** | Document pipeline deduplicates by `(household_id, sha256_checksum)` in PostgreSQL, but `HomeIQEventBus._processed_idempotency_keys` is an in-memory `set[str]` that resets on container restart (**AUD-03**). |
| **12** | **Testing** | **A-** | Meaningful async test coverage across 20 tables, cascades, constraints, API RBAC, SSRF, upload magic bytes, retries, DLQ, and 6 controlled AI evaluation cases. Note: `conftest.py` uses `sqlite+aiosqlite` in-memory, which does not exercise PostgreSQL-specific `pgvector` operators (**AUD-06**). |
| **13** | **Docker** | **A-** | Multi-stage `backend/Dockerfile` with non-root `homeiq` user, health-checked `docker-compose.yml` service dependencies, and persistent named volumes. |
| **14** | **Cloud Readiness** | **B+** | Terraform (`infra/terraform/main.tf`) provisions Cloud Run, Cloud SQL PG16, Memorystore Redis, GCS, and Secret Manager, but omits the Serverless VPC Access / Direct VPC Egress stanza required for Cloud Run to reach Private-IP Cloud SQL & Memorystore (**AUD-07**). |
| **15** | **CI/CD** | **A-** | GitHub Actions workflow (`.github/workflows/ci.yml`) runs Ruff, Pytest with `pgvector:pg16` + `redis` service containers, Docker build validation, and keyless GCP Workload Identity Federation. |
| **16** | **Observability** | **A-** | Prometheus metrics for all 12 required signals, `X-Correlation-ID` propagation, OTel collector attribute redaction, and 4 Grafana dashboards. |
| **17** | **Maintainability** | **A-** | Clean layering (`models.py` -> `repositories` -> `services` -> `routers`), strict Pydantic v2 types, zero circular imports. |
| **18** | **Performance** | **B+** | Async SQLAlchemy `asyncpg` pooling and `selectinload` dossier queries prevent N+1 queries, though `SharedRetrievalInterface` full-text scan and in-memory rate limiting need Redis/SQL pushdown at scale. |

---

## 2. Detailed Architectural Findings & Remediation Plan

### [AUD-01] CRITICAL — In-Memory Keyword Scan Instead of True `pgvector` Embedding Search
- **Severity**: **CRITICAL** (RAG Grounding, Database Design & Performance)
- **Affected Files / Components**:
  - `backend/app/db/models.py` (`Document` model)
  - `backend/app/intelligence/tool_registry.py` (`SharedRetrievalInterface.retrieve_grounded_documents`, lines 56–89)
  - `backend/migrations/versions/20260928_0001_initial_homeiq_schema.py`
- **Why It Matters**:
  Although the `vector` extension is enabled in PostgreSQL, `Document` currently stores only `extracted_text: Mapped[str | None]` without a `Vector(768)` column or a chunk table, and `SharedRetrievalInterface` pulls up to 25 documents into Python memory and scores them by substring keyword overlap. For long multi-page insurance policies or appliance manuals, full-document substring matching fails on semantic synonyms and truncates text at 320 characters (`(doc.extracted_text or "")[:320]`).
- **Recommended Fix**:
  1. Add `embedding: Mapped[list[float] | None] = mapped_column(Vector(768))` (or a child chunk array/column with an HNSW index `CREATE INDEX ix_documents_embedding_hnsw ON documents USING hnsw (embedding vector_cosine_ops)`) on `Document`.
  2. Update `SharedRetrievalInterface.retrieve_grounded_documents` to compute a 768-dim query embedding via `text-embedding-004` and execute a hybrid SQL query combining `Document.embedding.cosine_distance(query_vec)` with PostgreSQL `to_tsvector('english', extracted_text)` Reciprocal Rank Fusion (RRF).

---

### [AUD-02] CRITICAL — Human Approval Sign-Off Updates Status Without Resuming Suspended Tool Execution
- **Severity**: **CRITICAL** (Agent Orchestration & Functional Completeness)
- **Affected Files / Components**:
  - `backend/app/intelligence/orchestrator.py` (`HomeIQAgentOrchestrator.execute_workflow`)
  - `backend/app/api/v1/intelligence_router.py` (`decide_human_approval`, lines 113–153)
- **Why It Matters**:
  When a user asks to pay a utility bill, `SharedDomainAgentExecutor` halts before calling `dispatch_external_utility_bill_payment` and writes `pending_action_payload_json` to `agent_runs` with status `AWAITING_HUMAN_APPROVAL`. However, when an `OWNER` calls `POST /api/v1/intelligence/approvals/{run_id}/decide` with `{"approved": true}`, the endpoint merely updates `agent_runs.status = APPROVED_COMPLETED` in PostgreSQL without actually invoking the deferred `dispatch_external_utility_bill_payment` tool handler or recording the resulting `Expense` / `BillStatus.PAID` state transition!
- **Recommended Fix**:
  1. Wire a true LangGraph `StateGraph` checkpointer (or a deterministic `resume_approved_run(session, agent_run)` method in `HomeIQAgentOrchestrator`) that reads `agent_run.pending_action_payload_json`, verifies the approval signature, executes the suspended tool (`SHARED_TOOL_REGISTRY[tool_name].handler`), updates the target `Bill` status, and appends the completion trace span.

---

### [AUD-03] HIGH — Event Bus & Worker Operate In-Memory Without Live `aio_pika` AMQP Broker Binding or Persistent Idempotency
- **Severity**: **HIGH** (Event-Driven Architecture, Reliability & Idempotency)
- **Affected Files / Components**:
  - `backend/app/events/bus.py` (`HomeIQEventBus`, lines 77–215)
  - `backend/app/worker.py` (`run_worker`, lines 26–47)
- **Why It Matters**:
  1. `backend/app/worker.py` initializes `HomeIQEventBus()` and awaits `stop_event.wait()` without opening an `aio_pika.connect_robust(settings.RABBITMQ_URL)` connection or consuming from AMQP queues.
  2. `HomeIQEventBus._processed_idempotency_keys` is an in-memory Python `set[str]`. If the backend/worker container restarts or scales to 2 replicas on Cloud Run, duplicate events will bypass the in-memory set.
  3. Domain mutations and event publishing are not wrapped in a **Transactional Outbox**, risking lost events if RabbitMQ is unreachable right after `session.commit()`.
- **Recommended Fix**:
  1. Persist idempotency keys in Redis (`SET key 1 NX EX 86400`) and check `events` table in PostgreSQL.
  2. Add an `aio_pika` AMQP connection manager in `HomeIQEventBus` declaring durable topic exchange `homeiq.events`, dead-letter exchange `homeiq.events.dlx`, and queue bindings in `app/worker.py`, while retaining the in-memory mode as a fallback when `APP_ENV == "test"`.

---

### [AUD-04] HIGH — Header-Trust Authentication & Placeholder Password Hashing
- **Severity**: **HIGH** (Security & Authentication)
- **Affected Files / Components**:
  - `backend/app/core/auth.py` (`get_current_context`, lines 31–68)
  - `backend/app/services/household_services.py` (`register_user`, line 91)
- **Why It Matters**:
  1. `get_current_context` trusts raw client-supplied HTTP headers (`X-HomeIQ-User-Id` and `X-HomeIQ-Household-Id`) without verifying an HMAC-SHA256 / RS256 signed JWT `Authorization: Bearer <token>`. Any caller who guesses a valid user UUID can impersonate that user.
  2. `register_user` writes a placeholder string (`f"pbkdf2_sha256${payload.password[:4]}_hashed"`) instead of a real cryptographic password KDF (` Argon2id` or `bcrypt`).
- **Recommended Fix**:
  1. Implement `create_access_token` and `verify_jwt_token` using `PyJWT` / `joserfc` signed with `settings.SECRET_KEY` and password hashing via `pwdlib[argon2]` or `bcrypt`.
  2. Restrict `X-HomeIQ-User-Id` header override strictly to `settings.APP_ENV == "test"`.

---

### [AUD-05] MEDIUM — Synchronous HTTP Blocking in `/documents/ingest` & Missing Alembic DDL for Tables 7–20
- **Severity**: **MEDIUM** (Reliability & Database Migrations)
- **Affected Files / Components**:
  - `backend/app/api/v1/routers.py` (`ingest_document_with_gemini`, lines 435–457)
  - `backend/migrations/versions/20260928_0001_initial_homeiq_schema.py` (lines 147–150)
- **Why It Matters**:
  1. `POST /api/v1/documents/ingest` runs Gemini multimodal analysis and exponential backoff retries synchronously inside the HTTP request lifecycle. Under slow OCR or retries, this risks gateway timeouts.
  2. In `20260928_0001_initial_homeiq_schema.py`, `upgrade()` explicitly defines `op.create_table(...)` for tables 1–6 (`users`, `households`, `household_members`, `assets`, `appliances`, `vehicles`) and leaves a comment for tables 7–20 (relying on `Base.metadata.create_all` in tests). Running `alembic upgrade head` on a fresh PostgreSQL instance will only create 6 of the 20 tables!
- **Recommended Fix**:
  1. Complete `op.create_table(...)` for all 14 remaining tables in `20260928_0001_initial_homeiq_schema.py` so `alembic upgrade head` is 100% self-contained.
  2. Allow `/documents/ingest` to support `async_mode: bool = True` which stores the file, persists `Document(status=UPLOADED)`, publishes `DOCUMENT_UPLOADED` to RabbitMQ, and returns `202 Accepted`.

---

### [AUD-06] MEDIUM — Terraform Missing VPC Access Connector & Cloud SQL Connection Wiring
- **Severity**: **MEDIUM** (Cloud Readiness & Infrastructure as Code)
- **Affected Files / Components**:
  - `infra/terraform/main.tf` (`google_cloud_run_v2_service.backend`, lines 118–163)
- **Why It Matters**:
  `google_cloud_run_v2_service.backend` does not mount the Cloud SQL instance (`volume { name = "cloudsql" cloud_sql_instance { instances = [...] } }`) or configure Direct VPC Egress to reach the `google_redis_instance.cache` private IP, nor does it inject `DATABASE_URL` and `REDIS_URL` into the container environment.
- **Recommended Fix**:
  Add `vpc_access` (Direct VPC Egress), the Cloud SQL Unix socket volume mount, and Secret Manager references for `DATABASE_URL` and `SECRET_KEY` in `infra/terraform/main.tf`.
