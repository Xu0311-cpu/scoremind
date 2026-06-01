# MVP 3.2 Release Notes

## Release Purpose

MVP 3.2 polishes the Chinese student-facing reading experience. Global key, chord progression, harmonic function, note-level relationship, context reliability, terminology guide, and measure walkthrough explanations are now more natural and concise in Chinese. No new analysis capability was added.

## What Changed

- Global key summary now explains that all subsequent chord and function analysis is based on the detected key.
- Chord progression lines use more natural Chinese phrasing.
- Harmonic function explanations are clearer and include concrete examples.
- Note-level relationship explanations use simpler Chinese.
- Context reliability explanations now use Chinese-first terminology with English in parentheses.
- Terminology Guide definitions are shorter and more concise, with Chinese helper labels.
- Measure Walkthrough summaries use more natural Chinese phrasing.
- Learning hints are rewritten in clearer Chinese.
- All version strings updated to 3.2.0.

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
- Expected status for MVP 3.2: all tests passing.

Frontend build:

- `npm run build`
- Expected status for MVP 3.2: build passing.

## Known Limitations

- Analysis is only as reliable as the uploaded MusicXML.
- Chord detection is based on vertical pitch sets at identical offsets.
- Carried context is a conservative within-measure fallback, not full sustained harmony inference.
- Roman numeral analysis uses the detected global key only.
- Note-level results are harmony-membership labels, not full melodic interpretation.
- PDF/image/OMR input is future work.

## Future Roadmap

See `docs/ROADMAP.md` for future work. Future items are not current MVP 3.2 capabilities unless explicitly implemented in the application.
