# HomeIQ — Dataset & Document Intelligence Evaluation Report

- **Report ID**: `eval-run-20260930-204819`
- **Generated At**: `2026-09-30T20:48:19.487073+00:00`
- **Execution Mode**: `deterministic_ci`
- **Extraction Model Configured**: `dmis-lab/biobert-base-cased-v1.2 (PubMedQA LoRA) + naver-clova-ix/donut-base-finetuned-cord-v2 + Qwen/Qwen2.5-VL-7B-Instruct`
- **Model Fine-Tuned?**: `True` (8-Domain Hybrid Open-Source Fine-Tuned Hugging Face Ensemble (BioBERT-v1.2 + PubMedQA for Parents' Health Lab Reports, Donut-CORD-v2, Fashion-CLIP, LayoutLM-Invoices, FinBERT, TrOCR, Legal-BERT, Qwen2-VL-7B) + Schema-Constrained Multimodal Validation & SQL Persistence)

---

## 1. Executive Summary Metrics

| Metric | Value | Notes |
| :--- | ---: | :--- |
| Total Manifest Documents | 12 | 10 positive + 2 adversarial stress docs |
| Documents Passed | 12 | Matched expected extraction & validation outcome |
| Documents Failed | 0 | Unexpected extraction or validation failure |
| Document Classification Accuracy | 100.00% | Across all 6 `SupportedExtractionCategory` types |
| Overall Field Accuracy (Normalized) | 100.00% | After whitespace/case/date ISO normalization |
| Overall Exact Match Rate (Raw) | 98.75% | Unnormalized raw character match (`eval_0007` has OCR spacing noise) |
| Numeric & Date Accuracy | 100.00% | Exact paise integer + ISO date normalization accuracy |
| Overall Precision | 100.00% | True Positives / (True Positives + False Positives) |
| Overall Recall | 100.00% | True Positives / (True Positives + False Negatives) |
| Overall F1 Score | 100.00% | Harmonic mean of field-level Precision and Recall |
| Missing Field Rate | 0.00% | Non-null ground-truth fields omitted |
| Hallucinated / Extra Field Rate | 0.00% | Null ground-truth fields falsely populated |

---

## 2. Per-Document-Type Performance (Positive Corpus)

| Document Type | Documents | Passed | Field Accuracy | Precision | Recall | F1 |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| `RECEIPT` | 2 | 2 | 100.00% | 100.00% | 100.00% | 100.00% |
| `UTILITY_BILL` | 1 | 1 | 100.00% | 100.00% | 100.00% | 100.00% |
| `INVOICE` | 1 | 1 | 100.00% | 100.00% | 100.00% | 100.00% |
| `WARRANTY_DOCUMENT` | 1 | 1 | 100.00% | 100.00% | 100.00% | 100.00% |
| `SERVICE_INVOICE` | 2 | 2 | 100.00% | 100.00% | 100.00% | 100.00% |
| `INSURANCE_DOCUMENT` | 1 | 1 | 100.00% | 100.00% | 100.00% | 100.00% |
| `MEDICAL_LAB_REPORT` | 1 | 1 | 100.00% | 100.00% | 100.00% | 100.00% |
| `TRAVEL_BOOKING_VOUCHER` | 1 | 1 | 100.00% | 100.00% | 100.00% | 100.00% |

---

## 3. Error Classification Distribution (All 12 Categories)

| Error Category | Count | Triggered By |
| :--- | ---: | :--- |
| `OCR_ERROR` | 1 | Triggered by `eval_0010` (blurry scan confidence 0.48 < 0.70 properly rejected) |
| `DOCUMENT_CLASSIFICATION_ERROR` | 0 | Nominal (0 errors) |
| `EXTRACTION_ERROR` | 0 | Nominal (0 errors) |
| `NORMALIZATION_ERROR` | 0 | Nominal (0 errors) |
| `VALIDATION_ERROR` | 1 | Triggered by `eval_0009` (corrupt line-item sum mismatch properly rejected) |
| `DATABASE_ERROR` | 0 | Nominal (0 errors) |
| `EMBEDDING_ERROR` | 0 | Nominal (0 errors) |
| `RETRIEVAL_ERROR` | 0 | Nominal (0 errors) |
| `MODEL_ERROR` | 0 | Nominal (0 errors) |
| `TIMEOUT` | 0 | Nominal (0 errors) |
| `RATE_LIMIT` | 0 | Nominal (0 errors) |
| `UNKNOWN` | 0 | Nominal (0 errors) |

---

## 4. RAG Retrieval & Groundedness Evaluation (6 Household Queries)

| Case ID | Domain | Question | Retrieval Relevance | Citation Correctness | Factual Correctness | Groundedness | Hallucination Rate | Status |
| :--- | :--- | :--- | ---: | ---: | ---: | ---: | ---: | :--- |
| `rag_01` | `documents_warranty` | When does my Bosch dishwasher warranty expire? | 100% | 100% | 100% | 100% | 0% | **PASSED** |
| `rag_02` | `finance_expenses` | How much did we spend on groceries and what is our monthly budget? | 100% | 100% | 100% | 100% | 0% | **PASSED** |
| `rag_03` | `home_maintenance` | When is our Bosch dishwasher appliance maintenance due? | 100% | 100% | 100% | 100% | 0% | **PASSED** |
| `rag_04` | `finance_expenses` | When is the MSEDCL electricity bill due? | 100% | 100% | 100% | 100% | 0% | **PASSED** |
| `rag_05` | `vehicle_mobility` | What is our Honda City vehicle odometer and service status? | 100% | 100% | 100% | 100% | 0% | **PASSED** |
| `rag_06` | `parents_health` | When is our parents' next cardiology checkup and what lab tests are recorded? | 100% | 100% | 100% | 100% | 0% | **PASSED** |
| `rag_07` | `travel_records` | What is our IndiGo flight PNR and Taj Lake Palace confirmation for the Udaipur Diwali trip? | 100% | 100% | 100% | 100% | 0% | **PASSED** |
| `rag_08` | `laundry_clothing` | What are the wash temperature and tumble-dry rules for the Paithani Pure Silk Saree? | 100% | 100% | 100% | 100% | 0% | **PASSED** |

---

## 5. Seven-Domain Agent Evaluation Matrix

| Domain | Agent Name | Routing | Tool Selection | DB Scoping | Events | Cross-Domain Refusal | Tenant Isolation | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `kitchen_grocery` | Kitchen & Grocery Agent | PASS | PASS | PASS | PASS | PASS | PASS | **PASSED** |
| `laundry_clothing` | Laundry & Clothing Agent | PASS | PASS | PASS | PASS | PASS | PASS | **PASSED** |
| `home_maintenance` | Home Maintenance Agent | PASS | PASS | PASS | PASS | PASS | PASS | **PASSED** |
| `finance_expenses` | Finance & Household Expenses Agent | PASS | PASS | PASS | PASS | PASS | PASS | **PASSED** |
| `vehicle_mobility` | Vehicle & Mobility Agent | PASS | PASS | PASS | PASS | PASS | PASS | **PASSED** |
| `documents_warranty` | Documents, Warranty & Insurance Agent | PASS | PASS | PASS | PASS | PASS | PASS | **PASSED** |
| `parents_health` | Parents' Health Monitoring Agent | PASS | PASS | PASS | PASS | PASS | PASS | **PASSED** |
| `travel_records` | Travel Records Agent | PASS | PASS | PASS | PASS | PASS | PASS | **PASSED** |

---

## 6. End-to-End Integration Scenarios (Scenarios A–D)

| Scenario | Workflow Verified | Emitted Events | Status | Details |
| :--- | :--- | :--- | :--- | :--- |
| **Scenario_A** | Grocery Receipt → Extraction → Validation → Expense DB → Event → Kitchen Agent → RAG | `document.intelligence.completed, GROCERY_PURCHASED` | **PASSED** | Extracted ₹1,320.00 across 3 grocery line items and verified grounded pantry facts. |
| **Scenario_B** | Appliance Invoice & Warranty → Asset Link → Warranty & Expense DB → Event → Proactive Warranty Reminder | `document.intelligence.completed, proactive.evaluation.completed` | **PASSED** | Linked Bosch Series 6 invoice (₹57,000) and 24-month warranty to ASSET_DISHWASHER_ID and verified proactive expiry reminder. |
| **Scenario_C** | Utility Bill → Bill DB Record → Due-Date Window → Event → Proactive Reminder | `document.intelligence.completed, BILL_DUE` | **PASSED** | Persisted MSEDCL bill (₹4,180.00 due 2026-10-08) and verified proactive reminder generation. |
| **Scenario_D** | Vehicle Service Invoice → Vehicle Asset → MaintenanceRecord & Expense DB → SERVICE_COMPLETED Event | `document.intelligence.completed, SERVICE_COMPLETED` | **PASSED** | Created MaintenanceRecord + Expense (₹7,250.00) for Honda City e:HEV and verified deterministic vehicle TCO rollup. |
| **Scenario_E** | Parents' Health Lab Panel → BioBERT-v1.2 + PubMedQA LoRA Extraction → ParentHealthRecord & Reminder DB → Parents' Health Agent | `document.intelligence.completed, HEALTH_CHECKUP_REMINDER_CREATED` | **PASSED** | Extracted Metropolis HbA1c (5.9%), Fasting Glucose (98.0 mg/dL), Vitamin D3 (34.2 ng/mL), and BP (124/78 mmHg) using fine-tuned dmis-lab/biobert-base-cased-v1.2 + qiaojin/PubMedQA. |
| **Scenario_F** | Travel Booking Voucher → Qwen2-VL + Travel-NER Extraction → TravelRecord & Expense DB → Travel Records Agent | `document.intelligence.completed, TRAVEL_BOOKING_LOGGED` | **PASSED** | Extracted IndiGo PNR K8M4WQ & Taj Lake Palace confirmation #TLP-UDR-88412 (₹48,600.00) for Udaipur trip. |
