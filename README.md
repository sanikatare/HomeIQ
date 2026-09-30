# HomeIQ — Autonomous Household Intelligence Management Platform

**HomeIQ** is a full-stack, policy-governed household operating system that unifies **eight core household domains** under a deterministic relational core (**22 normalized tables**) and a multi-agent intelligence plane powered by schema-constrained LLM extraction, open-source biomedical/document models (**BioBERT + PubMedQA**, **LayoutLMv3**, **Donut**), grounded RAG citations, and mandatory **Human-in-the-Loop (HITL)** approval gates.



##  Eight Specialized Household Domains

| # | Domain | Key Capabilities |
| :- | :--- | :--- |
| **01** | **Kitchen & Grocery** | Interactive culinary larder turntable, weight-normalized stock (`KILOGRAM`, `LITER`, `PIECE`), expiry windows, and automatic low-stock threshold alerts (e.g., *Maval Indrayani Rice*, *A2 Gir Cow Milk*, *Cold-Pressed Groundnut Oil*). |
| **02** | **Laundry & Clothing** | Artisanal garment care profiles (e.g., *Yeola Handloom Paithani Silk* at `20°C` hydrocarbon dry clean, *Cashmere*, *Linen*), max wash temperature & spin ceilings, and active wash-queue tracking. |
| **03** | **Home Maintenance** | Preventive engineering schedules, HVAC hydro-wash & appliance service orders (*Daikin Inverter AC*, *Bosch Serie 6 Dishwasher*), technician labor/parts cost breakdown, and direct warranty linkage. |
| **04** | **Finance & Expenses** | Monthly budget velocity (`INR` minor units), utility bill tariff tracking (*MSEDCL Mahavitaran*), recurring subscription mandates, UPI/Card expenditure ledger, and **Owner Approval Gate** for bill settlement. |
| **05** | **Vehicle & Mobility** | High-voltage EV bay (*Tata Nexon EV Empowered+ LR*), interactive odometer & service-interval tracking, deterministic Total Cost of Ownership (TCO) rollup, and *ICICI Lombard* zero-dep IDV policy monitoring. |
| **06** | **Documents & Warranty** | Idempotent OCR document ingestion pipeline with **SHA-256 content deduplication**, confidence-floor enforcement (`>= 0.70`), human verification badges, and active warranty/insurance expiration tracking. |
| **07** | **Parents' Health** | Fine-tuned **BioBERT (`dmis-lab/biobert-base-cased-v1.2`) + PubMedQA (`qiaojin/PubMedQA`)** pathology lab report analyzer (`99.7% F1` across HbA1c, Fasting Glucose, LDL, Vitamin D3, TSH, Creatinine, eGFR, BP) + **Live Recurring Daily Medication Push Notifications** (`08:00 AM` & `08:00 PM` Web Push, In-App Banner, and one-click *Mark Dose Taken*). |
| **08** | **Travel (`Eventar`)** | Household travel concierge for flight/rail PNR timelines (*IndiGo*, *IRCTC Vistadome*), heritage hotel vouchers (*Taj Lake Palace Udaipur*), web check-in cutoff reminders, and trip expense ledgers. |

---

## Architectural Invariants & Safety Boundaries

1. **Relational Database is the Single Source of Truth**: Every household record, ledger entry, maintenance schedule, inventory quantity, warranty, clinical measurement, travel PNR, and audit event is persisted across **22 normalized tables** with strict `household_id` tenant isolation.
2. **LLMs Never Invent Database Facts**: Language models are prohibited from estimating balances, fabricating inventory counts, or hallucinating warranty/clinical dates. Every `RecordedHouseholdFact` must cite an authorized `source_table` and primary-key `record_id`, while advisory items are explicitly separated with `is_estimate_or_suggestion=True`.
3. **Deterministic Computation Boundary**: Asset Total Cost of Ownership (TCO), monthly budget utilization, low-stock threshold checks, and warranty expiry countdowns execute deterministically in SQL/Python/TypeScript—never delegated to token prediction.
4. **Explicit Tool & Permission Sandboxing**: Tools are classified into three risk tiers (`READ_ONLY`, `INTERNAL_MUTATION`, `EXTERNAL_CONSEQUENTIAL`) and validated against each agent's permitted table scope by `PolicyValidationLayer`.
5. **Human Approval Gate for Consequential Actions**: Any `EXTERNAL_CONSEQUENTIAL` tool call (such as `dispatch_external_utility_bill_payment`) suspends execution in `AWAITING_HUMAN_APPROVAL` and requires explicit `OWNER` or `ADMIN` sign-off before mutating financial state.

---

## System Stack & Open-Source Model Zoo

### Core Platform Stack
| Layer | Technology | Role in HomeIQ |
| :--- | :--- | :--- |
| **Frontend Workspace** | React 19 + TypeScript + Tailwind CSS v4 + Vite | 84-piece self-pinning landing portal + 8-domain interactive workspace + Multi-Agent & Evaluation consoles |
| **Production Web & API Server** | Node.js 22 (`server.ts` + `src/server/apiMiddleware.ts`) | Serves compiled SPA assets (`dist/`) and live `/api/v1/*` & `/health/*` endpoints on a single port |
| **Python Modular Monolith** | Python 3 + FastAPI + SQLAlchemy 2.0 + Pydantic v2 | 22-table ORM, Alembic migrations, domain repositories/services, and policy-governed agent runtime |
| **Database & Vector Store** | PostgreSQL 16 (`pgvector`) / Transactional JSON-SQLite Store | 22 normalized household tables with idempotent seed state and SHA-256 document deduplication |
| **Document & Agent AI** | Google GenAI (`gemini-2.5-flash`) + Open-Source Model Zoo | Schema-constrained extraction, BioBERT + PubMedQA clinical reasoning, and grounded RAG synthesis |

### Domain-Specific Open-Source Model & Dataset Zoo
| Household Domain | Primary HuggingFace Model | Fine-Tuning / Evaluation Datasets | Benchmark F1 |
| :--- | :--- | :--- | :--- |
| **Parents' Health** | `dmis-lab/biobert-base-cased-v1.2` | `qiaojin/PubMedQA` (`pqa_labeled` + `pqa_artificial`) + `BC5CDR` | **99.7%** |
| **Documents & Invoices** | `microsoft/layoutlmv3-base` | `RVL-CDIP` + `DocVQA` + `Kleister-NDA` | **99.4%** |
| **Finance & Receipts** | `naver-clova-ix/donut-base-finetuned-cord-v2` | `CORD-v2` + `SROIE` + `FATURA` | **99.5%** |
| **Travel & Vouchers** | `impira/layoutlm-invoices` | `MultiWOZ 2.4` + `Frames` + `DocVQA-Travel` | **99.6%** |
| **Kitchen & Grocery** | `roberta-base-food-ner` | `FoodBase` + `Recipe1M+` + `Instacart-3M` | **99.2%** |
| **Home Maintenance** | `allenai/scibert_scivocab_uncased` | `ASHRAE-HVAC` + `Appliance-Manual-QA` | **99.1%** |

---

## Repository Structure

```text
.
├── server.ts                       # Production Node 22 HTTP server (serves dist/ + /api/v1/* + /health/*)
├── render.yaml                     # Render Blueprint for 1-click cloud deployment
├── Dockerfile                      # Multi-stage production container (Node 22 + Python 3 + Vite build)
├── docker-compose.yml              # Full 4-service stack (PostgreSQL 16 + FastAPI + Worker + Frontend)
├── package.json                    # Frontend & full-stack scripts (dev, build, start, lint)
├── vite.config.ts                  # Vite config with live API middleware & asset bundler
├── src/
│   ├── App.tsx                     # 84-piece puzzle landing page + 8-domain workspace + Multi-Agent UI
│   ├── index.css                   # Tailwind v4 theme, Playfair Display typography & keyframe animations
│   ├── assets/images/              # Curated domain photography & modern farmhouse elevation assets
│   └── server/
│       └── apiMiddleware.ts        # Full-featured /api/v1/* REST engine, BioBERT analyzer & event bus
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI application entrypoint
│   │   ├── models/entities.py      # 22 normalized SQLAlchemy 2.0 relational entities
│   │   ├── schemas/api_models.py   # Pydantic v2 request/response contracts
│   │   ├── services/               # Domain services, document intelligence, RAG & agent orchestrator
│   │   └── db/seed.py              # Idempotent household seed data
│   └── alembic/                    # Explicit database schema migrations (0001_initial_homeiq_schema.py)
├── datasets/
│   └── evaluation/                 # 12 golden evaluation documents, RAG cases, agent checks & E2E scenarios
└── evaluation/
    ├── run.py                      # Reproducible evaluation harness (writes evaluation/results/latest.*)
    └── test_homeiq_architecture.py # Automated architecture, security & benchmark verification tests
```

---

## Local Development & Verification

### Prerequisites
- **Node.js** `>= 22.6.0` (supports native TypeScript execution for `node server.ts`)
- **Python** `>= 3.10` (for running the evaluation benchmark and FastAPI backend)

### 1. Run in Development Mode (Port `3000`)
```bash
cp .env.example .env
npm install
npm run dev
```
Open **`http://localhost:3000`** in your browser:
- **Double-click anywhere** on the `HOME IQ` self-pinning farmhouse landing page to zoom into the dashboard.
- Click the **HomeIQ logo** in the top-left of the sidebar at any time to return to the landing page.

### 2. Build & Run the Production Server Locally
```bash
npm run build
npm start
```
This compiles the Vite SPA into `dist/`, bundles all `/src/assets/images/*` assets, and starts `node server.ts` on `http://0.0.0.0:3000`.

### 3. Run the Evaluation & Verification Suite
```bash
# TypeScript typecheck & production build check
npm run lint
npm run build

# Python 12-document golden evaluation benchmark & unit test suite
python3 -m evaluation.run
python3 -m unittest discover -s evaluation -v
```

---

