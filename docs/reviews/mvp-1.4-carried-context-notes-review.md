# MVP 1.4 Sample Validation Review: carried_context_notes.musicxml

This is an example review artifact for the MVP validation process. It is not a full professional music-theory evaluation. The goal is to demonstrate how to record expected deterministic behavior for a small, clear fixture.

## Review Metadata

- Fixture file: `backend/tests/fixtures/carried_context_notes.musicxml`
- Reviewer: Example reviewer
- Review date: 2026-04-29
- System version: MVP 1.4
- Backend analysis version: `1.4.0`
- Explanation version, if generated: `1.4.0`
- Review scope: note role and context source validation for conservative same-offset and carried previous chord behavior.

## Fields Reviewed

- [ ] Chord quality
- [ ] Chord root
- [ ] Roman numeral
- [ ] Harmonic function
- [x] Note role
- [x] Context source
- [ ] Error handling

## Expected vs Actual

| Fixture | Measure | Beat/Offset | Field Reviewed | Expected | Actual | Result Label | Reviewer Note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| carried_context_notes.musicxml | 1 | offset 0.0 | B3 note role | unknown | unknown | correct | B3 occurs before any same-offset or earlier chord context. |
| carried_context_notes.musicxml | 1 | offset 0.0 | B3 context source | none | none | correct | No harmony context is available yet. |
| carried_context_notes.musicxml | 1 | offset 1.0 | C4 note role | chord_tone | chord_tone | correct | C belongs to the same-offset C major pitch set. |
| carried_context_notes.musicxml | 1 | offset 1.0 | C4 context source | same_offset | same_offset | correct | C4 is part of the simultaneous C-E-G chord event. |
| carried_context_notes.musicxml | 1 | offset 1.0 | E4 note role | chord_tone | chord_tone | correct | E belongs to the same-offset C major pitch set. |
| carried_context_notes.musicxml | 1 | offset 1.0 | E4 context source | same_offset | same_offset | correct | E4 is part of the simultaneous C-E-G chord event. |
| carried_context_notes.musicxml | 1 | offset 1.0 | G4 note role | chord_tone | chord_tone | correct | G belongs to the same-offset C major pitch set. |
| carried_context_notes.musicxml | 1 | offset 1.0 | G4 context source | same_offset | same_offset | correct | G4 is part of the simultaneous C-E-G chord event. |
| carried_context_notes.musicxml | 1 | offset 2.0 | E4 note role | chord_tone | chord_tone | correct | E belongs to the carried previous C major chord context. |
| carried_context_notes.musicxml | 1 | offset 2.0 | E4 context source | carried_previous_chord | carried_previous_chord | correct | The nearest earlier detected chord in the same measure is C major. |
| carried_context_notes.musicxml | 1 | offset 3.0 | D4 note role | non_chord_tone candidate | non_chord_tone | correct | D is not part of the carried previous C major pitch set; this is only a candidate label, not full classical non-chord tone classification. |
| carried_context_notes.musicxml | 1 | offset 3.0 | D4 context source | carried_previous_chord | carried_previous_chord | correct | The nearest earlier detected chord in the same measure is C major. |

## Summary Accuracy

| Metric | Correct | Reviewed | Accuracy | Notes |
| --- | ---: | ---: | ---: | --- |
| Chord quality accuracy | 0 | 0 | N/A | Not reviewed in this sample artifact. |
| Root accuracy | 0 | 0 | N/A | Not reviewed in this sample artifact. |
| Roman numeral accuracy | 0 | 0 | N/A | Not reviewed in this sample artifact. |
| Harmonic function accuracy | 0 | 0 | N/A | Not reviewed in this sample artifact. |
| Note role accuracy | 6 | 6 | 100% | B3 unknown, C4/E4/G4 same-offset chord tones, carried E4 chord tone, carried D4 non-chord-tone candidate. |
| Context source accuracy | 6 | 6 | 100% | B3 none, C4/E4/G4 same_offset, later E4/D4 carried_previous_chord. |

## Reviewer Notes

- This fixture is intentionally simple and should not be interpreted as evidence for full sustained harmony inference.
- `non_chord_tone` is reviewed here as a candidate label only.
- The carried context rows validate the MVP fallback: nearest previous detected chord within the same measure.

## Follow-Up Issues

| Priority | Issue | Evidence | Suggested Next Step |
| --- | --- | --- | --- |
| None | No mismatch found in this sample review. | All reviewed note role and context source rows matched expected MVP behavior. | Keep this fixture as a regression check and review artifact example. |
