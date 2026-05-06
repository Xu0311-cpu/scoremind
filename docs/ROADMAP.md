# Roadmap

This roadmap describes future work. Items listed here are not current MVP 2.5 capabilities unless explicitly implemented elsewhere.

## Near Term

- Improve visual polish and responsive layout.
- Improve Measure Walkthrough readability.
- Add clearer empty states and demo hints.
- Add Learning Report download as a file.
- Add more small validation fixtures.
- Add screenshot-based demo documentation.

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

The current system is MusicXML/XML only. It does not perform OMR, local modulation, passing tone detection, neighbor tone detection, full sustained harmony inference, melody analysis, voice-leading analysis, or jazz/modern harmony analysis.
