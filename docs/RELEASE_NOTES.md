# MVP 2.5 Release Notes

## Release Purpose

MVP 2.5 prepares ScoreMind / AI Music Score Understanding for GitHub and portfolio presentation. The release focuses on documentation, demo readiness, and clear product framing. It does not add new runtime product features.

## Current Capabilities

- Upload `.musicxml` and `.xml` files.
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
- Expected status for MVP 2.5: all tests passing.

Frontend build:

- `npm run build`
- Expected status for MVP 2.5: build passing.

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

See `docs/ROADMAP.md` for future work. Future items are not current MVP 2.5 capabilities unless explicitly implemented in the application.
