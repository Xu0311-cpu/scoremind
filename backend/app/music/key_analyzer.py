from __future__ import annotations

from dataclasses import dataclass

from music21 import stream


@dataclass(frozen=True)
class GlobalKeyAnalysis:
    tonic: str | None
    mode: str | None
    confidence: float | None


def analyze_global_key(source_stream: stream.Stream | None) -> GlobalKeyAnalysis:
    if source_stream is None:
        return GlobalKeyAnalysis(tonic=None, mode=None, confidence=None)

    try:
        detected_key = source_stream.analyze("key")
    except Exception:
        return GlobalKeyAnalysis(tonic=None, mode=None, confidence=None)

    tonic = getattr(getattr(detected_key, "tonic", None), "name", None)
    mode = getattr(detected_key, "mode", None)
    confidence = _as_float(getattr(detected_key, "correlationCoefficient", None))

    return GlobalKeyAnalysis(tonic=tonic, mode=mode, confidence=confidence)


def _as_float(value: object) -> float | None:
    if value is None:
        return None
    try:
        return round(float(value), 6)
    except (TypeError, ValueError):
        return None
