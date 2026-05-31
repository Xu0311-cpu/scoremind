# MVP 3.1 Release Notes

## Release Purpose

MVP 3.1 polishes error messages and empty states so ScoreMind feels more robust and understandable when users make mistakes or the backend is unavailable. Error messages are now bilingual (English/Chinese) and student-friendly. Empty states provide clearer guidance. No new analysis capability was added.

## What Changed

- Error messages for unsupported file type, no file selected, analysis failure, explanation failure, and backend unavailability are now bilingual and more descriptive.
- Score rendering failure message now explains that analysis may still work.
- Clipboard unavailability message now suggests manual copy.
- Empty states for no chord analysis, no note analysis, and filter mismatch are now more helpful.
- All version strings updated to 3.1.0.

## What Did Not Change

- Backend analysis algorithms are unchanged.
- Supported upload formats remain `.musicxml` and `.xml` only.
- PDF/image/OMR upload is still not supported at runtime.
- No real LLM/OpenAI integration.
- No database, authentication, or user accounts.
- Expert Review is not reintroduced.
- No new music-theory analysis was added.

## Current Capabilities

- Upload `.musicxml` and `.xml` files.
- Use the Score Input Workspace to understand supported, export-first, research-only, and out-of-scope score sources.
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

## Validation Status

Backend test suite:

- `pytest`
- Expected status for MVP 3.1: all tests passing.

Frontend build:

- `npm run build`
- Expected status for MVP 3.1: build passing.

## Known Limitations

- Analysis is only as reliable as the uploaded MusicXML.
- Chord detection is based on vertical pitch sets at identical offsets.
- Carried context is a conservative within-measure fallback, not full sustained harmony inference.
- Roman numeral analysis uses the detected global key only.
- Note-level results are harmony-membership labels, not full melodic interpretation.
- PDF/image/OMR input is future work.

## Future Roadmap

See `docs/ROADMAP.md` for future work. Future items are not current MVP 3.1 capabilities unless explicitly implemented in the application.
