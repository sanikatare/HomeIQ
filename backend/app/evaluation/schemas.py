"""
HomeIQ — Evaluation Manifest, Ground-Truth & Result Schemas.

Matches the existing `backend/app/schemas/document_extraction.py` and
`backend/app/db/models.py` conventions.
"""
from __future__ import annotations

from datetime import datetime
try:
    from enum import StrEnum
except ImportError:
    from enum import Enum

    class StrEnum(str, Enum):  # type: ignore[no-redef]
        pass
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class EvaluationErrorCategory(StrEnum):
    """
    12 mandatory error classification categories for document, RAG, and agent evaluation.
    """

    OCR_ERROR = "OCR_ERROR"
    DOCUMENT_CLASSIFICATION_ERROR = "DOCUMENT_CLASSIFICATION_ERROR"
    EXTRACTION_ERROR = "EXTRACTION_ERROR"
    NORMALIZATION_ERROR = "NORMALIZATION_ERROR"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    DATABASE_ERROR = "DATABASE_ERROR"
    EMBEDDING_ERROR = "EMBEDDING_ERROR"
    RETRIEVAL_ERROR = "RETRIEVAL_ERROR"
    MODEL_ERROR = "MODEL_ERROR"
    TIMEOUT = "TIMEOUT"
    RATE_LIMIT = "RATE_LIMIT"
    UNKNOWN = "UNKNOWN"


class ManifestDocumentEntry(BaseModel):
    model_config = ConfigDict(extra="forbid")

    document_id: str
    file: str
    document_type: str
    domain: str
    ground_truth: str
    source: Literal["synthetic", "public"] = "synthetic"
    language: str = "en"
    difficulty: Literal["normal", "hard", "adversarial"] = "normal"
    requires_asset_link: bool = False
    asset_role: Literal["appliance", "vehicle"] | None = None
    expected_entities: list[str] = Field(default_factory=list)
    expected_fields: list[str] = Field(default_factory=list)


class EvaluationManifest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    manifest_version: str
    project: str
    created_at: str
    documents: list[ManifestDocumentEntry]


class DocumentGroundTruthEnvelope(BaseModel):
    """
    Ground-truth specification for a single evaluation document.
    """

    model_config = ConfigDict(extra="forbid")

    document_id: str
    expected_category: str
    expected_status: str = "DB_UPDATED"
    expected_error_category: EvaluationErrorCategory | None = None
    expected_domain_tables: list[str] = Field(default_factory=list)
    fields: dict[str, Any] = Field(default_factory=dict)


class FieldComparisonResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    expected: Any
    predicted: Any
    exact_match: bool
    normalized_match: bool
    match: bool
    comparison_mode: Literal["exact", "normalized_text", "numeric_tolerance", "date_iso", "line_items", "null_check"]
    notes: str | None = None


class DocumentEvaluationMetrics(BaseModel):
    model_config = ConfigDict(extra="forbid")

    field_accuracy: float
    exact_match_rate: float
    normalized_match_rate: float
    numeric_date_accuracy: float
    precision: float
    recall: float
    f1: float
    missing_field_rate: float
    extra_field_rate: float
    hallucinated_field_rate: float
    category_correct: bool
    database_tables_matched: bool


class ClassifiedErrorRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    category: EvaluationErrorCategory
    stage: str
    message: str
    expected_failure: bool = False


class DocumentEvaluationResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    document_id: str
    document_type: str
    domain: str
    difficulty: str
    status: Literal["passed", "failed", "partial"]
    expected_pipeline_status: str
    actual_pipeline_status: str
    detected_category: str | None = None
    field_results: dict[str, FieldComparisonResult] = Field(default_factory=dict)
    metrics: DocumentEvaluationMetrics
    created_domain_records: list[dict[str, str]] = Field(default_factory=list)
    errors: list[ClassifiedErrorRecord] = Field(default_factory=list)


class RAGEvaluationCaseResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    case_id: str
    question: str
    domain: str
    expected_answer_facts: list[str]
    expected_source_documents: list[str]
    expected_database_entities: list[str]
    retrieved_document_ids: list[str]
    cited_record_ids: list[str]
    retrieval_relevance: float
    source_citation_correctness: float
    factual_correctness: float
    groundedness: float
    hallucination_or_unsupported_rate: float
    status: Literal["passed", "failed"]


class AgentEvaluationCaseResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    domain: str
    agent_name: str
    test_query: str
    correct_routing: bool
    correct_tool_selection: bool
    correct_database_updates_or_reads: bool
    correct_event_generation: bool
    refusal_of_unsupported_operations: bool
    correct_household_isolation: bool
    error_handling_verified: bool
    status: Literal["passed", "failed"]


class EndToEndScenarioResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scenario_id: str
    title: str
    stages_verified: list[str]
    created_entities: dict[str, str]
    emitted_events: list[str]
    status: Literal["passed", "failed"]
    details: str


class PerCategoryPerformanceSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    document_type: str
    documents_count: int
    passed_count: int
    field_accuracy: float
    precision: float
    recall: float
    f1: float


class PerFieldPerformanceSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    field_name: str
    occurrences: int
    exact_match_rate: float
    normalized_match_rate: float


class CompleteEvaluationReport(BaseModel):
    model_config = ConfigDict(extra="forbid")

    report_id: str
    generated_at: datetime
    execution_mode: Literal["deterministic_ci", "live_gemini"]
    model_configuration: dict[str, Any]
    total_documents: int
    positive_documents_count: int
    adversarial_documents_count: int
    documents_passed: int
    documents_failed: int
    documents_partial: int
    document_classification_accuracy: float
    overall_field_accuracy: float
    overall_exact_match_rate: float
    overall_normalized_match_rate: float
    overall_numeric_date_accuracy: float
    overall_precision: float
    overall_recall: float
    overall_f1: float
    overall_missing_field_rate: float
    overall_extra_field_rate: float
    overall_hallucinated_field_rate: float
    per_document_type: list[PerCategoryPerformanceSummary]
    per_field_performance: list[PerFieldPerformanceSummary]
    error_distribution: dict[str, int]
    document_results: list[DocumentEvaluationResult]
    rag_evaluation_summary: dict[str, float]
    rag_results: list[RAGEvaluationCaseResult]
    agent_results: list[AgentEvaluationCaseResult]
    end_to_end_results: list[EndToEndScenarioResult]
