# Music Score Analysis Backend MVP 0.4.1

Minimal FastAPI backend for:

```text
MusicXML upload -> music21 parsing -> deterministic analysis -> diagnostics/evidence -> template explanation
```

This MVP intentionally excludes OMR, PDF/image upload, frontend work, database work, and real LLM/OpenAI calls.

## Supported Input

- `.musicxml`
- `.xml`

Compressed `.mxl` files are intentionally not supported in MVP 0.4.1.

## Key and Roman Numeral Analysis

MVP 0.4.1 keeps the deterministic global-key and conservative Roman numeral analysis from earlier MVPs:

- Global key is detected once for the whole score using music21 key analysis.
- Roman numerals are assigned only against that global key.
- Basic Roman numeral inversion figures are supported, such as `I6`, `I64`, `ii6`, `V65`, `V43`, `V42`, and `viiø65`.
- Harmonic function labels are limited to basic MVP categories: tonic, predominant, dominant, unknown.
- No local modulation, secondary dominant, jazz, or cadence analysis is performed.

## Diagnostics and Evidence

The analysis response includes an evidence layer for each detected chord: pitch classes, pitch-class numbers, interval patterns, matched quality patterns, bass pitch, root source, Roman numeral source, global key context, scope assumptions, and warning codes.

## Explanation Layer

MVP 0.4.1 hardens the template-based explanation endpoint:

```text
POST /api/v1/explain/analysis
```

The endpoint accepts an existing structured analysis JSON payload under a nested `analysis` field, not a MusicXML file. Explanation parameters such as `language` and `level` are separate from deterministic analysis data.

```json
{
  "analysis": { "...": "MusicXMLAnalysisResponse JSON" },
  "language": "zh-CN",
  "level": "student"
}
```

It generates Chinese explanation text from deterministic fields such as `key_analysis`, `detected_chords`, `roman_numeral`, `harmonic_function`, `evidence`, and `warnings`.

No real LLM or OpenAI call is included yet. The code introduces a provider boundary for future LLM integration, but deterministic analysis remains the source of truth. `analysis_version` remains `0.3.0` because the deterministic analysis contract has not changed; `explanation_version` is `0.4.1`. A future LLM should explain the existing analysis and evidence only; it must not infer new chords, keys, Roman numerals, harmonic functions, modulation, secondary dominants, cadences, or jazz substitutions.

## Current Limitations

- The analyzer only detects vertical pitch sets at the same measure offset.
- It does not infer sustained harmonic context.
- It does not handle non-chord tones.
- It does not perform key-aware enharmonic spelling.
- Inversion is estimated from the lowest detected pitch.
- Roman numeral analysis is global-key only.
- Harmonic function labels are basic MVP classifications.

## Run

```bash
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

## Analyze a MusicXML File

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/analyze/musicxml" \
  -F "file=@tests/fixtures/simple_chords.musicxml"
```

## Explain Existing Analysis JSON

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/explain/analysis" \
  -H "Content-Type: application/json" \
  -d @analysis.json
```

## Test

```bash
pytest
```
