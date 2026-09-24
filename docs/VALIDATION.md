# Validation Guide for MVP 3.9

## MVP 3.9 人工校审验证

在 `backend/` 运行 `/opt/miniconda3/bin/python3 -m pytest`；在 `frontend/` 运行 `npm test` 和 `npm run build`。校审数据契约测试检查：增删改、相同文件指纹及分析版本下的浏览器草稿重载、不同指纹隔离、错谱/跨版本/无效书面小节/悬空来源/重复 ID/异常 JSON 拒绝、旧分析无时间轴时禁用，以及存储被拒绝或配额耗尽时保留可导出的内存记录。

浏览器手动步骤：上传 `timeline_meter_tuplets.musicxml` 并 Analyze，按书面序号选择两个显示标号同为 `1` 的小节，分别添加整小节校审；选择 `timeline_ties.musicxml` 时可选 `p1:m2:n1` 来源 ID，记录依据、编辑状态并删除一条。导出 JSON 后刷新页面、重新上传**同一字节文件**并分析，确认本地草稿恢复；用导出的 JSON 替换/恢复记录。换成其他 MusicXML，旧记录不得出现；导入原文件 JSON 必须因 SHA-256 不匹配而拒绝。将 JSON 中的来源 ID 改为其他小节或不存在的 ID、分析版本改为旧版本，均应拒绝且保留现有记录。

在 390px 宽度触控切换小节、打开来源选择、编辑和删除，确认状态与谱面/技术证据导航一致且页面无横向溢出。将很长的无空格依据或 `<img src=x onerror=alert(1)>` 作为文字输入并导入，必须换行且仅显示文本，不执行 HTML。禁用浏览器本地存储或模拟容量不足时，页面应明确提示当前记录仍在内存中、刷新可能丢失，并可立即导出 JSON。旧分析响应缺 `notated_timeline` 时应显示校审不可用而不猜测来源。人工记录不得出现在分析 API、解释请求或 Markdown 学习报告中。

本地验收记录：Python 3.13 后端 90 项通过（环境已有 RequestsDependencyWarning），前端 11 项单测及 `npm run build` 通过。内置浏览器使用真实 `timeline_meter_tuplets.musicxml` 完成上传、分析、新增、编辑、同号书面小节隔离、刷新后重新上传恢复、换成 `timeline_ties.musicxml` 后 0 条、错谱 JSON 导入拒绝；报告文本不含人工依据。390px 与 1280px 视口页面横向溢出均为 0，390px 下小节按钮可点击。包含 HTML 标签的长依据以文本显示，未插入 `<img>`。当前内置浏览器没有上报 blob 下载事件，且后续文件选择事件超时；改为内联确认后的删除、导入覆盖、实际下载落盘及真实触屏硬件手势仍需独立复审时在常规浏览器复验，不能把 390px 鼠标点击称为真实触屏测试。

## MVP 3.8 书面小节导航验证

在 `backend/` 运行 `/opt/miniconda3/bin/python3 -m pytest`；在 `frontend/` 运行 `npm test` 与 `npm run build`。前端测试使用现有 TypeScript 编译器与 Node 内置测试运行器，不增加运行时或测试依赖。它检查弱起/重复标号仍为独立书面序号、多 part 网格、每个谱表图形来源匹配、前后边界、旧响应缺字段、`unsupported`、缺失谱面和不匹配图形时不返回高亮目标。

浏览器端用真实 `backend/tests/fixtures/timeline_meter_tuplets.musicxml` 上传并 Analyze：下拉选项应为书面第 1/2/3 小节（标号 `0/1/1`），后两个同号小节分别高亮；在技术证据点“下一个”应滚回谱面并将两处选择同步。`timeline_staff_transpose.musicxml` 验证同一小节的两个谱表都被框出；`timeline_parts.musicxml` 验证两个 part 的两个谱表都框出。`timeline_ties.musicxml` 验证导航不丢失原有完整 tie 来源链。`timeline_misaligned_parts.musicxml` 预期 `unsupported`，不显示高亮，只显示不可定位原因。重选文件应移除旧选框和分析导航；重新分析从首个书面小节开始。将视口从 1280px 缩到 390px，应重新排版且保持当前选择；触控下一小节后等待平滑滚动完成，查看标框和页面横向溢出。谱面自身在较密排版时可能允许内部水平滚动，但页面不应横向溢出。

本轮实测：Python 3.13 后端 90 项通过（既有 RequestsDependencyWarning 1 条）；前端导航单测 5 项通过，构建通过。1280px / 390px 浏览器中，meter_tuplets 3 个书面位置各绘制 4 条边框线；staff_transpose 与 parts 的每个选中位置均绘制 8 条边框线（各 2 个谱表）。桌面和窄屏切换后两处选择一致，页面 `document.documentElement.scrollWidth - innerWidth` 为 0。390px 下技术证据触控导航后，等待平滑滚动约 1 秒，谱面容器回到视口中；缩放重排仍保留高亮。文件替换后高亮与导航归零，重新分析回到首个小节；misaligned_parts 返回 `unsupported` 时高亮线数量为 0。浏览器用独立 Next 临时副本避免本机其他开发服务共享 `.next` 缓存，后端仅在临时测试服务允许测试端口跨域，仓库 CORS 配置未改变。

OSMD 映射只用于书面小节可视定位。活动持续音集合仍不是和弦；旧 detected_chords、harmonic_context、音符角色、NCT 和学习报告不读取图形位置。失败状态应由文字明确说明，不能用显示小节号猜 SVG 元素。

## MVP 3.7 历史验证

## MVP 3.7 记谱音观察验证

从真实 MusicXML 通过 `/api/v1/analyze/musicxml` 上传，不以手工构造事件替代验收。`timeline_moving_upper.musicxml` 验证 C4 在 `[0,4)` 持续，E4 `[1,2)`、G4 `[2,3)` 依次新起；这两个时间片各有持续 C4，但旧 `detected_chords` 仍为空。`timeline_overlap.musicxml` 验证 E/G 恰在 2 结束、重奏产生新事件、休止片不带过旧音。`timeline_ties.musicxml` 验证跨小节 `stop+start` / 记谱 `continue` 的来源片段作为延续而非新起；多声部同音保留两个事件。受控 XML 变体将声音 `<tie type="continue">` 改为非标准值，必须诊断并拒绝合并。

`timeline_staff_transpose.musicxml`、身份缺失变体、损坏 tie 和 `timeline_misaligned_parts.musicxml` 分别核验最低音比较不可用、原因码、结构失败不输出猜测片段。旧响应缺少 `written_pitch_observation` 仍可用于解释；空观察与未计算需区分。对新增引用断言可在当前响应内回溯，重复解析结果稳定。桌面及窄屏应检查按小节选择、精确分数、来源展开、静默与诊断，不将活动音集合展示为和弦。

复审回归：上传 `timeline_ties.musicxml`，在技术证据中选第 2 小节。C4 必须同时显示持续事件 `[0,12)`、当前片段 `p1:m2:n1` 和完整链 `p1:m1:n1 → p1:m2:n1 → p1:m3:n1`；展开链后可核对三段来源。把中间声音标签替换成非标准 `<tie type="continue"/>` 的 API 测试应保留 `tie: ["continue"]` 供审计，同时给出诊断、`tie_safe=false` 并拒绝合并。此用例在 390px 窄屏不应横向溢出。

历史 3.7 命令：在 `backend/` 运行 `/opt/miniconda3/bin/python3 -m pytest`，在 `frontend/` 运行 `npm run build`。当时本地 Python 3.13 下 90 项测试通过，前端构建通过；1280px 与 390px 页面核对无横向溢出。当前 `.github/workflows/ci.yml` 在 push / PR 时执行 Python 3.11 后端测试及 Node 20 前端测试与构建；本地通过不代表远端 CI 已运行。

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
