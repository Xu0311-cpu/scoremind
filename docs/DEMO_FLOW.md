# Demo Flow

## What The Demo Shows

- Score Input Workspace for understanding supported and unsupported score sources.
- Downloading a sample MusicXML file for quick testing.
- Uploading an already-digitized `.musicxml` or `.xml` score.
- Rendering the uploaded MusicXML as a score preview.
- Running deterministic backend analysis for basic chords, global key, Roman numerals, harmonic functions, and conservative note-level harmony membership.
- Reading the result through Student Analysis: Student Summary, Process Explanation, Measure Walkthrough, and Terminology Guide.
- Opening Technical Evidence for detailed chord cards, note-level filters, note summaries, warnings, and validation hints.
- Generating, copying, or downloading a Markdown Learning Report based on the current backend analysis.

## What The Demo Does Not Show

- OMR.
- PDF or image upload.
- Real OpenAI/LLM integration.
- Local modulation analysis.
- Passing tone, neighbor tone, suspension, or appoggiatura classification.
- Full sustained harmony inference.
- Melody or voice-leading analysis.
- Jazz or modern harmony analysis.
- Database persistence, authentication, or user accounts.

## Start Locally

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

## Recommended Fixtures

Recommended demo fixture:

- `backend/tests/fixtures/c_major_progression.musicxml`
- Frontend downloadable sample: `frontend/public/samples/c_major_progression.musicxml`

Optional validation fixture:

- `backend/tests/fixtures/carried_context_notes.musicxml`
- Frontend downloadable sample: `frontend/public/samples/carried_context_notes.musicxml`

The frontend `Try sample files` panel exposes these public sample files as download links. Downloading a sample does not auto-upload or auto-analyze it; the user still uploads the downloaded `.musicxml` file through the normal flow.

## Step-By-Step Demo Script

1. Open the Score Input Workspace.
   Show the six source options and explain that MusicXML/XML is the supported path, MuseScore needs export first, PDF/image are research-only, and MIDI/audio is outside current scope.

2. Download a sample file.
   Click the C major progression sample link under `Try sample files` to download it.

3. Upload the MusicXML file.
   Use the upload control to select the downloaded `.musicxml` file.

4. Preview the score.
   Point out that the score preview is rendered from MusicXML and is not OMR.

5. Run analysis.
   Click `Analyze` and wait for deterministic backend analysis.

6. Read Student Summary.
   Show global key, detected chord count, analyzed note count, and student-friendly summary text in Chinese.

7. Read Process Explanation.
   Walk through global key, chord progression, harmonic function, note-level relationship, context strength, and cautions.

8. Read Measure Walkthrough.
   Open a few measure cards and show how each card connects chord labels, Roman numerals, functions, note summary counts, and cautions.

9. Open Technical Evidence.
   Show detailed chord cards, note-level filters, summary counts, backend warnings, and validation hints.

10. Generate Learning Report.
    Click `Generate Learning Report`, show that the report is Markdown, then click `Download Learning Report` to save it as a `.md` file.

## Product Positioning

ScoreMind is a deterministic MusicXML score-analysis prototype for music students. It combines symbolic parsing, rule-based chord and note-level analysis, score preview, student-friendly learning views, technical evidence, and report export. The project demonstrates how AI product architecture can keep music-theory reasoning deterministic while reserving language generation for future explanation layers.
