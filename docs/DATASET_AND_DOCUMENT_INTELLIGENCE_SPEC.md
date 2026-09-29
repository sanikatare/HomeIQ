# HomeIQ — Complete Dataset, Document Intelligence & Evaluation Specification

**Project**: HomeIQ — AI Household Intelligence & Management Platform (B.Tech Final-Year Capstone)  
**Architectural Truth Principle**: PostgreSQL 16 is the single source of truth for all household state. LLMs never invent database facts and never perform financial arithmetic.

---

## SECTION 1 — DATASET INVENTORY

### 1.1 Currently Implemented & Executed Datasets in Repository

1. **HomeIQ Evaluation Benchmark Corpus (`datasets/evaluation/`)**
   - **Official URL**: Repository path `datasets/evaluation/manifests/evaluation_manifest.json`
   - **Creator**: HomeIQ Capstone Engineering Team
   - **Document Types**: 10 representative household documents across all 6 `SupportedExtractionCategory` types (`RECEIPT`, `UTILITY_BILL`, `INVOICE`, `WARRANTY_DOCUMENT`, `INSURANCE_DOCUMENT`, `SERVICE_INVOICE`), including 8 valid documents (normal + hard/OCR-noisy/missing-field) and 2 negative/adversarial stress documents.
   - **Approximate Size**: 10 annotated document files + 10 structured ground-truth JSON schemas + 6 RAG evaluation queries + 7 domain agent evaluation cases + 4 end-to-end integration scenarios.
   - **Languages**: English (`en`) with Indian currency (`INR` / `₹` / paise minor units) and Indian household terminology.
   - **Annotation Type**: Ground-truth key-value JSON matching HomeIQ's Pydantic v2 extraction schemas (`backend/app/schemas/document_extraction.py`) + line-item arrays.
   - **What HomeIQ Uses It For**: Automated evaluation of the `DocumentIntelligencePipeline`, field-level Precision/Recall/F1 calculation, error classification, RAG groundedness benchmarking, and CI regression gating.
   - **Supported Domains**: All 7 HomeIQ household domains.
   - **License**: Apache-2.0 (100% synthetic, zero PII).
   - **Category**: Evaluation data + OCR/document extraction benchmark + RAG test corpus + Synthetic data.
   - **Status**: **CURRENTLY USED**.

2. **HomeIQ Relational & Vault Seed Dataset (`backend/app/db/seed.py`)**
   - **Official URL**: Repository path `backend/app/db/seed.py`
   - **Creator**: HomeIQ Capstone Engineering Team
   - **Document Types**: Seeded relational rows across all 20 PostgreSQL tables + 2 indexed `Document` vault records (`DOC_DISHWASHER_INVOICE_ID`, `DOC_CAR_POLICY_ID`).
   - **Approximate Size**: ~35 interconnected relational entities across 20 normalized tables.
   - **Languages**: English (`en`).
   - **Annotation Type**: Strongly-typed SQLAlchemy 2.0 ORM entities with deterministic UUID primary/foreign keys.
   - **What HomeIQ Uses It For**: Database relationship verification, deterministic SQL aggregation tests, multi-agent tool execution, and proactive insight generation.
   - **Supported Domains**: All 7 HomeIQ household domains.
   - **License**: Apache-2.0 (100% synthetic, zero PII).
   - **Category**: Synthetic relational & RAG test corpus.
   - **Status**: **CURRENTLY USED**.

### 1.2 Public Benchmark Datasets Supported via Ingestion Adapters (`backend/app/evaluation/runner.py`) & Recommended Future Datasets

| Dataset | Creator | Official URL | Hugging Face URL | Doc Type & Size | License | HomeIQ Domains | Role & Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CORD-v2** | NAVER Clova AI | https://github.com/clovaai/cord | https://huggingface.co/datasets/naver-clova-ix/cord-v2 | 1,000 POS receipts | CC BY 4.0 | Kitchen & Grocery, Expense & Budget | External OCR/Extraction Benchmark (**Adapter Implemented**, dataset not bundled in Git) |
| **ICDAR 2019 SROIE** | ICDAR RRC | https://rrc.cvc.uab.es/?ch=13 | https://huggingface.co/datasets/darentang/sroie | 973 scanned receipts | MIT / Research | Kitchen & Grocery, Expense & Budget | External OCR/Header Extraction Benchmark (**Adapter Implemented**, dataset not bundled in Git) |
| **FUNSD** | EPFL / Swisscom | https://guillaumejaume.github.io/FUNSD/ | https://huggingface.co/datasets/nielsr/funsd | 199 noisy forms | Non-Commercial Research | Documents, Warranty & Insurance | **Recommended** for noisy form entity linking |
| **XFUND** | Microsoft Research | https://github.com/doc-analysis/XFUND | https://huggingface.co/datasets/ega/xfund | 1,393 multilingual forms | MIT | Documents, Warranty & Insurance | **Recommended** for multilingual layout evaluation |
| **DocVQA** | CVC UAB / IIT-H | https://www.docvqa.org/ | https://huggingface.co/datasets/lmms-lab/DocVQA | 12,767 doc images, 50k QA pairs | Research-Only | Documents, Warranty & Insurance (RAG) | **Recommended** for RAG visual QA benchmarking |
| **WildReceipt** | OpenMMLab | https://github.com/open-mmlab/mmocr | https://huggingface.co/datasets/dvgodoy/WildReceipt | 1,768 camera receipts | Apache-2.0 / Research | Kitchen & Grocery, Expense & Budget | **Recommended** for mobile camera skew/blur benchmarking |
| **RVL-CDIP** | Ryerson Vision Lab | https://adamharley.com/rvl-cdip/ | https://huggingface.co/datasets/aharley/rvl_cdip | 400,000 docs (16 classes) | Research-Only | Document Classification Router | **Recommended** for document category classification |

---

## SECTION 2 — FINE-TUNING / MODEL STRATEGY

1. **Which model(s) are used?**
   - **Document Extraction & Multimodal Classification**: Google Gemini 2.5 Flash (`gemini-2.5-flash`) configured in `backend/app/core/config.py` (`GEMINI_FLASH_MODEL`) and invoked via the official `google-genai` SDK in `GoogleGenAIDocumentAnalyzer` (`backend/app/intelligence/document_pipeline.py`).
   - **Multi-Agent Reasoning & Orchestration**: Google Gemini 2.5 Pro (`gemini-2.5-pro`) configured in `GEMINI_PRO_MODEL`.
   - **Vector Embeddings (RAG)**: Google `text-embedding-004` (768 dimensions) configured in `GEMINI_EMBEDDING_MODEL`.
2. **Is any model actually fine-tuned in the current implementation?**
   - **NO.** HomeIQ does **not** currently fine-tune any Gemini model or local open-weights model. There are no training loops, LoRA adapters, or fine-tuned model checkpoints in the repository.
3. **How does the current implementation achieve high extraction accuracy without fine-tuning?**
   - **Schema-Constrained Multimodal Decoding**: `GoogleGenAIDocumentAnalyzer.analyze_document()` passes `response_mime_type="application/json"`, `response_schema=GeminiDocumentAnalysisEnvelope`, and `temperature=0.0` to `client.models.generate_content()`.
   - **Strict Extractive System Instruction**: Instructs Gemini to extract *only* factual fields explicitly stated in the document, leave absent optional fields as `null`, convert currency amounts to integer minor units (paise), and provide verbatim `evidence_quote` strings with calibrated confidence scores.
   - **Deterministic Post-Extraction Validation**: `DocumentIntelligencePipeline._validate_envelope()` enforces `overall_confidence >= 0.70`, verifies sub-schema presence, cross-checks `model_validator` date ordering (`end_date >= start_date`), and verifies line-item sum consistency before allowing any database write.
4. **Planned / Future Model Improvements**:
   - **Planned**: Parameter-efficient fine-tuning (Vertex AI Supervised Fine-Tuning for Gemini Flash or LoRA on Qwen2.5-VL / Donut) ONLY if empirical evaluation on multi-lingual Indian regional utility bills (Marathi/Hindi/English MSEDCL & municipal tax bills) reveals systematic layout errors below 90% F1.

---

## SECTION 3 — ACTUAL DOCUMENT PROCESSING PIPELINE

```text
[1. Document Upload / Evaluation Input]
       │  (POST /api/v1/documents/ingest or EvaluationRunner)
       ▼
[2. Security & Magic-Byte Validation]
       │  (validate_safe_document_upload: %PDF-, PNG, JPEG, WEBP, max 15MB)
       ▼
[3. Object Storage & SHA-256 Fingerprinting]
       │  (DocumentStorageAdapter.store_document -> gs://... & sha256_checksum)
       ▼
[4. Idempotency Guard in PostgreSQL]
       │  (DocumentRepository.get_by_sha256(household_id, sha256_checksum))
       │  ├─ Hit: Return cached DocumentPipelineResult (0 LLM tokens)
       │  └─ Miss: Create Document row (status = ANALYZING)
       ▼
[5. Gemini Structured Multimodal Extraction + Retry Loop]
       │  (GoogleGenAIDocumentAnalyzer / Analyzer Protocol, max_retries=3, exponential backoff)
       │  Returns GeminiDocumentAnalysisEnvelope (Pydantic extra="forbid")
       ▼
[6. Deterministic Pydantic & Domain Validation]
       │  (_validate_envelope: confidence >= 0.70, date window checks, line-item sum cross-check)
       ▼
[7. Controlled Whitelisted Relational Persistence]
       │  (_apply_controlled_domain_updates -> writes ONLY to mapped SQLAlchemy models:
       │   INVOICE/RECEIPT -> expenses | UTILITY_BILL -> bills | WARRANTY_DOCUMENT -> warranties
       │   INSURANCE_DOCUMENT -> insurance_policies | SERVICE_INVOICE -> maintenance_records + expenses)
       ▼
[8. RAG Vault Indexing & Audit Event Emission]
       │  (Sets is_indexed_for_rag=True, extracted_text, structured_metadata_json;
       │   emits Event("document.intelligence.completed") -> SharedRetrievalInterface & Domain Agents)
```
