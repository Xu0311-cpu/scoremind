from __future__ import annotations

from dataclasses import dataclass

from music21 import pitch as m21_pitch

from app.music.parser import ParsedMeasure, ParsedNote


@dataclass(frozen=True)
class ChordContext:
    measure_number: int
    beat: float | None
    offset: float
    root: str | None
    quality: str
    roman_numeral: str | None
    pitch_classes: list[str]
    pitch_class_numbers: list[int]


@dataclass(frozen=True)
class RelatedChord:
    root: str | None
    quality: str
    roman_numeral: str | None


@dataclass(frozen=True)
class NoteEvidence:
    chord_pitch_classes: list[str]
    note_pitch_class: str
    reason: str
    analysis_scope: list[str]
    context_source: str


@dataclass(frozen=True)
class AnalyzedNote:
    part_id: str | None
    voice: str | None
    measure_number: int
    beat: float | None
    offset: float
    duration: float | None
    pitch: str
    pitch_class: str
    role: str
    related_chord: RelatedChord | None
    possible_non_chord_tone_type: str | None
    evidence: NoteEvidence


def analyze_measure_notes(
    measure: ParsedMeasure,
    chord_contexts: list[ChordContext],
) -> list[AnalyzedNote]:
    measure_chords = sorted(
        [
            chord
            for chord in chord_contexts
            if chord.measure_number == measure.measure_number
        ],
        key=lambda chord: chord.offset,
    )

    return [
        _analyze_note(note, *_find_chord_context(note, measure_chords))
        for note in measure.notes
    ]


def _find_chord_context(
    note: ParsedNote,
    measure_chords: list[ChordContext],
) -> tuple[ChordContext | None, str]:
    note_offset = _offset_key(note.offset)
    for chord in measure_chords:
        if _offset_key(chord.offset) == note_offset:
            return chord, "same_offset"

    previous_chords = [
        chord
        for chord in measure_chords
        if _offset_key(chord.offset) < note_offset
    ]
    if previous_chords:
        return previous_chords[-1], "carried_previous_chord"

    return None, "none"


def _analyze_note(
    note: ParsedNote,
    chord_context: ChordContext | None,
    context_source: str,
) -> AnalyzedNote:
    note_pitch_class_number = _pitch_class_number(note.pitch)
    note_pitch_class = (
        _pc_to_name(note_pitch_class_number)
        if note_pitch_class_number is not None
        else "unknown"
    )

    if note_pitch_class_number is None:
        return _unknown_note(note, note_pitch_class, "invalid_note_pitch")

    if chord_context is None:
        return _unknown_note(
            note,
            note_pitch_class,
            "no_harmony_context",
        )

    related_chord = RelatedChord(
        root=chord_context.root,
        quality=chord_context.quality,
        roman_numeral=chord_context.roman_numeral,
    )
    if note_pitch_class_number in chord_context.pitch_class_numbers:
        return AnalyzedNote(
            part_id=note.part_id,
            voice=note.voice,
            measure_number=note.measure_number,
            beat=note.beat,
            offset=note.offset,
            duration=note.duration,
            pitch=note.pitch,
            pitch_class=note_pitch_class,
            role="chord_tone",
            related_chord=related_chord,
            possible_non_chord_tone_type=None,
            evidence=NoteEvidence(
                chord_pitch_classes=chord_context.pitch_classes,
                note_pitch_class=note_pitch_class,
                reason=_reason_for_match(context_source),
                analysis_scope=[_analysis_scope_for_context(context_source)],
                context_source=context_source,
            ),
        )

    return AnalyzedNote(
        part_id=note.part_id,
        voice=note.voice,
        measure_number=note.measure_number,
        beat=note.beat,
        offset=note.offset,
        duration=note.duration,
        pitch=note.pitch,
        pitch_class=note_pitch_class,
        role="non_chord_tone",
        related_chord=related_chord,
        possible_non_chord_tone_type=None,
        evidence=NoteEvidence(
            chord_pitch_classes=chord_context.pitch_classes,
            note_pitch_class=note_pitch_class,
            reason=_reason_for_mismatch(context_source),
            analysis_scope=[_analysis_scope_for_context(context_source)],
            context_source=context_source,
        ),
    )


def _unknown_note(note: ParsedNote, note_pitch_class: str, reason: str) -> AnalyzedNote:
    return AnalyzedNote(
        part_id=note.part_id,
        voice=note.voice,
        measure_number=note.measure_number,
        beat=note.beat,
        offset=note.offset,
        duration=note.duration,
        pitch=note.pitch,
        pitch_class=note_pitch_class,
        role="unknown",
        related_chord=None,
        possible_non_chord_tone_type=None,
        evidence=NoteEvidence(
            chord_pitch_classes=[],
            note_pitch_class=note_pitch_class,
            reason=reason,
            analysis_scope=["no_harmony_context"],
            context_source="none",
        ),
    )


def _reason_for_match(context_source: str) -> str:
    if context_source == "carried_previous_chord":
        return "note_pitch_class_matches_carried_previous_chord"
    return "note_pitch_class_matches_same_offset_chord"


def _reason_for_mismatch(context_source: str) -> str:
    if context_source == "carried_previous_chord":
        return "note_pitch_class_not_in_carried_previous_chord"
    return "note_pitch_class_not_in_same_offset_chord"


def _analysis_scope_for_context(context_source: str) -> str:
    if context_source == "carried_previous_chord":
        return "carried_previous_chord_within_measure"
    return "same_offset_harmony_only"


def _offset_key(offset: float) -> float:
    return round(offset, 6)


def _pitch_class_number(pitch_name: str) -> int | None:
    try:
        return int(m21_pitch.Pitch(pitch_name).pitchClass)
    except Exception:
        return None


def _pc_to_name(pc: int) -> str:
    return m21_pitch.Pitch(pc).name
