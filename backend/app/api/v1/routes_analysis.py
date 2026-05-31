from fastapi import APIRouter, HTTPException, UploadFile, status

from app.music.chord_analyzer import AnalyzedChord
from app.music.chord_analyzer import analyze_measures
from app.music.key_analyzer import GlobalKeyAnalysis, analyze_global_key
from app.music.note_analyzer import (
    AnalyzedNote,
    ChordContext,
    analyze_measure_notes,
)
from app.music.parser import MusicXMLParseError, parse_musicxml_bytes
from app.music.roman_numeral_analyzer import RomanNumeralAnalysis, analyze_roman_numeral
from app.schemas.analysis import (
    AnalyzedNoteEvent,
    ChordEvidence,
    DetectedChord,
    KeyAnalysis,
    MeasureAnalysis,
    NoteAnalysisEvidence,
    MusicXMLAnalysisResponse,
    NoteEvent,
    RelatedChord,
    SourceChordEvent,
)


router = APIRouter()

MVP_WARNINGS = [
    "MVP 3.0 detects chords only from simultaneous pitch sets at identical offsets.",
    "Enharmonic spelling is not key-aware.",
    "Inversion is estimated from the lowest detected pitch.",
    "Roman numeral analysis is based only on the detected global key.",
    "No local modulation or secondary dominant analysis is performed.",
    "Harmonic function labels are basic MVP classifications.",
    "MVP 3.0 note-level analysis prefers same-offset harmony, then may use carried previous chord context within the same measure.",
    "Carried harmony context is a conservative MVP approximation.",
    "It does not perform full sustained harmony, phrase-level harmony, or voice-leading analysis.",
    "A non_chord_tone role means the note is not part of the selected chord context; it is not full classical non-chord tone classification.",
    "Passing tone and neighbor tone detection are not performed in MVP 3.0.",
]

ANALYSIS_VERSION = "3.0.0"
ANALYSIS_SCOPE = [
    "musicxml_input_only",
    "same_offset_vertical_pitch_set",
    "global_key_only",
    "basic_triad_and_seventh_chords",
    "note_level_chord_tone_labeling",
    "carried_previous_chord_within_measure",
]


@router.post("/analyze/musicxml", response_model=MusicXMLAnalysisResponse)
async def analyze_musicxml(file: UploadFile) -> MusicXMLAnalysisResponse:
    if not _looks_like_musicxml(file.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .musicxml and .xml files are supported in MVP 3.0.",
        )

    content = await file.read()
    try:
        parsed_score = parse_musicxml_bytes(content, file.filename or "uploaded.musicxml")
    except MusicXMLParseError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    detected_by_measure = analyze_measures(parsed_score.measures)
    global_key = analyze_global_key(parsed_score.source_stream)
    measures = []
    for measure in parsed_score.measures:
        detected_chords = [
            _to_detected_chord_response(item, global_key)
            for item in detected_by_measure.get(measure.measure_number, [])
        ]
        analyzed_notes = analyze_measure_notes(
            measure,
            [_to_chord_context(item) for item in detected_chords],
        )
        measures.append(
            MeasureAnalysis(
                measure_number=measure.measure_number,
                notes=[
                    NoteEvent(
                        part_id=item.part_id,
                        voice=item.voice,
                        measure_number=item.measure_number,
                        beat=item.beat,
                        offset=item.offset,
                        duration=item.duration,
                        pitch=item.pitch,
                    )
                    for item in measure.notes
                ],
                source_chord_events=[
                    SourceChordEvent(
                        part_id=item.part_id,
                        voice=item.voice,
                        measure_number=item.measure_number,
                        beat=item.beat,
                        offset=item.offset,
                        duration=item.duration,
                        pitches=item.pitches,
                    )
                    for item in measure.source_chord_events
                ],
                detected_chords=detected_chords,
                analyzed_notes=[
                    _to_analyzed_note_response(item)
                    for item in analyzed_notes
                ],
            )
        )

    return MusicXMLAnalysisResponse(
        file_name=file.filename or "uploaded.musicxml",
        measure_count=len(measures),
        analysis_version=ANALYSIS_VERSION,
        analysis_scope=ANALYSIS_SCOPE,
        key_analysis=KeyAnalysis(
            tonic=global_key.tonic,
            mode=global_key.mode,
            confidence=global_key.confidence,
        ),
        warnings=MVP_WARNINGS,
        measures=measures,
    )


def _looks_like_musicxml(file_name: str | None) -> bool:
    if not file_name:
        return True
    return file_name.lower().endswith((".musicxml", ".xml"))


def _to_detected_chord_response(
    item: AnalyzedChord,
    global_key: GlobalKeyAnalysis,
) -> DetectedChord:
    roman_analysis = analyze_roman_numeral(item, global_key)
    evidence = _to_chord_evidence_response(item, roman_analysis)
    return DetectedChord(
        measure_number=item.measure_number,
        beat=item.beat,
        offset=item.offset,
        pitches=item.pitches,
        root=item.root,
        quality=item.quality,
        inversion=item.inversion,
        bass=item.bass,
        roman_numeral=roman_analysis.roman_numeral,
        harmonic_function=roman_analysis.harmonic_function,
        evidence=evidence,
    )


def _to_chord_evidence_response(item: AnalyzedChord, roman_analysis: RomanNumeralAnalysis) -> ChordEvidence:
    return ChordEvidence(
        pitch_classes=item.evidence.pitch_classes,
        pitch_class_numbers=item.evidence.pitch_class_numbers,
        interval_pattern=item.evidence.interval_pattern,
        matched_quality_pattern=item.evidence.matched_quality_pattern,
        bass_pitch=item.evidence.bass_pitch,
        root_source=item.evidence.root_source,
        roman_numeral_source=roman_analysis.source,
        global_key_context=roman_analysis.global_key_context,
        analysis_scope=item.evidence.analysis_scope,
        warnings=item.evidence.warnings + roman_analysis.warnings,
    )


def _to_chord_context(item: DetectedChord) -> ChordContext:
    return ChordContext(
        measure_number=item.measure_number,
        beat=item.beat,
        offset=item.offset,
        root=item.root,
        quality=item.quality,
        roman_numeral=item.roman_numeral,
        pitch_classes=item.evidence.pitch_classes,
        pitch_class_numbers=item.evidence.pitch_class_numbers,
    )


def _to_analyzed_note_response(item: AnalyzedNote) -> AnalyzedNoteEvent:
    related_chord = None
    if item.related_chord is not None:
        related_chord = RelatedChord(
            root=item.related_chord.root,
            quality=item.related_chord.quality,
            roman_numeral=item.related_chord.roman_numeral,
        )

    return AnalyzedNoteEvent(
        part_id=item.part_id,
        voice=item.voice,
        measure_number=item.measure_number,
        beat=item.beat,
        offset=item.offset,
        duration=item.duration,
        pitch=item.pitch,
        pitch_class=item.pitch_class,
        role=item.role,
        related_chord=related_chord,
        possible_non_chord_tone_type=item.possible_non_chord_tone_type,
        evidence=NoteAnalysisEvidence(
            chord_pitch_classes=item.evidence.chord_pitch_classes,
            note_pitch_class=item.evidence.note_pitch_class,
            reason=item.evidence.reason,
            analysis_scope=item.evidence.analysis_scope,
            context_source=item.evidence.context_source,
        ),
    )
