# Validation Report Template

Use this template when manually reviewing deterministic MusicXML analysis output. Keep each review focused on a single fixture or a very small set of closely related fixtures.

## Review Metadata

- Fixture file:
- Reviewer:
- Review date:
- System version:
- Backend analysis version:
- Explanation version, if generated:
- Review scope:

## Fields Reviewed

Mark the fields included in this review.

- [ ] Chord quality
- [ ] Chord root
- [ ] Roman numeral
- [ ] Harmonic function
- [ ] Note role
- [ ] Context source
- [ ] Error handling
- [ ] Other:

## Result Labels

Use these labels consistently:

- `correct`: actual output matches the expected MVP behavior.
- `false_positive`: the system produced a supported label where the expected behavior says it should not.
- `false_negative`: the system failed to produce a label that the fixture clearly expects.
- `unsupported`: the case is intentionally outside current MVP scope, and the output is acceptable as unsupported/null/unknown.
- `unclear`: the expected answer is ambiguous or the fixture is not suitable for this MVP validation pass.

## Expected vs Actual

| Fixture | Measure | Beat/Offset | Field Reviewed | Expected | Actual | Result Label | Reviewer Note |
| --- | --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |  |

## Summary Accuracy

Only include rows where the expected value is explicit and reviewable. Exclude `unsupported` and `unclear` cases from accuracy denominators unless the field is specifically validating unsupported behavior.

| Metric | Correct | Reviewed | Accuracy | Notes |
| --- | ---: | ---: | ---: | --- |
| Chord quality accuracy |  |  |  |  |
| Root accuracy |  |  |  |  |
| Roman numeral accuracy |  |  |  |  |
| Harmonic function accuracy |  |  |  |  |
| Note role accuracy |  |  |  |  |
| Context source accuracy |  |  |  |  |

## Reviewer Notes

- 

## Follow-Up Issues

Use this section for concrete follow-up work. Do not record broad future capabilities as bugs unless the current MVP explicitly claims support.

| Priority | Issue | Evidence | Suggested Next Step |
| --- | --- | --- | --- |
|  |  |  |  |
