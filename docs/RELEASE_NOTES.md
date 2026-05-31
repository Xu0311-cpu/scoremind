# MVP 3.0 Release Notes

## Release Purpose

MVP 3.0 polishes the Score Input Workspace so it is clearer, more product-like, and easier for real users to understand. Supported, export-first, research-only, and out-of-scope score paths are now visually distinct. No new runtime input capability was added. Runtime uploads remain limited to `.musicxml` and `.xml`.

## What Changed

- Score Input Workspace source options now have distinct status labels:
  - MusicXML / XML: "Supported now"
  - MuseScore / notation software: "Export first"
  - PDF score: "Research only"
  - Image / screenshot: "Research only"
  - Scanned paper score: "Future work"
  - MIDI / audio: "Outside current scope"
- Each source type has a clear, concise description of why it is supported, export-first, research-only, or out of scope.
- Status pills use distinct colors: green for supported, blue for export-first, purple for research, blue for future, grey for outside scope.
- The workspace helper line now reads: "ScoreMind currently analyzes structured MusicXML. Other score sources are shown to clarify the roadmap, not as runtime features."
- All version strings updated to 3.0.0.

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

If needed, set:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

## Recommended Demo Sample Files

- `frontend/public/samples/c_major_progression.musicxml`
- `frontend/public/samples/carried_context_notes.musicxml`
- `backend/tests/fixtures/c_major_progression.musicxml`
- `backend/tests/fixtures/carried_context_notes.musicxml`

## Validation Status

Backend test suite:

- `pytest`
- Expected status for MVP 3.0: all tests passing.

Frontend build:

- `npm run build`
- Expected status for MVP 3.0: build passing.

## Known Limitations

- Analysis is only as reliable as the uploaded MusicXML.
- Chord detection is based on vertical pitch sets at identical offsets.
- Carried context is a conservative within-measure fallback, not full sustained harmony inference.
- Roman numeral analysis uses the detected global key only.
- Note-level results are harmony-membership labels, not full melodic interpretation.
- PDF/image/OMR input is future work.

## Future Roadmap

See `docs/ROADMAP.md` for future work. Future items are not current MVP 3.0 capabilities unless explicitly implemented in the application.
