# HomeIQ Synthetic Household Data (`datasets/synthetic/`)

All synthetic documents in `datasets/evaluation/documents/` and relational seed records in `backend/app/db/seed.py` are 100% fictional and specifically crafted to test Indian household management workflows across HomeIQ's 7 domains without any real personal data (PII).

## Fictional Entities Used

- **Grocery & Supermarkets**: `Sahyadri Fresh Mart (Kothrud, Pune)`, `Deccan Organic Provision Store`
- **Utility Providers**: `MSEDCL Mahavitaran (Fictional Feeder #99)`, `Pune Municipal Water Works (Sim)`
- **Appliance & Electronics Vendors**: `pragati ElectroWorld Pvt Ltd`, `Bosch Fictional Authorized Care`
- **Vehicle Service Centers**: `Deccan AutoWorks Service Hub (MH-12-AB-9090 Fictional Vehicle)`
- **Insurance Providers**: `BharatShield General Insurance Co. Ltd.`

## Intentionally Difficult Edge Cases Included

1. **Unusual Date Formats**: `15-Sep-2026`, `28/09/2026`, `2026.10.08`, and ISO `2026-09-28`.
2. **Multi-Line Items & Ordering**: Receipts and service invoices with multiple items listed in varying orders to test order-invariant bipartite line-item matching.
3. **OCR-Like Noise**: Simulated character substitutions and extra whitespace (`"Sahyadri  Fresh   Mart "`, `"Rs. 1,450.00/-"`).
4. **Missing Optional Fields**: Documents intentionally omitting optional fields (`invoice_number=null`, `units_consumed=null`) to verify that the pipeline does not hallucinate missing values.
5. **Adversarial & Failure Cases**:
   - `eval_0009`: Corrupt/hallucinated line-item sum mismatch (`VALIDATION_ERROR`).
   - `eval_0010`: Blurry low-confidence scan (`confidence=0.48 < 0.70`, `OCR_ERROR` / `VALIDATION_ERROR`).
