from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
import tempfile

from music21 import converter, note, chord as m21_chord, stream


class MusicXMLParseError(ValueError):
    """Raised when a MusicXML payload cannot be parsed."""


@dataclass(frozen=True)
class ParsedNote:
    part_id: str | None
    voice: str | None
    measure_number: int
    beat: float | None
    offset: float
    duration: float | None
    pitch: str


@dataclass(frozen=True)
class ParsedChord:
    part_id: str | None
    voice: str | None
    measure_number: int
    beat: float | None
    offset: float
    duration: float | None
    pitches: list[str]


@dataclass
class ParsedMeasure:
    measure_number: int
    notes: list[ParsedNote] = field(default_factory=list)
    source_chord_events: list[ParsedChord] = field(default_factory=list)


@dataclass
class ParsedScore:
    measures: list[ParsedMeasure]
    source_stream: stream.Stream | None = None


def parse_musicxml_bytes(content: bytes, file_name: str = "uploaded.musicxml") -> ParsedScore:
    if not content:
        raise MusicXMLParseError("Uploaded file is empty.")

    suffix = _musicxml_suffix(file_name)
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as tmp:
            tmp.write(content)
            tmp.flush()
            parsed = converter.parse(tmp.name)
    except Exception as exc:  # music21 raises several parser-specific exceptions.
        raise MusicXMLParseError("Invalid or unsupported MusicXML file.") from exc

    return _extract_score(parsed)


def _extract_score(parsed: stream.Stream) -> ParsedScore:
    parts = list(parsed.parts) if hasattr(parsed, "parts") and parsed.parts else [parsed]
    measures_by_number: dict[int, ParsedMeasure] = {}

    for part_index, part in enumerate(parts, start=1):
        part_id = _part_id(part, part_index)
        for measure in part.getElementsByClass(stream.Measure):
            measure_number = int(measure.number or 0)
            parsed_measure = measures_by_number.setdefault(
                measure_number,
                ParsedMeasure(measure_number=measure_number),
            )

            for element in measure.recurse().notes:
                offset = _as_float(_safe_offset(element, measure))
                beat = _safe_beat(element)
                duration = _as_float(getattr(element.duration, "quarterLength", None))
                voice = _safe_voice(element)

                if isinstance(element, note.Note):
                    parsed_measure.notes.append(
                        ParsedNote(
                            part_id=part_id,
                            voice=voice,
                            measure_number=measure_number,
                            beat=beat,
                            offset=offset,
                            duration=duration,
                            pitch=element.pitch.nameWithOctave,
                        )
                    )
                elif isinstance(element, m21_chord.Chord):
                    pitches = [pitch.nameWithOctave for pitch in element.pitches]
                    parsed_measure.source_chord_events.append(
                        ParsedChord(
                            part_id=part_id,
                            voice=voice,
                            measure_number=measure_number,
                            beat=beat,
                            offset=offset,
                            duration=duration,
                            pitches=pitches,
                        )
                    )
                    for pitch in element.pitches:
                        parsed_measure.notes.append(
                            ParsedNote(
                                part_id=part_id,
                                voice=voice,
                                measure_number=measure_number,
                                beat=beat,
                                offset=offset,
                                duration=duration,
                                pitch=pitch.nameWithOctave,
                            )
                        )

    measures = [measures_by_number[key] for key in sorted(measures_by_number)]
    return ParsedScore(measures=measures, source_stream=parsed)


def _musicxml_suffix(file_name: str) -> str:
    suffix = Path(file_name).suffix.lower()
    if suffix in {".xml", ".musicxml"}:
        return suffix
    return ".musicxml"


def _part_id(part: stream.Stream, part_index: int) -> str:
    return (
        getattr(part, "id", None)
        or getattr(part, "partName", None)
        or f"part-{part_index}"
    )


def _safe_offset(element: object, measure: stream.Measure) -> object:
    try:
        return element.getOffsetInHierarchy(measure)  # type: ignore[attr-defined]
    except Exception:
        return getattr(element, "offset", 0.0)


def _safe_beat(element: object) -> float | None:
    try:
        return _as_float(getattr(element, "beat"))
    except Exception:
        return None


def _safe_voice(element: object) -> str | None:
    try:
        voice = getattr(element, "voice", None)
        return str(voice) if voice is not None else None
    except Exception:
        return None


def _as_float(value: object) -> float | None:
    if value is None:
        return None
    try:
        return round(float(value), 6)
    except (TypeError, ValueError):
        return None
