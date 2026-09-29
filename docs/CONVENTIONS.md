# HomeIQ — Engineering & Development Conventions

This document establishes mandatory engineering standards for the HomeIQ codebase. These conventions ensure academic rigor, deterministic correctness, and production maintainability.

---

## 1. The Deterministic vs. Probabilistic Boundary (Golden Rule)

### 1.1 Never Use an LLM for Arithmetic or Date Math
- **FORBIDDEN**: Passing raw transaction lists to Gemini and asking *"What is the total spent on groceries in September?"*
- **REQUIRED**: Executing a parameterized SQL aggregation (`SELECT SUM(amount_paise) FROM transactions WHERE ...`) via an explicit domain tool or repository method, and passing the exact deterministic result to the LLM only if natural-language synthesis is needed.

### 1.2 Monetary Representation
- Never use IEEE 754 floating-point (`float`) for currency in Python or TypeScript.
- Store all monetary amounts in PostgreSQL as `BIGINT` in minor units (e.g., paise/cents) or `NUMERIC(14, 2)` mapped to Python `decimal.Decimal`.

### 1.3 Grounded Citations
- Any agent response referencing uploaded household documents (warranties, insurance policies, utility bills, appliance manuals) must return structured `citations: list[SourceCitation]` linking to `document_id` and `chunk_id`.
- If hybrid retrieval returns zero chunks above the similarity threshold (`0.72`), the agent must state that no matching household document was found rather than guessing from pre-training knowledge.

---

## 2. Backend Conventions (Python 3.12 + FastAPI + SQLAlchemy 2.0)

### 2.1 Domain Module Encapsulation
Every domain under `backend/app/domains/<domain_name>/` must adhere to a strict 6-file contract:
- `models.py`: SQLAlchemy 2.0 `Mapped[...]` and `mapped_column(...)` declarations.
- `schemas.py`: Pydantic v2 request/response DTOs (`ConfigDict(from_attributes=True, extra="forbid")`).
- `repository.py`: Pure async data access methods accepting an `AsyncSession`. Every query **must** filter by `household_id` for strict multi-tenant isolation.
- `service.py`: Deterministic business logic, unit conversions, and domain event publishing.
- `tools.py`: Explicitly registered `@household_tool(domain=..., risk_level=...)` functions exposed to the LangGraph agent layer.
- `router.py`: FastAPI `APIRouter` endpoints with explicit `response_model` and status codes.

### 2.2 Cross-Domain Communication
- **No Circular Imports**: Domain A (`kitchen_grocery`) must never directly mutate SQLAlchemy models belonging to Domain B (`finance_expenses`).
- Cross-domain interactions occur strictly via:
  1. Calling the target domain's public `Service` interface within a shared database transaction unit-of-work, or
  2. Publishing a typed domain event to RabbitMQ (`homeiq.events`), or
  3. Orchestrated multi-step tool calls coordinated by the `PlanningAgent`.

### 2.3 Database & Migration Rules (Alembic)
- All tables must include:
  - `id: Mapped[uuid.UUID]` (UUIDv7 or UUIDv4 primary key)
  - `household_id: Mapped[uuid.UUID]` (indexed foreign key for tenant isolation)
  - `created_at: Mapped[datetime]` (`TIMESTAMP WITH TIME ZONE`, server default `now()`)
  - `updated_at: Mapped[datetime]` (`TIMESTAMP WITH TIME ZONE`)
- Never modify an already-committed Alembic migration file. Always generate a new revision (`alembic revision --autogenerate -m "verb_domain_description"`) and manually inspect the generated SQL before committing.

---

## 3. Agent & Tool Permission Conventions

Every tool exposed to the AI Orchestrator must declare its metadata using the `ToolSpec` contract:

```python
class ActionRiskLevel(StrEnum):
    READ_ONLY = "READ_ONLY"                         # Safe query, auto-executed
    INTERNAL_MUTATION = "INTERNAL_MUTATION"         # Audited DB write, policy-checked
    EXTERNAL_CONSEQUENTIAL = "EXTERNAL_CONSEQUENTIAL" # Mandatory Human Approval Gate
```

- Tools must be **idempotent** where possible; mutations accept an `idempotency_key`.
- Tools must never accept raw SQL strings from the LLM. All filters must be strongly-typed Pydantic fields.

---

## 4. Frontend Conventions (Next.js App Router + TypeScript)

- **Strict TypeScript**: `strict: true`, no implicit `any`, shared OpenAPI-generated types from FastAPI (`/openapi.json`).
- **Server vs. Client Components**: Default to React Server Components (RSC) for initial data fetching; use `"use client"` strictly for interactive forms, SSE streaming agent consoles, and approval action drawers.
- **Tabular Numerals**: All financial tables, utility meter logs, and inventory quantities must apply `tabular-nums` (`font-variant-numeric: tabular-nums`) for vertical decimal alignment.

---

## 5. Testing & Verification Standards

1. **Unit Tests (`tests/unit/`)**: Pure deterministic tests for domain calculators (FIFO stock depletion, electricity slab calculation, budget split math, vehicle mileage). Zero network or LLM calls.
2. **Integration Tests (`tests/integration/`)**: Testcontainers-backed PostgreSQL (`pgvector`) + Redis tests verifying repository tenant isolation and Alembic migrations.
3. **Policy & Guardrail Tests (`tests/intelligence/`)**: Deterministic verification that `EXTERNAL_CONSEQUENTIAL` tools always trigger `HumanApprovalRequiredInterrupt` and cannot execute without a valid signed approval record.
4. **RAG Evaluation Suite (`tests/evals/`)**: Golden dataset of household queries checking citation recall and numeric faithfulness.
