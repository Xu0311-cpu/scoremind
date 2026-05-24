# OMR Experiments

This folder is for isolated OMR feasibility experiments only.

It is not part of the production ScoreMind app. It does not change supported upload formats, backend analysis behavior, frontend upload UI, or the main API. The product still accepts only `.musicxml` and `.xml`.

## Suggested Manual Workflow

1. Take a simple PDF/image score.
2. Convert it externally to MusicXML with a notation or OMR tool.
3. Save the generated MusicXML in a local ignored folder, or test it manually without committing it.
4. Upload the MusicXML to ScoreMind through the existing MusicXML/XML upload flow.
5. Compare the ScoreMind analysis output with the expected result.
6. Record issues in `docs/OMR_EXPERIMENT.md` or a future experiment log.

## Experiment Boundaries

- Do not add OMR dependencies here without a separate decision.
- Do not wire experiments into the FastAPI backend.
- Do not expose PDF/image upload in the frontend.
- Do not treat generated MusicXML as trustworthy without manual inspection.
- Keep any converted test artifacts small, simple, and clearly marked as research material.
