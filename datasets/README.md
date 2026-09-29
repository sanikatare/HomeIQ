# HomeIQ — Datasets, Licenses & Document Evaluation Corpus Registry

This directory contains the dataset governance documentation, external public dataset ingestion adapters, synthetic household document fixtures, ground-truth annotations, and machine-readable evaluation manifests for **HomeIQ — AI Household Intelligence & Management Platform**.

---

## 1. Core Governance & Academic Integrity Rules

1. **Zero Private PII**: No real personal household bills, private bank statements, real policy numbers, phone numbers, or personally identifiable information (PII) are stored in this repository. All bundled evaluation documents in `datasets/evaluation/` and `datasets/synthetic/` use 100% fictional Indian household entities (`Sharma-Tare Residence (Pune)` simulation).
2. **No Automatic Downloading of Restricted/Copyrighted Corpora**: Public academic benchmarks (such as SROIE, CORD-v2, FUNSD, XFUND, DocVQA, WildReceipt, and RVL-CDIP) are **not redistributed** inside this repository. Instead, `datasets/public/` and `backend/app/evaluation/public_adapters.py` provide deterministic ingestion converters so researchers who download those datasets from their official sources under their respective licenses can convert them into HomeIQ's evaluation manifest format.
3. **Model Usage Truthfulness**: HomeIQ **does NOT currently fine-tune** any Gemini or open-weights model. Document extraction is performed via **Gemini 2.5 Flash (`gemini-2.5-flash`)** using zero-shot multimodal structured extraction (`response_mime_type="application/json"`, `response_schema=GeminiDocumentAnalysisEnvelope`, `temperature=0.0`) followed by deterministic Pydantic v2 validation and whitelisted SQLAlchemy persistence.

---

## 2. Directory Structure

```text
datasets/
├── public/
│   └── README.md                       # Instructions & schema adapters for public benchmarks (CORD-v2, SROIE, FUNSD)
├── synthetic/
│   └── README.md                       # Documentation for HomeIQ's synthetic household seed & stress corpora
├── evaluation/
│   ├── documents/
│   │   ├── grocery/                    # eval_0001 (normal POS receipt), eval_0007 (OCR-noisy multi-line receipt)
│   │   ├── bills/                      # eval_0002 (electricity bill), eval_0008 (missing-field water bill)
│   │   ├── appliances/                 # eval_0003 (dishwasher invoice), eval_0009 (hallucinated sum mismatch)
│   │   ├── maintenance/                # eval_0004 (AC preventive service invoice)
│   │   ├── vehicles/                   # eval_0005 (Honda City periodic service invoice)
│   │   ├── insurance/                  # eval_0006 (motor comprehensive policy), eval_0010 (low-confidence blurry scan)
│   │   └── warranties/                 # eval_0006b / eval_0003b (manufacturer warranty certificate)
│   ├── ground_truth/
│   │   ├── eval_0001.json ... eval_0010.json
│   └── manifests/
│       └── evaluation_manifest.json    # Machine-readable manifest linking documents, categories, domains & ground truth
└── README.md                           # This dataset inventory and license specification
```

---

## 3. Complete Dataset Inventory (Current In-Repo vs. Public Benchmark Adapters)

### 3.1 Datasets Currently Bundled & Executed in the Repository

| Dataset Name | Source / Creator | Official URL | License | Public or Synthetic | Role in HomeIQ | Supported HomeIQ Domains | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **HomeIQ Evaluation Benchmark Corpus (`eval_0001`–`eval_0010`)** | HomeIQ Capstone Engineering Team | In-repo: `datasets/evaluation/` | Apache-2.0 | Synthetic (Fictional Indian Household Documents) | Document extraction benchmark, field-level P/R/F1 evaluation, error classification, RAG & E2E testing | Core Household Domains (`kitchen_grocery`, `finance_expenses`, `home_maintenance`, `vehicle_mobility`, `documents_warranty`, `laundry_clothing`) | **CURRENTLY USED** |
| **HomeIQ Relational & Vault Seed Dataset (`Sharma-Tare Residence`)** | HomeIQ Capstone Engineering Team | In-repo: `backend/app/db/seed.py` | Apache-2.0 | Synthetic (20-Table Normalized Relational + Vault Seed) | Deterministic SQL rollup testing, multi-agent routing, RAG citation verification, proactive insight evaluation | All Household Domains across all 20 PostgreSQL tables | **CURRENTLY USED** |

---

### 3.2 Verified Public Benchmark Datasets (Supported via Ingestion Adapters / Recommended)

The following public document AI datasets have been verified for academic benchmarking. None of these external datasets are claimed as training data for a fine-tuned model in the current repository; they are documented for external evaluation benchmarking (`datasets/public/`) and planned future supervised fine-tuning (SFT) experiments.

| Dataset Name | Creator / Organization | Official / Canonical URL | Hugging Face / GitHub URL | Document Type & Size | Languages | Annotation Type | License | Allowed Use & Intended HomeIQ Role | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CORD (Consolidated Receipt Dataset v2)** | Clova AI Research, NAVER Corp. | https://github.com/clovaai/cord | https://huggingface.co/datasets/naver-clova-ix/cord-v2 | Retail & restaurant POS receipts (~1,000 images: 800 train, 100 val, 100 test) | English / Indonesian | Bounding boxes + hierarchical key-value JSON (`menu.nm`, `menu.cnt`, `menu.price`, `total.total_price`) | **CC BY 4.0** | Academic & commercial research with attribution. Used via `convert_cord_to_homeiq_ground_truth()` to benchmark `RECEIPT` (`ReceiptExtractionSchema`) in `kitchen_grocery` & `finance_expenses`. | **ADAPTER IMPLEMENTED / EXTERNAL BENCHMARK** |
| **ICDAR 2019 SROIE (Scanned Receipts OCR and Information Extraction)** | ICDAR 2019 Robust Reading Competition | https://rrc.cvc.uab.es/?ch=13 | https://huggingface.co/datasets/darentang/sroie | Scanned store receipts (~973 images: 626 train, 347 test) | English | Word bounding boxes + 4 key-value entities (`company`, `date`, `address`, `total`) | **MIT / Competition Research Terms** | Academic benchmarking of OCR and header extraction (`merchant_name`, `transaction_date`, `total_amount_minor`) for `RECEIPT` and `INVOICE`. | **ADAPTER IMPLEMENTED / EXTERNAL BENCHMARK** |
| **FUNSD (Form Understanding in Noisy Scanned Documents)** | Guillaume Jaume et al. (EPFL / Swisscom) | https://guillaumejaume.github.io/FUNSD/ | https://huggingface.co/datasets/nielsr/funsd | Noisy scanned administrative/contract forms (199 annotated forms, 9,707 semantic entities) | English | Semantic entity labeling (`question`, `answer`, `header`, `other`) + entity linking | **Non-Commercial Research License** (Dataset derived from RVL-CDIP) | **Academic / Non-Commercial Research Only.** Benchmark for `WARRANTY_DOCUMENT` and `INSURANCE_DOCUMENT` key-value linking under scan noise. | **RECOMMENDED / PLANNED** |
| **XFUND (Multilingual Form Understanding Benchmark)** | Microsoft Research & Shanghai Jiao Tong Univ. | https://github.com/doc-analysis/XFUND | https://huggingface.co/datasets/ega/xfund | Multilingual scanned forms across 7 languages (1,393 forms total; 199 per language) | ZH, JA, ES, FR, IT, DE, PT | Key-value semantic entities & relation extraction | **MIT License** (Code/Annotations) | Multilingual form layout generalization study for structured household certificates. | **RECOMMENDED / PLANNED** |
| **DocVQA (Document Visual Question Answering)** | Minesh Mathew et al. (CVC UAB / IIT Hyderabad) | https://www.docvqa.org/ | https://huggingface.co/datasets/lmms-lab/DocVQA | 12,767 document images with 50,000+ question-answer pairs | English | Extractive question-answer spans over multi-layout documents | **Research-Only Terms** (rrc.cvc.uab.es) | **Academic Research Only.** Benchmarking HomeIQ's `SharedRetrievalInterface` (RAG) and `Documents, Warranty & Insurance Agent` QA accuracy. | **RECOMMENDED / PLANNED** |
| **WildReceipt** | OpenMMLab (MMOCR) | https://github.com/open-mmlab/mmocr | https://huggingface.co/datasets/dvgodoy/WildReceipt | 1,768 unconstrained camera-captured receipts with 25 key-value classes (~68,000 text boxes) | English | Polygon bounding boxes + 25 fine-grained key-value tags | **Apache-2.0** (MMOCR toolkit; research use for images) | Benchmarking skew/blur resilience for mobile-uploaded household receipts (`RECEIPT`). | **RECOMMENDED / PLANNED** |
| **RVL-CDIP (Ryerson Vision Lab Complex Document Information Processing)** | Adam Harley et al. (Ryerson University) | https://adamharley.com/rvl-cdip/ | https://huggingface.co/datasets/aharley/rvl_cdip | 400,000 grayscale document images across 16 document classes (invoices, forms, letters, budgets) | English | Document-level category label (16 classes) | **Research Use Only** (Truth Tobacco Industry Documents archive) | Document classification benchmark (`SupportedExtractionCategory` routing). | **RECOMMENDED / PLANNED** |
