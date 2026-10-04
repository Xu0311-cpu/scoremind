# ScoreMind — AI Music Score Understanding (MVP 3.13)

ScoreMind is a deterministic MusicXML score understanding tool for music students. It parses symbolic score data, analyzes basic harmony and note-level chord membership, renders a score preview, and turns the result into student-friendly learning views.

Current release: MVP 3.13. Current score uploads remain limited to `.musicxml` and `.xml`.

MVP 3.13 adds a **human annotation progress navigator** beside the independent harmony form. It lists unannotated written positions and separate counts of `unclear`, `partial`, and `determined` human records; it also distinguishes `score_only_attested` from `machine_visible`. Filtering and Previous/Next use written measure indices, not printed numbers. These are record states, not harmonic accuracy or evidence that a `determined` measure was exhaustively annotated. An attested blind entry remains a reviewer self-declaration, not a verified professional gold standard. Imported and restored drafts recalculate the view for the same original-file SHA-256. No backend theory rules or annotation JSON fields change.

The app and template explanation release is `3.13.0`; the unchanged deterministic `analysis_version` remains `3.11.0` to preserve older ExpertReview drafts and imports. The independent annotation format remains v1.

MVP 3.12 adds a **read-only human comparison view** after the reviewer reveals machine results. It places the independent harmony annotation, same-written-measure machine chord output, and notated timeline evidence alongside one another only when the original-file SHA-256 and written-measure identity can be verified. Ambiguous or unsupported cases say they cannot be directly compared. A shortcut opens the existing ExpertReview form at that written measure; it never saves an opinion automatically. No verdict, accuracy metric, new harmony inference, or change to the independent annotation JSON is introduced. See [comparison rules and acceptance cases](docs/HARMONIC_COMPARISON.md).

In MVP 3.12, the app and template explanation release was `3.12.0`, while the deterministic `analysis_version` stayed `3.11.0`. That version split continues in 3.13 and preserves existing ExpertReview drafts and JSON imports keyed to the analysis version.

MVP 3.11 adds a **separate, browser-local independent harmony annotation** workflow. Reviewers can inspect the original score before revealing machine results, record manually judged events or explicit uncertainty per written measure, and export/import a strict versioned JSON package. It is bound to the original-file SHA-256 and verified written-measure structure, not to the machine analysis version. The old machine-review workflow remains separate. Once machine results are revealed, later edits are `machine_visible`, including after refresh when the marker survives. Storage or fingerprint failure never disables ordinary Analyze: session-only reveal requires explicit confirmation and cannot create a new blind claim. No annotations enter the API, explanation, Learning Report, or accuracy calculation. See the [contract](docs/HARMONIC_ANNOTATION_DESIGN.md) and [acceptance cases](docs/HARMONIC_ANNOTATION_ACCEPTANCE.md).

MVP 3.10 adds three short, redistributable CC0 repertoire excerpts with independently recorded **structural** expectations, plus a compact human-review triage view. Reviewers can see separate counts of correct/uncertain/wrong opinions per **written measure index** and jump to the next flagged measure. These counts come only from human records; they do not alter machine analysis or become a consensus label. Complex harmonic judgments remain marked unclear until independently reviewed. See [real-score validation and provenance](docs/PROFESSIONAL_VALIDATION.md).

MVP 3.9 adds a separate **professional human review record** beside written-measure navigation. A reviewer can mark a written measure or one of its source note IDs as correct, uncertain, or wrong; record a category, suggested result, and rationale; edit or delete entries; and export/import a strictly validated JSON review package. The package is tied to SHA-256 of the original uploaded file and the analysis version; compact UTF-8 JSON is capped at 1 MiB across save, export, and import. Browser-local drafts are not cloud sync and may be unavailable in private mode or when storage is full. Review data never changes the deterministic API response, confidence labels, explanation request, or Markdown Learning Report.

MVP 3.8 links the rendered score preview and Technical Evidence by **written measure order**. Choose a measure in either area or use Previous/Next; OSMD scrolls to and outlines the corresponding graphical measure on every staff. The mapping checks OSMD source and graphical measure identity before highlighting. If rendering, timeline support, or mapping is unavailable, the UI states why and draws no misleading outline. This is measure-level navigation only, not note-click highlighting or a new harmony conclusion. Existing backend analysis rules, API fields, explanation compatibility, and upload formats are unchanged.

MVP 3.7 adds auditable written-pitch observations to each notated time slice: active notes, new onsets, earlier continuing notes, exact source references, and a lowest written pitch only when comparison is safe. These observations are **not chords** and do not feed the existing harmony or note-role rules. Technical Evidence shows them per measure; old analysis JSON without observations remains valid. Nonstandard sound `<tie type="continue">` is diagnosed instead of accepted; notation `<tied type="continue">` with sound `stop+start` remains supported. A minimal CI runs backend tests and the frontend build.

MVP 3.6 established the independent **notated-duration timeline** with exact time, source-note references, conservative tie joining, and a per-measure Technical Evidence view. Existing harmony, note-role, and low-confidence NCT candidate rules do not consume it.

### MVP 3.6 持续音时间轴

- 按 MusicXML 记谱时值建立 `[start, end)` 时间片，正确显示错开起音、结束边界、休止和安全的跨小节延音线。
- `notated_timeline` 是独立增量字段：原始片段、持续事件、来源引用、时间片、可定位诊断。时间以四分音符为单位，JSON 使用精确分数字符串（例如 `"4/3"`），不是浮点近似。
- 技术证据中的“持续音时间轴”按小节查看，区分书面顺序与显示小节号；不新增学生和声结论，也不改变学习报告结构。
- 一个必要的数据修正：旧解析不再合并重复编号的小节，响应增加可选 `measure_index`。基础和弦识别、调性、罗马数字、音符分类规则保留；旧 JSON 缺少新字段仍可解释。
- 只处理书面顺序，不展开反复，不模拟踏板或演奏时值。移调乐器保留**记谱音高**并给出诊断，不输出混合实音。缺失身份、损坏延音线和不支持结构均有诊断。
- 参见 [架构](docs/ARCHITECTURE.md)、[验证说明](docs/VALIDATION.md)、[发布说明](docs/RELEASE_NOTES.md)。

## Why I Built This

Generic AI tools can explain music in natural language, but they are not reliable as the source of truth for score analysis. ScoreMind takes a different approach: music-theory reasoning stays deterministic and auditable, while student-facing explanations are generated only from structured analysis results.

## Product Positioning

ScoreMind is not a chatbot. It is a structured score-understanding prototype built around:

- MusicXML as the input format.
- FastAPI and `music21` for deterministic symbolic analysis.
- Next.js for score preview, student learning views, technical evidence, and report export.
- Clear boundaries between analysis, evidence, and explanation.

## Current MVP Capabilities

- Upload `.musicxml` or `.xml` files.
- Use the Score Input Workspace to understand supported and unsupported score sources.
- Render a MusicXML score preview.
- Navigate from Technical Evidence to the matching written score measure, with a visible staff-level outline when mapping is verified.
- Record separate, file-bound human review notes by written measure and optional source note ID; export/import them as JSON.
- Record independent human harmony judgments or uncertainty by verified written measure, separate from machine results and older machine-review notes.
- Filter and navigate independent human annotation states by written measure; counts describe records and unannotated positions, never analysis accuracy.
- Inspect per-written-measure counts of human review opinions and jump between uncertain/wrong measures without changing machine results.
- Inspect written-duration slices and safe tie chains with traceable note sources in Technical Evidence.
- Detect basic triads and seventh chords.
- Estimate global key and conservative Roman numerals.
- Label basic harmonic functions.
- Classify notes as chord tones, non-chord tone candidates, or unknown based on same-offset or carried within-measure harmony context.
- Provide conservative non-chord tone candidate hints (possible passing tone, possible neighbor tone) for student learning only.
- Show a simplified Student Analysis, Process Explanation, Measure Walkthrough, Technical Evidence, and a Markdown Learning Report.
- Provide downloadable demo MusicXML samples for quick testing.

## What It Does Not Support Yet

- PDF/image/scanned-score upload, OMR, or automatic conversion.
- `.mxl`, audio, MIDI, or notation-project input.
- Real OpenAI/LLM reasoning.
- Local modulation, full classical non-chord tone classification, full sustained harmony, melody/voice-leading, or jazz/modern harmony analysis.
- Definitive passing/neighbor tone classification (only conservative candidate hints are provided).
- Database persistence, authentication, user accounts, or marketplace workflows.
- Shared reviews, cross-device sync, and any automatic promotion of human notes into machine conclusions.

## Demo Screenshots

### Upload & Score Preview

Users upload a MusicXML/XML score and preview the rendered score before running deterministic analysis.

![Upload and Score Preview](docs/screenshots/01-upload-score-preview.png)

### Student Analysis

The student-facing view summarizes global key, detected chords, analyzed notes, reliability scope, and beginner-readable harmonic explanations.

![Student Analysis](docs/screenshots/02-student-analysis.png)

### Measure Walkthrough

Each measure is explained with chord label, Roman numeral, harmonic function, and a concise note-relationship summary.

![Measure Walkthrough](docs/screenshots/03-measure-walkthrough.png)

### Technical Evidence

Advanced users can inspect supported/unsupported scope, detailed chord cards, note-level evidence, and reliability labels.

![Technical Evidence](docs/screenshots/04-technical-evidence.png)

See `docs/SCREENSHOT_GUIDE.md` for suggested captions and additional screenshot ideas.

## Portfolio Summary

ScoreMind demonstrates an AI product architecture where domain reasoning is deterministic, testable, and evidence-backed. The frontend translates structured backend output into a student-friendly learning flow without claiming unsupported AI capabilities.

## Resume Bullets

- Built a deterministic MusicXML analysis backend with FastAPI, Pydantic, `music21`, and pytest.
- Implemented chord, global key, Roman numeral, harmonic function, and conservative note-level harmony-membership analysis.
- Built a Next.js frontend with MusicXML score preview, Student Analysis, Technical Evidence, and Markdown Learning Report export.
- Created validation, architecture, roadmap, release, demo, screenshot, and input-expansion documentation for portfolio-ready presentation.

## Documentation

- `docs/INPUT_EXPANSION.md`: user-facing import guidance and current MusicXML workflow.
- `docs/INPUT_RESEARCH.md`: developer/product research for future PDF/image/OMR input paths.
- `docs/OMR_EXPERIMENT.md`: isolated OMR feasibility research plan, evaluation criteria, failure cases, and decision gates.
- `docs/DEMO_FLOW.md`: demo script and recommended fixtures.
- `docs/PORTFOLIO.md`: product framing, target user, technical highlights, and resume-ready bullets.
- `docs/ARCHITECTURE.md`: backend/frontend architecture and deterministic analysis boundary.
- `docs/ROADMAP.md`: future work, clearly separated from current capability.
- `docs/VALIDATION.md`: validation process for current fixtures.
- `docs/PROFESSIONAL_VALIDATION.md`: CC0 repertoire excerpt provenance, fixed structural expectations, observed results, and remaining review work.
- `docs/RELEASE_NOTES.md`: release summary, run instructions, validation status, and limitations.
- `docs/SCREENSHOT_GUIDE.md`: suggested screenshots and captions for GitHub/portfolio presentation.

## Product Flow

- Score Input Workspace: choose a score source, read import guidance, upload `.musicxml` or `.xml`, and render the MusicXML score for visual verification.
- Student Analysis: read Student Summary, Process Explanation, Measure Walkthrough, Terminology Guide, and static learning hints.
- Technical Evidence: inspect detailed chord cards, note-level filters, summaries, backend warnings, and validation hints.
- Export Learning Report: generate a Markdown report from the current deterministic backend analysis, then copy or download it as a `.md` file.

## Input Guidance

- If you have `.musicxml` or `.xml`, upload it directly.
- If you use MuseScore or notation software, export MusicXML/XML first, then upload.
- If you only have PDF, image, screenshot, or scanned paper, convert externally to MusicXML before using this MVP.
- The Score Input Workspace explains these paths in the frontend, but it does not add PDF/image/MIDI/audio upload.
- Input conversion is future work. MVP 3.13 keeps the runtime score upload path limited to MusicXML/XML.

## Sample Files

MVP 3.13 includes downloadable demo MusicXML files in `frontend/public/samples`:

- `frontend/public/samples/c_major_progression.musicxml`: demonstrates global key, Roman numerals, harmonic functions, and Measure Walkthrough.
- `frontend/public/samples/carried_context_notes.musicxml`: demonstrates note-level chord-tone labels and carried previous chord context.

In the frontend, use the `Try sample files` panel to download a sample, then upload it manually through the normal MusicXML/XML upload flow. These files are demo assets only; they are not an input conversion feature.

## Scope

- Backend deterministic analysis remains the source of truth.
- Student Analysis is computed only from existing backend analysis JSON and does not infer new conclusions.
- MusicXML/XML remains the only runtime score input path in MVP 3.13; review JSON import is a separate human annotation workflow.
- OMR feasibility work lives only in `docs/OMR_EXPERIMENT.md` and `experiments/omr`.
- Input conversion, real LLM explanation, and advanced music-theory analysis are future work.

## Run Backend

```bash
cd backend
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

Backend default:

```text
http://127.0.0.1:8000
```

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend default:

```text
http://localhost:3000
```

Optional frontend environment variable:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

## Recommended Demo

Use:

- `backend/tests/fixtures/c_major_progression.musicxml`
- or download `frontend/public/samples/c_major_progression.musicxml` from the frontend `Try sample files` panel.

Then:

1. Upload the MusicXML file.
2. Preview the rendered score.
3. Click `Analyze`.
4. Read Student Analysis.
5. Open Technical Evidence.
6. Generate Learning Report, then copy or download it as a `.md` file.

For an optional human review, use the shared written-measure navigator, then add a review record beside the score. Export the separate JSON before changing browsers; import requires the exact same uploaded file bytes and analysis version. Review entries are never included in the Learning Report.

See `docs/DEMO_FLOW.md` for a fuller script.

## Validation Dataset

Current fixtures:

- `simple_chords.musicxml`
- `chord_quality_matrix.musicxml`
- `c_major_progression.musicxml`
- `c_major_inversions.musicxml`
- `carried_context_notes.musicxml`

Validation docs:

- `docs/VALIDATION.md`
- `docs/VALIDATION_REPORT_TEMPLATE.md`
- `docs/reviews/mvp-1.4-carried-context-notes-review.md`

## Limitations

MVP 3.13 renders MusicXML only and does not use an LLM. Score linkage is limited to verified written measures; a source ID in the older review identifies backend data, not a clickable note on the score. It still does not support PDF/image/OMR, `.mxl`, audio, MIDI, local modulation, full classical non-chord tone classification, full sustained harmony inference, phrase-level harmony, melody/voice-leading analysis, or jazz/modern harmony. Non-chord tone candidate hints remain conservative. Both human workflows are local, not machine corrections or a marketplace: older machine-review records require the same file bytes **and analysis version**, while independent harmony annotations require the same file bytes and verified written structure but intentionally do **not** bind to analysis version. The comparison view is not a verdict or accuracy metric. OMR remains isolated research.
