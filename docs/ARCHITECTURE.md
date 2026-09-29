# HomeIQ — System Architecture Specification

## 1. Executive Summary & Architectural Style

HomeIQ employs a **Modular Monolith with an Event-Driven Worker Plane and a Policy-Governed Agentic Control Layer**.

Rather than decomposing the seven household domains into seven network-isolated microservices—which introduces distributed transaction complexity (2PC/Sagas), operational overhead, and network serialization latency—HomeIQ isolates each domain as an independent Python package (`backend/app/domains/<domain>`) sharing a single PostgreSQL 16 cluster with strict schema/table ownership.

Asynchronous, compute-heavy workflows (document OCR, chunking, `pgvector` embedding generation, and scheduled recurrence evaluation) are offloaded via **RabbitMQ** to background worker processes built from the exact same container image.

---

## 2. Layered System Topology

```text
+-----------------------------------------------------------------------------------+
|                        PRESENTATION LAYER (Next.js + TS)                          |
|  Domain Dashboards  |  Unified Command Bar  |  HITL Approval Queue  |  RAG Citations |
+-----------------------------------------+-----------------------------------------+
                                          | HTTPS / REST + Server-Sent Events (SSE)
                                          v
+-----------------------------------------------------------------------------------+
|                      API GATEWAY & AUTHENTICATION (FastAPI)                       |
|  JWT Multi-Tenant Household Context  |  Redis Rate Limiter  |  OTel Trace Context |
+-----------------------------------------+-----------------------------------------+
                                          |
        +---------------------------------+---------------------------------+
        | Direct Deterministic CRUD                                         | Natural Language / Complex Workflows
        v                                                                   v
+-------------------------------+   +-----------------------------------------------+
|  DETERMINISTIC DOMAIN LAYER   |   |        AGENTIC INTELLIGENCE PLANE             |
|                               |   |                                               |
| 1. Kitchen & Grocery          |   |  [1. AI Orchestrator (LangGraph StateGraph)]  |
| 2. Laundry & Clothing         |   |                      |                        |
| 3. Home Maintenance           |   |  [2. Agent Router] ->+-> [3. Planning Agent]  |
| 4. Finance & Household Exp.   |   |                      |                        |
| 5. Vehicle & Mobility         |   |  [4. Hybrid RAG Layer (SQL + pgvector HNSW)]  |
| 6. Documents & Warranty       |   |                      |                        |
|                               |   |  [5. Policy & Validation Engine (Pydantic)]   |
|                               |<--|                      |                        |
| (Typed Domain Service APIs)   |   |  [6. Human Approval Gate (Interrupt/Resume)]  |
+---------------+---------------+   +-----------------------+-----------------------+
                |                                           |
                +---------------------+---------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------------+
|                    DATA & INFRASTRUCTURE PERSISTENCE LAYER                        |
|                                                                                   |
|  +-------------------------+  +---------------+  +------------+  +-------------+  |
|  | PostgreSQL 16 + pgvector|  |    Redis 7    |  | RabbitMQ   |  | Google Cloud|  |
|  | (Relational + 768d Vec) |  | (Cache/State) |  | (AMQP Bus) |  | Storage     |  |
|  +-------------------------+  +---------------+  +------------+  +-------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 3. The Six-Layer Agentic Intelligence Plane

Above the seven household domains sits the `backend/app/intelligence/` package, orchestrated via **LangGraph** and powered by the **Gemini API**:

### 3.1 AI Orchestrator (`orchestrator.py`)
- Manages the overarching `HouseholdAgentState` TypedDict across turns.
- Persists graph execution checkpoints to Redis (hot state) and PostgreSQL (audit log).
- Emits OpenTelemetry spans for every node transition, recording prompt tokens, completion tokens, latency, and tool invocations.

### 3.2 Agent Router (`router.py`)
- Uses `gemini-2.5-flash` with structured JSON output (`response_schema`) to classify user intent into:
  - `SINGLE_DOMAIN_QUERY` (e.g., *"When does the Bosch dishwasher warranty expire?"* -> Domain 7)
  - `MULTI_DOMAIN_PLANNING` (e.g., *"Plan a 5-day dinner menu using expiring pantry items and check if the missing ingredients fit this week's grocery budget"* -> Domains 1 & 5)
  - `DIRECT_MUTATION_REQUEST` (e.g., *"Log ₹4,200 for Honda City periodic service"* -> Domains 5 & 6)
- Rejects out-of-scope prompts before invoking heavy reasoning models.

### 3.3 Planning Agent (`planner.py`)
- Powered by `gemini-2.5-pro` for cross-domain requests.
- Decomposes multi-domain goals into a Directed Acyclic Graph (DAG) of deterministic tool calls.
- Example cross-domain plan:
  1. Query `home_maintenance` for unresolved appliance faults (`ac_unit_01`).
  2. Query `documents_warranty` for active warranty coverage on `ac_unit_01`.
  3. If covered, draft a warranty claim task; if expired, query `finance_expenses` for available `Home Repair` budget envelope before recommending vendor dispatch.

### 3.4 Retrieval / Hybrid RAG Layer (`rag.py`)
- Combines **Relational Pre-Filtering** (`household_id`, `domain`, `document_type`, `valid_until`) with **Dense Vector Similarity** (`pgvector` HNSW cosine distance `<=>` using 768-dimensional `text-embedding-004` embeddings) and **Lexical Full-Text Search** (`tsvector` / BM25 ranking) merged via Reciprocal Rank Fusion (RRF).
- Every retrieved chunk returns a mandatory `SourceCitation` object (`document_id`, `title`, `page_number`, `bounding_box`, `gcs_uri`) so the frontend can highlight exact PDF/receipt evidence.

### 3.5 Policy & Validation Layer (`policy.py`)
- **Pre-Execution Guardrails**:
  - Verifies tenant isolation (`user.household_id == target_resource.household_id`).
  - Validates tool arguments against strict Pydantic schemas and business invariants (e.g., negative quantities prohibited, budget ceiling checks).
  - Evaluates the tool's `ActionRiskLevel` (`READ_ONLY`, `INTERNAL_MUTATION`, `EXTERNAL_CONSEQUENTIAL`).
- **Post-Execution Grounding Verifier**:
  - Audits LLM-synthesized responses to ensure numerical figures in the prose match the exact numbers returned by SQL/Python tool outputs.

### 3.6 Human Approval Gate (`approval.py`)
- When any agent attempts to invoke a tool marked `EXTERNAL_CONSEQUENTIAL` (or an `INTERNAL_MUTATION` exceeding a configured monetary/policy threshold), the Policy Layer raises a `HumanApprovalRequiredInterrupt`.
- LangGraph freezes the state graph at the pre-tool checkpoint and writes an `ApprovalRequest` record to PostgreSQL with status `PENDING_APPROVAL`.
- The Next.js UI renders an actionable approval card displaying the exact diff/payload, target vendor/account, and risk reason.
- Only when an authorized household admin signs off via `POST /api/v1/intelligence/approvals/{id}/decide` does LangGraph resume execution.

---

## 4. The Seven Household Domains & Boundary Contracts

Each domain inside `backend/app/domains/` follows a uniform internal structure (`models.py`, `schemas.py`, `repository.py`, `service.py`, `tools.py`, `router.py`):

| # | Domain Module | Primary PostgreSQL Entities | Deterministic SQL / Code Calculations | Grounded AI / RAG Capabilities |
| :- | :--- | :--- | :--- | :--- |
| **1** | `kitchen_grocery` | `pantry_items`, `stock_batches`, `recipes`, `recipe_ingredients`, `shopping_lists` | FIFO stock depletion, unit normalization (`g`/`kg`/`ml`), expiry countdowns, missing ingredient diff | Recipe generation constrained by expiring stock; receipt line-item normalization |
| **2** | `laundry_clothing` | `garments`, `care_labels`, `wash_cycles`, `stain_protocols` | Wash load grouping by fabric/temp/color constraints, cost-per-wear calculation | Care tag symbol decoding, stain removal retrieval from fabric care knowledge base |
| **3** | `home_maintenance` | `home_assets`, `maintenance_schedules`, `work_orders`, `vendor_logs` | Next-service due date calculation, MTBF (Mean Time Between Failures), seasonal checklist generation | Troubleshooting synthesis grounded in uploaded appliance manuals (Domain 6 link) |
| **4** | `finance_expenses` | `bills`, `subscriptions`, `expenses`, `households`, `reminders` | Utility bill verification, due dates, recurring bills, household expenses & expenditure, budget management, payment history, spending summaries, financial reminders | Utility bill & receipt extraction, spending summary & budget Q&A via deterministic SQL tools |
| **5** | `vehicle_mobility` | `vehicles`, `fuel_logs`, `service_records`, `compliance_docs` | Fuel efficiency (`km/L` or `Wh/km`), cost-per-km, odometer-based service interval triggers | Service invoice parsing, PUC/insurance renewal orchestration |
| **6** | `documents_warranty` | `documents`, `document_chunks` (`vector(768)`), `warranties`, `insurance_policies` | Coverage expiration alerts, claim eligibility date window checks, cryptographic SHA-256 deduplication | Hybrid semantic + keyword RAG over policies, warranties, and manuals with page citations |

---

## 5. Asynchronous Event Architecture (RabbitMQ)

To keep API response times under `150ms` p95, slow I/O and indexing operations are decoupled via RabbitMQ topic exchanges (`homeiq.events`):

1. **`document.uploaded`**: Triggered when a user uploads a PDF/image to Google Cloud Storage via a signed URL. Consumed by the ingestion worker to run OCR/document parsing, chunk text, generate 768-dim Gemini embeddings, and insert into `document_chunks`.
2. **`transaction.recorded`**: Consumed by the budget evaluator worker to recompute envelope utilization in PostgreSQL and invalidate Redis dashboard caches.
3. **`maintenance.due_check`**: Scheduled cron trigger that evaluates deterministic maintenance/warranty rules and creates actionable alerts.

---

## 6. Observability & Telemetry Pipeline

- **OpenTelemetry SDK** instruments FastAPI, SQLAlchemy async queries, Redis commands, RabbitMQ publish/consume hooks, and Gemini/LangGraph execution nodes.
- **Prometheus** scrapes `/metrics` from the FastAPI backend and OpenTelemetry Collector, tracking:
  - `homeiq_http_request_duration_seconds`
  - `homeiq_agent_node_latency_seconds{node, domain}`
  - `homeiq_llm_tokens_total{model, type="prompt|completion"}`
  - `homeiq_policy_interrupts_total{domain, risk_level}`
- **Grafana** visualizes system health, database connection saturation, RAG retrieval recall latency, and AI token spend per household.
