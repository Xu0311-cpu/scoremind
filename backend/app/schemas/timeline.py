from typing import Annotated, Literal

from pydantic import BaseModel, Field


ExactTime = Annotated[str, Field(pattern=r"^\d+(?:/[1-9]\d*)?$", description="Exact quarter-note units: integer or reduced numerator/denominator string.")]


class TimelineDiagnostic(BaseModel):
    code: str
    message: str
    measure_ids: list[str] = Field(default_factory=list)
    source_note_ids: list[str] = Field(default_factory=list)


class TimelineMeasure(BaseModel):
    measure_id: str
    part_index: int
    part_id: str | None
    measure_index: int = Field(description="One-based written order within the part, never the display number.")
    measure_number: str
    start: ExactTime
    end: ExactTime


class SourceNoteSegment(BaseModel):
    note_id: str
    measure_id: str
    part_index: int
    part_id: str | None
    instrument_id: str | None
    instrument_name: str | None
    staff: str | None
    voice: str | None
    measure_index: int
    measure_number: str
    source_note_index: int = Field(description="One-based XML note element position, including rests.")
    local_start: ExactTime
    start: ExactTime
    duration: ExactTime
    pitch: str
    octave: int
    tie: list[Literal["start", "continue", "stop"]]
    notation_tie: list[Literal["start", "continue", "stop"]]
    tie_safe: bool


class SustainedNoteEvent(BaseModel):
    event_id: str
    pitch: str
    start: ExactTime
    end: ExactTime
    source_note_ids: list[str]


class TimelineSlice(BaseModel):
    start: ExactTime
    end: ExactTime
    measure_ids: list[str]
    active_event_ids: list[str]
    source_note_ids: list[str] = Field(description="Notated fragments active in this slice, not every fragment of a tied event.")
    is_silent: bool = Field(description="No supported pitched event active; inspect diagnostics for omitted input.")


class NotatedTimeline(BaseModel):
    status: Literal["complete", "partial", "unsupported"]
    time_unit: Literal["quarter_note"] = "quarter_note"
    time_encoding: Literal["reduced_fraction_string"] = "reduced_fraction_string"
    interval_convention: Literal["[start,end)"] = "[start,end)"
    pitch_basis: Literal["written"] = "written"
    support_scope: list[str] = Field(default_factory=lambda: [
        "score_partwise_written_order", "notated_duration_only", "explicit_safe_ties_only",
        "no_repeat_expansion", "no_pedal_or_acoustics", "not_used_by_legacy_harmony",
    ])
    measures: list[TimelineMeasure] = Field(default_factory=list)
    source_notes: list[SourceNoteSegment] = Field(default_factory=list)
    sustained_events: list[SustainedNoteEvent] = Field(default_factory=list)
    slices: list[TimelineSlice] = Field(default_factory=list)
    diagnostics: list[TimelineDiagnostic] = Field(default_factory=list)
