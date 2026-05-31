# Input Expansion Strategy

This is the user-facing import guidance document. For developer/product research on future PDF/image/OMR paths, see `docs/INPUT_RESEARCH.md`.

## Why The Current MVP Uses MusicXML

ScoreMind Core uses MusicXML because it is a symbolic score format. It preserves pitches, durations, measures, beats, offsets, chords, and other structural information that deterministic analysis can inspect directly.

This keeps the analysis core reliable. The system can parse symbolic events first, then run chord, key, Roman numeral, harmonic function, and note-level harmony-membership analysis without guessing from pixels.

## Score Input Workspace

The frontend Score Input Workspace helps users identify what kind of score source they have and whether ScoreMind can process it today.

The workspace is guidance-only for unsupported formats. It does not add PDF upload, image upload, OMR, MIDI/audio support, or automatic conversion. Runtime upload support remains limited to `.musicxml` and `.xml`.

Current workspace guidance:

- MusicXML / XML: supported now; upload `.musicxml` or `.xml` directly. This is the current reliable input path.
- MuseScore / notation software: export first; export MusicXML/XML from MuseScore or notation software, then upload.
- PDF score: research only; requires OMR, which is still research-only because recognition errors can corrupt downstream analysis.
- Image / screenshot: research only; requires OMR and correction workflow. Current runtime does not process image files.
- Scanned paper score: future work; needs OMR plus correction before analysis.
- MIDI / audio: outside current scope; ScoreMind analyzes symbolic notation data, not performance or audio input.

Supported, export-first, research-only, and out-of-scope paths are visually distinct in the workspace.

## Common Score Inputs Users May Have

- MusicXML / XML
- MuseScore project files
- PDF
- images / screenshots
- scanned paper scores

## Current Supported Input

- `.musicxml`
- `.xml`

## Current Unsupported Input

- `.pdf`
- `.png` / `.jpg`
- `.mxl`
- audio
- MIDI

## Recommended Current Workflow

If you have MusicXML/XML:

- Upload it directly.

If you use MuseScore or notation software:

- Export the score as MusicXML/XML.
- Upload the exported MusicXML/XML file.

If you only have PDF/image/scanned paper:

- Convert it externally to MusicXML first.
- Then upload the MusicXML/XML file.
- The current MVP does not perform this conversion internally.

## Demo Sample Files

Downloadable MusicXML sample files are available in `frontend/public/samples` so testers can try the demo even if they do not already have a MusicXML file.

- `c_major_progression.musicxml`
- `carried_context_notes.musicxml`

These samples are demo assets only. They are not an input conversion feature, and they do not change the supported upload formats.

## Why OMR Is Not Implemented Yet

OMR can introduce pitch, rhythm, measure, voice, and notation errors. Those errors would corrupt downstream deterministic analysis and make chord, Roman numeral, and note-level results less trustworthy.

The project prioritizes a reliable deterministic analysis core first. Input conversion should come after the symbolic analysis pipeline is stable, testable, and auditable.

## Future Input Expansion Roadmap

- Research external OMR workflows.
- Evaluate Audiveris, MuseScore, and other conversion tools.
- Investigate confidence scoring for imported notation.
- Design correction UI for OMR/conversion errors.
- Eventually add a PDF/image pipeline if quality and review workflows are strong enough.

## Clear Boundary

Input conversion is future work. The Score Input Workspace explains import paths and provides demo sample MusicXML files.

`docs/INPUT_EXPANSION.md` explains what users can do today. `docs/INPUT_RESEARCH.md` evaluates future product and engineering options.
