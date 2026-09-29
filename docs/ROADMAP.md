# HomeIQ — Phased Implementation Roadmap

This roadmap sequences the implementation of HomeIQ so that each phase produces a testable, working vertical slice while adhering to our foundational rule: **deterministic relational core first, grounded retrieval second, policy-governed agent orchestration third**.

---

## Phase 0: Architecture, Repository Foundation & Dev Topology (Completed)
- **Objective**: Establish the modular monolith directory structure, architectural specifications, Docker Compose multi-service stack, Terraform IaC baseline, and CI workflow.
- **Deliverables**:
  - `docs/ARCHITECTURE.md`, `docs/CONVENTIONS.md`, `docs/ENVIRONMENT.md`, `docs/ROADMAP.md`
  - `docker-compose.yml` orchestrating PostgreSQL 16 (`pgvector`), Redis 7, RabbitMQ 3.13, FastAPI Backend, Worker, Next.js Frontend, OpenTelemetry Collector, Prometheus, and Grafana.
  - `backend/` FastAPI modular skeleton with all 7 domain packages and the 6-layer intelligence package contracts.
  - Interactive Architecture & System Workbench UI for inspecting contracts and simulating policy gates.

---

## Phase 1: Multi-Tenant Core, Authentication & Database Foundation (Next Step)
- **Objective**: Implement core household tenancy, RBAC, database migrations, and health verification.
- **Deliverables**:
  1. SQLAlchemy 2.0 base models (`Base`, `TenantMixin`, `TimestampMixin`) and initial Alembic migration enabling `CREATE EXTENSION IF NOT EXISTS vector;`.
  2. Household & Member authentication module (`users`, `households`, `household_memberships` with roles: `OWNER`, `ADULT_MEMBER`, `JUNIOR_MEMBER`, `GUEST`).
  3. Redis-backed JWT session validation and rate-limiting middleware.
  4. Integration test harness with `pytest-asyncio` verifying tenant isolation across households.

---

## Phase 2: Deterministic Domain Modules (Domains 1 to 7)
- **Objective**: Build the relational schemas, deterministic calculation services, and REST endpoints for all seven domains before wiring LLM autonomy.
- **Sequence**:
  - **2A — Financial & Document Core**:
    - `finance_expenses`: Bills & utilities, household expenses, expenditure, budget management, payments & payment history, due dates, recurring bills, expense tracking, spending summaries, and financial reminders.
    - `documents_warranty`: GCS signed URL upload flow, warranty expiration trackers, insurance policy registry.
  - **2B — Physical Operations & Asset Core (Domains 1, 2, 3, 6)**:
    - `kitchen_grocery`: Pantry batch tracking, FIFO stock deduction, unit normalization, recipe ingredient diffing.
    - `home_maintenance`: Home appliance asset registry, preventive service calculators, work orders.
    - `vehicle_mobility`: Fleet odometer logs, fuel efficiency calculators, compliance renewal trackers.
    - `laundry_clothing`: Garment care constraints, load compatibility solver.

---

## Phase 3: Async Ingestion Pipeline & Hybrid `pgvector` RAG
- **Objective**: Connect RabbitMQ workers, OCR extraction, and grounded semantic search over household documents and records.
- **Deliverables**:
  1. RabbitMQ consumer (`document.uploaded`) that extracts text/tables from PDFs/receipts using Gemini multimodal structured extraction.
  2. Semantic chunker + `text-embedding-004` pipeline writing 768-dim vectors to `document_chunks`.
  3. Hybrid Retriever (`rag.py`) combining SQL metadata filters + `pgvector` HNSW cosine similarity + Full-Text Search with Reciprocal Rank Fusion (RRF) and mandatory `SourceCitation` links.

---

## Phase 4: LangGraph Orchestration, Policy Layer & Human Approval Gate
- **Objective**: Activate the 6-layer AI Intelligence Plane above the deterministic domain tools.
- **Deliverables**:
  1. Register typed domain tools (`@household_tool`) with explicit `ActionRiskLevel` tags.
  2. Implement LangGraph `StateGraph` (`orchestrator.py`, `router.py`, `planner.py`, `policy.py`, `approval.py`).
  3. Implement `INTERRUPT_BEFORE_ACTION` checkpointing for `EXTERNAL_CONSEQUENTIAL` actions and the Next.js Approval Queue UI.
  4. Post-execution grounding verifier ensuring numerical faithfulness.

---

## Phase 5: Full Observability, Evaluation Benchmark & GCP Terraform Deployment
- **Objective**: Production hardening, academic evaluation benchmarks, and cloud provisioning.
- **Deliverables**:
  1. Grafana dashboards for LLM token cost, RAG latency, and domain tool execution metrics.
  2. Golden evaluation benchmark (`tests/evals/`) measuring routing accuracy, citation precision, and zero-hallucination compliance for the B.Tech thesis report.
  3. Terraform deployment to Google Cloud Run, Cloud SQL (`pgvector`), Memorystore, and GCS.
