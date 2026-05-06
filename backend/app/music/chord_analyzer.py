from __future__ import annotations

from dataclasses import dataclass, field

from music21 import pitch as m21_pitch

from app.music.parser import ParsedMeasure


TRIAD_PATTERNS: dict[tuple[int, int, int], str] = {
    (0, 4, 7): "major",
    (0, 3, 7): "minor",
    (0, 3, 6): "diminished",
    (0, 4, 8): "augmented",
}

SEVENTH_PATTERNS: dict[tuple[int, int, int, int], str] = {
    (0, 4, 7, 10): "dominant_seventh",
    (0, 4, 7, 11): "major_seventh",
    (0, 3, 7, 10): "minor_seventh",
    (0, 3, 6, 10): "half_diminished_seventh",
    (0, 3, 6, 9): "diminished_seventh",
    (0, 3, 7, 11): "minor_major_seventh",
}


@dataclass(frozen=True)
class AnalyzedChord:
    measure_number: int
    beat: float | None
    offset: float
    pitches: list[str]
    root: str | None
    quality: str
    inversion: int | None
    bass: str | None
    evidence: "ChordEvidence"


@dataclass(frozen=True)
class ChordEvidence:
    pitch_classes: list[str]
    pitch_class_numbers: list[int]
    interval_pattern: list[int]
    matched_quality_pattern: str | None
    bass_pitch: str | None
    root_source: str | None
    analysis_scope: list[str] = field(
        default_factory=lambda: ["same_offset_vertical_pitch_set", "global_key_only"]
    )
    warnings: list[str] = field(default_factory=list)


def analyze_measures(measures: list[ParsedMeasure]) -> dict[int, list[AnalyzedChord]]:
    return {
        measure.measure_number: analyze_measure(measure)
        for measure in measures
    }


def analyze_measure(measure: ParsedMeasure) -> list[AnalyzedChord]:
    buckets: dict[tuple[float, float], list[str]] = {}

    for note in measure.notes:
        beat = note.beat if note.beat is not None else note.offset + 1
        key = (round(beat, 6), round(note.offset, 6))
        buckets.setdefault(key, []).append(note.pitch)

    detected: list[AnalyzedChord] = []
    for (beat, offset), pitches in sorted(buckets.items(), key=lambda item: item[0]):
        unique_pitches = _unique_preserve_order(pitches)
        if len({_pitch_class(pitch) for pitch in unique_pitches}) < 3:
            continue

        root_pc, quality, interval_pattern = _detect_quality(unique_pitches)
        root_name = _pc_to_name(root_pc) if root_pc is not None else None
        bass = min(unique_pitches, key=_midi_number)
        inversion = _detect_inversion(unique_pitches, root_pc) if root_pc is not None else None
        evidence = _build_chord_evidence(
            pitches=unique_pitches,
            root_pc=root_pc,
            quality=quality,
            interval_pattern=interval_pattern,
            bass=bass,
        )

        detected.append(
            AnalyzedChord(
                measure_number=measure.measure_number,
                beat=beat,
                offset=offset,
                pitches=unique_pitches,
                root=root_name,
                quality=quality,
                inversion=inversion,
                bass=bass,
                evidence=evidence,
            )
        )

    return detected


def _detect_quality(pitches: list[str]) -> tuple[int | None, str, list[int]]:
    pitch_classes = sorted({_pitch_class(pitch) for pitch in pitches})

    for root_pc in pitch_classes:
        intervals = tuple(sorted((pc - root_pc) % 12 for pc in pitch_classes))
        if intervals in SEVENTH_PATTERNS:
            return root_pc, SEVENTH_PATTERNS[intervals], list(intervals)

    for root_pc in pitch_classes:
        intervals = tuple(sorted((pc - root_pc) % 12 for pc in pitch_classes))
        if intervals in TRIAD_PATTERNS:
            return root_pc, TRIAD_PATTERNS[intervals], list(intervals)

    fallback_root_pc = pitch_classes[0]
    fallback_intervals = sorted((pc - fallback_root_pc) % 12 for pc in pitch_classes)
    return None, "unknown", fallback_intervals


def _build_chord_evidence(
    pitches: list[str],
    root_pc: int | None,
    quality: str,
    interval_pattern: list[int],
    bass: str | None,
) -> ChordEvidence:
    pitch_class_numbers = sorted({_pitch_class(pitch) for pitch in pitches})
    warnings = []
    if quality == "unknown":
        warnings.append("unsupported_interval_pattern")

    return ChordEvidence(
        pitch_classes=[_pc_to_name(pc) for pc in pitch_class_numbers],
        pitch_class_numbers=pitch_class_numbers,
        interval_pattern=interval_pattern,
        matched_quality_pattern=None if quality == "unknown" else quality,
        bass_pitch=bass,
        root_source="pitch_class_pattern_match" if root_pc is not None else None,
        warnings=warnings,
    )


def _detect_inversion(pitches: list[str], root_pc: int) -> int | None:
    bass_pc = _pitch_class(min(pitches, key=_midi_number))
    intervals_from_root = sorted((_pitch_class(pitch) - root_pc) % 12 for pitch in pitches)
    unique_intervals = []
    for interval in intervals_from_root:
        if interval not in unique_intervals:
            unique_intervals.append(interval)

    try:
        return unique_intervals.index((bass_pc - root_pc) % 12)
    except ValueError:
        return None


def _pitch_class(pitch_name: str) -> int:
    return int(m21_pitch.Pitch(pitch_name).pitchClass)


def _midi_number(pitch_name: str) -> int:
    parsed = m21_pitch.Pitch(pitch_name)
    if parsed.midi is None:
        return parsed.pitchClass
    return int(parsed.midi)


def _pc_to_name(pc: int) -> str:
    return m21_pitch.Pitch(pc).name


def _unique_preserve_order(values: list[str]) -> list[str]:
    seen = set()
    unique = []
    for value in values:
        if value not in seen:
            seen.add(value)
            unique.append(value)
    return unique
