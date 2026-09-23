from fractions import Fraction
from pathlib import Path

from fastapi.testclient import TestClient
import pytest

from app.main import app
from app.music.notated_timeline import build_notated_timeline
from app.music.parser import parse_musicxml_bytes


FIXTURES = Path(__file__).parent / "fixtures"
client = TestClient(app)


def analyze(name):
    response = client.post("/api/v1/analyze/musicxml", files={
        "file": (name, (FIXTURES / name).read_bytes(), "application/xml"),
    })
    assert response.status_code == 200, response.text
    return response.json()


def codes(timeline):
    return {d["code"] for d in timeline["diagnostics"]}


def test_staggered_onsets_and_exact_end_boundary():
    data = analyze("timeline_overlap.musicxml")
    t = data["notated_timeline"]
    assert t["status"] == "complete"
    assert t["time_unit"] == "quarter_note"
    assert t["interval_convention"] == "[start,end)"
    events = {e["event_id"]: e for e in t["sustained_events"]}
    first = [e for e in events.values() if e["source_note_ids"][0].startswith("p1:m1:")]
    assert {(e["pitch"], e["start"], e["end"]) for e in first} == {
        ("C4", "0", "4"), ("E4", "1", "2"), ("G4", "1", "2"),
    }
    slices = {(s["start"], s["end"]): s for s in t["slices"]}
    assert {events[e]["pitch"] for e in slices[("1", "2")]["active_event_ids"]} == {"C4", "E4", "G4"}
    assert [events[e]["pitch"] for e in slices[("2", "4")]["active_event_ids"]] == ["C4"]
    assert slices[("4", "5")]["is_silent"]
    assert slices[("8", "12")]["is_silent"]
    assert not data["measures"][0]["detected_chords"], "Timeline sets must not replace same-offset chord detection."


def test_rearticulation_stays_two_events_at_shared_boundary():
    t = analyze("timeline_overlap.musicxml")["notated_timeline"]
    notes = [e for e in t["sustained_events"] if e["source_note_ids"][0].startswith("p1:m2:")]
    assert [(e["pitch"], e["start"], e["end"]) for e in notes] == [("C4", "5", "6"), ("C4", "6", "7")]
    at_six = next(s for s in t["slices"] if s["start"] == "6")
    assert at_six["active_event_ids"] == [notes[1]["event_id"]]


def test_sound_stop_start_with_notated_continue_and_partial_chord_ties():
    t = analyze("timeline_ties.musicxml")["notated_timeline"]
    assert t["status"] == "complete"
    e = t["sustained_events"][0]
    assert (e["pitch"], e["start"], e["end"]) == ("C4", "0", "12")
    assert e["source_note_ids"] == ["p1:m1:n1", "p1:m2:n1", "p1:m3:n1"]
    assert next(n for n in t["source_notes"] if n["note_id"] == "p1:m1:n2")["tie"] == []
    middle = next(n for n in t["source_notes"] if n["note_id"] == "p1:m2:n1")
    assert middle["tie"] == ["start", "stop"]
    assert middle["notation_tie"] == ["continue"]
    assert middle["tie_safe"]
    assert ("E4", "0", "4") in {(e["pitch"], e["start"], e["end"]) for e in t["sustained_events"]}
    assert t["slices"][1]["source_note_ids"] == ["p1:m2:n1", "p1:m2:n2"]


def test_conflicting_sound_and_notation_ties_do_not_merge():
    xml = (FIXTURES / "timeline_ties.musicxml").read_bytes().replace(
        b'<tied type="continue"/>', b'<tied type="start"/>'
    )
    response = client.post("/api/v1/analyze/musicxml", files={"file": ("conflict.musicxml", xml, "application/xml")})
    assert response.status_code == 200, response.text
    t = response.json()["notated_timeline"]
    assert t["status"] == "partial"
    assert "ambiguous_tie_notation" in codes(t)
    assert not next(n for n in t["source_notes"] if n["note_id"] == "p1:m2:n1")["tie_safe"]
    assert all(len(e["source_note_ids"]) == 1 for e in t["sustained_events"])


def test_ordinary_zero_duration_note_is_located_and_not_complete():
    t = analyze("timeline_zero_duration.musicxml")["notated_timeline"]
    assert t["status"] == "partial"
    zero = next(n for n in t["source_notes"] if n["pitch"] == "C4")
    assert zero["duration"] == "0"
    assert any(d["code"] == "zero_duration_note" and d["source_note_ids"] == [zero["note_id"]]
               and d["measure_ids"] == [zero["measure_id"]] for d in t["diagnostics"])
    assert all(zero["note_id"] not in e["source_note_ids"] for e in t["sustained_events"])
    assert [(e["pitch"], e["start"], e["end"]) for e in t["sustained_events"]] == [("D4", "0", "4")]


def test_same_pitch_different_voices_preserves_sources():
    t = analyze("timeline_ties.musicxml")["notated_timeline"]
    notes = [n for n in t["source_notes"] if n["measure_index"] == 4]
    assert {n["voice"] for n in notes} == {"1", "2"}
    assert len(t["slices"][-1]["active_event_ids"]) == 2
    assert len(t["slices"][-1]["source_note_ids"]) == 2


def test_broken_ambiguous_and_missing_identity_ties_do_not_extend():
    t = analyze("timeline_broken_ties.musicxml")["notated_timeline"]
    assert {"tie_time_discontinuity", "orphan_tie_stop", "tie_pitch_mismatch",
            "ambiguous_tie_match", "unclosed_tie_start", "missing_voice_or_staff"} <= codes(t)
    assert len(t["sustained_events"]) == len(t["source_notes"])
    by_id = {n["note_id"]: n for n in t["source_notes"]}
    for e in t["sustained_events"]:
        n = by_id[e["source_note_ids"][0]]
        assert Fraction(e["end"]) == Fraction(n["start"]) + Fraction(n["duration"])
    for d in t["diagnostics"]:
        assert d["measure_ids"]
        assert all(n in by_id for n in d["source_note_ids"])


def test_pickup_meter_change_tuplet_precision_and_repeated_number():
    data = analyze("timeline_meter_tuplets.musicxml")
    t = data["notated_timeline"]
    assert [(m["measure_number"], m["start"], m["end"]) for m in t["measures"]] == [
        ("0", "0", "1"), ("1", "1", "4"), ("1", "4", "6"),
    ]
    assert [n["start"] for n in t["source_notes"]] == ["0", "1", "4/3", "5/3"]
    assert [n["duration"] for n in t["source_notes"]][1:] == ["1/3"] * 3
    assert "repeated_measure_number" in codes(t)
    assert len({m["measure_id"] for m in t["measures"]}) == 3
    assert data["measure_count"] == 3
    assert [m["measure_index"] for m in data["measures"]] == [1, 2, 3]
    assert not data["measures"][2]["notes"], "Repeated display numbers must not merge legacy measures either."


def test_multi_staff_and_transposition_stay_in_written_pitch():
    t = analyze("timeline_staff_transpose.musicxml")["notated_timeline"]
    assert t["pitch_basis"] == "written"
    assert "written_pitch_only" in codes(t)
    assert {n["staff"] for n in t["source_notes"]} == {"1", "2"}
    assert {n["part_id"] for n in t["source_notes"]} == {"P1"}
    assert {n["instrument_id"] for n in t["source_notes"]} == {"I1"}
    assert len(t["sustained_events"]) == 2
    assert {e["pitch"] for e in t["sustained_events"]} == {"C4"}


def test_slur_does_not_merge_and_grace_has_no_invented_duration():
    t = analyze("timeline_slur_grace.musicxml")["notated_timeline"]
    assert len(t["source_notes"]) == 4
    assert len(t["sustained_events"]) == 3
    assert "grace_note_no_duration" in codes(t)
    assert all(len(e["source_note_ids"]) == 1 for e in t["sustained_events"])
    assert next(n for n in t["source_notes"] if n["pitch"] == "D4")["duration"] == "0"


@pytest.mark.parametrize("fixture", sorted(p.name for p in FIXTURES.glob("timeline_*.musicxml")))
def test_ids_repeatable_and_all_references_resolve(fixture):
    first = analyze(fixture)["notated_timeline"]
    second = analyze(fixture)["notated_timeline"]
    assert first == second
    source_ids = {n["note_id"] for n in first["source_notes"]}
    measure_ids = {m["measure_id"] for m in first["measures"]}
    assert len(source_ids) == len(first["source_notes"])
    for diagnostic in first["diagnostics"]:
        assert set(diagnostic["measure_ids"]) <= measure_ids
        assert set(diagnostic["source_note_ids"]) <= source_ids
    events = {e["event_id"]: e for e in first["sustained_events"]}
    for s in first["slices"]:
        assert set(s["source_note_ids"]) <= source_ids
        assert set(s["active_event_ids"]) <= events.keys()
        assert Fraction(s["end"]) > Fraction(s["start"])
        for eid in s["active_event_ids"]:
            e = events[eid]
            assert Fraction(e["start"]) <= Fraction(s["start"]) < Fraction(e["end"])
            assert set(e["source_note_ids"]) <= source_ids


def test_build_is_pure_and_old_analysis_is_not_mutated():
    parsed = parse_musicxml_bytes((FIXTURES / "timeline_ties.musicxml").read_bytes())
    from copy import deepcopy
    before = deepcopy(parsed.measures)
    assert build_notated_timeline(parsed.timeline_source) == build_notated_timeline(parsed.timeline_source)
    assert parsed.measures == before
    assert not parsed.timeline_source.diagnostics


def test_old_explanation_payload_and_computed_empty_are_distinct():
    old = analyze("simple_chords.musicxml")
    del old["notated_timeline"]
    for measure in old["measures"]:
        measure.pop("measure_index")
        measure.pop("harmonic_context")
        for note in measure["analyzed_notes"]:
            note.pop("non_chord_tone_candidate")
    response = client.post("/api/v1/explain/analysis", json={"analysis": old})
    assert response.status_code == 200
    from app.schemas.analysis import MusicXMLAnalysisResponse
    assert MusicXMLAnalysisResponse.model_validate(old).notated_timeline is None
    timeline = analyze("timeline_empty.musicxml")["notated_timeline"]
    assert timeline["status"] == "complete"
    assert timeline["sustained_events"] == []
    assert timeline["slices"][0]["is_silent"]


def test_parts_never_share_tie_sources():
    t = analyze("timeline_parts.musicxml")["notated_timeline"]
    assert len(t["sustained_events"]) == 2
    assert t["sustained_events"][0]["source_note_ids"] == ["p1:m1:n1", "p1:m2:n1"]
    assert t["sustained_events"][1]["source_note_ids"] == ["p2:m1:n1", "p2:m2:n1"]
    assert len(t["slices"][0]["active_event_ids"]) == 2


def test_unsupported_part_alignment_does_not_guess_global_times():
    t = analyze("timeline_misaligned_parts.musicxml")["notated_timeline"]
    assert t["status"] == "unsupported"
    assert "unsupported_timeline_structure" in codes(t)
    assert t["measures"] == t["source_notes"] == t["sustained_events"] == t["slices"] == []
    assert len(t["diagnostics"]) == 1
    failure = t["diagnostics"][0]
    assert "p1:m2" in failure["message"] and "p2:m2" in failure["message"]
    assert failure["measure_ids"] == failure["source_note_ids"] == []


def test_conflicting_part_measure_ends_identify_both_measures():
    xml = (FIXTURES / "timeline_misaligned_parts.musicxml").read_bytes().replace(
        b'</part></score-partwise>',
        b'<measure number="2"><attributes><time><beats>3</beats><beat-type>4</beat-type></time></attributes>'
        b'<note><pitch><step>D</step><octave>4</octave></pitch><duration>3</duration><voice>1</voice></note>'
        b'</measure></part></score-partwise>',
    )
    response = client.post("/api/v1/analyze/musicxml", files={"file": ("grid.xml", xml, "application/xml")})
    assert response.status_code == 200, response.text
    t = response.json()["notated_timeline"]
    assert t["status"] == "unsupported"
    assert t["measures"] == t["source_notes"] == t["sustained_events"] == t["slices"] == []
    assert len(t["diagnostics"]) == 1
    failure = t["diagnostics"][0]
    assert "p1:m2 [4,8)" in failure["message"]
    assert "p2:m2 [4,7)" in failure["message"]
    assert failure["measure_ids"] == failure["source_note_ids"] == []


@pytest.mark.parametrize("old,new,code", [
    (b'<part id="P1">', b'<part>', "ambiguous_part_identity"),
    (b'<voice>1</voice>', b'', "missing_voice_or_staff"),
    (b'<voice>1</voice>', b'<voice>1</voice><notations><tied type="start"/></notations>', "ambiguous_tie_notation"),
    (b'<pitch><step>C</step><octave>4</octave></pitch>', b'<unpitched><display-step>C</display-step><display-octave>4</display-octave></unpitched>', "unsupported_unpitched_note"),
    (b'<time><beats>4</beats><beat-type>4</beat-type></time>', b'', "missing_time_signature"),
])
def test_incomplete_source_identity_and_unsupported_notes_are_diagnosed(old, new, code):
    xml = (FIXTURES / "timeline_overlap.musicxml").read_bytes().replace(old, new)
    response = client.post("/api/v1/analyze/musicxml", files={"file": ("variant.musicxml", xml, "application/xml")})
    assert response.status_code == 200
    t = response.json()["notated_timeline"]
    assert t["status"] == "partial"
    assert code in codes(t)
    assert all(set(d["measure_ids"]) <= {m["measure_id"] for m in t["measures"]}
               and set(d["source_note_ids"]) <= {n["note_id"] for n in t["source_notes"]}
               for d in t["diagnostics"])


def test_missing_part_prevents_otherwise_valid_tie_merging():
    xml = (FIXTURES / "timeline_ties.musicxml").read_bytes().replace(b'<part id="P1">', b'<part>')
    response = client.post("/api/v1/analyze/musicxml", files={"file": ("variant.xml", xml)})
    assert response.status_code == 200
    t = response.json()["notated_timeline"]
    assert "ambiguous_part_identity" in codes(t)
    assert all(len(e["source_note_ids"]) == 1 for e in t["sustained_events"])


def test_missing_staff_in_multistaff_score_prevents_tie_merging():
    xml = (FIXTURES / "timeline_staff_transpose.musicxml").read_bytes().replace(b'<staff>1</staff>', b'').replace(b'<staff>2</staff>', b'')
    response = client.post("/api/v1/analyze/musicxml", files={"file": ("variant.xml", xml)})
    assert response.status_code == 200
    t = response.json()["notated_timeline"]
    assert "missing_voice_or_staff" in codes(t)
    assert all(len(e["source_note_ids"]) == 1 for e in t["sustained_events"])


def test_missing_instrument_identity_prevents_tie_merging():
    xml = (FIXTURES / "timeline_ties.musicxml").read_bytes().replace(
        b'<score-instrument id="I1"><instrument-name>Piano</instrument-name></score-instrument>', b''
    )
    response = client.post("/api/v1/analyze/musicxml", files={"file": ("variant.xml", xml)})
    assert response.status_code == 200
    t = response.json()["notated_timeline"]
    assert "instrument_identity_unavailable" in codes(t)
    assert all(len(e["source_note_ids"]) == 1 for e in t["sustained_events"])
