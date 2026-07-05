# Roadmap

This roadmap describes future work. Items listed here are not current MVP 3.5 capabilities unless explicitly implemented elsewhere.

## Current / Completed

- Score Input Workspace for explaining supported and unsupported score sources.
- Score Input Workspace visual polish with distinct supported, export-first, research-only, and out-of-scope paths.
- Runtime MusicXML/XML upload and deterministic analysis.
- Learning Report download as a `.md` file.
- Isolated OMR feasibility research outside the production app.
- Conservative non-chord tone candidate hints (passing/neighbor tone candidates) for student learning.

## Near Term

- Improve visual polish and responsive layout.
- Improve Measure Walkthrough readability.
- Add clearer empty states and demo hints.
- Add more small validation fixtures.
- Add screenshot-based demo documentation.
- Run isolated OMR feasibility experiments outside the production app.

## Mid Term

- Strengthen note-level analysis while remaining conservative.
- Improve handling of ties and sustained notes.
- Expand supported chord and Roman numeral cases.
- Add more robust confidence and warning signals.
- Improve validation reporting and fixture coverage.

## Long Term

- Add PDF/image/OMR pipeline.
- Add optional LLM explanation provider that only explains deterministic analysis output.
- Add human validation workflow for quality review and dataset building.
- Add score-linked visual highlighting.
- Add broader repertoire support.
- Add deployment packaging for demos.

## Current Boundary

The current system is MusicXML/XML only. MVP 3.5 includes conservative non-chord tone candidate hints (possible passing tone, possible neighbor tone) for student learning, but the runtime app still does not perform OMR, PDF/image upload, MIDI/audio analysis, local modulation, full classical non-chord tone classification, full sustained harmony inference, melody analysis, voice-leading analysis, or jazz/modern harmony analysis.
