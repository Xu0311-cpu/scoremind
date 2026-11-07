from pathlib import Path
from copy import deepcopy
import xml.etree.ElementTree as ET

from fastapi.testclient import TestClient
import pytest

from app.main import app
from app.api.v1 import routes_analysis


FIXTURES = Path(__file__).parent / "fixtures"
client = TestClient(app)


def upload(name, xml=None):
    response = client.post("/api/v1/analyze/musicxml", files={
        "file": (name, xml if xml is not None else (FIXTURES / name).read_bytes(), "application/xml"),
    })
    assert response.status_code == 200, response.text
    return response.json()


def test_original_k80_independent_xml_expectation_and_local_isolation():
    # Assert source facts before inspecting any analyzer output; do not derive an oracle from it.
    path = "professional/mozart_k80_opening.musicxml"
    root = ET.fromstring((FIXTURES / path).read_bytes())
    parts = root.findall("part")
    for pi, step, octave, duration in [(0, "D", "5", "24"), (2, "B", "3", "12"), (3, "G", "3", "12")]:
        measure = parts[pi].find("measure")
        assert measure.findtext("attributes/divisions") == "24"
        note = measure.find("note")
        assert (note.findtext("pitch/step"), note.findtext("pitch/octave"), note.findtext("duration")) == (step, octave, duration)
        assert note.findtext("pitch/alter", "0") == "0"
    rest = parts[1].find("measure/note")
    assert rest.find("rest") is not None and rest.findtext("duration") == "72"
    data = upload(path)
    timeline, h = data["notated_timeline"], data["notated_harmony"]
    assert timeline["status"] == "partial" and len(timeline["diagnostics"]) == 3
    assert {sid for d in timeline["diagnostics"] for sid in d["source_note_ids"]} == {"p1:m2:n1", "p1:m4:n1", "p3:m4:n1"}
    assert h["schema_version"] == "2" and h["status"] == "partial"
    assert h["diagnostics"] == timeline["diagnostics"]
    first = h["slices"][0]
    assert (first["start"], first["end"], first["status"], first["root"], first["quality"], first["bass"], first["inversion"]) == ("0", "1/2", "recognized", "G", "major", "G3", 0)
    assert {n["pitch"] for n in first["notes"]} == {"D5", "B3", "G3"}
    assert {sid for n in first["notes"] for sid in n["source_note_ids"]} == {"p1:m1:n1", "p3:m1:n1", "p4:m1:n1"}
    assert [m["measure_index"] for m in h["excluded_measures"]] == [2, 3, 4]
    for m in h["excluded_measures"]:
        assert set(m["measure_ids"]) == {f"p{i}:m{m['measure_index']}" for i in range(1, 5)}
    dependency = h["excluded_measures"][1]
    assert dependency["reason_codes"] == ["tied_dependency_isolated"]
    assert set(dependency["cause_measure_ids"]) == {"p1:m4", "p3:m4"}
    for s in h["slices"]:
        if s["measure_index"] in {2, 3, 4}:
            assert s["status"] == "skipped"
            assert all(s[k] is None for k in ["root", "quality", "bass", "inversion"])
        else:
            assert s["status"] != "skipped"
    # Exact partition, current sources and full chains survive both analyzed and skipped slices.
    assert [(s["start"], s["end"]) for s in h["slices"]] == [(s["start"], s["end"]) for s in timeline["slices"]]
    sources = {n["note_id"]: n for n in timeline["source_notes"]}
    events = {e["event_id"]: e for e in timeline["sustained_events"]}
    for s in h["slices"]:
        for n in s["notes"]:
            assert n["event_source_note_ids"] == events[n["event_id"]]["source_note_ids"]
            assert all(sid in sources and sources[sid]["pitch"] == n["pitch"] for sid in n["source_note_ids"])


def test_grace_tie_dependency_closure_rearticulation_and_rest_boundaries():
    data = upload("local_harmony_grace.musicxml")
    h = data["notated_harmony"]
    assert h["status"] == "partial" and data["notated_timeline"]["status"] == "partial"
    assert [s["status"] for s in h["slices"]] == ["recognized", "skipped", "skipped", "skipped", "recognized", "silent"]
    assert [(s["start"], s["end"]) for s in h["slices"]] == [("0","4"),("4","8"),("8","12"),("12","16"),("16","20"),("20","24")]
    assert [m["measure_index"] for m in h["excluded_measures"]] == [2, 3, 4]
    assert all(m["cause_measure_ids"] == ["p1:m3"] for m in h["excluded_measures"])
    # Measure 5 rearticulates the same pitch, but is not part of either affected chain.
    assert all(n["onset"] == "new" for n in h["slices"][4]["notes"])
    assert {m["measure_number"] for m in data["notated_timeline"]["measures"] if m["measure_index"] in {1, 2, 3}} == {"1"}


def test_repeated_numbers_and_tuplets_are_allowed_only_with_exact_written_grid():
    data = upload("timeline_meter_tuplets.musicxml")
    h = data["notated_harmony"]
    assert h["status"] == "available" and h["excluded_measures"] == []
    assert data["notated_timeline"]["status"] == "partial"
    assert any(s["start"] == "4/3" and s["end"] == "5/3" for s in h["slices"])
    assert {s["measure_index"] for s in h["slices"]} == {1, 2, 3}
    assert [m["measure_index"] for m in data["measures"]] == [1, 2, 3]
    assert [m["measure_number"] for m in data["measures"]] == [0, 1, 1]


def test_repeated_number_only_diagnostics_do_not_hide_other_invalid_input():
    root = ET.fromstring((FIXTURES / "local_harmony_grace.musicxml").read_bytes())
    for grace in root.findall("part/measure/note/grace"):
        # Convert the grace to an ordinary zero-duration fragment, not a grace approximation.
        note = next(n for n in root.findall("part/measure/note") if grace in list(n))
        note.remove(grace)
        ET.SubElement(note, "duration").text = "0"
    h = upload("ordinary-zero.musicxml", ET.tostring(root))["notated_harmony"]
    assert h["status"] == "unavailable" and h["slices"] == []


def test_grace_rest_without_pitched_source_still_isolates_the_whole_measure():
    root = ET.fromstring((FIXTURES / "local_harmony_grace.musicxml").read_bytes())
    note = root.findall("part")[0].findall("measure")[2].find("note")
    note.remove(note.find("pitch"))
    ET.SubElement(note, "rest")
    data = upload("grace-rest.musicxml", ET.tostring(root))
    d = next(d for d in data["notated_timeline"]["diagnostics"] if d["code"] == "grace_note_no_duration")
    assert d["measure_ids"] == ["p1:m3"] and d["source_note_ids"] == []
    assert data["notated_harmony"]["status"] == "partial"
    assert [m["measure_index"] for m in data["notated_harmony"]["excluded_measures"]] == [2, 3, 4]


@pytest.mark.parametrize("name", ["timeline_broken_ties.musicxml", "timeline_staff_transpose.musicxml", "timeline_zero_duration.musicxml", "timeline_misaligned_parts.musicxml", "simple_chords.musicxml"])
def test_other_real_diagnostics_remain_globally_rejected(name):
    h = upload(name)["notated_harmony"]
    assert h["status"] == "unavailable" and h["slices"] == [] and h["diagnostics"]


@pytest.mark.parametrize("damage", ["unknown_diagnostic", "missing_location", "bad_measure_reference", "bad_source_reference", "positive_grace", "source_in_wrong_measure", "missing_event_source", "grid_conflict", "zero_without_grace", "unsafe_tie"])
def test_upload_pipeline_rejects_corrupt_or_unlocatable_evidence_even_in_skipped_measure(monkeypatch, damage):
    original = routes_analysis.build_notated_timeline

    def damaged(source):
        t = original(source).model_copy(deep=True)
        grace = next(d for d in t.diagnostics if d.code == "grace_note_no_duration")
        if damage == "unknown_diagnostic":
            grace.code = "future_unsupported_diagnostic"
        elif damage == "missing_location":
            grace.measure_ids = []
        elif damage == "bad_measure_reference":
            grace.measure_ids = ["missing"]
        elif damage == "bad_source_reference":
            grace.source_note_ids = ["missing"]
        elif damage == "positive_grace":
            grace.source_note_ids = ["p1:m3:n2"]
        elif damage == "source_in_wrong_measure":
            grace.source_note_ids = ["p1:m1:n1"]
        elif damage == "missing_event_source":
            next(e for e in t.sustained_events if "p1:m3:n2" in e.source_note_ids).source_note_ids = ["missing"]
        elif damage == "grid_conflict":
            next(m for m in t.measures if m.measure_id == "p2:m3").end = "11"
        elif damage == "zero_without_grace":
            next(n for n in t.source_notes if n.note_id == "p1:m3:n2").duration = "0"
        else:
            next(n for n in t.source_notes if n.note_id == "p1:m3:n2").tie_safe = False
        return t

    monkeypatch.setattr(routes_analysis, "build_notated_timeline", damaged)
    h = upload("local_harmony_grace.musicxml")["notated_harmony"]
    assert h["status"] == "unavailable" and h["slices"] == [] and h["excluded_measures"] == []
    assert all(not d["measure_ids"] and not d["source_note_ids"] for d in h["diagnostics"])


def test_local_module_preserves_old_api_fields_and_source_timeline(monkeypatch):
    data = upload("professional/mozart_k80_opening.musicxml")
    monkeypatch.setattr(routes_analysis, "analyze_notated_harmony", lambda _: None)
    old = upload("professional/mozart_k80_opening.musicxml")
    for key in ["analysis_version", "measures", "key_analysis", "notated_timeline", "analysis_scope"]:
        assert data[key] == old[key]
    assert data["analysis_version"] == "3.11.0"


def test_partial_explanation_counts_skipped_unknown_and_analyzed_separately():
    data = upload("local_harmony_grace.musicxml")
    response = client.post("/api/v1/explain/analysis", json={"analysis": data})
    assert response.status_code == 200
    summary = response.json()["summary"]
    assert "已分析 3 片，跳过 3 片" in summary
    assert "识别未知 0 片、记谱静默 1 片" in summary
    assert "隔离书面小节：2、3、4" in summary
    text = response.json()["sections"][0]["text"]
    assert "输入受影响，本区间未计算" in text and "记谱静默" in text
    assert "书面第 5 小节，四分音符偏移 [0,4)：C 大三和弦" in text


def test_all_isolated_is_zero_analyzed_not_silent_or_unknown():
    root = ET.fromstring((FIXTURES / "local_harmony_grace.musicxml").read_bytes())
    grace = deepcopy(root.findall("part")[0].findall("measure")[2].find("note"))
    for part in root.findall("part"):
        for measure in part.findall("measure")[1:]:
            part.remove(measure)
    root.findall("part")[0].find("measure").insert(1, grace)
    data = upload("all-isolated.musicxml", ET.tostring(root))
    h = data["notated_harmony"]
    assert h["status"] == "partial" and len(h["slices"]) == 1
    assert h["slices"][0]["status"] == "skipped" and h["slices"][0]["bass"] is None
    result = client.post("/api/v1/explain/analysis", json={"analysis": data})
    assert result.status_code == 200
    assert "已分析 0 片，跳过 1 片" in result.json()["summary"]
    assert "识别未知 0 片、记谱静默 0 片" in result.json()["summary"]


def test_v1_and_missing_harmony_json_remain_explainable():
    data = upload("professional/mozart_k157_opening.musicxml")
    data["notated_harmony"]["schema_version"] = "1"
    data["notated_harmony"]["analyzer_version"] = "3.16.0"
    del data["notated_harmony"]["excluded_measures"]
    r = client.post("/api/v1/explain/analysis", json={"analysis": data})
    assert r.status_code == 200 and r.json()["notated_harmony_version"] == "3.16.0"
    assert "C 大三和弦" in r.json()["sections"][0]["text"]
    del data["notated_harmony"]
    assert client.post("/api/v1/explain/analysis", json={"analysis": data}).status_code == 200


@pytest.mark.parametrize("v2_field", ["status", "slices", "excluded_measures"])
def test_new_states_cannot_be_mislabeled_as_v1_in_explanation_payload(v2_field):
    data = upload("local_harmony_grace.musicxml")
    h = data["notated_harmony"]
    if v2_field == "slices":
        h["status"], h["excluded_measures"] = "available", []
    elif v2_field == "excluded_measures":
        h["status"], h["slices"] = "available", []
    else:
        h["slices"], h["excluded_measures"] = [], []
    h["schema_version"] = "1"
    response = client.post("/api/v1/explain/analysis", json={"analysis": data})
    assert response.status_code == 422
