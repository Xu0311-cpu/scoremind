# Roadmap

This roadmap describes future work. Items listed here are not current MVP 2.8 capabilities unless explicitly implemented elsewhere.

## Current / Completed

- Score Input Workspace for explaining supported and unsupported score sources.
- Runtime MusicXML/XML upload and deterministic analysis.
- Isolated OMR feasibility research outside the production app.

## Near Term

- Improve visual polish and responsive layout.
- Improve Measure Walkthrough readability.
- Add clearer empty states and demo hints.
- Add Learning Report download as a file.
- Add more small validation fixtures.
- Add screenshot-based demo documentation.
- Run isolated OMR feasibility experiments outside the production app.

## Mid Term

- Strengthen note-level analysis while remaining conservative.
- Add carefully bounded non-chord tone candidate heuristics.
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

The current system is MusicXML/XML only. MVP 2.8 includes a Score Input Workspace and active OMR feasibility research, but the runtime app still does not perform OMR, PDF/image upload, MIDI/audio analysis, local modulation, passing tone detection, neighbor tone detection, full sustained harmony inference, melody analysis, voice-leading analysis, or jazz/modern harmony analysis.
