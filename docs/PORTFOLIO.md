# Portfolio Brief

## One-Line Summary

AI Music Score Understanding is a deterministic MusicXML score-analysis demo that helps music students read key, chords, Roman numerals, harmonic function, and note-level harmony relationships from symbolic scores.

## Target User Pain Point

Music students often receive raw notation or MusicXML files but still need help connecting the written score to harmonic concepts. Generic explanations can be hard to trust if the system cannot show where each conclusion came from.

## Why Not Just Use Generic AI

Generic AI can produce fluent music-theory prose, but it may hallucinate chords, keys, Roman numerals, or note functions. This project keeps music reasoning deterministic and evidence-backed. Language-oriented views are generated from structured analysis output rather than raw score interpretation.

## Product Solution

The product accepts MusicXML/XML, renders the score, runs deterministic symbolic analysis, and presents the result through:

- Student Summary
- Process Explanation
- Measure Walkthrough
- Terminology Guide
- Technical Evidence
- Learning Report export

## Current Workflow

1. Upload MusicXML/XML.
2. Preview the score with OpenSheetMusicDisplay.
3. Run FastAPI deterministic analysis.
4. Read Student Analysis.
5. Inspect Technical Evidence.
6. Generate a Markdown Learning Report.

## Technical Highlights

- FastAPI backend with typed Pydantic response contracts.
- `music21`-based MusicXML parsing.
- Deterministic chord, global-key, Roman numeral, harmonic function, and note-level harmony-membership analysis.
- Evidence fields for auditability.
- Next.js frontend with OSMD score preview.
- Frontend-only student learning views that do not add new theory inference.
- Markdown Learning Report generated from the current analysis JSON.

## Deterministic Analysis Boundary

The backend is the source of truth for music reasoning. The frontend can summarize, group, filter, and explain existing fields, but it must not infer new chords, keys, Roman numerals, harmonic functions, non-chord tone types, melody, voice leading, or modulation.

## Validation Approach

Validation uses small MusicXML fixtures with known behavior:

- chord quality fixtures
- C major progression fixture
- inversion fixture
- carried-context note-level fixture

See `docs/VALIDATION.md` and `docs/VALIDATION_REPORT_TEMPLATE.md` for review methods.

## Current Limitations

- MusicXML/XML only.
- No PDF/image/OMR.
- No real LLM/OpenAI integration.
- No local modulation.
- No passing/neighbor tone classification.
- No full sustained harmony inference.
- No melody or voice-leading analysis.
- No jazz/modern harmony support.

## Future Roadmap

- Better frontend usability and report export.
- Stronger conservative note-level analysis.
- Optional OMR pipeline for PDF/image input.
- Optional LLM provider for prose only, constrained by deterministic analysis output.
- Human validation workflow for quality review.

## Resume-Ready Bullet Points

- Built a deterministic MusicXML analysis backend with FastAPI, Pydantic, `music21`, and pytest.
- Designed a structured music-reasoning pipeline for chord quality, global key, Roman numerals, harmonic functions, and note-level harmony membership.
- Implemented evidence-backed API responses so analysis outputs are auditable before any LLM explanation layer.
- Built a Next.js frontend with MusicXML score preview, student-facing analysis, technical evidence views, and Markdown report export.
- Maintained a strict boundary between deterministic music reasoning and future natural-language explanation.
