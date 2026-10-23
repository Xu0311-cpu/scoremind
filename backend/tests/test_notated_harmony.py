from collections import Counter
from copy import deepcopy
from fractions import Fraction
from pathlib import Path
import xml.etree.ElementTree as ET

from fastapi.testclient import TestClient
import pytest

from app.main import app
from app.music.notated_harmony import analyze_notated_harmony
from app.schemas.timeline import NotatedTimeline


FIXTURES = Path(__file__).parent / "fixtures"
client = TestClient(app)


def upload(name, xml=None):
    response = client.post("/api/v1/analyze/musicxml", files={"file": (name, xml if xml is not None else (FIXTURES / name).read_bytes(), "application/xml")})
    assert response.status_code == 200, response.text
    return response.json()


def repeated_chord_xml(measure_count):
    """Scale a project-authored fixture, not a repertoire accuracy reference."""
    root = ET.fromstring((FIXTURES / "notated_harmony_inversions.musicxml").read_bytes())
    part = root.find("part")
    template = deepcopy(part.find("measure"))
    template.find("attributes/divisions").text = "2"
    notes = template.findall("note")
    for note in notes:
        note.find("duration").text = "1"
        template.remove(note)
    for _ in range(8):
        template.extend(deepcopy(notes))
    for measure in part.findall("measure"):
        part.remove(measure)
    for index in range(1, measure_count + 1):
        measure = deepcopy(template)
        measure.set("number", str(index))
        part.append(measure)
    return ET.tostring(root)


def test_k157_fixed_positive_and_negative_without_editing_original_notes():
    data = upload("professional/mozart_k157_opening.musicxml")
    harmony = data["notated_harmony"]
    assert harmony["status"] == "available"
    good = next(s for s in harmony["slices"] if (s["start"], s["end"]) == ("2", "5/2"))
    assert (good["root"], good["quality"], good["bass"], good["inversion"]) == ("C", "major", "C3", 0)
    assert good["pitch_classes"] == ["C", "E", "G"]
    assert good["interval_pattern"] == [0, 4, 7]
    assert good["measure_index"] == 1 and good["local_start"] == "2"
    assert {n["source_note_ids"][0]: n["pitch"] for n in good["notes"]} == {
        "p1:m1:n3": "E4", "p2:m1:n3": "C4", "p3:m1:n1": "G3", "p4:m1:n5": "C3",
    }
    assert next(n for n in good["notes"] if n["pitch"] == "G3")["onset"] == "continuing"
    bad = next(s for s in harmony["slices"] if (s["start"], s["end"]) == ("3/2", "2"))
    assert bad["status"] == "unknown" and bad["root"] is None
    assert bad["reason_codes"] == ["unsupported_pitch_set"]
    assert {n["pitch"] for n in bad["notes"]} == {"D4", "B3", "G3", "C3"}
    assert all("roman_numeral" not in s and "harmonic_function" not in s for s in harmony["slices"])


@pytest.mark.parametrize("index,root,quality,bass,inversion", [
    (1, "C", "major", "C3", 0), (2, "C", "major", "E3", 1), (3, "C", "major", "G2", 2),
    (4, "G", "dominant_seventh", "G2", 0), (5, "G", "dominant_seventh", "B2", 1),
    (6, "G", "dominant_seventh", "D3", 2), (7, "G", "dominant_seventh", "F3", 3),
    (11, "C", "minor_major_seventh", "C3", 0),
])
def test_exact_triad_and_seventh_inversions(index, root, quality, bass, inversion):
    h = upload("notated_harmony_inversions.musicxml")["notated_harmony"]
    assert h["status"] == "available"
    s = next(s for s in h["slices"] if s["measure_index"] == index)
    assert (s["root"], s["quality"], s["bass"], s["inversion"]) == (root, quality, bass, inversion)
    assert s["status"] == "recognized"


def test_spelling_conflicts_and_nonoverlapping_arpeggio_are_not_forced():
    h = upload("notated_harmony_inversions.musicxml")["notated_harmony"]
    bad_spelling = next(s for s in h["slices"] if s["measure_index"] == 8)
    assert bad_spelling["reason_codes"] == ["unsupported_chord_spelling"]
    enharmonic = next(s for s in h["slices"] if s["measure_index"] == 9)
    assert enharmonic["reason_codes"] == ["enharmonic_spelling_conflict"]
    assert enharmonic["bass"] is None
    assert all(s["status"] != "recognized" for s in h["slices"] if s["measure_index"] in [8, 9, 10])
    assert [s["status"] for s in h["slices"] if s["measure_index"] == 10] == ["unknown", "unknown", "unknown", "silent"]


def test_quality_whitelist_and_symmetric_multiroot_sets_through_real_xml():
    # Add only explicit source identity to the old quality matrix, without changing a pitch or duration.
    root = ET.fromstring((FIXTURES / "chord_quality_matrix.musicxml").read_bytes())
    instrument = ET.SubElement(root.find("part-list/score-part"), "score-instrument", id="I1")
    ET.SubElement(instrument, "instrument-name").text = "Piano"
    for note in root.findall("part/measure/note"):
        ET.SubElement(note, "voice").text = "1"
    h = upload("matrix.musicxml", ET.tostring(root))["notated_harmony"]
    assert h["status"] == "available"
    expected = {1: "major", 2: "major", 3: "minor", 4: "diminished", 6: "dominant_seventh", 7: "major_seventh", 8: "minor_seventh", 9: "half_diminished_seventh"}
    for s in h["slices"]:
        index = s["measure_index"]
        if index in expected:
            assert s["quality"] == expected[index] and s["status"] == "recognized"
        if index in [5, 10]:
            assert s["status"] == "unknown" and s["reason_codes"] == ["ambiguous_root_candidates"]
            assert len(s["candidate_roots"]) > 1 and s["root"] is None


def test_staggered_onsets_exact_end_rest_and_sources():
    h = upload("timeline_overlap.musicxml")["notated_harmony"]
    assert h["status"] == "available"
    lookup = {(s["start"], s["end"]): s for s in h["slices"]}
    assert lookup[("1", "2")]["quality"] == "major"
    assert next(n for n in lookup[("1", "2")]["notes"] if n["pitch"] == "C4")["onset"] == "continuing"
    assert [n["pitch"] for n in lookup[("2", "4")]["notes"]] == ["C4"]
    assert lookup[("4", "5")]["status"] == "silent"
    assert lookup[("8", "12")]["status"] == "silent"


def test_tied_chord_chain_and_rearticulation_never_compress_away_evidence():
    data = upload("notated_harmony_ties.musicxml")
    h = data["notated_harmony"]
    assert h["status"] == "available"
    for s in h["slices"][:3]:
        assert s["quality"] == "major" and s["inversion"] == 0
    middle = h["slices"][1]
    c = next(n for n in middle["notes"] if n["pitch"] == "C4")
    assert (c["event_start"], c["event_end"], c["onset"]) == ("0", "12", "continuing")
    assert c["source_note_ids"] == ["p1:m2:n1"]
    assert c["event_source_note_ids"] == ["p1:m1:n1", "p1:m2:n1", "p1:m3:n1"]
    assert h["slices"][3]["status"] == "silent"
    replay = [s for s in h["slices"] if s["measure_index"] == 5]
    assert [s["status"] for s in replay] == ["recognized", "recognized", "silent"]
    assert all(n["onset"] == "new" for s in replay[:2] for n in s["notes"])
    assert {n["event_id"] for n in replay[0]["notes"]}.isdisjoint({n["event_id"] for n in replay[1]["notes"]})


@pytest.mark.parametrize("name", ["timeline_broken_ties.musicxml", "timeline_staff_transpose.musicxml", "timeline_zero_duration.musicxml", "timeline_meter_tuplets.musicxml", "timeline_misaligned_parts.musicxml", "professional/mozart_k80_opening.musicxml", "simple_chords.musicxml"])
def test_unsafe_or_incomplete_inputs_have_no_harmony_claims(name):
    data = upload(name)
    h = data["notated_harmony"]
    assert h["status"] == "unavailable" and h["slices"] == []
    assert h["diagnostics"]
    if name == "timeline_meter_tuplets.musicxml":
        assert [m["measure_index"] for m in data["measures"]] == [1, 2, 3]
        assert [m["measure_number"] for m in data["measures"]] == [0, 1, 1]


def test_sources_and_fractions_are_stable_and_resolvable():
    data = upload("professional/mozart_k157_opening.musicxml")
    assert data["notated_harmony"] == upload("professional/mozart_k157_opening.musicxml")["notated_harmony"]
    t = data["notated_timeline"]
    sources = {n["note_id"]: n for n in t["source_notes"]}
    events = {e["event_id"]: e for e in t["sustained_events"]}
    for s in data["notated_harmony"]["slices"]:
        assert str(Fraction(s["start"])) == s["start"] and Fraction(s["start"]) < Fraction(s["end"])
        for n in s["notes"]:
            assert n["event_source_note_ids"] == events[n["event_id"]]["source_note_ids"]
            assert all(sid in sources and sources[sid]["pitch"] == n["pitch"] for sid in n["source_note_ids"])


def test_repeated_display_numbers_preserve_positions_and_refuse_partial_timeline():
    root = ET.fromstring((FIXTURES / "notated_harmony_inversions.musicxml").read_bytes())
    for measure in root.findall("part/measure"):
        measure.set("number", "1")
    repeated = upload("repeated.musicxml", ET.tostring(root))
    assert repeated["notated_timeline"]["status"] == "partial"
    assert {d["code"] for d in repeated["notated_timeline"]["diagnostics"]} == {"repeated_measure_number"}
    assert repeated["notated_harmony"]["status"] == "unavailable"
    assert repeated["notated_harmony"]["slices"] == []
    assert repeated["notated_harmony"]["diagnostics"][0]["code"] == "timeline_not_complete"
    assert [m["measure_number"] for m in repeated["measures"]] == [1] * 11
    assert [m["measure_index"] for m in repeated["measures"]] == list(range(1, 12))
    assert len({m["measure_id"] for m in repeated["notated_timeline"]["measures"]}) == 11


def test_new_module_does_not_mutate_legacy_analysis(monkeypatch):
    from app.api.v1 import routes_analysis
    before = upload("professional/mozart_k157_opening.musicxml")
    monkeypatch.setattr(routes_analysis, "analyze_notated_harmony", lambda _: None)
    legacy = upload("professional/mozart_k157_opening.musicxml")
    for key in ["measures", "key_analysis", "notated_timeline", "analysis_version", "analysis_scope"]:
        assert before[key] == legacy[key]
    assert before["analysis_version"] == "3.11.0"


def test_missing_new_field_keeps_old_explanation_compatible_and_new_sections_are_separate():
    data = upload("professional/mozart_k157_opening.musicxml")
    new = client.post("/api/v1/explain/analysis", json={"analysis": data})
    assert new.status_code == 200
    assert new.json()["notated_harmony_version"] == "3.16.0"
    section = new.json()["sections"][0]
    assert "[2,5/2)" in section["text"] and "C 大三和弦" in section["text"] and "此前延续音 G3" in section["text"]
    assert "罗马数字" not in section["text"]
    del data["notated_harmony"]
    old = client.post("/api/v1/explain/analysis", json={"analysis": data})
    assert old.status_code == 200 and old.json()["notated_harmony_version"] is None


def test_corrupted_references_refuse_analysis_without_dangling_diagnostics():
    t = NotatedTimeline.model_validate(upload("timeline_overlap.musicxml")["notated_timeline"])
    before = deepcopy(t)
    t.slices[0].active_event_ids = ["missing"]
    h = analyze_notated_harmony(t)
    assert h.status == "unavailable" and h.slices == []
    assert h.diagnostics[0].code == "slice_source_mismatch"
    assert h.diagnostics[0].source_note_ids == []
    assert analyze_notated_harmony(before).status == "available"


def test_explanation_does_not_invent_missing_recognized_chord_fields():
    data = upload("professional/mozart_k157_opening.musicxml")
    item = next(s for s in data["notated_harmony"]["slices"] if s["start"] == "2")
    item["root"], item["quality"], item["inversion"] = None, None, None
    response = client.post("/api/v1/explain/analysis", json={"analysis": data})
    assert response.status_code == 200
    text = response.json()["sections"][0]["text"]
    assert "[2,5/2)：识别字段不完整，暂不解释和弦。" in text


def test_safe_fractional_xml_keeps_exact_boundaries_and_missing_voice_is_not_guessed():
    xml = (FIXTURES / "timeline_overlap.musicxml").read_bytes().replace(b"<divisions>1</divisions>", b"<divisions>3</divisions>")
    h = upload("fractional.musicxml", xml)["notated_harmony"]
    assert h["status"] == "available"
    s = next(s for s in h["slices"] if s["start"] == "1/3")
    assert s["end"] == "2/3" and s["quality"] == "major"
    no_voice = xml.replace(b"<voice>1</voice>", b"").replace(b"<voice>2</voice>", b"")
    missing = upload("missing-voice.musicxml", no_voice)
    unsafe = missing["notated_harmony"]
    assert unsafe["status"] == "unavailable" and unsafe["slices"] == []
    assert unsafe["diagnostics"][0]["code"] == "timeline_not_complete"
    assert "missing_voice_or_staff" in {d["code"] for d in missing["notated_timeline"]["diagnostics"]}


def test_computed_rest_only_is_distinct_from_not_computed():
    h = upload("timeline_empty.musicxml")["notated_harmony"]
    assert h["status"] == "available" and all(s["status"] == "silent" for s in h["slices"])
    assert analyze_notated_harmony(None) is None


def test_large_musicxml_upload_retains_every_rearticulation_and_source():
    data = upload("load-200.musicxml", repeated_chord_xml(200))
    harmony = data["notated_harmony"]
    assert harmony["status"] == "available"
    assert len(harmony["slices"]) == 1600
    assert len(data["notated_timeline"]["source_notes"]) == 4800
    assert (harmony["slices"][0]["start"], harmony["slices"][-1]["end"]) == ("0", "800")
    source_ids = {n["note_id"] for n in data["notated_timeline"]["source_notes"]}
    seen_events = set()
    for s in harmony["slices"]:
        assert (s["status"], s["root"], s["quality"], s["bass"], s["inversion"]) == ("recognized", "C", "major", "C3", 0)
        assert len(s["notes"]) == 3 and all(n["onset"] == "new" for n in s["notes"])
        event_ids = {n["event_id"] for n in s["notes"]}
        assert seen_events.isdisjoint(event_ids)
        seen_events.update(event_ids)
        assert all(len(n["source_note_ids"]) == 1 and n["source_note_ids"][0] in source_ids for n in s["notes"])


def test_exact_time_parsing_is_request_local_and_cached_across_validation_and_output(monkeypatch):
    from app.music import notated_harmony
    from app.music.notated_timeline import build_notated_timeline
    from app.music.timeline_normalizer import normalize_musicxml

    timelines = [build_notated_timeline(normalize_musicxml(repeated_chord_xml(n))) for n in [20, 40]]
    original_time = notated_harmony._time
    calls = Counter()

    def counted_time(value):
        calls[value] += 1
        return original_time(value)

    monkeypatch.setattr(notated_harmony, "_time", counted_time)
    sizes = []
    for t in timelines:
        calls.clear()
        result = analyze_notated_harmony(t)
        assert result.status == "available" and result.slices
        assert calls and max(calls.values()) == 1
        sizes.append(sum(calls.values()))
    assert sizes[1] <= 2 * sizes[0]
    calls.clear()
    assert analyze_notated_harmony(timelines[0]).status == "available"
    assert calls["0"] == 1  # A previous request must not seed a global time cache.


@pytest.mark.parametrize("damage,code", [
    ("duplicate_event", "slice_source_mismatch"),
    ("duplicate_source", "slice_source_mismatch"),
    ("missing_active_source", "slice_source_mismatch"),
    ("missing_measure", "slice_measure_mismatch"),
    ("interior_boundary", "unsplit_note_boundary"),
    ("partition_gap", "invalid_slice_partition"),
    ("cross_silent_measure", "slice_measure_mismatch"),
])
def test_sweep_still_rejects_false_slice_claims(damage, code):
    t = NotatedTimeline.model_validate(upload("timeline_overlap.musicxml")["notated_timeline"])
    if damage == "duplicate_event":
        t.slices[0].active_event_ids *= 2
    elif damage == "duplicate_source":
        t.slices[0].source_note_ids *= 2
    elif damage == "missing_active_source":
        t.slices[1].source_note_ids.pop()
    elif damage == "missing_measure":
        t.slices[0].measure_ids = []
    elif damage == "interior_boundary":
        t.slices[0].end = "2"
        t.slices.pop(1)
    elif damage == "partition_gap":
        t.slices.pop(0)
    else:
        index = next(i for i, s in enumerate(t.slices) if s.start == "7")
        t.slices[index].end = "12"
        t.slices.pop(index + 1)
    harmony = analyze_notated_harmony(t)
    assert harmony.status == "unavailable" and harmony.slices == []
    assert harmony.diagnostics[0].code == code


def test_sweep_checks_fragment_boundaries_inside_one_continuous_tie_event():
    root = ET.fromstring((FIXTURES / "notated_harmony_ties.musicxml").read_bytes())
    for measure in root.findall("part/measure")[:3]:
        for note in measure.findall("note"):
            if note.findtext("pitch/step") != "C":
                measure.remove(note)
    t = NotatedTimeline.model_validate(upload("tie-only.musicxml", ET.tostring(root))["notated_timeline"])
    assert analyze_notated_harmony(t).status == "available"
    assert t.sustained_events[0].end == "12"
    t.slices[0].end = "8"
    t.slices.pop(1)
    harmony = analyze_notated_harmony(t)
    assert harmony.status == "unavailable" and harmony.slices == []
    assert harmony.diagnostics[0].code == "unsplit_note_boundary"


def test_explanation_discloses_k157_excerpt_range_and_omissions():
    data = upload("professional/mozart_k157_opening.musicxml")
    response = client.post("/api/v1/explain/analysis", json={"analysis": data})
    assert response.status_code == 200
    result = response.json()
    assert "32 个时间片中识别了 16 个区间" in result["summary"]
    for text in [result["summary"], result["sections"][0]["text"]]:
        assert "前 8/32 个时间片（书面第 1 小节）" in text
        assert "其余 24 个时间片未展开" in text
    assert "[2,5/2)" in result["sections"][0]["text"]
    assert "书面第 2 小节，四分音符偏移" not in result["sections"][0]["text"]


def test_explanation_excerpt_range_is_written_order_across_measures():
    data = upload("notated_harmony_inversions.musicxml")
    result = client.post("/api/v1/explain/analysis", json={"analysis": data}).json()
    text = result["sections"][0]["text"]
    assert "前 8/14 个时间片（书面第 1 至 8 小节）" in text
    assert "其余 6 个时间片未展开" in text


def test_small_and_empty_explanations_do_not_claim_omissions():
    for name in ["timeline_overlap.musicxml", "timeline_empty.musicxml"]:
        data = upload(name)
        response = client.post("/api/v1/explain/analysis", json={"analysis": data})
        assert response.status_code == 200
        text = response.json()["sections"][0]["text"]
        total = len(data["notated_harmony"]["slices"])
        assert total <= 8 and f"已展示全部 {total} 个时间片" in text
        assert "未展开" not in text
    data["notated_harmony"]["slices"] = []
    empty = client.post("/api/v1/explain/analysis", json={"analysis": data})
    assert empty.status_code == 200
    assert empty.json()["sections"][0]["text"] == "已计算，但没有持续音时间片。"
