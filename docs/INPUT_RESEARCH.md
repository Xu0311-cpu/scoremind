# Input Expansion Research

## A. Purpose

ScoreMind Core currently relies on MusicXML because it is structured, symbolic, and reliable for deterministic analysis. It preserves pitches, durations, measures, offsets, and other musical structure that the backend can inspect without guessing from pixels.

Real users often have PDF, image, screenshot, scanned-paper, or notation-software project files rather than raw MusicXML. This document evaluates future input expansion options without implementing them in MVP 2.5.

## B. Candidate Input Paths

- Direct MusicXML/XML upload.
- MuseScore / notation software export to MusicXML.
- External OMR tool -> MusicXML -> ScoreMind.
- Future native PDF/image upload.
- Future correction UI before analysis.

## C. Evaluation Criteria

- Accuracy.
- User effort.
- Engineering complexity.
- Failure visibility.
- Compatibility with existing MusicXML Core.
- Risk of corrupting downstream analysis.

## D. Option Analysis

### Direct MusicXML/XML Upload

Description: users upload symbolic `.musicxml` or `.xml` directly.

Benefits:

- Most reliable current input.
- Lowest engineering complexity.
- Fully compatible with ScoreMind Core.
- Failures are easier to detect and test.

Risks:

- Users may not already have MusicXML.
- Requires users to export from notation software.

MVP suitability: strong.

Recommended status: current.

### MuseScore / Notation Software Export To MusicXML

Description: users open a score in MuseScore or another notation program, export MusicXML/XML, then upload the exported file.

Benefits:

- Practical bridge for many real users.
- Keeps ScoreMind runtime simple.
- Avoids introducing conversion errors inside the app.

Risks:

- Requires user education.
- Export quality can vary by source file and notation software.

MVP suitability: strong as guidance, not runtime conversion.

Recommended status: recommended near term.

### External OMR Tool -> MusicXML -> ScoreMind

Description: users or future workflows use an external OMR tool to convert PDF/image/scanned scores into MusicXML before upload.

Benefits:

- Opens a path for PDF/image users.
- Keeps OMR outside ScoreMind runtime during early evaluation.
- Allows comparison between tools before product integration.

Risks:

- OMR errors can corrupt chord/key/note-level analysis.
- Users may not notice conversion mistakes.
- Tool setup and workflow can be complex.

MVP suitability: research only.

Recommended status: research only.

### Future Native PDF/Image Upload

Description: ScoreMind accepts PDF/image files directly and runs an internal or integrated conversion pipeline before analysis.

Benefits:

- Best long-term user experience.
- Matches how many users actually store scores.

Risks:

- High engineering complexity.
- Requires OMR confidence, correction, validation, and fallback UX.
- Mistakes can silently corrupt downstream deterministic analysis.

MVP suitability: not suitable yet.

Recommended status: not recommended yet.

### Future Correction UI Before Analysis

Description: after conversion, users review and correct recognized notation before deterministic analysis runs.

Benefits:

- Makes OMR failures visible.
- Protects downstream analysis quality.
- Can build user trust through reviewable corrections.

Risks:

- Significant frontend and data-model complexity.
- Requires score editing or correction workflows.

MVP suitability: future companion to OMR, not current MVP.

Recommended status: research only.

## E. OMR Risk Analysis

OMR mistakes can corrupt downstream chord, key, Roman numeral, harmonic function, and note-level analysis. A single wrong pitch, rhythm, measure boundary, voice assignment, or tie can change the analysis result.

Before trusting OMR outputs, the system would need:

- confidence scores
- user correction workflows
- validation fixtures
- clear failure states
- side-by-side review of original score and converted MusicXML

OMR should not be treated as a solved preprocessing step.

## F. Recommended Roadmap

Current:

- MusicXML/XML direct upload.

Near term:

- Guide users to export MusicXML from notation software.

Research:

- Evaluate external OMR tools and workflows.

Later:

- Add correction UI and OMR confidence display.

Long term:

- Native PDF/image pipeline.

## G. Decision For MVP 2.5

- No runtime input expansion.
- No upload format changes.
- No OMR integration.
- Keep MusicXML Core stable.
