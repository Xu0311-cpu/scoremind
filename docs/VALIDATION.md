# Validation Guide for MVP 1.4

This document defines a small validation workflow for the deterministic MusicXML analysis backend. It is intended for simple fixtures and early product review, not for professional-grade repertoire evaluation.

Use these companion documents when recording review results:

- `docs/VALIDATION_REPORT_TEMPLATE.md`: reusable template for manual accuracy reviews.
- `docs/reviews/mvp-1.4-carried-context-notes-review.md`: example review artifact for `carried_context_notes.musicxml`.

## What Can Be Validated

MVP 1.4 can validate simple MusicXML cases where the expected result is clear:

- Basic triad and seventh-chord quality detection.
- Chord root detection.
- Conservative inversion handling.
- Global-key Roman numeral output for simple C major examples.
- Basic harmonic function labels: tonic, predominant, dominant, unknown.
- Note role labels: chord_tone, non_chord_tone, unknown.
- Note context source labels: same_offset, carried_previous_chord, none.
- API error handling for invalid MusicXML and unsupported file extensions.

## Current Fixture Dataset

Use the fixtures in `backend/tests/fixtures` as the first validation set:

- `simple_chords.musicxml`: validates measure parsing, basic major triad detection, inversion detection, diminished triad detection, and dominant seventh detection.
- `chord_quality_matrix.musicxml`: validates major, minor, diminished, augmented, dominant seventh, major seventh, minor seventh, half-diminished seventh, diminished seventh, dyad rejection, and empty-measure handling.
- `c_major_progression.musicxml`: validates global C major context, basic Roman numerals, harmonic functions, unsupported chord handling, and template explanation inputs.
- `c_major_inversions.musicxml`: validates conservative Roman numeral inversion figures and harmonic function normalization.
- `carried_context_notes.musicxml`: validates note-level same-offset context, carried previous chord context, no-context notes, chord-tone labels, and non-chord-tone candidate labels.

## Out of Scope

Do not use MVP 1.4 validation to claim support for:

- Passing tone, neighbor tone, suspension, or appoggiatura classification.
- Full sustained harmony inference.
- Melody analysis.
- Voice-leading analysis.
- Local modulation.
- Secondary dominants.
- Jazz or modern harmony analysis.
- PDF/image/OMR input.
- Real LLM/OpenAI reasoning.
- Complex repertoire with ambiguous harmony, dense textures, ornamentation, or expressive notation.

## Manual Accuracy Review Workflow

1. Start the backend and frontend.
2. Upload one fixture at a time.
3. Run deterministic analysis.
4. Compare each displayed result with the expected fixture purpose above.
5. Copy `docs/VALIDATION_REPORT_TEMPLATE.md` into `docs/reviews/` when a result should be tracked over time.
6. Record every reviewed row in the expected-vs-actual table.
7. Generate the app Markdown report when useful, but treat it as a review artifact rather than ground truth.
8. Keep review comments focused on current MVP fields only.

Recommended review table columns:

- Fixture file.
- Measure number.
- Beat or offset.
- Field reviewed.
- Expected value.
- Actual value.
- Result: correct, false_positive, false_negative, unsupported, or unclear.
- Reviewer note.

## When to Create a New Review File

Create a new file in `docs/reviews/` when:

- A fixture is added or changed.
- A system version changes and you want to preserve review history.
- A previous review found false positives, false negatives, unsupported behavior, or unclear cases.
- A target-user demo depends on a fixture and should have a documented expected result.

Use a name that includes the MVP version and fixture purpose, for example:

```text
docs/reviews/mvp-1.4-carried-context-notes-review.md
```

## Simple Accuracy Calculations

Use only cases where the expected label is explicitly known. Do not include ambiguous examples in the denominator.

### Chord Quality Accuracy

```text
correct chord quality labels / total reviewed chord quality labels
```

Example reviewed field: `detected_chords[].quality`.

### Root Accuracy

```text
correct chord roots / total reviewed chord roots
```

Example reviewed field: `detected_chords[].root`.

### Roman Numeral Accuracy

```text
correct Roman numerals / total reviewed Roman numerals
```

Example reviewed field: `detected_chords[].roman_numeral`.

Only count fixtures with a clear global-key expectation. If the current MVP intentionally returns null for unsupported chords, score that according to the expected value for the fixture.

### Harmonic Function Accuracy

```text
correct harmonic function labels / total reviewed harmonic function labels
```

Example reviewed field: `detected_chords[].harmonic_function`.

Only use the MVP function classes: tonic, predominant, dominant, unknown.

### Note Role Accuracy

```text
correct note role labels / total reviewed note role labels
```

Example reviewed field: `analyzed_notes[].role`.

Remember that `non_chord_tone` means non-chord-tone candidate only. It does not mean a full classical non-chord tone classification.

### Context Source Accuracy

```text
correct context source labels / total reviewed context source labels
```

Example reviewed field: `analyzed_notes[].evidence.context_source`.

Valid MVP values are `same_offset`, `carried_previous_chord`, and `none`.

## False Positives and False Negatives

Use these definitions consistently:

- False positive: the system outputs a supported label where the expected review says it should not.
- False negative: the system fails to output a label that the fixture clearly expects.
- Unsupported: the system returns null or unknown for a case that is intentionally outside MVP scope.
- Unclear: the example is ambiguous or too complex for the current validation set.

Examples:

- If a dyad is detected as a full chord, record a false positive.
- If a clear C major triad is not detected, record a false negative.
- If a chromatic unsupported chord returns `roman_numeral: null`, record it as correct if the fixture expects unsupported behavior.
- If a complex piece has conflicting plausible analyses, mark it unclear and remove it from accuracy calculations.

## Why Complex Repertoire Should Wait

MVP 1.4 is designed to validate simple deterministic building blocks. Complex repertoire often includes sustained harmony, non-chord tones, modulations, secondary dominants, voice-leading implications, enharmonic ambiguity, dense textures, and style-specific harmonic grammar. Those features are intentionally not implemented yet.

Using complex repertoire too early will blur the difference between a real regression and a missing future capability. Keep the validation set small, explicit, and boring for now. That is how this system earns trust before it gets clever.
