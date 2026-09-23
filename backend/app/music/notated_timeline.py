"""Build bounded tie events and half-open active sets, independent of harmony."""
from collections import defaultdict
from dataclasses import asdict
from fractions import Fraction

from app.music.timeline_normalizer import NormalizedTimeline, Segment
from app.music.timeline_observations import add_slice_pitch_observations
from app.schemas.timeline import (
    NotatedTimeline, SourceNoteSegment, SustainedNoteEvent, TimelineMeasure, TimelineSlice,
)


def _identity(note: Segment) -> tuple:
    return (note.part_index, note.part_id, note.staff, note.voice, note.instrument_id)


def build_notated_timeline(source: NormalizedTimeline) -> NotatedTimeline:
    # Diagnostics belong to this run; repeated calls must not mutate parsed input.
    diagnostics = list(source.diagnostics)
    result = NotatedTimeline(status="unsupported" if source.unsupported else "complete", diagnostics=diagnostics)
    if source.unsupported:
        return result
    for measure in source.measures:
        data = asdict(measure)
        for key in ("start", "end"):
            data[key] = str(data[key])
        result.measures.append(TimelineMeasure(**data))
    for note in source.notes:
        data = asdict(note)
        for key in ("start", "local_start", "duration"):
            data[key] = str(data[key])
        result.source_notes.append(SourceNoteSegment(**data))

    def warn(code: str, message: str, notes: list[Segment]) -> None:
        from app.schemas.timeline import TimelineDiagnostic
        result.diagnostics.append(TimelineDiagnostic(
            code=code, message=message,
            measure_ids=list(dict.fromkeys(n.measure_id for n in notes)),
            source_note_ids=[n.note_id for n in notes],
        ))

    pitched = [n for n in source.notes if n.duration > 0]
    starts: dict[tuple, list[Segment]] = defaultdict(list)
    ends: dict[tuple, list[Segment]] = defaultdict(list)
    streams: dict[tuple, list[Segment]] = defaultdict(list)
    for n in pitched:
        key = (_identity(n), n.pitch)
        starts[(key, n.start)].append(n)
        ends[(key, n.start + n.duration)].append(n)
        streams[key].append(n)
    # Overlapping unisons cannot be disambiguated by pitch and identity alone.
    ambiguous: set[str] = set()
    for notes in streams.values():
        active: list[Segment] = []
        for n in sorted(notes, key=lambda n: (n.start, n.note_id)):
            active = [p for p in active if p.start + p.duration > n.start]
            if active:
                ambiguous.update([n.note_id, *(p.note_id for p in active)])
            active.append(n)

    previous: dict[str, Segment] = {}
    following: dict[str, Segment] = {}
    for n in pitched:
        if n.tie and (not n.tie_safe or n.note_id in ambiguous):
            warn("unsafe_tie_identity", "Tie retained as separate fragment: identity or overlapping unison is ambiguous.", [n])
        has_stop = "stop" in n.tie
        if not has_stop:
            continue
        key = (_identity(n), n.pitch)
        candidates = ends[(key, n.start)]
        incoming = starts[(key, n.start)]
        if (n.tie_safe and n.note_id not in ambiguous and len(candidates) == 1 and len(incoming) == 1
                and candidates[0].tie_safe and candidates[0].note_id not in ambiguous
                and "start" in candidates[0].tie):
            previous[n.note_id] = candidates[0]
            following[candidates[0].note_id] = n
        else:
            prior_starts = [p for p in pitched if _identity(p) == _identity(n)
                            and "start" in p.tie and p.start < n.start]
            code = "orphan_tie_stop"
            if len(candidates) > 1 or len(incoming) > 1 or n.note_id in ambiguous:
                code = "ambiguous_tie_match"
            elif any(p.pitch == n.pitch and p.start + p.duration != n.start for p in prior_starts):
                code = "tie_time_discontinuity"
            elif any(p.start + p.duration == n.start and p.pitch != n.pitch for p in prior_starts):
                code = "tie_pitch_mismatch"
            warn(code, "No unique continuous same-identity/same-spelling tie predecessor; duration not extended.", [n])
    for n in pitched:
        if "start" in n.tie and n.note_id not in following:
            warn("unclosed_tie_start", "No safe matching continuation; event ends at its written duration.", [n])

    for n in sorted(pitched, key=lambda n: (n.start, n.part_index, n.measure_index, n.source_note_index)):
        if n.note_id in previous:
            continue
        chain = [n]
        while chain[-1].note_id in following:
            chain.append(following[chain[-1].note_id])
        result.sustained_events.append(SustainedNoteEvent(
            event_id=f"event:{n.note_id}", pitch=n.pitch, start=str(n.start),
            end=str(chain[-1].start + chain[-1].duration),
            source_note_ids=[p.note_id for p in chain],
        ))

    # Sweep all boundaries: removals precede additions at t for [t, next_t).
    additions: dict[Fraction, list[tuple[str, str]]] = defaultdict(list)
    removals: dict[Fraction, list[tuple[str, str]]] = defaultdict(list)
    for kind, entries in (
        ("event", [(e.event_id, Fraction(e.start), Fraction(e.end)) for e in result.sustained_events]),
        ("source", [(n.note_id, n.start, n.start + n.duration) for n in pitched]),
        ("measure", [(m.measure_id, m.start, m.end) for m in source.measures if m.end > m.start]),
    ):
        for identifier, start, end in entries:
            additions[start].append((kind, identifier))
            removals[end].append((kind, identifier))
    boundaries = sorted(set(additions) | set(removals))
    active: dict[str, set[str]] = {"event": set(), "source": set(), "measure": set()}
    for start, end in zip(boundaries, boundaries[1:]):
        for kind, identifier in removals[start]:
            active[kind].discard(identifier)
        for kind, identifier in additions[start]:
            active[kind].add(identifier)
        result.slices.append(TimelineSlice(
            start=str(start), end=str(end), measure_ids=sorted(active["measure"]),
            active_event_ids=sorted(active["event"]), source_note_ids=sorted(active["source"]),
            is_silent=not active["event"],
        ))
    if result.diagnostics:
        result.status = "partial"
    add_slice_pitch_observations(result)
    return result
