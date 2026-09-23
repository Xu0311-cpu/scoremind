"""Describe written pitches in each time slice without inferring harmony."""

from fractions import Fraction
import re

from app.schemas.timeline import NotatedTimeline, ObservedWrittenNote, SlicePitchObservation


_PITCH = re.compile(r"^([A-G])(--|##|-|#)?(-?\d+)$")
_SEMITONES = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
_ALTER = {None: 0, "": 0, "--": -2, "-": -1, "#": 1, "##": 2}


def _written_height(pitch: str) -> int | None:
    match = _PITCH.fullmatch(pitch)
    if match is None:
        return None
    step, alter, octave = match.groups()
    return (int(octave) + 1) * 12 + _SEMITONES[step] + _ALTER[alter]


def add_slice_pitch_observations(timeline: NotatedTimeline) -> None:
    events = {event.event_id: event for event in timeline.sustained_events}
    sources = {source.note_id: source for source in timeline.source_notes}
    transposing = any(d.code == "written_pitch_only" for d in timeline.diagnostics)

    for slice_ in timeline.slices:
        active_source_ids = set(slice_.source_note_ids)
        notes: list[ObservedWrittenNote] = []
        reasons: list[str] = []
        if timeline.status != "complete":
            reasons.append("timeline_not_complete")
        if transposing:
            reasons.append("transposing_instrument_written_pitch_only")

        for event_id in slice_.active_event_ids:
            event = events.get(event_id)
            if event is None:
                reasons.append("event_reference_missing")
                continue
            source_ids = [sid for sid in event.source_note_ids if sid in active_source_ids]
            if not source_ids or any(sid not in sources for sid in source_ids):
                reasons.append("source_reference_missing")
            if source_ids and any(sources[sid].pitch != event.pitch for sid in source_ids if sid in sources):
                reasons.append("source_pitch_mismatch")
            notes.append(ObservedWrittenNote(
                event_id=event_id,
                pitch=event.pitch,
                source_note_ids=source_ids,
                onset="new" if Fraction(event.start) == Fraction(slice_.start) else "continuing",
            ))

        if not notes:
            reasons.append("no_active_supported_notes")
        observation = SlicePitchObservation(
            active_notes=notes,
            new_onset_event_ids=[note.event_id for note in notes if note.onset == "new"],
            continuing_event_ids=[note.event_id for note in notes if note.onset == "continuing"],
            reasons=list(dict.fromkeys(reasons)),
        )
        if not observation.reasons:
            heights = {note.event_id: _written_height(note.pitch) for note in notes}
            if any(height is None for height in heights.values()):
                observation.reasons.append("pitch_not_comparable")
            else:
                lowest = min(heights.values())
                bottom = [note for note in notes if heights[note.event_id] == lowest]
                if len({note.pitch for note in bottom}) != 1:
                    observation.reasons.append("enharmonic_lowest_tie")
                else:
                    observation.comparison_status = "available"
                    observation.lowest_written_pitch = bottom[0].pitch
                    observation.lowest_event_ids = [note.event_id for note in bottom]
        slice_.written_pitch_observation = observation
