from typing import Literal

from pydantic import BaseModel, Field


ChordQuality = Literal[
    "major",
    "minor",
    "diminished",
    "augmented",
    "dominant_seventh",
    "major_seventh",
    "minor_seventh",
    "half_diminished_seventh",
    "diminished_seventh",
    "minor_major_seventh",
    "unknown",
]

HarmonicFunction = Literal["tonic", "predominant", "dominant", "unknown"]
HarmonicContextConfidence = Literal["supported", "partial", "low"]
NoteRole = Literal["chord_tone", "non_chord_tone", "unknown"]
PossibleNonChordToneType = Literal["possible_passing_tone", "possible_neighbor_tone"]
NoteContextSource = Literal["same_offset", "carried_previous_chord", "none"]


class KeyAnalysis(BaseModel):
    tonic: str | None = Field(default=None, description="Detected global tonic, such as C or F#.")
    mode: str | None = Field(default=None, description="Detected global mode, such as major or minor.")
    confidence: float | None = Field(
        default=None,
        description="music21 key-analysis correlation coefficient when available.",
    )


class ChordEvidence(BaseModel):
    pitch_classes: list[str] = Field(description="Unique pitch-class names found in this vertical sonority.")
    pitch_class_numbers: list[int] = Field(description="Unique pitch classes as chromatic numbers 0-11.")
    interval_pattern: list[int] = Field(description="Intervals above the detected root used for quality matching.")
    matched_quality_pattern: str | None = Field(
        default=None,
        description="Chord-quality pattern matched by the deterministic analyzer.",
    )
    bass_pitch: str | None = Field(default=None, description="Lowest detected pitch.")
    root_source: str | None = Field(default=None, description="Method used to identify the chord root.")
    roman_numeral_source: str | None = Field(default=None, description="Method used to produce Roman numeral.")
    global_key_context: str | None = Field(default=None, description="Global key context used for Roman numeral analysis.")
    analysis_scope: list[str] = Field(description="Scope assumptions that apply to this chord analysis.")
    warnings: list[str] = Field(description="Diagnostics warnings for this chord analysis.")


class NoteEvent(BaseModel):
    part_id: str | None = Field(default=None, description="MusicXML part identifier when available.")
    voice: str | None = Field(default=None, description="MusicXML voice identifier when available.")
    measure_number: int = Field(description="MusicXML measure number.")
    beat: float | None = Field(default=None, description="Beat position reported by music21 when available.")
    offset: float = Field(description="Offset within the measure, in quarter lengths.")
    duration: float | None = Field(default=None, description="Duration in quarter lengths when available.")
    pitch: str = Field(description="Pitch name with octave, such as C4 or F#5.")


class SourceChordEvent(BaseModel):
    part_id: str | None = Field(default=None, description="MusicXML part identifier when available.")
    voice: str | None = Field(default=None, description="MusicXML voice identifier when available.")
    measure_number: int = Field(description="MusicXML measure number.")
    beat: float | None = Field(default=None, description="Beat position reported by music21 when available.")
    offset: float = Field(description="Offset within the measure, in quarter lengths.")
    duration: float | None = Field(default=None, description="Duration in quarter lengths when available.")
    pitches: list[str] = Field(description="Pitches that music21 parsed as a source chord event.")


class RelatedChord(BaseModel):
    root: str | None = Field(default=None, description="Detected root of the related same-offset chord.")
    quality: ChordQuality = Field(description="Detected quality of the related same-offset chord.")
    roman_numeral: str | None = Field(
        default=None,
        description="Roman numeral of the related same-offset chord when available.",
    )


class NoteAnalysisEvidence(BaseModel):
    chord_pitch_classes: list[str] = Field(
        description="Pitch classes from the related same-offset detected harmony."
    )
    note_pitch_class: str = Field(description="Pitch class of the analyzed note.")
    reason: str = Field(description="Deterministic reason for the note role classification.")
    analysis_scope: list[str] = Field(description="Scope assumptions for this note-level classification.")
    context_source: NoteContextSource = Field(description="Harmony context source used for note classification.")


class AnalyzedNoteEvent(BaseModel):
    part_id: str | None = Field(default=None, description="MusicXML part identifier when available.")
    voice: str | None = Field(default=None, description="MusicXML voice identifier when available.")
    measure_number: int = Field(description="MusicXML measure number.")
    beat: float | None = Field(default=None, description="Beat position reported by music21 when available.")
    offset: float = Field(description="Offset within the measure, in quarter lengths.")
    duration: float | None = Field(default=None, description="Duration in quarter lengths when available.")
    pitch: str = Field(description="Pitch name with octave, such as C4 or F#5.")
    pitch_class: str = Field(description="Pitch class name of the note, such as C or F#.")
    role: NoteRole = Field(description="Chord-tone role relative to the detected same-offset harmony.")
    related_chord: RelatedChord | None = Field(
        default=None,
        description="Detected chord context used for note classification, when available.",
    )
    possible_non_chord_tone_type: PossibleNonChordToneType | None = Field(
        default=None,
        description="Reserved for future conservative melodic labels; null in the current MVP.",
    )
    evidence: NoteAnalysisEvidence = Field(description="Deterministic evidence for the note-level label.")


class DetectedChord(BaseModel):
    measure_number: int = Field(description="MusicXML measure number.")
    beat: float | None = Field(default=None, description="Beat position for the detected vertical pitch set.")
    offset: float = Field(description="Offset within the measure, in quarter lengths.")
    pitches: list[str] = Field(description="Unique pitches found at this exact measure offset.")
    root: str | None = Field(default=None, description="Detected chord root pitch class name.")
    quality: ChordQuality = Field(default="unknown", description="Detected basic triad or seventh-chord quality.")
    inversion: int | None = Field(
        default=None,
        description="0=root position, 1=first inversion, 2=second inversion, 3=third inversion.",
    )
    bass: str | None = Field(default=None, description="Lowest detected pitch used for inversion estimation.")
    roman_numeral: str | None = Field(
        default=None,
        description="Conservative Roman numeral in the detected global key, when supported.",
    )
    harmonic_function: HarmonicFunction = Field(
        default="unknown",
        description="Basic MVP harmonic function classification derived from the Roman numeral.",
    )
    evidence: ChordEvidence = Field(description="Deterministic evidence used to audit this chord analysis.")


class MeasureHarmonicContext(BaseModel):
    primary_chord_label: str | None = Field(
        default=None,
        description="Human-readable chord label such as C major or G dominant_seventh.",
    )
    primary_root: str | None = Field(default=None, description="Root of the primary chord.")
    primary_quality: ChordQuality = Field(
        default="unknown", description="Quality of the primary chord."
    )
    primary_roman_numeral: str | None = Field(
        default=None, description="Roman numeral of the primary chord when available."
    )
    primary_harmonic_function: HarmonicFunction = Field(
        default="unknown", description="Harmonic function of the primary chord."
    )
    context_source: Literal["detected_chord", "no_detected_chord"] = Field(
        description="Whether the context was derived from a detected chord or not."
    )
    confidence: HarmonicContextConfidence = Field(
        description="supported if roman_numeral and function exist, partial if chord exists but roman/function missing, low if no chord."
    )
    warnings: list[str] = Field(
        default_factory=list, description="Warnings for this harmonic context."
    )


class MeasureAnalysis(BaseModel):
    measure_number: int = Field(description="MusicXML measure number.")
    notes: list[NoteEvent] = Field(description="Flattened note events extracted from this measure.")
    source_chord_events: list[SourceChordEvent] = Field(
        description="Chord events directly parsed from the source MusicXML/music21 stream."
    )
    detected_chords: list[DetectedChord] = Field(
        description="Chords inferred from simultaneous pitch sets at identical measure offsets."
    )
    analyzed_notes: list[AnalyzedNoteEvent] = Field(
        description="Note-level membership check against same-offset or carried previous chord context."
    )
    harmonic_context: MeasureHarmonicContext = Field(
        description="Measure-level harmonic context derived from detected chords."
    )


class MusicXMLAnalysisResponse(BaseModel):
    file_name: str = Field(description="Uploaded file name.")
    measure_count: int = Field(description="Number of parsed measures returned in the response.")
    analysis_version: str = Field(description="Version of the deterministic analysis contract.")
    analysis_scope: list[str] = Field(description="Top-level scope assumptions for this analysis response.")
    key_analysis: KeyAnalysis = Field(description="Global key analysis for the uploaded MusicXML.")
    warnings: list[str] = Field(description="Known MVP limitations that apply to this analysis response.")
    measures: list[MeasureAnalysis] = Field(description="Per-measure note extraction and chord analysis.")
