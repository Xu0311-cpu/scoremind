# Validation Guide for MVP 3.6

## MVP 3.6 时间轴验证

基线 `main/ac7ca5c` 重新验证：52 项后端测试通过，前端构建通过。新版本验证记录见 `docs/RELEASE_NOTES.md`；以下原有乐理核验流程保留历史范围，不代表新增推断。

运行 `/opt/miniconda3/bin/python3 -m pytest`（在 backend）及 `npm run build`（在 frontend）。新增测试必须穿过真实 MusicXML 解析与上传 API，不用手工事件替代输入验证。

| Fixture | 核验重点 |
| --- | --- |
| `timeline_overlap.musicxml` | C4=[0,4)、E4/G4=[1,2)；2 时 E/G 已结束；休止、同音重奏 |
| `timeline_ties.musicxml` | 跨小节 tie：中间片段声音 `stop+start`、记谱 `continue`，C4 合并为 `[0,12)`；和弦仅 C 延续；不同声部同音 |
| `timeline_broken_ties.musicxml` | 孤立 stop、未闭合 start、时间缺口、错音高、缺失 voice、重叠同音歧义 |
| `timeline_meter_tuplets.musicxml` | 弱起、拍号变化、精确 1/3、重复显示编号与书面序号 |
| `timeline_staff_transpose.musicxml` | part 被 music21 拆分为 PartStaff 的情况；保留 staff、记谱音高与移调诊断 |
| `timeline_slur_grace.musicxml` | slur 不合并；装饰音保留零时值来源，不补时值 |
| `timeline_parts.musicxml` | 多乐器相同音高 tie 不串来源 |
| `timeline_misaligned_parts.musicxml` | 小节网格缺失时 unsupported；受控变体覆盖双方小节结束时间不同，均定位冲突小节且不输出猜测时间 |
| `timeline_empty.musicxml` | 已计算但无音符事件，与缺失字段/未计算区分 |
| `timeline_zero_duration.musicxml` | 无 `grace` 的零时值 C4 保留来源并返回 `partial`、`zero_duration_note`；该 C4 不产生持续事件，D4 正常保留 |

测试还对 fixture 进行受控 XML 变体：缺 part ID、缺 voice/staff、缺乐器 ID、声音与记谱 tie 标签真正冲突、无拍号和无固定音高。冲突标签不能合并；普通零时值音符不能返回无诊断的 `complete`。重复解析 ID 一致；所有返回的诊断 `measure_ids` 和 `source_note_ids` 必须可在同一响应中解析；旧解释载荷同时缺失 timeline、harmonic_context、NCT 字段仍可使用。

小节网格无法对齐属于结构失败：`status=unsupported`，`measures`、`source_notes`、`sustained_events`、`slices` 均为空；只返回一条 `unsupported_timeline_structure` 诊断，引用数组为空，消息点名首个冲突的书面小节（包括缺失的 part 小节或双方结束时间不同）。不向已清空的来源数组留下悬空 ID，也不输出猜测的全曲时间。

手动步骤：上传 overlap 谱例并 Analyze，进入 Technical Evidence 的“持续音时间轴”。核对 `[1,2)` 为三个独立来源、`[2,4)` 只剩 C4；切到第三小节确认静默。上传 ties 谱例，确认 C4 事件 `[0,12)` 回指三个片段，中间来源为声音 `stop+start` / 记谱 `continue`，E4/G4 各自结束。再上传 broken_ties 与 zero_duration 谱例核对诊断，上传 misaligned_parts 谱例核对首个冲突小节和空引用，上传 meter_tuplets 确认同号不同顺序小节和分数显示。

桌面与窄屏检查：选择器切换只展示选定小节时间片；展开来源查看 staff/voice、局部起点、全曲起点、时值、tie；长 ID 和诊断不溢出；旧响应与空响应显示明确状态。时间轴音集合不能进入学生摘要或报告充当新和弦结论。

## 历史基础乐理验证流程

This document defines a small validation workflow for the deterministic MusicXML analysis backend. It is intended for simple fixtures and early product review, not for professional-grade repertoire evaluation.

Use these companion documents when recording review results:

- `docs/VALIDATION_REPORT_TEMPLATE.md`: reusable template for manual accuracy reviews.
- `docs/reviews/mvp-1.4-carried-context-notes-review.md`: example review artifact for `carried_context_notes.musicxml`.

## What Can Be Validated

MVP 1.4 can validate simple MusicXML cases where the expected result is clear:

- Basic triad and seventh-chord quality detection.
- Chord root detection.
- Conservative inversion handling.
- Global-key Roman numeral output for simple C major examples.
- Basic harmonic function labels: tonic, predominant, dominant, unknown.
- Note role labels: chord_tone, non_chord_tone, unknown.
- Note context source labels: same_offset, carried_previous_chord, none.
- API error handling for invalid MusicXML and unsupported file extensions.

## Current Fixture Dataset

Use the fixtures in `backend/tests/fixtures` as the first validation set:

- `simple_chords.musicxml`: validates measure parsing, basic major triad detection, inversion detection, diminished triad detection, and dominant seventh detection.
- `chord_quality_matrix.musicxml`: validates major, minor, diminished, augmented, dominant seventh, major seventh, minor seventh, half-diminished seventh, diminished seventh, dyad rejection, and empty-measure handling.
- `c_major_progression.musicxml`: validates global C major context, basic Roman numerals, harmonic functions, unsupported chord handling, and template explanation inputs.
- `c_major_inversions.musicxml`: validates conservative Roman numeral inversion figures and harmonic function normalization.
- `carried_context_notes.musicxml`: validates note-level same-offset context, carried previous chord context, no-context notes, chord-tone labels, and non-chord-tone candidate labels.

## Out of Scope

Do not use MVP 1.4 validation to claim support for:

- Passing tone, neighbor tone, suspension, or appoggiatura classification.
- Full sustained harmony inference.
- Melody analysis.
- Voice-leading analysis.
- Local modulation.
- Secondary dominants.
- Jazz or modern harmony analysis.
- PDF/image/OMR input.
- Real LLM/OpenAI reasoning.
- Complex repertoire with ambiguous harmony, dense textures, ornamentation, or expressive notation.

## Manual Accuracy Review Workflow

1. Start the backend and frontend.
2. Upload one fixture at a time.
3. Run deterministic analysis.
4. Compare each displayed result with the expected fixture purpose above.
5. Copy `docs/VALIDATION_REPORT_TEMPLATE.md` into `docs/reviews/` when a result should be tracked over time.
6. Record every reviewed row in the expected-vs-actual table.
7. Generate the app Markdown report when useful, but treat it as a review artifact rather than ground truth.
8. Keep review comments focused on current MVP fields only.

Recommended review table columns:

- Fixture file.
- Measure number.
- Beat or offset.
- Field reviewed.
- Expected value.
- Actual value.
- Result: correct, false_positive, false_negative, unsupported, or unclear.
- Reviewer note.

## When to Create a New Review File

Create a new file in `docs/reviews/` when:

- A fixture is added or changed.
- A system version changes and you want to preserve review history.
- A previous review found false positives, false negatives, unsupported behavior, or unclear cases.
- A target-user demo depends on a fixture and should have a documented expected result.

Use a name that includes the MVP version and fixture purpose, for example:

```text
docs/reviews/mvp-1.4-carried-context-notes-review.md
```

## Simple Accuracy Calculations

Use only cases where the expected label is explicitly known. Do not include ambiguous examples in the denominator.

### Chord Quality Accuracy

```text
correct chord quality labels / total reviewed chord quality labels
```

Example reviewed field: `detected_chords[].quality`.

### Root Accuracy

```text
correct chord roots / total reviewed chord roots
```

Example reviewed field: `detected_chords[].root`.

### Roman Numeral Accuracy

```text
correct Roman numerals / total reviewed Roman numerals
```

Example reviewed field: `detected_chords[].roman_numeral`.

Only count fixtures with a clear global-key expectation. If the current MVP intentionally returns null for unsupported chords, score that according to the expected value for the fixture.

### Harmonic Function Accuracy

```text
correct harmonic function labels / total reviewed harmonic function labels
```

Example reviewed field: `detected_chords[].harmonic_function`.

Only use the MVP function classes: tonic, predominant, dominant, unknown.

### Note Role Accuracy

```text
correct note role labels / total reviewed note role labels
```

Example reviewed field: `analyzed_notes[].role`.

Remember that `non_chord_tone` means non-chord-tone candidate only. It does not mean a full classical non-chord tone classification.

### Context Source Accuracy

```text
correct context source labels / total reviewed context source labels
```

Example reviewed field: `analyzed_notes[].evidence.context_source`.

Valid MVP values are `same_offset`, `carried_previous_chord`, and `none`.

## False Positives and False Negatives

Use these definitions consistently:

- False positive: the system outputs a supported label where the expected review says it should not.
- False negative: the system fails to output a label that the fixture clearly expects.
- Unsupported: the system returns null or unknown for a case that is intentionally outside MVP scope.
- Unclear: the example is ambiguous or too complex for the current validation set.

Examples:

- If a dyad is detected as a full chord, record a false positive.
- If a clear C major triad is not detected, record a false negative.
- If a chromatic unsupported chord returns `roman_numeral: null`, record it as correct if the fixture expects unsupported behavior.
- If a complex piece has conflicting plausible analyses, mark it unclear and remove it from accuracy calculations.

## Why Complex Repertoire Should Wait

MVP 1.4 is designed to validate simple deterministic building blocks. Complex repertoire often includes sustained harmony, non-chord tones, modulations, secondary dominants, voice-leading implications, enharmonic ambiguity, dense textures, and style-specific harmonic grammar. Those features are intentionally not implemented yet.

Using complex repertoire too early will blur the difference between a real regression and a missing future capability. Keep the validation set small, explicit, and boring for now. That is how this system earns trust before it gets clever.
