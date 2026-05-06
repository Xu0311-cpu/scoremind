# MVP 2.5 Demo Flow

## What The Demo Shows

- Uploading an already-digitized `.musicxml` or `.xml` score.
- Rendering the uploaded MusicXML as a score preview.
- Running deterministic backend analysis for basic chords, global key, Roman numerals, harmonic functions, and conservative note-level harmony membership.
- Reading the result through Student Analysis: Student Summary, Process Explanation, Measure Walkthrough, and Terminology Guide.
- Opening Technical Evidence for detailed chord cards, note-level filters, note summaries, warnings, and validation hints.
- Exporting a Markdown Learning Report based on the current backend analysis.

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

1. Upload MusicXML.
   Use `backend/tests/fixtures/c_major_progression.musicxml`, or download the C major progression sample from the frontend `Try sample files` panel and upload it manually.

2. Preview score.
   Point out that the score preview is rendered from MusicXML and is not OMR.

3. Run analysis.
   Click `Analyze` and wait for deterministic backend analysis.

4. Read Student Summary.
   Show global key, detected chord count, analyzed note count, and student-friendly summary text.

5. Read Process Explanation.
   Walk through global key, chord progression, harmonic function, note-level relationship, context strength, and cautions.

6. Read Measure Walkthrough.
   Open a few measure cards and show how each card connects chord labels, Roman numerals, functions, note summary counts, and cautions.

7. Open Technical Evidence.
   Show detailed chord cards, note-level filters, summary counts, backend warnings, and validation hints.

8. Generate Learning Report.
   Click `Generate Learning Report`, show that the report is Markdown, and explain that it is based only on the current deterministic backend output.

## Product Positioning

AI Music Score Understanding is a deterministic MusicXML score-analysis prototype for music students. It combines symbolic parsing, rule-based chord and note-level analysis, score preview, student-friendly learning views, technical evidence, and report export. The project demonstrates how AI product architecture can keep music-theory reasoning deterministic while reserving language generation for future explanation layers.
