# MVP 3.4.1 Release Notes

## Release Purpose

MVP 3.4.1 hardens the measure-level harmonic context layer for backward compatibility and conservative wording. This is a compatibility and language fix, not a new analysis capability.

## What Changed

- `harmonic_context` is now optional in `MeasureAnalysis`. Old analysis JSON without `harmonic_context` is accepted by the explanation endpoint.
- Field names changed from `primary_*` to `selected_*` to avoid overclaiming when multiple chords exist.
- Context source now includes `not_available` for missing harmonic context.
- Multiple detected chords in a measure now produce a warning: "Multiple detected chords exist in this measure; the selected context is a representative reference, not a full harmonic reduction."
- Frontend safely handles missing `harmonic_context` with a conservative fallback.
- Wording changed from "主要和声" to "选定和声参考" (selected harmony reference).
- All version strings updated to 3.4.1.

## What Did Not Change

- Chord detection algorithm is unchanged.
- Key detection algorithm is unchanged.
- Roman numeral algorithm is unchanged.
- No new music-theory analysis added.
- No PDF/image/OMR runtime.
- No LLM/database/auth/Expert Review.
- No new dependencies.

## Harmonic Context Schema (Updated)

```python
class MeasureHarmonicContext(BaseModel):
    selected_chord_label: str | None
    selected_root: str | None
    selected_quality: ChordQuality
    selected_roman_numeral: str | None
    selected_harmonic_function: HarmonicFunction
    context_source: Literal["detected_chord", "no_detected_chord", "not_available"]
    confidence: Literal["supported", "partial", "low"]
    warnings: list[str]
```

## Validation Status

- Backend: 35 tests passing (2 new for backward compatibility and multiple chords).
- Frontend: build passing.

## Known Limitations

- Harmonic context is derived from detected chords only.
- No cadence, modulation, or phrase-level analysis.
- `partial` confidence when Roman numeral or harmonic function is not supported.
- PDF/image/OMR input is future work.
