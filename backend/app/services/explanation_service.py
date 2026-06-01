from __future__ import annotations

from typing import Protocol

from app.schemas.analysis import DetectedChord, MusicXMLAnalysisResponse
from app.schemas.explanation import ExplanationResponse, ExplanationSection


EXPLANATION_VERSION = "3.2.0"
EXPLANATION_WARNINGS = [
    "This explanation is template-generated from deterministic analysis output.",
    "No LLM is called in MVP 3.2.",
    "Future LLM providers must not infer new music-theory conclusions.",
]


class ExplanationProvider(Protocol):
    def explain(
        self,
        analysis: MusicXMLAnalysisResponse,
        language: str = "zh-CN",
        level: str = "student",
    ) -> ExplanationResponse:
        """Create an explanation from deterministic analysis JSON only."""


class TemplateExplanationProvider:
    def explain(
        self,
        analysis: MusicXMLAnalysisResponse,
        language: str = "zh-CN",
        level: str = "student",
    ) -> ExplanationResponse:
        key_text = _key_text(analysis)
        chord_text = _chord_text(_detected_chords(analysis))
        note_text = _note_text(analysis)
        limitation_text = _limitation_text(analysis)

        return ExplanationResponse(
            analysis_version=analysis.analysis_version,
            explanation_version=EXPLANATION_VERSION,
            language=language,
            level=level,
            summary=f"{key_text} 本解释只复述后端已经产生的结构化分析和证据，不新增音乐理论结论。",
            sections=[
                ExplanationSection(title="整体调性", text=key_text),
                ExplanationSection(title="和弦与功能", text=chord_text),
                ExplanationSection(title="音符与和声关系", text=note_text),
                ExplanationSection(title="注意限制", text=limitation_text),
            ],
            warnings=EXPLANATION_WARNINGS + analysis.warnings,
        )


def _detected_chords(analysis: MusicXMLAnalysisResponse) -> list[DetectedChord]:
    chords: list[DetectedChord] = []
    for measure in analysis.measures:
        chords.extend(measure.detected_chords)
    return chords


def _key_text(analysis: MusicXMLAnalysisResponse) -> str:
    key = analysis.key_analysis
    if key.tonic and key.mode:
        confidence = f"，置信度为 {key.confidence}" if key.confidence is not None else ""
        return f"全局调性分析结果为 {key.tonic} {key.mode}{confidence}。"
    return "当前分析结果没有可用的全局调性。"


def _chord_text(chords: list[DetectedChord]) -> str:
    if not chords:
        return "当前分析结果没有检测到可解释的和弦。"

    sentences = []
    for chord in chords[:8]:
        interval_pattern = ", ".join(str(value) for value in chord.evidence.interval_pattern)
        pitch_text = ", ".join(chord.pitches)
        roman_text = (
            f"罗马数字为 {chord.roman_numeral}，功能为 {chord.harmonic_function}"
            if chord.roman_numeral
            else "罗马数字不在当前 MVP 支持集合内，功能标记为 unknown."
        )
        sentences.append(
            f"第 {chord.measure_number} 小节 beat {chord.beat} 的音集合为 {pitch_text}，"
            f"检测为 {chord.quality}，根音为 {chord.root}，"
            f"证据 interval pattern 为 [{interval_pattern}]；{roman_text}。"
        )

    if len(chords) > 8:
        sentences.append(f"其余 {len(chords) - 8} 个检测和弦未在模板摘要中展开。")
    return " ".join(sentences)


def _note_text(analysis: MusicXMLAnalysisResponse) -> str:
    counts = {"chord_tone": 0, "non_chord_tone": 0, "unknown": 0}
    context_counts = {
        "same_offset": 0,
        "carried_previous_chord": 0,
        "none": 0,
    }
    for measure in analysis.measures:
        for note in measure.analyzed_notes:
            counts[note.role] += 1
            context_counts[note.evidence.context_source] += 1

    total = sum(counts.values())
    if total == 0:
        return "当前分析没有可用的音符级结果。"

    return (
        "音符级分析先检查同一 measure offset 的已检测和声；"
        "如果没有同 offset 和声，会保守使用同小节内最近的前一个检测和弦作为 carried context。"
        f"本次统计：chord_tone {counts['chord_tone']} 个，"
        f"non_chord_tone candidate {counts['non_chord_tone']} 个，"
        f"unknown {counts['unknown']} 个。"
        f"上下文来源：same_offset {context_counts['same_offset']} 个，"
        f"carried_previous_chord {context_counts['carried_previous_chord']} 个，"
        f"none {context_counts['none']} 个。"
        "non_chord_tone 只表示该音不属于所选和弦上下文，"
        "不是完整的古典非和弦音分类；carried context 也不是完整持续和声、乐句和声、旋律或声部进行分析。"
    )


def _limitation_text(analysis: MusicXMLAnalysisResponse) -> str:
    warnings = "；".join(analysis.warnings)
    scope = "、".join(analysis.analysis_scope)
    return f"分析范围为：{scope}。限制说明：{warnings}。"
