# Public Dataset Ingestion Adapters (`datasets/public/`)

HomeIQ does **not** commit third-party copyrighted or large binary image datasets directly into Git. Instead, researchers can place downloaded subsets of **CORD-v2** or **ICDAR 2019 SROIE** into this directory and convert them into HomeIQ's canonical ground-truth schema using `backend/app/evaluation/runner.py` (`PublicDatasetAdapter`).

## Supported Public Formats

1. **ICDAR 2019 SROIE (`sroie`)**:
   - Input JSON keys: `{"company": "...", "date": "...", "address": "...", "total": "..."}`
   - Mapped to HomeIQ `ReceiptGroundTruth`: `merchant_name`, `transaction_date`, `total_amount_minor` (converted to integer minor currency units), `currency_code`.

2. **NAVER Clova CORD-v2 (`cord_v2`)**:
   - Input JSON keys: `{"gt_parse": {"menu": [{"nm": "...", "cnt": "...", "price": "..."}], "total": {"total_price": "..."}}}`
   - Mapped to HomeIQ `ReceiptGroundTruth`: `line_items` (`description`, `quantity`, `line_total_minor`) and `total_amount_minor`.
