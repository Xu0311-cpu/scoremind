from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.timeline import ExactTime, TimelineDiagnostic


class HarmonyNoteEvidence(BaseModel):
    event_id: str
    pitch: str
    onset: Literal["new", "continuing"]
    source_note_ids: list[str] = Field(description="Fragments active in this exact interval.")
    event_source_note_ids: list[str] = Field(description="Complete notated source chain for this sustained event.")
    event_start: ExactTime
    event_end: ExactTime


class NotatedHarmonySlice(BaseModel):
    slice_id: str
    measure_index: int
    measure_ids: list[str]
    start: ExactTime
    end: ExactTime
    local_start: ExactTime
    local_end: ExactTime
    status: Literal["recognized", "unknown", "silent"]
    root: str | None = None
    quality: Literal["major", "minor", "diminished", "dominant_seventh", "major_seventh", "minor_seventh", "half_diminished_seventh", "minor_major_seventh"] | None = None
    bass: str | None = None
    inversion: int | None = Field(default=None, ge=0, le=3)
    pitch_classes: list[str] = Field(default_factory=list)
    interval_pattern: list[int] = Field(default_factory=list)
    candidate_roots: list[str] = Field(default_factory=list, description="Chromatic-pattern candidates before conservative ambiguity/spelling checks.")
    reason_codes: list[str] = Field(default_factory=list)
    notes: list[HarmonyNoteEvidence] = Field(default_factory=list)


class NotatedHarmony(BaseModel):
    schema_version: Literal["1"] = "1"
    analyzer_version: str = "3.16.0"
    legacy_analysis_version: str = "3.11.0"
    status: Literal["available", "unavailable"]
    pitch_basis: Literal["written"] = "written"
    time_unit: Literal["quarter_note"] = "quarter_note"
    time_encoding: Literal["reduced_fraction_string"] = "reduced_fraction_string"
    interval_convention: Literal["[start,end)"] = "[start,end)"
    support_scope: list[str] = Field(default_factory=lambda: [
        "complete_reliable_notated_timeline_only", "all_active_pitches_without_exclusions",
        "strict_spelling_basic_triads_and_sevenths", "symmetric_root_sets_withheld",
        "no_roman_function_or_note_role_inheritance", "no_structural_harmony_reduction",
    ])
    slices: list[NotatedHarmonySlice] = Field(default_factory=list)
    diagnostics: list[TimelineDiagnostic] = Field(default_factory=list)
