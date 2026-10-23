"""Conservative chord recognition over complete, audited notated-duration slices."""

from fractions import Fraction

from music21 import chord as m21_chord, interval as m21_interval, pitch as m21_pitch

from app.music.chord_analyzer import TRIAD_PATTERNS, SEVENTH_PATTERNS
from app.music.timeline_observations import _written_height
from app.schemas.notated_harmony import HarmonyNoteEvidence, NotatedHarmony, NotatedHarmonySlice
from app.schemas.timeline import NotatedTimeline, TimelineDiagnostic


PATTERNS = {**TRIAD_PATTERNS, **SEVENTH_PATTERNS}
SPELLING_INTERVALS = {3: "m3", 4: "M3", 6: "d5", 7: "P5", 8: "A5", 9: "d7", 10: "m7", 11: "M7"}


class UnsafeTimeline(ValueError):
    pass


def _time(value: str) -> Fraction:
    result = Fraction(value)
    if result < 0 or str(result) != value:
        raise UnsafeTimeline("noncanonical_time")
    return result


def _require(condition: bool, code: str) -> None:
    if not condition:
        raise UnsafeTimeline(code)


def _validate(timeline: NotatedTimeline) -> None:
    _require(timeline.status == "complete", "timeline_not_complete")
    _require(not timeline.diagnostics, "timeline_has_diagnostics")
    _require(timeline.pitch_basis == "written", "unsupported_pitch_basis")
    measures = {m.measure_id: m for m in timeline.measures}
    sources = {n.note_id: n for n in timeline.source_notes}
    events = {e.event_id: e for e in timeline.sustained_events}
    _require(len(measures) == len(timeline.measures) and len(sources) == len(timeline.source_notes)
             and len(events) == len(timeline.sustained_events), "duplicate_source_identity")
    grids = {}
    for m in timeline.measures:
        _require(m.part_id is not None and m.measure_index > 0, "measure_identity_incomplete")
        _require(_time(m.end) > _time(m.start), "invalid_measure_interval")
        grids.setdefault(m.part_index, []).append((m.measure_index, _time(m.start), _time(m.end)))
    reference = next(iter(grids.values()), [])
    for grid in grids.values():
        _require(grid == reference, "inconsistent_measure_grid")
    cursor = Fraction(0)
    for expected_index, (index, start, end) in enumerate(reference, 1):
        _require(index == expected_index and start == cursor, "invalid_written_measure_order")
        cursor = end
    for n in timeline.source_notes:
        m = measures.get(n.measure_id)
        _require(m is not None, "source_measure_missing")
        _require(all((n.part_id, n.staff, n.voice, n.instrument_id)), "source_identity_incomplete")
        _require(n.tie_safe, "unsafe_tie_source")
        _require(n.part_id == m.part_id and n.part_index == m.part_index and n.measure_index == m.measure_index,
                 "source_measure_identity_mismatch")
        _require(_time(n.duration) > 0 and _time(m.start) <= _time(n.start)
                 and _time(n.start) + _time(n.duration) <= _time(m.end)
                 and _time(n.start) - _time(m.start) == _time(n.local_start), "source_interval_mismatch")
        _require(_written_height(n.pitch) is not None and m21_pitch.Pitch(n.pitch).octave == n.octave, "invalid_written_pitch")
    owned_sources = []
    for e in timeline.sustained_events:
        _require(bool(e.source_note_ids) and len(set(e.source_note_ids)) == len(e.source_note_ids), "event_source_missing")
        _require(all(sid in sources for sid in e.source_note_ids), "event_source_missing")
        chain = [sources[sid] for sid in e.source_note_ids]
        identity = lambda n: (n.part_index, n.part_id, n.staff, n.voice, n.instrument_id, n.pitch)
        _require(all(n.pitch == e.pitch and identity(n) == identity(chain[0]) for n in chain), "event_identity_mismatch")
        position = _time(e.start)
        for n in chain:
            _require(_time(n.start) == position, "event_source_gap_or_overlap")
            position += _time(n.duration)
        _require(position == _time(e.end) and position > _time(e.start), "event_interval_mismatch")
        owned_sources.extend(e.source_note_ids)
    _require(len(owned_sources) == len(set(owned_sources)) and set(owned_sources) == set(sources), "source_event_ownership_mismatch")
    position = Fraction(0)
    for s in timeline.slices:
        start, end = _time(s.start), _time(s.end)
        _require(start == position and start < end, "invalid_slice_partition")
        position = end
        active = {eid for eid, e in events.items() if _time(e.start) < end and _time(e.end) > start}
        fragments = {sid for sid, n in sources.items() if _time(n.start) < end and _time(n.start) + _time(n.duration) > start}
        _require(active == set(s.active_event_ids) and len(active) == len(s.active_event_ids)
                 and fragments == set(s.source_note_ids) and len(fragments) == len(s.source_note_ids)
                 and s.is_silent == (not active), "slice_source_mismatch")
        _require(all(_time(events[eid].start) <= start and _time(events[eid].end) >= end for eid in active)
                 and all(_time(sources[sid].start) <= start and _time(sources[sid].start) + _time(sources[sid].duration) >= end for sid in fragments),
                 "unsplit_note_boundary")
        expected_measures = {mid for mid, m in measures.items() if _time(m.start) <= start and end <= _time(m.end)}
        _require(expected_measures == set(s.measure_ids) and len(s.measure_ids) == len(grids), "slice_measure_mismatch")
    _require(position == cursor, "incomplete_slice_partition")


def _recognize(result: NotatedHarmonySlice) -> None:
    if not result.notes:
        result.status = "silent"
        return
    pitches = [m21_pitch.Pitch(n.pitch) for n in result.notes]
    spellings: dict[int, set[str]] = {}
    for p in pitches:
        spellings.setdefault(p.pitchClass, set()).add(p.name)
    result.pitch_classes = [name for pc in sorted(spellings) for name in sorted(spellings[pc])]
    if any(len(names) != 1 for names in spellings.values()):
        result.reason_codes = ["enharmonic_spelling_conflict"]
        return
    result.bass = min(pitches, key=lambda p: p.ps).nameWithOctave
    pcs = set(spellings)
    candidates = [(pc, tuple(sorted((other - pc) % 12 for other in pcs))) for pc in sorted(pcs)]
    candidates = [(pc, pattern) for pc, pattern in candidates if pattern in PATTERNS]
    result.candidate_roots = [next(iter(spellings[pc])) for pc, _ in candidates]
    if len(candidates) != 1:
        result.reason_codes = ["ambiguous_root_candidates" if len(candidates) > 1 else
                               "insufficient_distinct_pitches" if len(pcs) < 3 else "unsupported_pitch_set"]
        return
    root_pc, pattern = candidates[0]
    root = m21_pitch.Pitch(next(iter(spellings[root_pc])))
    expected = {root.name} | {m21_interval.Interval(SPELLING_INTERVALS[distance]).transposePitch(root).name for distance in pattern[1:]}
    if expected != {p.name for p in pitches}:
        result.reason_codes = ["unsupported_chord_spelling"]
        return
    chord = m21_chord.Chord(pitches)
    chord.root(root)
    inversion = chord.inversion()
    if inversion != pattern.index((chord.bass().pitchClass - root_pc) % 12):
        result.reason_codes = ["inversion_not_reliable"]
        return
    result.status = "recognized"
    result.root, result.quality = root.name, PATTERNS[pattern]
    result.inversion, result.interval_pattern = inversion, list(pattern)


def analyze_notated_harmony(timeline: NotatedTimeline | None) -> NotatedHarmony | None:
    if timeline is None:
        return None
    result = NotatedHarmony(status="available")
    try:
        _validate(timeline)
    except (UnsafeTimeline, ValueError) as exc:
        code = str(exc) if isinstance(exc, UnsafeTimeline) else "invalid_timeline_time_or_pitch"
        result.status = "unavailable"
        result.diagnostics = [TimelineDiagnostic(code=code, message=f"记谱持续音和弦未计算：{code}。请查阅原时间轴诊断。")]
        return result
    events = {e.event_id: e for e in timeline.sustained_events}
    measures = {m.measure_id: m for m in timeline.measures}
    for index, s in enumerate(timeline.slices, 1):
        measure = measures[s.measure_ids[0]]
        item = NotatedHarmonySlice(
            slice_id=f"notated-harmony:s{index}", measure_index=measure.measure_index,
            measure_ids=s.measure_ids, start=s.start, end=s.end,
            local_start=str(_time(s.start) - _time(measure.start)), local_end=str(_time(s.end) - _time(measure.start)),
            status="unknown",
        )
        for eid in s.active_event_ids:
            event = events[eid]
            item.notes.append(HarmonyNoteEvidence(
                event_id=eid, pitch=event.pitch, onset="new" if _time(event.start) == _time(s.start) else "continuing",
                source_note_ids=[sid for sid in event.source_note_ids if sid in s.source_note_ids],
                event_source_note_ids=event.source_note_ids, event_start=event.start, event_end=event.end,
            ))
        _recognize(item)
        result.slices.append(item)
    return result
