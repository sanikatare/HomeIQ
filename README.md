# HomeIQ — AI Household Intelligence & Management Platform

**HomeIQ** is a modular monolith platform that unifies household operations across seven core domains under a deterministic relational core (20 normalized tables) and a policy-governed multi-agent intelligence plane.

HomeIQ enforces strict architectural separation between **deterministic transactional state** (SQLAlchemy 2.0 / PostgreSQL 16 + deterministic SQL aggregations) and **policy-governed agentic reasoning** (schema-constrained Gemini document extraction, grounded retrieval with verifiable citations, and mandatory Human-in-the-Loop approval gates).

---

## 1. Architectural Invariants

1. **Relational Database is the Single Source of Truth**: Every household record, ledger entry, maintenance schedule, inventory quantity, warranty, and audit event is persisted across 20 normalized tables with strict `household_id` tenant isolation.
2. **LLMs Never Invent Database Facts**: Language models are prohibited from estimating balances, fabricating inventory counts, or hallucinating warranty dates. Every `RecordedHouseholdFact` must cite an authorized `source_table` and primary-key `record_id`, while advisory items are explicitly separated with `is_estimate_or_suggestion=True`.
3. **Deterministic Computation Boundary**: Asset Total Cost of Ownership (TCO), monthly budget rollups, low-stock threshold checks, and expiry countdowns execute deterministically in SQL/Python—never delegated to token prediction.
4. **Explicit Tool & Permission Sandboxing**: Tools are classified into three risk tiers (`READ_ONLY`, `INTERNAL_MUTATION`, `EXTERNAL_CONSEQUENTIAL`) and validated against each agent's permitted table scope by `PolicyValidationLayer`.
5. **Human Approval Gate for Consequential Actions**: Any `EXTERNAL_CONSEQUENTIAL` tool call (such as `dispatch_external_utility_bill_payment`) suspends execution in `AWAITING_HUMAN_APPROVAL` and requires explicit `OWNER` or `ADMIN` sign-off before mutating financial state.

---

## 2. System Stack

| Layer | Technology | Role in HomeIQ |
| :--- | :--- | :--- |
| **Frontend Console** | React 19 + TypeScript + Tailwind CSS + Vite | Interactive 5-module web workspace connected to live `/api/v1/*` endpoints |
| **Backend API** | Python 3.12 + FastAPI + Pydantic v2 | Async REST API, domain services, HMAC-SHA256 auth, and policy enforcement |
| **Database & Migrations** | PostgreSQL 16 (`pgvector`) / SQLite + SQLAlchemy 2.0 + Alembic | 20 normalized household tables with explicit Alembic DDL migrations |
| **Document Intelligence** | Google `google-genai` SDK (`gemini-2.5-flash`) + Deterministic Fallback | Schema-constrained extraction, confidence floor (`>= 0.70`), and SHA-256 idempotency |
| **Event Bus & Worker** | `HomeIQEventBus` + Transactional `events` Table + DLQ | In-process async event bus with idempotency ledger, exponential backoff retries, and Dead-Letter Queue |
| **Evaluation Harness** | `evaluation/run.py` + `datasets/evaluation/` | Reproducible 10-document benchmark, 6 RAG citation tests, 7 agent checks, and 4 E2E scenarios |

---

## 3. Quickstart & Verification Commands

### Run the Interactive Web Application (Port 3000)
```bash
cp .env.example .env
npm install
npm run dev
```
- **Application UI**: `http://localhost:3000`
- **Health & Dependency Status**: `http://localhost:3000/health/dependencies`

### Run the Reproducible Evaluation Pipeline & Test Suites
```bash
# 1. Run the 10-document evaluation harness (generates evaluation/results/latest.json & latest.md)
python3 -m evaluation.run

# 2. Run the stdlib verification & architecture test suite
python3 -m unittest discover -s evaluation -v

# 3. Build & typecheck the frontend and API middleware
npm run lint
npm run build
```

### Run Full Docker Compose Stack (PostgreSQL + FastAPI + Worker + Frontend)
```bash
docker compose up --build -d
docker compose exec backend alembic upgrade head
```

---

## 4. Key Documentation

- `docs/FINAL_IMPLEMENTATION_STATUS.md` — Subsystem implementation matrix and verification notes
- `docs/ENVIRONMENT_VARIABLE_AUDIT.md` — Complete audit of all environment variables and defaults
- `docs/PRINCIPAL_ARCHITECT_AUDIT.md` — Reliability, database, event bus, and AI safety architecture audit
- `docs/DATASET_AND_DOCUMENT_INTELLIGENCE_SPEC.md` — Evaluation dataset schemas and metrics specification
