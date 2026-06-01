# MVP 3.3 Release Notes

## Release Purpose

MVP 3.3 aligns documentation, demo flow, screenshot guidance, and portfolio language with the current MVP 3.3 product state. No new runtime capability was added.

## What Changed

- README updated to reflect current capabilities: Score Input Workspace, Download Learning Report, improved error/empty states, and Chinese student-facing analysis polish.
- `docs/PORTFOLIO.md` updated to match MVP 3.3 product positioning and resume-ready bullets.
- `docs/DEMO_FLOW.md` updated with a 10-step demo script covering Score Input Workspace, sample download, upload, analysis, Student Analysis, Measure Walkthrough, Technical Evidence, and Learning Report download.
- `docs/SCREENSHOT_GUIDE.md` updated with recommended screenshots for Score Input Workspace, Score Preview, Student Analysis, Measure Walkthrough, Technical Evidence, and Download Learning Report.
- All version strings updated to 3.3.0.

## What Did Not Change

- Backend analysis algorithms are unchanged.
- Supported upload formats remain `.musicxml` and `.xml` only.
- PDF/image/OMR upload is still not supported at runtime.
- No real LLM/OpenAI integration.
- No database, authentication, or user accounts.
- Expert Review is not reintroduced.
- No new music-theory analysis was added.

## Current Capabilities

- Score Input Workspace with distinct supported, export-first, research-only, and out-of-scope paths.
- Upload `.musicxml` and `.xml` files.
- Render a MusicXML score preview in the frontend.
- Run deterministic backend analysis for:
  - basic triads and seventh chords
  - global key
  - Roman numerals in a global-key context
  - basic harmonic function labels
  - conservative note-level chord-tone membership
  - carried previous chord context within a measure
- Show Student Analysis with polished Chinese explanations.
- Show Process Explanation, Measure Walkthrough, Terminology Guide, and Technical Evidence.
- Generate, copy, or download a Markdown Learning Report.
- Bilingual error and empty states.
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

See `docs/DEMO_FLOW.md` for a full step-by-step demo script.

## Validation Status

Backend test suite:

- `pytest`
- Expected status for MVP 3.3: all tests passing.

Frontend build:

- `npm run build`
- Expected status for MVP 3.3: build passing.

## Known Limitations

- Analysis is only as reliable as the uploaded MusicXML.
- Chord detection is based on vertical pitch sets at identical offsets.
- Carried context is a conservative within-measure fallback, not full sustained harmony inference.
- Roman numeral analysis uses the detected global key only.
- Note-level results are harmony-membership labels, not full melodic interpretation.
- PDF/image/OMR input is future work.

## Future Roadmap

See `docs/ROADMAP.md` for future work. Future items are not current MVP 3.3 capabilities unless explicitly implemented in the application.
