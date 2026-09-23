# MVP 3.6 Release Notes

## 当前发布：3.6.0

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
