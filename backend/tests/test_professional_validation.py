"""Small CC0 repertoire excerpts, checked against source-notation facts only."""

from hashlib import sha256
from pathlib import Path
import xml.etree.ElementTree as ET

from fastapi.testclient import TestClient

from app.main import app


SCORES = Path(__file__).parent / "fixtures" / "professional"
client = TestClient(app)
FIXTURE_SHA256 = {
    "beethoven_fur_elise_opening.musicxml": "98d8f290c62da03be493fad9a333b96c830d6ba1ef79e582f40e622d9318bd46",
    "mozart_k157_opening.musicxml": "ac43b91ee29b890f3258c40f5454172c9678b0be565635d1db9b6614c09fdb46",
    "mozart_k80_opening.musicxml": "732dd41d8051d6dcd8e0cabc08ec1345a61a11cfc8340a11a987baf8b7c6e9a1",
}


def upload(name: str) -> dict:
    content = (SCORES / name).read_bytes()
    response = client.post("/api/v1/analyze/musicxml", files={
        "file": (name, content, "application/xml"),
    })
    assert response.status_code == 200, response.text
    return response.json()


def source_score(name: str) -> ET.Element:
    content = (SCORES / name).read_bytes()
    assert sha256(content).hexdigest() == FIXTURE_SHA256[name]
    root = ET.fromstring(content)
    assert "CC0" in (root.findtext("identification/rights") or "")
    return root


def event_sources(timeline: dict) -> set[tuple[str, ...]]:
    return {tuple(event["source_note_ids"]) for event in timeline["sustained_events"]}


def test_fur_elise_pickup_and_staggered_notes_are_source_facts():
    root = source_score("beethoven_fur_elise_opening.musicxml")
    part = root.find("part")
    assert part is not None
    assert [measure.get("number") for measure in part.findall("measure")] == [str(n) for n in range(8)]
    opening = part.find("measure")
    assert opening is not None
    assert [(note.findtext("pitch/step"), note.findtext("pitch/alter"), note.findtext("pitch/octave"))
            for note in opening.findall("note")[:2]] == [("E", None, "5"), ("D", "1", "5")]
    assert [note.findtext("staff") for note in opening.findall("note")[:2]] == ["1", "1"]
    assert opening.findall("note")[2].find("rest") is not None

    result = upload("beethoven_fur_elise_opening.musicxml")
    timeline = result["notated_timeline"]
    assert timeline["status"] == "complete"
    assert [(measure["measure_index"], measure["measure_number"])
            for measure in result["measures"]] == [(index + 1, index) for index in range(8)]
    source_pitches = {note["note_id"]: note["pitch"] for note in timeline["source_notes"]}
    assert source_pitches["p1:m1:n1"] == "E5"
    assert source_pitches["p1:m1:n2"] == "D#5"
    events = {event["source_note_ids"][0]: event for event in timeline["sustained_events"]}
    assert events["p1:m1:n1"]["end"] == events["p1:m1:n2"]["start"]
    assert events["p1:m1:n1"]["event_id"] != events["p1:m1:n2"]["event_id"]


def test_k157_four_parts_and_same_part_tie_chain():
    root = source_score("mozart_k157_opening.musicxml")
    parts = root.findall("part")
    assert len(parts) == 4
    assert all(len(part.findall("measure")) == 4 for part in parts)
    viola_measures = parts[2].findall("measure")
    assert [tie.get("type") for tie in viola_measures[0].findall("note/tie")] == ["start"]
    assert [[tie.get("type") for tie in note.findall("tie")]
            for note in viola_measures[1].findall("note")[:2]] == [["stop", "start"], ["stop"]]
    cello_notes = parts[3].findall("measure")[0].findall("note")
    assert len(cello_notes) == 8
    assert all(note.findtext("pitch/step") == "C" and not note.findall("tie") for note in cello_notes)

    timeline = upload("mozart_k157_opening.musicxml")["notated_timeline"]
    assert timeline["status"] == "complete"
    assert {measure["measure_index"] for measure in timeline["measures"]} == {1, 2, 3, 4}
    assert ("p3:m1:n1", "p3:m2:n1", "p3:m2:n2") in event_sources(timeline)
    assert len([event for event in timeline["sustained_events"]
                if event["pitch"] == "C3" and event["source_note_ids"][0].startswith("p4:m1:")]) == 8


def test_k80_part_separation_rests_and_grace_are_reported_conservatively():
    root = source_score("mozart_k80_opening.musicxml")
    parts = root.findall("part")
    assert len(parts) == 4
    assert all(len(part.findall("measure")) == 8 for part in parts)
    violin_two = parts[1].findall("measure")
    assert all(measure.find("note/rest") is not None for measure in violin_two[:2])
    assert parts[0].findall("measure")[1].find("note/grace") is not None

    result = upload("mozart_k80_opening.musicxml")
    timeline = result["notated_timeline"]
    assert len(result["measures"]) == 8
    assert timeline["status"] == "partial"
    assert {
        (item["measure_ids"][0], item["source_note_ids"][0])
        for item in timeline["diagnostics"] if item["code"] == "grace_note_no_duration"
    } == {
        ("p1:m2", "p1:m2:n1"),
        ("p1:m4", "p1:m4:n1"),
        ("p3:m4", "p3:m4:n1"),
    }
    assert not any(note["note_id"].startswith(("p2:m1:", "p2:m2:")) for note in timeline["source_notes"])
    chains = event_sources(timeline)
    assert ("p2:m3:n1", "p2:m4:n1") in chains
    assert ("p1:m6:n9", "p1:m7:n1") in chains
    assert ("p2:m6:n9", "p2:m7:n1") in chains
    assert all(len({source.split(":", 1)[0] for source in chain}) == 1 for chain in chains)


def test_professional_excerpt_response_and_source_ids_are_repeatable():
    first = upload("mozart_k157_opening.musicxml")
    second = upload("mozart_k157_opening.musicxml")
    assert first["notated_timeline"] == second["notated_timeline"]
    assert first["analysis_version"] == "3.11.0"
