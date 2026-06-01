# MVP 3.4 Release Notes

## Release Purpose

MVP 3.4 adds a measure-level harmonic context layer derived from existing detected chords. Each measure now reports its primary chord label, Roman numeral, harmonic function, and confidence level. This is a structure-and-explanation improvement, not a new advanced music-theory analyzer.

## What Changed

- Added `harmonic_context` field to each measure in the analysis response.
- Each measure reports: primary chord label, root, quality, Roman numeral, harmonic function, context source, confidence, and warnings.
- Confidence labels: `supported` (Roman numeral and function exist), `partial` (chord exists but Roman/function missing), `low` (no detected chord).
- Selection rule: prefers supported chords with Roman numeral and function; falls back to first detected chord with partial confidence; reports low confidence when no chord exists.
- Measure Walkthrough in Student Analysis now shows harmonic context summary.
- Learning Report includes harmonic context in Measure Walkthrough section.
- All version strings updated to 3.4.0.

## What Did Not Change

- Chord detection algorithm is unchanged.
- Key detection algorithm is unchanged.
- Roman numeral algorithm is unchanged.
- No passing tone / neighbor tone analysis added.
- No cadence analysis added.
- No local modulation added.
- No melody or voice-leading analysis added.
- Supported upload formats remain `.musicxml` and `.xml` only.
- No PDF/image/OMR runtime support.
- No LLM/database/auth/Expert Review.
- No new dependencies.

## Harmonic Context Schema

```python
class MeasureHarmonicContext(BaseModel):
    primary_chord_label: str | None      # e.g. "C major"
    primary_root: str | None             # e.g. "C"
    primary_quality: ChordQuality        # e.g. "major"
    primary_roman_numeral: str | None    # e.g. "I"
    primary_harmonic_function: str       # e.g. "tonic"
    context_source: str                  # "detected_chord" or "no_detected_chord"
    confidence: str                      # "supported", "partial", or "low"
    warnings: list[str]
```

## Current Capabilities

- Score Input Workspace with distinct supported, export-first, research-only, and out-of-scope paths.
- Upload `.musicxml` and `.xml` files.
- Render a MusicXML score preview.
- Deterministic backend analysis for chords, global key, Roman numerals, harmonic functions, note-level harmony membership, and measure-level harmonic context.
- Student Analysis with polished Chinese explanations and harmonic context summaries.
- Process Explanation, Measure Walkthrough, Terminology Guide, and Technical Evidence.
- Generate, copy, or download a Markdown Learning Report.
- Bilingual error and empty states.

## Validation Status

- Backend: 33 tests passing (4 new harmonic context tests).
- Frontend: build passing.

## Known Limitations

- Harmonic context is derived from detected chords only; it does not perform cadence analysis, modulation detection, or phrase-level harmonic analysis.
- Confidence is `partial` when Roman numeral or harmonic function is not in the supported set.
- Confidence is `low` when no chord is detected in the measure.
- PDF/image/OMR input is future work.

## Future Roadmap

See `docs/ROADMAP.md` for future work.
