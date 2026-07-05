# MVP 3.5 Release Notes

## Release Purpose

MVP 3.5 adds conservative non-chord tone candidate hints for student learning. This is NOT full non-chord tone analysis — it is a candidate layer with cautious wording and low confidence.

## What Changed

- Added `non_chord_tone_candidate` field to every analyzed note with kind, confidence, reason, and limitations.
- Kinds: `not_applicable` (chord tones), `passing_tone_candidate`, `neighbor_tone_candidate`, `unknown_non_chord_tone_candidate`.
- Passing/neighbor tone candidates are detected only from simple same-measure adjacent pitch motion (stepwise movement).
- Non-chord tones without safe adjacent context are labeled `unknown_non_chord_tone_candidate`.
- Confidence is always `low` in MVP 3.5 (never `high`).
- All wording uses conservative language: "可能的经过音候选", "可能的辅助音候选", "学习提示，不是最终乐理结论".
- Explanation endpoint includes NCT candidate counts in the note text section.
- Frontend displays NCT candidate info in note cards, measure walkthroughs, and learning reports.
- All version strings updated to 3.5.

## What Did Not Change

- Chord detection algorithm is unchanged.
- Key detection algorithm is unchanged.
- Roman numeral algorithm is unchanged.
- Note-level chord-tone classification is unchanged.
- Harmonic context behavior is unchanged (MVP 3.4.1 backward compatibility).
- No LLM calls, OMR, PDF/image, MIDI, audio, database, or authentication added.
- No new dependencies.
- `possible_non_chord_tone_type` field remains null (preserved for backward compatibility).

## Non-Chord Tone Candidate Schema

```python
class NonChordToneCandidate(BaseModel):
    kind: Literal["passing_tone_candidate", "neighbor_tone_candidate", "unknown_non_chord_tone_candidate", "not_applicable"]
    confidence: Literal["low"]
    reason: str
    limitations: list[str]
```

## Detection Rules

- Chord tone → `kind="not_applicable"`, `confidence="low"`
- Unknown role (no harmony context) → `kind="unknown_non_chord_tone_candidate"`, `confidence="low"`
- Non-chord tone with stepwise same-direction adjacent motion → `kind="passing_tone_candidate"`, `confidence="low"`
- Non-chord tone with same-pitch neighbors (away-and-back) → `kind="neighbor_tone_candidate"`, `confidence="low"`
- All other non-chord tones → `kind="unknown_non_chord_tone_candidate"`, `confidence="low"`
- Adjacent notes must be in the same measure; cross-measure context is not used.

## Validation Status

- Backend: 43 tests passing (35 existing + 8 new for NCT).
- Frontend: build passing.
- All existing MVP 3.4.1 tests still pass.

## Known Limitations

- Non-chord tone candidate hints are conservative learning aids, not definitive music-theory conclusions.
- Passing/neighbor tone detection uses only simple same-measure adjacent pitch motion.
- No consideration of rhythm, voice, harmonic rhythm, or phrase structure.
- Cross-measure melodic context is not used.
- Confidence is never high; all labels should be treated as tentative.
- Suspension, appoggiatura, échappée, and other complex non-chord tone types are not detected.
- PDF/image/OMR input is future work.
