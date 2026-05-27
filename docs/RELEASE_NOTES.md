# MVP 2.9 Release Notes

## Release Purpose

MVP 2.9 adds a Download Learning Report action that saves the generated Markdown Learning Report as a local `.md` file. The backend analysis behavior is unchanged from MVP 2.8. No new analysis capabilities, PDF export, or extra AI reasoning are added.

## What Changed

- Added a `Download Learning Report` button next to `Copy Learning Report` in the Export Learning Report section.
- The download saves the current Markdown report as a `.md` file using browser Blob and `URL.createObjectURL`.
- Filename is derived from the uploaded file name (e.g., `c_major_progression.musicxml` produces `c_major_progression-learning-report.md`), with a fallback of `scoremind-learning-report.md`.
- Added a UI note near report actions: "The report is generated from deterministic backend analysis only. No PDF export or extra AI reasoning is added."
- All version strings updated to 2.9.0.

## What Did Not Change

- Backend analysis algorithms are unchanged.
- Supported upload formats remain `.musicxml` and `.xml` only.
- PDF/image/OMR upload is still not supported.
- No real LLM/OpenAI integration.
- No database, authentication, or user accounts.
- Expert Review is not reintroduced.
- Score Input Workspace and OMR research remain as in MVP 2.8.

## Current Capabilities

- Upload `.musicxml` and `.xml` files.
- Use the Score Input Workspace to understand supported and unsupported score sources.
- Render a MusicXML score preview in the frontend.
- Run deterministic backend analysis for:
  - basic triads and seventh chords
  - global key
  - Roman numerals in a global-key context
  - basic harmonic function labels
  - conservative note-level chord-tone membership
  - carried previous chord context within a measure
- Show Student Analysis, Process Explanation, Measure Walkthrough, Terminology Guide, and Technical Evidence.
- Generate a Markdown Learning Report.
- Copy the Learning Report to clipboard.
- Download the Learning Report as a `.md` file.
- Download demo MusicXML sample files from the frontend.

## Intentionally Unsupported

- PDF upload.
- Image or screenshot upload.
- OMR.
- Automatic file conversion.
- `.mxl`, audio, MIDI, or notation-project file upload.
- Real OpenAI/LLM integration.
- Database persistence, authentication, accounts, marketplace, or expert-review workflow.
- Passing tone, neighbor tone, suspension, appoggiatura, melody, voice-leading, local modulation, or jazz/modern harmony analysis.

## How To Run The Demo

Start the backend:

```bash
cd backend
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

Start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

If needed, set:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

## Recommended Demo Sample Files

- `frontend/public/samples/c_major_progression.musicxml`
- `frontend/public/samples/carried_context_notes.musicxml`
- `backend/tests/fixtures/c_major_progression.musicxml`
- `backend/tests/fixtures/carried_context_notes.musicxml`

The frontend sample links are download links only. Users still upload the downloaded file manually through the existing MusicXML/XML upload flow.

## Validation Status

Backend test suite:

- `pytest`
- Expected status for MVP 2.9: all tests passing.

Frontend build:

- `npm run build`
- Expected status for MVP 2.9: build passing.

Validation documentation:

- `docs/VALIDATION.md`
- `docs/VALIDATION_REPORT_TEMPLATE.md`
- `docs/reviews/mvp-1.4-carried-context-notes-review.md`

## Known Limitations

- Analysis is only as reliable as the uploaded MusicXML.
- Chord detection is based on vertical pitch sets at identical offsets.
- Carried context is a conservative within-measure fallback, not full sustained harmony inference.
- Roman numeral analysis uses the detected global key only.
- Note-level results are harmony-membership labels, not full melodic interpretation.
- PDF/image/OMR input is future work.

## Future Roadmap

See `docs/ROADMAP.md` for future work. Future items are not current MVP 2.9 capabilities unless explicitly implemented in the application.
