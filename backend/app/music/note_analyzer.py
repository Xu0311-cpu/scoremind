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
class NonChordToneCandidate:
    kind: str
    confidence: str
    reason: str
    limitations: list[str]


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
    non_chord_tone_candidate: NonChordToneCandidate | None
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

    basic = [
        _analyze_note(note, *_find_chord_context(note, measure_chords))
        for note in measure.notes
    ]
    return _compute_nct_candidates(basic)


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
            non_chord_tone_candidate=None,
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
        non_chord_tone_candidate=None,
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
        non_chord_tone_candidate=None,
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


def _to_midi(pitch_name: str) -> int | None:
    try:
        return m21_pitch.Pitch(pitch_name).midi
    except Exception:
        return None


def _compute_nct_candidates(notes: list[AnalyzedNote]) -> list[AnalyzedNote]:
    sorted_notes = sorted(notes, key=lambda n: (n.offset, n.pitch))
    result: list[AnalyzedNote] = []
    for i, note in enumerate(sorted_notes):
        candidate = _compute_single_nct_candidate(note, sorted_notes, i)
        result.append(AnalyzedNote(
            part_id=note.part_id,
            voice=note.voice,
            measure_number=note.measure_number,
            beat=note.beat,
            offset=note.offset,
            duration=note.duration,
            pitch=note.pitch,
            pitch_class=note.pitch_class,
            role=note.role,
            related_chord=note.related_chord,
            possible_non_chord_tone_type=note.possible_non_chord_tone_type,
            non_chord_tone_candidate=candidate,
            evidence=note.evidence,
        ))
    return result


def _compute_single_nct_candidate(
    note: AnalyzedNote,
    all_notes: list[AnalyzedNote],
    index: int,
) -> NonChordToneCandidate:
    if note.role == "chord_tone":
        return NonChordToneCandidate(
            kind="not_applicable",
            confidence="low",
            reason="该音属于当前和弦，不适用非和弦音候选分析。",
            limitations=["当前系统仅对非和弦音进行候选类型推测。"],
        )

    if note.role == "unknown":
        return NonChordToneCandidate(
            kind="unknown_non_chord_tone_candidate",
            confidence="low",
            reason="缺少和声上下文，无法进行非和弦音候选分析。",
            limitations=["缺少和声参考和弦，无法判断非和弦音类型。"],
        )

    prev_note = all_notes[index - 1] if index > 0 else None
    next_note = all_notes[index + 1] if index < len(all_notes) - 1 else None

    if prev_note is None or next_note is None:
        return NonChordToneCandidate(
            kind="unknown_non_chord_tone_candidate",
            confidence="low",
            reason="缺少相邻音符上下文，无法安全判断非和弦音候选类型。",
            limitations=["非和弦音候选类型判断需要同一小节内前后相邻音符。"],
        )

    if prev_note.measure_number != note.measure_number or next_note.measure_number != note.measure_number:
        return NonChordToneCandidate(
            kind="unknown_non_chord_tone_candidate",
            confidence="low",
            reason="相邻音符不在同一小节，无法安全判断非和弦音候选类型。",
            limitations=["当前非和弦音候选分析仅限同一小节内的相邻音符。"],
        )

    curr_midi = _to_midi(note.pitch)
    prev_midi = _to_midi(prev_note.pitch)
    next_midi = _to_midi(next_note.pitch)

    if curr_midi is None or prev_midi is None or next_midi is None:
        return NonChordToneCandidate(
            kind="unknown_non_chord_tone_candidate",
            confidence="low",
            reason="无法解析相邻音符音高。",
            limitations=["音高解析失败，无法进行非和弦音候选分析。"],
        )

    prev_step = curr_midi - prev_midi
    next_step = next_midi - curr_midi

    def _is_step(interval: int) -> bool:
        return abs(interval) in (1, 2)

    # Passing tone candidate: stepwise motion in same direction
    if _is_step(prev_step) and _is_step(next_step):
        if (prev_step > 0 and next_step > 0) or (prev_step < 0 and next_step < 0):
            direction = "上行" if prev_step > 0 else "下行"
            return NonChordToneCandidate(
                kind="passing_tone_candidate",
                confidence="low",
                reason=f"该音（{note.pitch}）在相邻音 {prev_note.pitch} 和 {next_note.pitch} 之间形成可能的级进{direction}经过运动。",
                limitations=[
                    "仅基于同一小节内相邻音符的简单音高关系判断，未考虑节奏、声部、和声节奏等因素。",
                    "这是学习提示，不是最终乐理结论。",
                ],
            )

    # Neighbor tone candidate: prev and next same pitch, current steps away and back
    prev_pc = _pitch_class_number(prev_note.pitch)
    next_pc = _pitch_class_number(next_note.pitch)
    if prev_pc is not None and next_pc is not None and prev_pc == next_pc and _is_step(prev_step):
        return NonChordToneCandidate(
            kind="neighbor_tone_candidate",
            confidence="low",
            reason=f"该音（{note.pitch}）从 {prev_note.pitch} 离开后返回同一音高，可能是辅助音运动。",
            limitations=[
                "仅基于同一小节内相邻音符的简单音高关系判断，未考虑节奏、声部、和声节奏等因素。",
                "这是学习提示，不是最终乐理结论。",
            ],
        )

    return NonChordToneCandidate(
        kind="unknown_non_chord_tone_candidate",
        confidence="low",
        reason="当前只能判断为非和弦音候选，类型暂不确定。",
        limitations=[
            "相邻音符的运动模式不匹配简单经过音或辅助音模式。",
            "系统还不能识别suspension、appoggiatura、échappée等复杂非和弦音类型。",
        ],
    )
