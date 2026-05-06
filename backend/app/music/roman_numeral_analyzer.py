from __future__ import annotations

from dataclasses import dataclass
import re

from music21 import chord as m21_chord, key as m21_key, roman

from app.music.chord_analyzer import AnalyzedChord
from app.music.key_analyzer import GlobalKeyAnalysis


TONIC_BASES = {"I", "i", "vi", "VI"}
PREDOMINANT_BASES = {"ii", "ii°", "IV", "iv"}
DOMINANT_BASES = {"V", "vii°", "viiø"}


@dataclass(frozen=True)
class RomanNumeralAnalysis:
    roman_numeral: str | None
    harmonic_function: str
    source: str | None
    global_key_context: str | None
    warnings: list[str]


def analyze_roman_numeral(
    detected_chord: AnalyzedChord,
    global_key: GlobalKeyAnalysis,
) -> RomanNumeralAnalysis:
    global_key_context = _global_key_context(global_key)

    if not global_key.tonic or not global_key.mode:
        return RomanNumeralAnalysis(
            roman_numeral=None,
            harmonic_function="unknown",
            source=None,
            global_key_context=global_key_context,
            warnings=["global_key_unavailable"],
        )

    if not detected_chord.root or detected_chord.quality == "unknown":
        return RomanNumeralAnalysis(
            roman_numeral=None,
            harmonic_function="unknown",
            source=None,
            global_key_context=global_key_context,
            warnings=["roman_numeral_not_in_supported_mvp_set"],
        )

    try:
        key_context = m21_key.Key(global_key.tonic, global_key.mode)
        source_chord = m21_chord.Chord(detected_chord.pitches)
        roman_numeral = roman.romanNumeralFromChord(source_chord, key_context)
    except Exception:
        return RomanNumeralAnalysis(
            roman_numeral=None,
            harmonic_function="unknown",
            source="music21.romanNumeralFromChord",
            global_key_context=global_key_context,
            warnings=["roman_numeral_analysis_failed"],
        )

    figure = getattr(roman_numeral, "figure", None)
    harmonic_function = classify_harmonic_function(figure)
    if harmonic_function == "unknown":
        return RomanNumeralAnalysis(
            roman_numeral=None,
            harmonic_function="unknown",
            source="music21.romanNumeralFromChord",
            global_key_context=global_key_context,
            warnings=["roman_numeral_not_in_supported_mvp_set"],
        )

    return RomanNumeralAnalysis(
        roman_numeral=figure,
        harmonic_function=harmonic_function,
        source="music21.romanNumeralFromChord",
        global_key_context=global_key_context,
        warnings=[],
    )


def classify_harmonic_function(figure: str | None) -> str:
    if not figure:
        return "unknown"

    base = _strip_inversion_figure(figure)
    if base in TONIC_BASES:
        return "tonic"
    if base in PREDOMINANT_BASES:
        return "predominant"
    if base in DOMINANT_BASES:
        return "dominant"
    return "unknown"


def _strip_inversion_figure(figure: str) -> str:
    return re.sub(r"\d+$", "", figure)


def _global_key_context(global_key: GlobalKeyAnalysis) -> str | None:
    if not global_key.tonic or not global_key.mode:
        return None
    return f"{global_key.tonic} {global_key.mode}"
