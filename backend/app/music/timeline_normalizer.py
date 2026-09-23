"""Normalize source identity and exact written time without music21 object IDs.

music21 remains the legacy analysis parser. XML is used here because import can
rename parts, split staves, and discard explicit voice identity on single voices.
"""
from dataclasses import dataclass, field
from fractions import Fraction
import xml.etree.ElementTree as ET

from app.schemas.timeline import TimelineDiagnostic


@dataclass
class Segment:
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
    source_note_index: int
    local_start: Fraction
    start: Fraction
    duration: Fraction
    pitch: str
    octave: int
    tie: list[str]
    notation_tie: list[str]
    tie_safe: bool


@dataclass
class Measure:
    measure_id: str
    part_index: int
    part_id: str | None
    measure_index: int
    measure_number: str
    start: Fraction
    end: Fraction


@dataclass
class NormalizedTimeline:
    measures: list[Measure] = field(default_factory=list)
    notes: list[Segment] = field(default_factory=list)
    diagnostics: list[TimelineDiagnostic] = field(default_factory=list)
    unsupported: bool = False

    def warn(self, code: str, message: str, measure_id: str | None = None,
             note_ids: list[str] | None = None) -> None:
        self.diagnostics.append(TimelineDiagnostic(
            code=code, message=message, measure_ids=[measure_id] if measure_id else [],
            source_note_ids=note_ids or [],
        ))


def normalize_musicxml(content: bytes) -> NormalizedTimeline:
    result = NormalizedTimeline()
    try:
        root = ET.fromstring(content)
        for element in root.iter():
            element.tag = element.tag.rsplit("}", 1)[-1]
        if root.tag != "score-partwise":
            raise ValueError("Only score-partwise is supported by the timeline.")
        parts = root.findall("part")
        if not parts:
            raise ValueError("No parts are present for written-time alignment.")
        ids = [part.get("id") for part in parts]
        for pi, part in enumerate(parts, 1):
            _normalize_part(part, pi, ids, root, result)
        # Locate the first conflicting written measure before discarding global times.
        grids = [[m for m in result.measures if m.part_index == pi]
                 for pi in range(1, len(parts) + 1)]
        for part_index, grid in enumerate(grids[1:], 2):
            for measure_index in range(max(len(grids[0]), len(grid))):
                reference = grids[0][measure_index] if measure_index < len(grids[0]) else None
                current = grid[measure_index] if measure_index < len(grid) else None
                if (reference is None or current is None or
                        (reference.start, reference.end) != (current.start, current.end)):
                    def describe(measure: Measure | None, pi: int) -> str:
                        if measure is None:
                            return f"missing p{pi}:m{measure_index + 1}"
                        return f"{measure.measure_id} [{measure.start},{measure.end})"
                    raise ValueError(
                        f"Part measure grid conflict at written measure {measure_index + 1}: "
                        f"{describe(reference, 1)} vs {describe(current, part_index)}."
                    )
    except (ET.ParseError, ValueError, TypeError, ZeroDivisionError) as exc:
        result.unsupported = True
        # Structural failure exposes no timeline entities, so no diagnostic may refer to one.
        result.diagnostics.clear()
        result.warn("unsupported_timeline_structure", str(exc))
        # Do not expose guessed global times after a structural failure.
        result.measures.clear()
        result.notes.clear()
    return result


def _normalize_part(part: ET.Element, pi: int, ids: list[str | None],
                    root: ET.Element, out: NormalizedTimeline) -> None:
    pid = part.get("id")
    identity_safe = bool(pid and ids.count(pid) == 1)
    definition = next((p for p in root.findall("part-list/score-part") if p.get("id") == pid), None)
    declared_instruments = [] if definition is None else definition.findall("score-instrument")
    instrument_ids = [i.get("id") for i in declared_instruments]
    instruments = {
        i.get("id"): i.findtext("instrument-name")
        for i in declared_instruments if i.get("id") and instrument_ids.count(i.get("id")) == 1
    }
    divisions = None
    nominal = None
    staves = 1
    absolute = Fraction(0)
    display_numbers: set[str] = set()
    for mi, xml_measure in enumerate(part.findall("measure"), 1):
        mid = f"p{pi}:m{mi}"
        number = xml_measure.get("number", "")
        if number in display_numbers:
            out.warn("repeated_measure_number", "Display number repeated; positional measure IDs remain distinct.", mid)
        display_numbers.add(number)
        if not identity_safe:
            out.warn("ambiguous_part_identity", "Missing or duplicate XML part ID; ties cannot be merged.", mid)
        cursor = extent = Fraction(0)
        chord_start = None
        chord_identity = None
        note_index = 0
        for child in xml_measure:
            if child.tag == "attributes":
                if child.find("divisions") is not None:
                    divisions = Fraction(child.findtext("divisions"))
                    if divisions <= 0:
                        raise ValueError(f"{mid}: non-positive divisions.")
                if child.find("staves") is not None:
                    staves = int(child.findtext("staves"))
                time = child.find("time")
                if time is not None:
                    if cursor != 0 or time.get("number") is not None:
                        raise ValueError(f"{mid}: mid-measure or staff-specific meter is not supported.")
                    beats, types = time.findall("beats"), time.findall("beat-type")
                    if not beats or len(beats) != len(types):
                        raise ValueError(f"{mid}: unsupported time signature.")
                    nominal = sum((sum(Fraction(x) for x in b.text.split("+")) * 4 / Fraction(t.text)
                                   for b, t in zip(beats, types)), Fraction(0))
                if child.find("transpose") is not None:
                    out.warn("written_pitch_only", "Transposing instrument: written pitches retained; no concert-pitch conversion.", mid)
                if child.find("measure-style/multiple-rest") is not None:
                    raise ValueError(f"{mid}: condensed multiple-measure rests are not supported.")
            elif child.tag in {"backup", "forward"}:
                if divisions is None:
                    raise ValueError(f"{mid}: duration without divisions.")
                duration = Fraction(child.findtext("duration")) / divisions
                if duration < 0:
                    raise ValueError(f"{mid}: negative cursor duration.")
                cursor += duration if child.tag == "forward" else -duration
                if cursor < 0:
                    raise ValueError(f"{mid}: backup before measure start.")
                extent = max(extent, cursor)
                chord_start = None
            elif child.tag == "note":
                note_index += 1
                nid = f"{mid}:n{note_index}"
                grace = child.find("grace") is not None
                if grace:
                    duration = Fraction(0)
                elif divisions is None or child.find("duration") is None:
                    raise ValueError(f"{nid}: missing divisions or duration.")
                else:
                    duration = Fraction(child.findtext("duration")) / divisions
                if duration < 0:
                    raise ValueError(f"{nid}: negative duration.")
                zero_duration = not grace and duration == 0
                voice = child.findtext("voice") or None
                staff = child.findtext("staff") or ("1" if staves == 1 else None)
                if staff is not None and (not staff.isdigit() or not 1 <= int(staff) <= staves):
                    staff = None
                identity = (voice, staff)
                if child.find("chord") is not None:
                    if chord_start is None or chord_identity != identity:
                        raise ValueError(f"{nid}: chord member without a matching preceding onset.")
                    local_start = chord_start
                else:
                    local_start = cursor
                    chord_start, chord_identity = cursor, identity
                    cursor += duration
                extent = max(extent, local_start + duration)
                if child.find("rest") is not None:
                    if zero_duration:
                        out.warn("zero_duration_note", f"{nid}: Ordinary zero-duration rest omitted from active events.", mid)
                    if grace:
                        out.warn("grace_note_no_duration", f"{nid}: Grace rest has no notated duration.", mid)
                    continue
                p = child.find("pitch")
                if p is None:
                    out.warn("unsupported_unpitched_note", f"{nid}: Unpitched note omitted; active sets may be incomplete.", mid)
                    if zero_duration:
                        out.warn("zero_duration_note", f"{nid}: Ordinary zero-duration note omitted from active events.", mid)
                    if grace:
                        out.warn("grace_note_no_duration", f"{nid}: Grace note has no notated duration.", mid)
                    continue
                step, octave = p.findtext("step"), int(p.findtext("octave"))
                alter = Fraction(p.findtext("alter", "0"))
                if step not in set("ABCDEFG") or alter.denominator != 1 or abs(alter) > 2:
                    out.warn("unsupported_pitch", f"{nid}: Unsupported pitch spelling omitted; active sets may be incomplete.", mid)
                    if zero_duration:
                        out.warn("zero_duration_note", f"{nid}: Ordinary zero-duration note omitted from active events.", mid)
                    if grace:
                        out.warn("grace_note_no_duration", f"{nid}: Grace note has no notated duration.", mid)
                    continue
                if zero_duration:
                    out.warn("zero_duration_note", "Ordinary zero-duration note retained as source but omitted from active events.", mid, [nid])
                if grace:
                    out.warn("grace_note_no_duration", "Grace fragment retained with zero notated time; omitted from active events.", mid, [nid])
                pitch = step + ({-2: "--", -1: "-", 0: "", 1: "#", 2: "##"}[int(alter)]) + str(octave)
                instrument = child.find("instrument")
                iid = instrument.get("id") if instrument is not None else (next(iter(instruments)) if len(instruments) == 1 else None)
                if iid not in instruments:
                    iid = None
                if iid is None:
                    out.warn("instrument_identity_unavailable", "No unique score-instrument identity declared; no instrument/voice assignment inferred.", mid, [nid])
                ties = [t.get("type", "") for t in child.findall("tie")]
                visual = [t.get("type", "") for t in child.findall("notations/tied")]
                visual_types = set(visual)
                if visual_types == {"continue"}:
                    visual_types = {"start", "stop"}
                tie_safe = (len(ties) == len(set(ties)) and set(ties) <= {"start", "continue", "stop"}
                            and len(visual) == len(set(visual)))
                if visual and visual_types != set(ties):
                    tie_safe = False
                if not tie_safe:
                    out.warn("ambiguous_tie_notation", "Inconsistent sound/notation tie tags; fragment will not be joined.", mid, [nid])
                if voice is None or staff is None:
                    out.warn("missing_voice_or_staff", "Voice/staff identity is not explicit enough for tie merging; no melodic identity inferred.", mid, [nid])
                out.notes.append(Segment(
                    nid, mid, pi, pid, iid, instruments.get(iid), staff, voice, mi, number,
                    note_index, local_start, absolute + local_start, duration, pitch, octave,
                    sorted(set(ties) & {"start", "continue", "stop"}),
                    sorted(set(visual) & {"start", "continue", "stop"}),
                    tie_safe and identity_safe and voice is not None and staff is not None
                    and iid is not None and not grace,
                ))
        if nominal is None:
            out.warn("missing_time_signature", "Measure extent taken from explicit durations; trailing unencoded silence is unknown.", mid)
        # A marked pickup or a short first measure uses its written extent.
        length = extent if xml_measure.get("implicit") == "yes" or (mi == 1 and extent > 0 and nominal and extent < nominal) else max(extent, nominal or 0)
        if nominal and extent > nominal:
            out.warn("overfull_measure", "Written duration exceeds the meter; explicit extent retained.", mid)
        out.measures.append(Measure(mid, pi, pid, mi, number, absolute, absolute + length))
        absolute += length
