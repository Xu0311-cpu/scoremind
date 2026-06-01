from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from app.music.chord_analyzer import analyze_measures
from app.music.key_analyzer import analyze_global_key
from app.music.note_analyzer import ChordContext, analyze_measure_notes
from app.music.parser import MusicXMLParseError, ParsedMeasure, ParsedNote, parse_musicxml_bytes
from app.music.roman_numeral_analyzer import analyze_roman_numeral, classify_harmonic_function


FIXTURE_DIR = Path(__file__).parent / "fixtures"


def _c_major_context(offset: float = 0.0, beat: float = 1.0) -> ChordContext:
    return ChordContext(
        measure_number=1,
        beat=beat,
        offset=offset,
        root="C",
        quality="major",
        roman_numeral="I",
        pitch_classes=["C", "E", "G"],
        pitch_class_numbers=[0, 4, 7],
    )


def _note_by_pitch_and_offset(notes: list[dict], pitch: str, offset: float) -> dict:
    for note in notes:
        if note["pitch"] == pitch and note["offset"] == offset:
            return note
    raise AssertionError(f"Could not find note {pitch} at offset {offset}")


def test_parse_musicxml_extracts_measures_and_notes() -> None:
    score = parse_musicxml_bytes((FIXTURE_DIR / "simple_chords.musicxml").read_bytes())

    assert len(score.measures) == 4
    assert score.measures[0].measure_number == 1
    assert [note.pitch for note in score.measures[0].notes] == ["C4", "E4", "G4"]
    assert score.measures[0].notes[0].beat == 1.0


def test_analyze_measures_detects_basic_chords() -> None:
    score = parse_musicxml_bytes((FIXTURE_DIR / "simple_chords.musicxml").read_bytes())
    result = analyze_measures(score.measures)

    assert result[1][0].root == "C"
    assert result[1][0].quality == "major"
    assert result[1][0].inversion == 0

    assert result[2][0].root == "C"
    assert result[2][0].quality == "major"
    assert result[2][0].inversion == 1

    assert result[3][0].root == "B"
    assert result[3][0].quality == "diminished"

    assert result[4][0].root == "C"
    assert result[4][0].quality == "dominant_seventh"


def test_analyze_measures_detects_chord_quality_matrix() -> None:
    score = parse_musicxml_bytes((FIXTURE_DIR / "chord_quality_matrix.musicxml").read_bytes())
    result = analyze_measures(score.measures)

    expected = {
        1: ("C", "major", 0),
        2: ("C", "major", 1),
        3: ("A", "minor", 0),
        4: ("B", "diminished", 0),
        5: ("C", "augmented", 0),
        6: ("C", "dominant_seventh", 0),
        7: ("C", "major_seventh", 0),
        8: ("A", "minor_seventh", 0),
        9: ("B", "half_diminished_seventh", 0),
        10: ("C", "diminished_seventh", 0),
    }

    for measure_number, (root, quality, inversion) in expected.items():
        chord = result[measure_number][0]
        assert chord.root == root
        assert chord.quality == quality
        assert chord.inversion == inversion


def test_dyad_and_empty_measure_do_not_produce_detected_chords() -> None:
    score = parse_musicxml_bytes((FIXTURE_DIR / "chord_quality_matrix.musicxml").read_bytes())
    result = analyze_measures(score.measures)

    assert len(score.measures) == 12
    assert score.measures[11].measure_number == 12
    assert score.measures[11].notes == []
    assert result[11] == []
    assert result[12] == []


def test_unknown_chord_quality_includes_unsupported_interval_warning() -> None:
    measure = ParsedMeasure(
        measure_number=1,
        notes=[
            ParsedNote(None, None, 1, 1.0, 0.0, 1.0, "C4"),
            ParsedNote(None, None, 1, 1.0, 0.0, 1.0, "C#4"),
            ParsedNote(None, None, 1, 1.0, 0.0, 1.0, "D4"),
        ],
    )

    chord = analyze_measures([measure])[1][0]

    assert chord.quality == "unknown"
    assert chord.evidence.interval_pattern == [0, 1, 2]
    assert chord.evidence.matched_quality_pattern is None
    assert "unsupported_interval_pattern" in chord.evidence.warnings


def test_global_key_detection_finds_c_major() -> None:
    score = parse_musicxml_bytes((FIXTURE_DIR / "c_major_progression.musicxml").read_bytes())
    key_analysis = analyze_global_key(score.source_stream)

    assert key_analysis.tonic == "C"
    assert key_analysis.mode == "major"
    assert key_analysis.confidence is None or key_analysis.confidence > 0


def test_roman_numerals_and_harmonic_functions_in_c_major() -> None:
    score = parse_musicxml_bytes((FIXTURE_DIR / "c_major_progression.musicxml").read_bytes())
    key_analysis = analyze_global_key(score.source_stream)
    result = analyze_measures(score.measures)

    expected = {
        1: ("I", "tonic"),
        2: ("V7", "dominant"),
        3: ("ii", "predominant"),
        4: ("IV", "predominant"),
        5: ("vi", "tonic"),
    }

    for measure_number, (roman_numeral, harmonic_function) in expected.items():
        analysis = analyze_roman_numeral(result[measure_number][0], key_analysis)
        assert analysis.roman_numeral == roman_numeral
        assert analysis.harmonic_function == harmonic_function

    unsupported = analyze_roman_numeral(result[6][0], key_analysis)
    assert unsupported.roman_numeral is None
    assert unsupported.harmonic_function == "unknown"


def test_roman_numeral_inversions_are_not_returned_as_unknown() -> None:
    score = parse_musicxml_bytes((FIXTURE_DIR / "c_major_inversions.musicxml").read_bytes())
    key_analysis = analyze_global_key(score.source_stream)
    result = analyze_measures(score.measures)

    tonic_inversion = analyze_roman_numeral(result[2][0], key_analysis)
    assert tonic_inversion.roman_numeral in {"I6", "I64"}
    assert tonic_inversion.harmonic_function == "tonic"

    dominant_inversion = analyze_roman_numeral(result[3][0], key_analysis)
    assert dominant_inversion.roman_numeral is not None
    assert dominant_inversion.roman_numeral.startswith("V")
    assert dominant_inversion.harmonic_function == "dominant"

    predominant_inversion = analyze_roman_numeral(result[4][0], key_analysis)
    assert predominant_inversion.roman_numeral == "ii6"
    assert predominant_inversion.harmonic_function == "predominant"

    unsupported = analyze_roman_numeral(result[5][0], key_analysis)
    assert unsupported.roman_numeral is None
    assert unsupported.harmonic_function == "unknown"


def test_harmonic_function_normalizes_common_inversion_figures() -> None:
    assert classify_harmonic_function("I6") == "tonic"
    assert classify_harmonic_function("I64") == "tonic"
    assert classify_harmonic_function("vi6") == "tonic"
    assert classify_harmonic_function("ii6") == "predominant"
    assert classify_harmonic_function("ii65") == "predominant"
    assert classify_harmonic_function("IV6") == "predominant"
    assert classify_harmonic_function("V65") == "dominant"
    assert classify_harmonic_function("V43") == "dominant"
    assert classify_harmonic_function("vii°65") == "dominant"
    assert classify_harmonic_function("viiø65") == "dominant"
    assert classify_harmonic_function("I+") == "unknown"
    assert classify_harmonic_function("V/V") == "unknown"


def test_note_analyzer_marks_chord_tone_against_related_chord() -> None:
    measure = ParsedMeasure(
        measure_number=1,
        notes=[ParsedNote(None, None, 1, 1.0, 0.0, 1.0, "C4")],
    )
    analyzed = analyze_measure_notes(measure, [_c_major_context()])

    assert analyzed[0].role == "chord_tone"
    assert analyzed[0].pitch_class == "C"
    assert analyzed[0].related_chord is not None
    assert analyzed[0].related_chord.root == "C"
    assert analyzed[0].related_chord.roman_numeral == "I"
    assert analyzed[0].evidence.chord_pitch_classes == ["C", "E", "G"]
    assert analyzed[0].evidence.reason == "note_pitch_class_matches_same_offset_chord"
    assert analyzed[0].evidence.analysis_scope == ["same_offset_harmony_only"]
    assert analyzed[0].evidence.context_source == "same_offset"


def test_note_analyzer_marks_non_chord_tone_against_related_chord() -> None:
    measure = ParsedMeasure(
        measure_number=1,
        notes=[ParsedNote(None, None, 1, 1.0, 0.0, 1.0, "D4")],
    )
    analyzed = analyze_measure_notes(measure, [_c_major_context()])

    assert analyzed[0].role == "non_chord_tone"
    assert analyzed[0].pitch_class == "D"
    assert analyzed[0].possible_non_chord_tone_type is None
    assert analyzed[0].evidence.chord_pitch_classes == ["C", "E", "G"]
    assert analyzed[0].evidence.note_pitch_class == "D"
    assert analyzed[0].evidence.reason == "note_pitch_class_not_in_same_offset_chord"
    assert analyzed[0].evidence.analysis_scope == ["same_offset_harmony_only"]
    assert analyzed[0].evidence.context_source == "same_offset"


def test_note_analyzer_uses_carried_previous_chord_for_later_chord_tone() -> None:
    measure = ParsedMeasure(
        measure_number=1,
        notes=[ParsedNote(None, None, 1, 2.0, 1.0, 1.0, "E4")],
    )
    analyzed = analyze_measure_notes(measure, [_c_major_context()])

    assert analyzed[0].role == "chord_tone"
    assert analyzed[0].related_chord is not None
    assert analyzed[0].related_chord.root == "C"
    assert analyzed[0].evidence.chord_pitch_classes == ["C", "E", "G"]
    assert analyzed[0].evidence.reason == "note_pitch_class_matches_carried_previous_chord"
    assert analyzed[0].evidence.analysis_scope == ["carried_previous_chord_within_measure"]
    assert analyzed[0].evidence.context_source == "carried_previous_chord"


def test_note_analyzer_uses_carried_previous_chord_for_later_non_chord_tone() -> None:
    measure = ParsedMeasure(
        measure_number=1,
        notes=[ParsedNote(None, None, 1, 2.0, 1.0, 1.0, "D4")],
    )
    analyzed = analyze_measure_notes(measure, [_c_major_context()])

    assert analyzed[0].role == "non_chord_tone"
    assert analyzed[0].related_chord is not None
    assert analyzed[0].evidence.chord_pitch_classes == ["C", "E", "G"]
    assert analyzed[0].evidence.reason == "note_pitch_class_not_in_carried_previous_chord"
    assert analyzed[0].evidence.analysis_scope == ["carried_previous_chord_within_measure"]
    assert analyzed[0].evidence.context_source == "carried_previous_chord"


def test_note_analyzer_marks_unknown_before_any_chord_context() -> None:
    measure = ParsedMeasure(
        measure_number=1,
        notes=[ParsedNote(None, None, 1, 1.0, 0.0, 1.0, "E4")],
    )
    analyzed = analyze_measure_notes(measure, [_c_major_context(offset=1.0, beat=2.0)])

    assert analyzed[0].role == "unknown"
    assert analyzed[0].related_chord is None
    assert analyzed[0].evidence.chord_pitch_classes == []
    assert analyzed[0].evidence.reason == "no_harmony_context"
    assert analyzed[0].evidence.analysis_scope == ["no_harmony_context"]
    assert analyzed[0].evidence.context_source == "none"


def test_api_analyze_musicxml_returns_structured_json() -> None:
    client = TestClient(app)

    with (FIXTURE_DIR / "simple_chords.musicxml").open("rb") as handle:
        response = client.post(
            "/api/v1/analyze/musicxml",
            files={"file": ("simple_chords.musicxml", handle, "application/vnd.recordare.musicxml+xml")},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["file_name"] == "simple_chords.musicxml"
    assert payload["measure_count"] == 4
    assert payload["analysis_version"] == "3.2.0"
    assert payload["analysis_scope"] == [
        "musicxml_input_only",
        "same_offset_vertical_pitch_set",
        "global_key_only",
        "basic_triad_and_seventh_chords",
        "note_level_chord_tone_labeling",
        "carried_previous_chord_within_measure",
    ]
    assert payload["key_analysis"]["tonic"] is not None
    assert "MVP 3.2 detects chords only from simultaneous pitch sets at identical offsets." in payload["warnings"]
    assert "Roman numeral analysis is based only on the detected global key." in payload["warnings"]
    assert "No local modulation or secondary dominant analysis is performed." in payload["warnings"]
    assert "Harmonic function labels are basic MVP classifications." in payload["warnings"]
    assert (
        "MVP 3.2 note-level analysis prefers same-offset harmony, then may use carried previous chord context within the same measure."
    ) in payload["warnings"]
    assert "Carried harmony context is a conservative MVP approximation." in payload["warnings"]
    assert "It does not perform full sustained harmony, phrase-level harmony, or voice-leading analysis." in payload["warnings"]
    assert (
        "A non_chord_tone role means the note is not part of the selected chord context; "
        "it is not full classical non-chord tone classification."
    ) in payload["warnings"]
    assert "source_chord_events" in payload["measures"][0]
    assert "musicxml_chords" not in payload["measures"][0]
    assert "analyzed_notes" in payload["measures"][0]
    assert payload["measures"][0]["detected_chords"][0]["quality"] == "major"
    assert payload["measures"][3]["detected_chords"][0]["quality"] == "dominant_seventh"


def test_detected_chord_includes_major_triad_evidence() -> None:
    client = TestClient(app)

    with (FIXTURE_DIR / "c_major_progression.musicxml").open("rb") as handle:
        response = client.post(
            "/api/v1/analyze/musicxml",
            files={"file": ("c_major_progression.musicxml", handle, "application/vnd.recordare.musicxml+xml")},
        )

    assert response.status_code == 200
    chord = response.json()["measures"][0]["detected_chords"][0]
    assert chord["evidence"]["pitch_classes"] == ["C", "E", "G"]
    assert chord["evidence"]["pitch_class_numbers"] == [0, 4, 7]
    assert chord["evidence"]["interval_pattern"] == [0, 4, 7]
    assert chord["evidence"]["matched_quality_pattern"] == "major"
    assert chord["evidence"]["bass_pitch"] == "C4"
    assert chord["evidence"]["root_source"] == "pitch_class_pattern_match"
    assert chord["evidence"]["analysis_scope"] == [
        "same_offset_vertical_pitch_set",
        "global_key_only",
    ]


def test_api_analyzed_notes_include_chord_tone_evidence() -> None:
    client = TestClient(app)

    with (FIXTURE_DIR / "c_major_progression.musicxml").open("rb") as handle:
        response = client.post(
            "/api/v1/analyze/musicxml",
            files={"file": ("c_major_progression.musicxml", handle, "application/vnd.recordare.musicxml+xml")},
        )

    assert response.status_code == 200
    note = response.json()["measures"][0]["analyzed_notes"][0]
    assert note["pitch"] == "C4"
    assert note["pitch_class"] == "C"
    assert note["role"] == "chord_tone"
    assert note["related_chord"] == {
        "root": "C",
        "quality": "major",
        "roman_numeral": "I",
    }
    assert note["possible_non_chord_tone_type"] is None
    assert note["evidence"]["chord_pitch_classes"] == ["C", "E", "G"]
    assert note["evidence"]["note_pitch_class"] == "C"
    assert note["evidence"]["reason"] == "note_pitch_class_matches_same_offset_chord"
    assert note["evidence"]["analysis_scope"] == ["same_offset_harmony_only"]
    assert note["evidence"]["context_source"] == "same_offset"


def test_api_analyzed_notes_validate_carried_context_fixture() -> None:
    client = TestClient(app)

    with (FIXTURE_DIR / "carried_context_notes.musicxml").open("rb") as handle:
        response = client.post(
            "/api/v1/analyze/musicxml",
            files={"file": ("carried_context_notes.musicxml", handle, "application/vnd.recordare.musicxml+xml")},
        )

    assert response.status_code == 200
    measure = response.json()["measures"][0]
    notes = measure["analyzed_notes"]

    no_context_note = _note_by_pitch_and_offset(notes, "B3", 0.0)
    assert no_context_note["role"] == "unknown"
    assert no_context_note["related_chord"] is None
    assert no_context_note["evidence"]["context_source"] == "none"
    assert no_context_note["evidence"]["reason"] == "no_harmony_context"
    assert no_context_note["evidence"]["analysis_scope"] == ["no_harmony_context"]

    same_offset_notes = [
        _note_by_pitch_and_offset(notes, "C4", 1.0),
        _note_by_pitch_and_offset(notes, "E4", 1.0),
        _note_by_pitch_and_offset(notes, "G4", 1.0),
    ]
    for note in same_offset_notes:
        assert note["role"] == "chord_tone"
        assert note["related_chord"] == {
            "root": "C",
            "quality": "major",
            "roman_numeral": "I",
        }
        assert note["evidence"]["context_source"] == "same_offset"
        assert note["evidence"]["reason"] == "note_pitch_class_matches_same_offset_chord"
        assert note["evidence"]["analysis_scope"] == ["same_offset_harmony_only"]

    carried_chord_tone = _note_by_pitch_and_offset(notes, "E4", 2.0)
    assert carried_chord_tone["role"] == "chord_tone"
    assert carried_chord_tone["related_chord"]["root"] == "C"
    assert carried_chord_tone["evidence"]["context_source"] == "carried_previous_chord"
    assert carried_chord_tone["evidence"]["reason"] == "note_pitch_class_matches_carried_previous_chord"
    assert carried_chord_tone["evidence"]["analysis_scope"] == ["carried_previous_chord_within_measure"]

    carried_non_chord = _note_by_pitch_and_offset(notes, "D4", 3.0)
    assert carried_non_chord["role"] == "non_chord_tone"
    assert carried_non_chord["related_chord"]["root"] == "C"
    assert carried_non_chord["possible_non_chord_tone_type"] is None
    assert carried_non_chord["evidence"]["context_source"] == "carried_previous_chord"
    assert carried_non_chord["evidence"]["reason"] == "note_pitch_class_not_in_carried_previous_chord"
    assert carried_non_chord["evidence"]["analysis_scope"] == ["carried_previous_chord_within_measure"]


def test_dominant_seventh_evidence_includes_interval_pattern_and_key_context() -> None:
    client = TestClient(app)

    with (FIXTURE_DIR / "c_major_progression.musicxml").open("rb") as handle:
        response = client.post(
            "/api/v1/analyze/musicxml",
            files={"file": ("c_major_progression.musicxml", handle, "application/vnd.recordare.musicxml+xml")},
        )

    assert response.status_code == 200
    chord = response.json()["measures"][1]["detected_chords"][0]
    assert chord["quality"] == "dominant_seventh"
    assert chord["roman_numeral"] == "V7"
    assert chord["evidence"]["interval_pattern"] == [0, 4, 7, 10]
    assert chord["evidence"]["matched_quality_pattern"] == "dominant_seventh"
    assert chord["evidence"]["roman_numeral_source"] == "music21.romanNumeralFromChord"
    assert chord["evidence"]["global_key_context"] == "C major"
    assert chord["evidence"]["warnings"] == []


def test_unsupported_chord_includes_warning_evidence() -> None:
    client = TestClient(app)

    with (FIXTURE_DIR / "c_major_progression.musicxml").open("rb") as handle:
        response = client.post(
            "/api/v1/analyze/musicxml",
            files={"file": ("c_major_progression.musicxml", handle, "application/vnd.recordare.musicxml+xml")},
        )

    assert response.status_code == 200
    chord = response.json()["measures"][5]["detected_chords"][0]
    assert chord["quality"] == "augmented"
    assert chord["roman_numeral"] is None
    assert chord["harmonic_function"] == "unknown"
    assert chord["evidence"]["matched_quality_pattern"] == "augmented"
    assert "roman_numeral_not_in_supported_mvp_set" in chord["evidence"]["warnings"]


def test_explain_analysis_returns_template_explanation_for_valid_analysis_json() -> None:
    client = TestClient(app)

    with (FIXTURE_DIR / "c_major_progression.musicxml").open("rb") as handle:
        analysis_response = client.post(
            "/api/v1/analyze/musicxml",
            files={"file": ("c_major_progression.musicxml", handle, "application/vnd.recordare.musicxml+xml")},
        )
    assert analysis_response.status_code == 200

    explanation_response = client.post(
        "/api/v1/explain/analysis",
        json={
            "analysis": analysis_response.json(),
            "language": "zh-CN",
            "level": "student",
        },
    )

    assert explanation_response.status_code == 200
    payload = explanation_response.json()
    assert payload["analysis_version"] == "3.2.0"
    assert payload["explanation_version"] == "3.2.0"
    assert payload["language"] == "zh-CN"
    assert payload["level"] == "student"
    assert "C major" in payload["summary"]
    assert "This explanation is template-generated from deterministic analysis output." in payload["warnings"]
    assert "No LLM is called in MVP 3.2." in payload["warnings"]
    assert "Future LLM providers must not infer new music-theory conclusions." in payload["warnings"]
    assert "Roman numeral analysis is based only on the detected global key." in payload["warnings"]


def test_explanation_mentions_detected_chord_and_evidence_interval_pattern() -> None:
    client = TestClient(app)

    with (FIXTURE_DIR / "c_major_progression.musicxml").open("rb") as handle:
        analysis_response = client.post(
            "/api/v1/analyze/musicxml",
            files={"file": ("c_major_progression.musicxml", handle, "application/vnd.recordare.musicxml+xml")},
        )

    explanation = client.post(
        "/api/v1/explain/analysis",
        json={"analysis": analysis_response.json()},
    ).json()
    section_text = " ".join(section["text"] for section in explanation["sections"])

    assert "第 1 小节" in section_text
    assert "C4, E4, G4" in section_text
    assert "interval pattern 为 [0, 4, 7]" in section_text
    assert "罗马数字为 I" in section_text
    assert "音符级分析先检查同一 measure offset 的已检测和声" in section_text
    assert "carried_previous_chord" in section_text
    assert "不是完整的古典非和弦音分类" in section_text
    assert "chord_tone" in section_text


def test_explanation_does_not_invent_roman_numeral_for_unsupported_chord() -> None:
    client = TestClient(app)

    with (FIXTURE_DIR / "c_major_progression.musicxml").open("rb") as handle:
        analysis_response = client.post(
            "/api/v1/analyze/musicxml",
            files={"file": ("c_major_progression.musicxml", handle, "application/vnd.recordare.musicxml+xml")},
        )

    explanation = client.post(
        "/api/v1/explain/analysis",
        json={"analysis": analysis_response.json()},
    ).json()
    section_text = " ".join(section["text"] for section in explanation["sections"])

    assert "罗马数字不在当前 MVP 支持集合内，功能标记为 unknown." in section_text
    assert "I+" not in section_text
    assert "V/" not in section_text


def test_explanation_with_null_key_analysis_does_not_invent_key() -> None:
    client = TestClient(app)

    with (FIXTURE_DIR / "c_major_progression.musicxml").open("rb") as handle:
        analysis_response = client.post(
            "/api/v1/analyze/musicxml",
            files={"file": ("c_major_progression.musicxml", handle, "application/vnd.recordare.musicxml+xml")},
        )
    analysis = analysis_response.json()
    analysis["key_analysis"] = {"tonic": None, "mode": None, "confidence": None}

    explanation = client.post("/api/v1/explain/analysis", json={"analysis": analysis}).json()
    text = explanation["summary"] + " " + " ".join(section["text"] for section in explanation["sections"])

    assert "当前分析结果没有可用的全局调性" in text
    assert "C major" not in text


def test_explanation_with_no_detected_chords_returns_safe_message() -> None:
    client = TestClient(app)

    with (FIXTURE_DIR / "c_major_progression.musicxml").open("rb") as handle:
        analysis_response = client.post(
            "/api/v1/analyze/musicxml",
            files={"file": ("c_major_progression.musicxml", handle, "application/vnd.recordare.musicxml+xml")},
        )
    analysis = analysis_response.json()
    for measure in analysis["measures"]:
        measure["detected_chords"] = []

    explanation = client.post("/api/v1/explain/analysis", json={"analysis": analysis}).json()
    section_text = " ".join(section["text"] for section in explanation["sections"])

    assert "当前分析结果没有检测到可解释的和弦" in section_text
    assert "罗马数字为" not in section_text


def test_api_returns_roman_numerals_and_harmonic_functions() -> None:
    client = TestClient(app)

    with (FIXTURE_DIR / "c_major_progression.musicxml").open("rb") as handle:
        response = client.post(
            "/api/v1/analyze/musicxml",
            files={"file": ("c_major_progression.musicxml", handle, "application/vnd.recordare.musicxml+xml")},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["key_analysis"]["tonic"] == "C"
    assert payload["key_analysis"]["mode"] == "major"

    chords = {
        measure["measure_number"]: measure["detected_chords"][0]
        for measure in payload["measures"]
        if measure["detected_chords"]
    }
    assert chords[1]["roman_numeral"] == "I"
    assert chords[1]["harmonic_function"] == "tonic"
    assert chords[2]["roman_numeral"] == "V7"
    assert chords[2]["harmonic_function"] == "dominant"
    assert chords[3]["roman_numeral"] == "ii"
    assert chords[3]["harmonic_function"] == "predominant"
    assert chords[4]["roman_numeral"] == "IV"
    assert chords[4]["harmonic_function"] == "predominant"
    assert chords[5]["roman_numeral"] == "vi"
    assert chords[5]["harmonic_function"] == "tonic"
    assert chords[6]["roman_numeral"] is None
    assert chords[6]["harmonic_function"] == "unknown"


def test_invalid_musicxml_raises_parse_error() -> None:
    try:
        parse_musicxml_bytes(b"<not-musicxml>", "bad.musicxml")
    except MusicXMLParseError as exc:
        assert "Invalid or unsupported MusicXML file" in str(exc)
    else:
        raise AssertionError("Expected MusicXMLParseError")


def test_api_invalid_musicxml_returns_400() -> None:
    client = TestClient(app)

    response = client.post(
        "/api/v1/analyze/musicxml",
        files={"file": ("bad.musicxml", b"<not-musicxml>", "application/xml")},
    )

    assert response.status_code == 400
    assert "Invalid or unsupported MusicXML file" in response.json()["detail"]


def test_api_invalid_file_extension_returns_400() -> None:
    client = TestClient(app)

    response = client.post(
        "/api/v1/analyze/musicxml",
        files={"file": ("score.mxl", b"not checked because extension is rejected", "application/octet-stream")},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Only .musicxml and .xml files are supported in MVP 3.2."
