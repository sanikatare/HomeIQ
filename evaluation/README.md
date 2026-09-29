# HomeIQ — Dataset & Document Evaluation Framework (`evaluation/`)

This package provides the reproducible evaluation harness for **HomeIQ — AI Household Intelligence & Management Platform**.

## 1. Directory Organization

```text
evaluation/
├── __init__.py
├── run.py                          # CLI entrypoint (`python -m evaluation.run`)
├── configs/
│   └── evaluation_config.json      # Thresholds, numeric tolerances, and category mappings
├── datasets/
│   └── dataset_registry.json       # Registry linking `datasets/evaluation/manifests/evaluation_manifest.json` & public adapters
├── ground_truth/
│   └── schema_mapping.json         # Ground-truth schema definitions mapped to HomeIQ Pydantic v2 models
├── runners/
│   └── __init__.py                 # Re-exports `HomeIQEvaluationRunner` and `PublicDatasetAdapter`
├── metrics/
│   └── __init__.py                 # Re-exports field-level comparison and error classification functions
└── results/
    ├── latest.json                 # Machine-readable evaluation result (canonical artifact)
    └── latest.md                   # Human-readable Markdown evaluation report (canonical artifact)
```

## 2. How to Run the Evaluation

### Deterministic CI / Local Mode (Default — 0 External Gemini Quota Used)

From the repository root:

```bash
python -m evaluation.run
```

Or from inside `backend/`:

```bash
PYTHONPATH=. python -m app.evaluation.run
```

### Live Gemini API Mode (Optional Manual Execution)

Requires `GEMINI_API_KEY` set in `.env`:

```bash
python -m evaluation.run --live-gemini
```
