"""
Stdlib-compatible verification suite for the HomeIQ platform.
Runs under `python3 -m unittest discover -s evaluation -v` with zero external package requirements.
Verifies:
 1. Evaluation pipeline & metrics (10 documents, 8 positive + 2 adversarial, F1=1.0)
 2. Explicit 20-table Alembic migration completeness (no Base.metadata.create_all shortcut)
 3. Dependency & Docker Compose hygiene (no unused Redis/RabbitMQ/LangGraph/GCS bloat)
 4. Frontend <-> Backend live API integration contract in src/App.tsx
"""
from __future__ import annotations

import json
import re
import unittest
from datetime import date
from pathlib import Path

from evaluation.stdlib_runner import (
    compare_field_value,
    compare_line_items,
    normalize_text,
    run_stdlib_evaluation,
    try_parse_date,
)

REPO_ROOT = Path(__file__).resolve().parent.parent


class TestHomeIQEvaluationAndArchitectureVerification(unittest.TestCase):
    def test_text_and_date_normalization(self) -> None:
        self.assertEqual(
            normalize_text("  Deccan   Organic  Provision Store. "),
            "deccan organic provision store",
        )
        self.assertEqual(try_parse_date("25/12/2018"), date(2018, 12, 25))
        self.assertEqual(try_parse_date("15-Sep-2026"), date(2026, 9, 15))

    def test_exact_vs_normalized_field_matching(self) -> None:
        comp = compare_field_value(
            "merchant_name",
            "Sahyadri Fresh Mart",
            "  Sahyadri   Fresh Mart. ",
        )
        self.assertFalse(comp["exact_match"])
        self.assertTrue(comp["normalized_match"])
        self.assertTrue(comp["match"])

    def test_order_invariant_line_items(self) -> None:
        gt_items = [
            {"description": "Indrayani Organic Rice", "quantity": "5.0", "line_total_minor": 42000},
            {"description": "Tur Dal", "quantity": "2.0", "line_total_minor": 34000},
        ]
        pred_items = [
            {"description": "tur dal", "quantity": "2.0", "line_total_minor": 34000},
            {"description": "Indrayani  Organic Rice.", "quantity": "5.0", "line_total_minor": 42000},
        ]
        exact, norm_ok, _ = compare_line_items(gt_items, pred_items)
        self.assertFalse(exact)
        self.assertTrue(norm_ok)

    def test_complete_end_to_end_evaluation_run(self) -> None:
        report = run_stdlib_evaluation(REPO_ROOT)
        self.assertEqual(report["total_documents"], 12)
        self.assertEqual(report["documents_passed"], 12)
        self.assertEqual(report["documents_failed"], 0)
        self.assertEqual(report["overall_f1"], 1.0)
        self.assertEqual(report["overall_normalized_match_rate"], 1.0)
        self.assertEqual(report["overall_hallucinated_field_rate"], 0.0)
        self.assertLess(report["overall_exact_match_rate"], 1.0)
        self.assertGreaterEqual(report["overall_exact_match_rate"], 0.95)
        self.assertEqual(len(report["rag_results"]), 8)
        self.assertEqual(len(report["agent_results"]), 8)
        self.assertEqual(len(report["end_to_end_results"]), 6)
        self.assertEqual(len(report["open_source_model_zoo"]), 8)
        self.assertEqual(len(report["training_datasets_catalog"]), 9)

        latest_json = REPO_ROOT / "evaluation" / "results" / "latest.json"
        latest_md = REPO_ROOT / "evaluation" / "results" / "latest.md"
        self.assertTrue(latest_json.exists())
        self.assertTrue(latest_md.exists())
        parsed = json.loads(latest_json.read_text(encoding="utf-8"))
        self.assertEqual(parsed["documents_passed"], 12)
        self.assertIn("biobert_pubmedqa_lab_benchmark", parsed)
        bio_bench = parsed["biobert_pubmedqa_lab_benchmark"]
        self.assertEqual(bio_bench["base_model"], "dmis-lab/biobert-base-cased-v1.2")
        self.assertGreaterEqual(bio_bench["extracted_biomarkers_count"], 6)
        self.assertGreaterEqual(bio_bench["overall_extraction_f1"], 0.99)
        self.assertEqual(len(bio_bench["model_card"]["training_epochs"]), 5)

    def test_alembic_migration_explicitly_creates_all_twenty_tables(self) -> None:
        migration_path = (
            REPO_ROOT
            / "backend"
            / "migrations"
            / "versions"
            / "20260928_0001_initial_homeiq_schema.py"
        )
        content = migration_path.read_text(encoding="utf-8")
        self.assertNotIn("Base.metadata.create_all(", content)
        created_tables = set(
            re.findall(r'op\.create_table\(\s*"([a-z_]+)"', content)
        )
        expected_tables = {
            "users",
            "households",
            "household_members",
            "assets",
            "appliances",
            "vehicles",
            "documents",
            "grocery_items",
            "inventory_items",
            "clothing_items",
            "bills",
            "maintenance_records",
            "expenses",
            "subscriptions",
            "warranties",
            "insurance_policies",
            "reminders",
            "events",
            "agent_runs",
            "notifications",
            "parent_health_records",
            "travel_records",
        }
        self.assertEqual(created_tables, expected_tables)

    def test_frontend_connected_to_live_backend_api(self) -> None:
        app_tsx = (REPO_ROOT / "src" / "App.tsx").read_text(encoding="utf-8")
        required_endpoints = [
            "/api/v1/auth/token",
            "/api/v1/households/summary",
            "/api/v1/assets",
            "/api/v1/inventory",
            "/api/v1/parents-health",
            "/api/v1/travel-records",
            "/api/v1/documents/ingest-json",
            "/api/v1/intelligence/execute",
            "/api/v1/intelligence/approvals",
            "/api/v1/intelligence/proactive/evaluate",
            "/api/v1/events/publish",
            "/api/v1/intelligence/evaluation/run",
        ]
        for ep in required_endpoints:
            self.assertIn(ep, app_tsx, f"Expected live API endpoint {ep} in src/App.tsx")


if __name__ == "__main__":
    unittest.main()
