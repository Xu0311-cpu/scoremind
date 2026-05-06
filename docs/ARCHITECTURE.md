# Architecture

## Backend Structure

The backend is a Python FastAPI app. Its responsibilities are:

- accept MusicXML/XML upload
- parse symbolic score structure
- run deterministic music analysis
- return typed structured JSON
- generate template-based explanations from existing analysis JSON

Important areas:

- `app/main.py`: FastAPI app setup and version metadata.
- `app/api/v1/routes_analysis.py`: MusicXML analysis endpoint.
- `app/api/v1/routes_explanation.py`: explanation endpoint.
- `app/music/parser.py`: MusicXML parsing into internal parsed measures and events.
- `app/music/chord_analyzer.py`: deterministic chord quality detection.
- `app/music/key_analyzer.py`: global key detection wrapper.
- `app/music/roman_numeral_analyzer.py`: conservative Roman numeral and harmonic function mapping.
- `app/music/note_analyzer.py`: note-level harmony membership using same-offset and carried previous chord context.
- `app/schemas/analysis.py`: Pydantic analysis response schema.
- `app/services/explanation_service.py`: template explanation provider.

## MusicXML Parsing Pipeline

1. Upload `.musicxml` or `.xml`.
2. Parse bytes with `music21`.
3. Extract measures, notes, source chord events, offsets, beats, durations, and pitches.
4. Pass parsed symbolic structures into deterministic analyzers.

The backend does not accept PDFs or images in the current MVP.

## Analysis Pipeline

1. Chord analysis detects vertical pitch sets at the same measure offset.
2. Global key analysis uses `music21` key analysis and returns tonic, mode, and confidence when available.
3. Roman numeral analysis uses detected chord roots and global key context, then conservatively accepts supported figures.
4. Harmonic function maps accepted Roman numeral families to tonic, predominant, dominant, or unknown.
5. Note-level analysis checks whether each note belongs to the detected same-offset harmony. If no same-offset chord exists, it may use the nearest earlier chord within the same measure as carried context.
6. Evidence and warnings are included for auditability.

## Frontend Structure

The frontend is a Next.js app. Its responsibilities are:

- upload MusicXML/XML
- render score preview
- call backend analysis and explanation endpoints
- present Student Analysis and Technical Evidence
- generate Learning Report from current analysis JSON

Important areas:

- `frontend/app/page.tsx`: main single-page product workflow.
- `frontend/app/globals.css`: lightweight product styling.
- `frontend/package.json`: frontend app metadata and dependencies.

## OSMD Score Preview

OpenSheetMusicDisplay renders the uploaded MusicXML text in the browser. This preview is for visual verification only. It is not OMR and does not convert images or PDFs.

## Student View vs Technical Evidence

Student Analysis is the default user-facing path. It includes:

- Student Summary
- Process Explanation
- Measure Walkthrough
- Terminology Guide
- learning hints
- limitations

Technical Evidence is for inspection and validation. It includes:

- detailed chord cards
- note-level filters
- note-level summaries
- reason codes
- backend warnings
- validation hints

## Learning Report Generation

The Learning Report is generated in the browser from the current analysis JSON and optional template explanation response. It is Markdown text. It does not add new music-theory conclusions.

## Why Backend Remains Deterministic

Music-theory reasoning needs stable, inspectable outputs. The backend therefore remains deterministic and structured. This reduces hallucination risk, makes tests meaningful, and allows future LLM providers to explain only what the backend has already computed.
