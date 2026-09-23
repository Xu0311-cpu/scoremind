# Architecture

## Backend Structure

The backend is a Python FastAPI app. Its responsibilities are:

- accept MusicXML/XML upload
- parse symbolic score structure
- run deterministic music analysis
- return typed structured JSON
- generate template-based explanations from existing analysis JSON

Important areas:

- `app/main.py`: FastAPI app setup and version metadata.
- `app/api/v1/routes_analysis.py`: MusicXML analysis endpoint.
- `app/api/v1/routes_explanation.py`: explanation endpoint.
- `app/music/parser.py`: MusicXML parsing into internal parsed measures and events.
- `app/music/chord_analyzer.py`: deterministic chord quality detection.
- `app/music/key_analyzer.py`: global key detection wrapper.
- `app/music/roman_numeral_analyzer.py`: conservative Roman numeral and harmonic function mapping.
- `app/music/note_analyzer.py`: note-level harmony membership using same-offset and carried previous chord context.
- `app/schemas/analysis.py`: Pydantic analysis response schema.
- `app/services/explanation_service.py`: template explanation provider.

## MusicXML Parsing Pipeline

1. Upload `.musicxml` or `.xml`.
2. Parse bytes with `music21`.
3. Extract measures, notes, source chord events, offsets, beats, durations, and pitches.
4. Pass parsed symbolic structures into deterministic analyzers.

The backend does not accept PDFs or images in the current MVP.

## Analysis Pipeline

### MVP 3.6 独立记谱时间轴

`parse_musicxml_bytes` 保持 `music21` 导入路径，同时调用 `timeline_normalizer.py` 从原始 XML 规范化时间和身份。`notated_timeline.py` 负责延音线合并及时间片；路由只调用并组装 `notated_timeline`。类型位于 `schemas/timeline.py`，前端视图位于 `NotatedTimeline.tsx`。

实测 `music21` 会把 part ID 改为名称、多谱表拆成 `PartStaff`、单声部导入不保留 `Note.voice`；跨小节 `getContextByClass(Voice)` 还可能找到前一小节的声部。因此新时间轴从 XML 的 part/staff/voice/instrument 明确标签取身份，不依赖随机对象 ID，不据此猜测旋律。单谱表缺少 staff 时按 MusicXML 单谱表约定记录 `1`；缺少 voice 不假定为 `1`，延音线不合并。

内部音符时间为 `Fraction`。按 `<divisions>`、`<duration>`、`<backup>`、`<forward>` 和和弦起音位置处理每个 part 的实际顺序；小节全曲起点由前面小节长度累加，绝不以编号乘拍数。显式弱起或首个短小节使用实际长度，其余小节包含到拍号长度的静默；缺拍号诊断后只用显式时值。拍号变化被逐小节读取，三连音以源 duration/divisions 精确保留，不二次应用 time-modification。多个 part 的小节时间网格不一致时拒绝建立新时间轴，避免猜测对齐。

来源 ID 为 `p{part_index}:m{measure_index}:n{XML_note_index}`，均从 1 起；note 索引包含休止元素。它对同一 XML 重复解析稳定，不承诺跨谱面编辑保持不变。显示小节号单独保留为字符串。每个音符（包括和弦内的每个音）单独保存 tie 标签；持续事件通过 `source_note_ids` 回指片段。

延音线只在明确的 part/staff/voice/instrument 身份、相同音高拼写及八度、精确时间连续、唯一前驱与后继下连接。缺少乐器 ID 时即使 part 唯一也不合并。`stop + start` 表示 continue；重叠同音、孤立 stop、未闭合 start、时间缺口、音高不符、sound tie 与 notation tied 冲突都报告诊断，不补造时值。slur 和重新起奏不连接。谱表间 tie 暂不合并。

扫描所有起音、结束、来源片段边界和小节边界生成半开区间。同一时间先结束旧音，再加入新音；不同声部同音保留独立事件。时间片 `source_note_ids` 只指本片中实际记谱片段，事件的引用则包含整条 tie 链。空 active set 明确表示无已支持的持续音，有遗漏诊断时不能据此断言完整乐谱静默。

契约：`notated_timeline: null`（或旧载荷无此字段）表示未计算；有对象但事件列表为空表示已计算且为空。`status` 为 `complete / partial / unsupported`，任何诊断产生 partial，结构无法可靠定位时 unsupported 且不返回猜测的时间。`time_unit=quarter_note`、`time_encoding=reduced_fraction_string`、`pitch_basis=written`；JSON 时间为非负整数或约分分数字符串。

兼容边界：旧分析的三个乐理算法与音符规则不变，也不使用持续音集合。修正旧小节容器按显示编号合并的问题，改用书面序号，并在 API 添加可选 `measure_index`；重复编号不再制造同拍和弦或跨小节上下文。旧分析中的 part/voice 字段仍是原有 music21 路径，不应当作新时间轴来源键。新规范化层遇到不支持结构时不会阻断原有分析。

### MVP 3.7 记谱音观察

`timeline_observations.py` 在 3.6 时间片完成后生成独立的 `written_pitch_observation`。每个活动持续事件保留该片实际活动的 source note IDs，并按事件起点是否等于片段起点区分 `new` / `continuing`；跨小节 tie 的后续来源仍属于同一持续事件，不会变成新的起音。新增字段可选，旧 JSON 中缺失或 null 代表未计算；已计算的静默片段有空 `active_notes` 和 `no_active_supported_notes` 原因。

最低记谱音只在时间轴 `complete`、来源完整且音高可比较时给出；`partial`、移调乐器、缺失引用、不同拼写的同高最低音或静默时返回 null 与原因码。它是**记谱音高的数值比较**，不是低音功能、根音或实音。声音 `<tie>` 只接受 MusicXML 的 `start`/`stop`；记谱 `<tied type="continue">` 对应声音 `stop+start` 仍能连接。原有 detected_chords、harmonic_context、note role、NCT 与解释服务都不读取观察字段。前端仅在 Technical Evidence 中展示，学习报告不将其转为和声结论。

### 保留的乐理路径

1. Chord analysis detects vertical pitch sets at the same measure offset.
2. Global key analysis uses `music21` key analysis and returns tonic, mode, and confidence when available.
3. Roman numeral analysis uses detected chord roots and global key context, then conservatively accepts supported figures.
4. Harmonic function maps accepted Roman numeral families to tonic, predominant, dominant, or unknown.
5. Note-level analysis checks whether each note belongs to the detected same-offset harmony. If no same-offset chord exists, it may use the nearest earlier chord within the same measure as carried context.
6. Evidence and warnings are included for auditability.

## Frontend Structure

The frontend is a Next.js app. Its responsibilities are:

- upload MusicXML/XML
- render score preview
- call backend analysis and explanation endpoints
- present Student Analysis and Technical Evidence
- generate Learning Report from current analysis JSON

Important areas:

- `frontend/app/page.tsx`: main single-page product workflow.
- `frontend/app/globals.css`: lightweight product styling.
- `frontend/package.json`: frontend app metadata and dependencies.

## OSMD Score Preview

OpenSheetMusicDisplay renders the uploaded MusicXML text in the browser. This preview is for visual verification only. It is not OMR and does not convert images or PDFs.

## Student View vs Technical Evidence

Student Analysis is the default user-facing path. It includes:

- Student Summary
- Process Explanation
- Measure Walkthrough
- Terminology Guide
- learning hints
- limitations

Technical Evidence is for inspection and validation. It includes:

- detailed chord cards
- note-level filters
- note-level summaries
- reason codes
- backend warnings
- validation hints

## Learning Report Generation

The Learning Report is generated in the browser from the current analysis JSON and optional template explanation response. It is Markdown text. It does not add new music-theory conclusions.

## Why Backend Remains Deterministic

Music-theory reasoning needs stable, inspectable outputs. The backend therefore remains deterministic and structured. This reduces hallucination risk, makes tests meaningful, and allows future LLM providers to explain only what the backend has already computed.
