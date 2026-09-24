# MVP 3.8 Release Notes

## 当前发布：3.8.0

- 乐谱预览和“持续音时间轴”现在共用书面小节选中状态；两个区域都可按书面顺序选择及使用上一个/下一个。谱面自动滚动并用细框标示选中小节的所有谱表，显示编号不会用于定位。
- 使用 OSMD 1.9.7 公开的 `SourceMeasures`、`MeasureList`、`parentSourceMeasure` 和绘图接口核对并标框。不依赖内部 SVG 选择器；若谱面未渲染、时间轴 `unsupported`、来源/图形数量或身份不匹配，则明确显示不可定位且不高亮。弱起、重复显示编号、多谱表和多 part 均按书面顺序核验。
- 重选文件和重新分析清除旧选择；谱面宽度变化后重新渲染、复核并恢复选中标框。保留原有和弦、时间轴、来源链、音符角色、NCT、旧解释 JSON 和 `.musicxml/.xml` 上传行为。没有新增乐理结论、LLM、PDF/图片/OMR 或音符点击定位。
- 前端新增无依赖的映射/导航单元测试并纳入 CI；后端仅同步版本、警告文案和版本断言，分析算法不变。

## MVP 3.8 验证

本地 Python 3.13 后端 90 项测试通过（环境已有一条 RequestsDependencyWarning）；前端导航测试 5 项通过，`npm run build` 通过。使用真实 MusicXML 经本地上传 API，在 1280px 与 390px 浏览器检查弱起/重复编号、多谱表和多 part 的选择、标框与滚动；另核验 tie 谱例、缩放重排、触控、文件替换/重分析、`unsupported` 回退。两个宽度下页面横向溢出均为 0。浏览器测试使用临时本地服务和隔离前端构建副本，未修改产品 CORS 或上传路径；本地结果不等同于远端 CI。复现步骤见 `docs/VALIDATION.md`。

## MVP 3.7 历史发布说明

## 历史版本：3.7.0

- 每个记谱时间片新增可选 `written_pitch_observation`：活动记谱音、该片新起音、此前延续音、当前片段的来源 ID，以及安全时的最低记谱音。时间仍为精确四分音符分数字符串，区间仍为 `[start,end)`。
- 最低记谱音只是记谱音高比较，不是和弦低音、根音或实音。`partial`、移调、缺失来源、同高异名拼写、静默等情况下返回 null 和稳定原因码；`unsupported` 仍不输出猜测时间片。旧 JSON 缺字段依然可用于解释接口。
- 技术证据按小节显示观察与来源，和旧同起点和弦结果清楚分开；学生摘要、学习报告及旧和声/NCT 算法不消费新字段。
- 修复声音 `<tie type="continue">` 被接受的问题。声音只接受 `start` / `stop`；记谱 `<tied type="continue">` 配声音 `stop+start` 的有效链保持可用。
- 复审修复：技术证据在当前片段之外恢复持续事件 `[start,end)` 和可展开的完整延音来源链；非标准声音 `continue` 保留在来源标签中供审计，但 `tie_safe=false`，不能参与延音合并。
- CI 新增 Python 3.11 后端 pytest 与 Node 20 前端构建。运行时上传仍仅 `.musicxml/.xml`，无新增依赖或乐理规则。

## MVP 3.7 验证

见 `docs/VALIDATION.md` 中的真实 MusicXML 上传 API 测试。本地 Python 3.13 执行后端 90 项测试全部通过（环境已有一条 RequestsDependencyWarning），`npm run build` 通过。1280px 桌面和 390px 窄屏实测技术证据及来源显示，包括第二小节完整三段延音链，均无页面横向溢出。CI 将在推送后首次运行；本地尚未执行 Python 3.11 环境的 CI 任务，不能把本地结果称为远端通过。

## MVP 3.6 历史发布说明

## 历史版本：3.6.0

新增独立的记谱持续音时间轴，为未来和声分析提供可审计的时间基础。时间片只是记谱音集合，不是新和弦结论。旧和弦、全局调性、罗马数字、harmonic_context、音符角色和 NCT 规则不读取新时间轴。

- `notated_timeline` 包含 `source_notes`、`sustained_events`、`slices`、`measures`、`diagnostics`、支持范围。
- 内部使用 Fraction；JSON 使用约分分数字符串，单位四分音符，区间 `[start,end)`。
- 按 XML 顺序保留逐音 part/staff/voice/instrument 身份及 tie；明确声部、相同拼写/八度、时间连续且唯一匹配时合并。无法匹配只保留已记谱时长并诊断。
- 已验证中间片段声音 `stop+start` 与记谱 `continue` 可安全合并，冲突标签仍拒绝；无 `grace` 的零时值普通音符返回 `partial` 和来源诊断。结构失败诊断在消息中定位首个冲突小节，引用数组为空，避免指向已清空的时间轴来源。
- 技术证据增加按小节选择的“持续音时间轴”，可展开来源；不新增报告结构或学生乐理结论。
- 唯一旧数据行为修正：小节按书面序号聚合，不再把重复显示编号合并；增加可选 `measure_index`。旧 API `notated_timeline` 缺失或 null 表示未计算；已计算空结果用空列表表示。解释接口接受旧载荷。
- Python、前端、analysis/explanation 版本为 `3.6.0`；UI MVP 3.6。无新增依赖。

## 当前验证

- 基线 `main/ac7ca5c`：本轮重新执行 52 项后端测试全部通过，前端构建通过。
- 当前分支：85 项后端测试通过；`npm run build` 通过。桌面及 390px 窄屏浏览器验证了上传、分析、时间轴来源、半开区间和按小节呈现；窄屏时间片表格无横向截断。后端只有环境已有的 RequestsDependencyWarning，未影响结果。
- 本机 Python 3.13 符合 Python 3.11+ 要求；环境已有 RequestsDependencyWarning，未修改依赖解决环境问题。

## 当前限制

- 只接受 `.musicxml/.xml`，无 PDF/图片/OMR/LLM 或外部转换集成。
- 新时间轴只支持 score-partwise 书面顺序，不展开反复、踏板、混响或演奏时值，不推断和声/旋律/声部进行。
- 移调乐器保留记谱音高并诊断，不转换实音；跨谱表 tie、身份缺失/歧义不强行连接。
- 多 part 小节网格不一致、小节内/分谱表拍号、压缩多小节休止等结构不支持，返回 unsupported；不输出猜测的全曲定位。
- Grace 来源保留零时值，未加入正时值事件；无固定音高、未支持微分音被诊断并省略，partial 的空集合不能当作完整乐谱静默。
- ID 对相同 XML 重复解析稳定，不是跨编辑永久 ID。旧分析 part/voice 字段仍来自历史 music21 路径；可靠来源请使用新时间轴，不据此解读旧 NCT 为完整旋律分析。

---

# MVP 3.5 历史发布说明

## Release Purpose

MVP 3.5 adds conservative non-chord tone candidate hints for student learning. This is NOT full non-chord tone analysis — it is a candidate layer with cautious wording and low confidence.

## What Changed

- Added `non_chord_tone_candidate` field to every analyzed note with kind, confidence, reason, and limitations.
- Kinds: `not_applicable` (chord tones), `passing_tone_candidate`, `neighbor_tone_candidate`, `unknown_non_chord_tone_candidate`.
- Passing/neighbor tone candidates are detected only from simple same-measure adjacent pitch motion (stepwise movement).
- Non-chord tones without safe adjacent context are labeled `unknown_non_chord_tone_candidate`.
- Confidence is always `low` in MVP 3.5 (never `high`).
- All wording uses conservative language: "可能的经过音候选", "可能的辅助音候选", "学习提示，不是最终乐理结论".
- Explanation endpoint includes NCT candidate counts in the note text section.
- Frontend displays NCT candidate info in note cards, measure walkthroughs, and learning reports.
- All version strings updated to 3.5.

## What Did Not Change

- Chord detection algorithm is unchanged.
- Key detection algorithm is unchanged.
- Roman numeral algorithm is unchanged.
- Note-level chord-tone classification is unchanged.
- Harmonic context behavior is unchanged (MVP 3.4.1 backward compatibility).
- No LLM calls, OMR, PDF/image, MIDI, audio, database, or authentication added.
- No new dependencies.
- `possible_non_chord_tone_type` field remains null (preserved for backward compatibility).

## Non-Chord Tone Candidate Schema

```python
class NonChordToneCandidate(BaseModel):
    kind: Literal["passing_tone_candidate", "neighbor_tone_candidate", "unknown_non_chord_tone_candidate", "not_applicable"]
    confidence: Literal["low"]
    reason: str
    limitations: list[str]
```

## Detection Rules

- Chord tone → `kind="not_applicable"`, `confidence="low"`
- Unknown role (no harmony context) → `kind="unknown_non_chord_tone_candidate"`, `confidence="low"`
- Non-chord tone with stepwise same-direction adjacent motion → `kind="passing_tone_candidate"`, `confidence="low"`
- Non-chord tone with same-pitch neighbors (away-and-back) → `kind="neighbor_tone_candidate"`, `confidence="low"`
- All other non-chord tones → `kind="unknown_non_chord_tone_candidate"`, `confidence="low"`
- Adjacent notes must be in the same measure; cross-measure context is not used.

## Validation Status

- Backend: 43 tests passing (35 existing + 8 new for NCT).
- Frontend: build passing.
- All existing MVP 3.4.1 tests still pass.

## Known Limitations

- Non-chord tone candidate hints are conservative learning aids, not definitive music-theory conclusions.
- Passing/neighbor tone detection uses only simple same-measure adjacent pitch motion.
- No consideration of rhythm, voice, harmonic rhythm, or phrase structure.
- Cross-measure melodic context is not used.
- Confidence is never high; all labels should be treated as tentative.
- Suspension, appoggiatura, échappée, and other complex non-chord tone types are not detected.
- PDF/image/OMR input is future work.
