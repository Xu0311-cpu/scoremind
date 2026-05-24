# OMR Feasibility Experiment

## Purpose

ScoreMind's long-term product vision is to help users understand real scores, including PDF, image, screenshot, and scanned-paper scores. Most real users do not start with clean MusicXML. They often have a PDF from a teacher, a screenshot, or a scanned page.

OMR matters because it could eventually bridge those real-world inputs into ScoreMind Core. However, OMR is high-risk: recognition errors can corrupt downstream chord, key, Roman numeral, harmonic function, and note-level analysis. MVP 2.8 keeps OMR as isolated feasibility research only. It does not add PDF/image upload, OMR, or automatic conversion to the product.

## Why OMR Is Not Integrated Yet

- OMR can misread pitches, rhythms, clefs, accidentals, voices, ties, tuplets, repeats, and measure boundaries.
- A single recognition error can change the deterministic analysis result.
- Users may trust a polished UI even when conversion quality is poor.
- ScoreMind needs confidence signals, correction workflows, and validation before OMR output can safely enter the main product flow.
- The current MusicXML Core is stable and should remain decoupled from risky input conversion experiments.

## Candidate Workflows

### MuseScore Import / Export

Use MuseScore or notation software to open an existing score source, then export MusicXML/XML manually.

Current status: recommended manual bridge when the source can be opened reliably.

Risks:

- Import quality varies by source.
- Users may need to clean notation before export.
- Exported MusicXML can still contain structural issues.

### Audiveris External OMR

Use Audiveris outside ScoreMind to convert a PDF/image score into MusicXML.

Current status: research only.

Risks:

- Setup may be difficult for nontechnical users.
- Recognition errors can be subtle.
- Output needs manual inspection before ScoreMind analysis.

### Other Notation / OMR Tools

Evaluate other notation or OMR tools that can export MusicXML.

Current status: research only.

Risks:

- Tool quality and licensing vary.
- Some tools may export incomplete or nonstandard MusicXML.
- Closed workflows can make errors hard to diagnose.

### Manual MusicXML Export From Notation Software

If a user already has a score in MuseScore, Finale, Sibelius, Dorico, or another notation tool, export MusicXML/XML directly.

Current status: best current user-facing workflow.

Risks:

- Requires users to know how to export.
- Export behavior varies by notation software.

## Evaluation Criteria

Each OMR or conversion path should be evaluated against:

- Pitch accuracy: are notes, accidentals, and octaves correct?
- Rhythm accuracy: are durations, rests, ties, tuplets, and voices correct?
- Measure structure accuracy: are barlines, measure numbers, pickups, and time signatures correct?
- Chord analysis compatibility: does ScoreMind detect expected vertical pitch sets and chord qualities?
- User correction burden: how much cleanup is required before analysis is trustworthy?
- Failure visibility: are errors obvious to users before deterministic analysis runs?

## Test Plan

1. Start with very simple clean scores.
2. Convert the PDF/image externally to MusicXML.
3. Open the generated MusicXML in notation software if possible.
4. Inspect pitches, rhythm, measures, voices, and accidentals manually.
5. Upload the generated MusicXML to ScoreMind.
6. Compare ScoreMind output with expected chord, key, Roman numeral, harmonic function, and note-level results.
7. Record conversion errors and downstream analysis impact.

Recommended early test materials:

- one-staff melody with simple rhythm
- block triads in C major
- short four-measure progression
- carried-context note-level fixture style example

## Failure Cases To Track

- Wrong pitches.
- Wrong rhythm.
- Missing voices.
- Wrong measure boundaries.
- Missing or extra barlines.
- Enharmonic spelling issues.
- Duplicated notes.
- Missing accidentals.
- Incorrect rests.
- Broken ties or slurs.
- Incorrect clefs or octave displacement.

## Decision Gates

### External OMR Workflow Is Good Enough To Document

Consider documenting an external OMR workflow only when:

- simple clean scores convert with high pitch and rhythm accuracy
- generated MusicXML opens cleanly in notation software
- ScoreMind analysis matches expected simple fixtures
- common failure modes are visible and explainable
- users can reasonably inspect or correct the result before upload

### Correction UI Becomes Necessary

A correction UI becomes necessary when:

- OMR errors are frequent but locally fixable
- users need side-by-side review of original score and generated MusicXML
- downstream analysis depends on correcting pitches, measures, voices, or durations
- confidence scores need to be surfaced before analysis

### Native PDF/Image Upload Can Be Considered

Native PDF/image upload should only be considered after:

- external OMR workflows are validated
- failure cases are documented
- correction and confidence UX is designed
- ScoreMind can prevent low-confidence conversion from silently entering deterministic analysis
- validation fixtures demonstrate acceptable quality for simple scores

## MVP 2.8 Decision

- No runtime PDF/image upload.
- No OMR integration in the main API.
- No automatic conversion in the frontend.
- No change to supported upload extensions.
- OMR work remains isolated in documentation and `experiments/omr`.
- ScoreMind Core remains MusicXML/XML only.
