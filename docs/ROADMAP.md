# Roadmap

This roadmap describes future work. Items listed here are not current MVP 3.15 capabilities unless explicitly implemented elsewhere.

## Current / Completed

- MVP 3.15: 390px Edge 响应式指针环境完成部分移动可用性矩阵与实际 JSON 落盘回导；实体 iPhone Safari/Android Chrome 均未验证，因此真实触控验收尚未完成。无新乐理、输入或标注契约能力；详见 [`MOBILE_VALIDATION_3_15.md`](MOBILE_VALIDATION_3_15.md)。
- MVP 3.14: 页面内按书面小节比较未保存人工标注与已存记录；换谱、Reset、导入覆盖先确认，离页仅在脏态启用浏览器原生提醒。未保存字段不进入 v1 JSON 或进度；移动端离页提醒不保证触发。
- MVP 3.13: 对独立人工和声标注按书面小节索引筛选与前后跳转；未标注位置、`unclear`、`partial`、`determined` 及两种填写基准分别计数。计数只描述人工记录状态，不是准确率、完整覆盖或经验证的专业标准；不改变 v1 JSON 与后端乐理分析。
- MVP 3.12: 在同一原文件 SHA-256 与书面小节结构核实后、主动揭示机器结果时提供只读人工对照；不自动对齐歧义事件、判对错或计算准确率，旧校审意见仍单独保存。
- MVP 3.11: 原谱优先的逐书面小节独立和声标注、严格版本化 JSON/原文件 SHA-256 绑定、全页面机器结果揭示闸门和本地草稿；人工判断与旧校审、机器输出及学习报告隔离，不计算准确率。
- MVP 3.10: 三份明确 CC0 可再分发的真实短谱例、先于程序输出固定的结构性预期及 API 回归；人工校审按书面小节分别计数和跳转到下一处存疑/错误。复杂和声仍待独立专业校审，不报告总体准确率。
- MVP 3.9: 独立的专业人工校审记录、原始文件 SHA-256 绑定、按书面小节及可选来源 ID 校验、浏览器草稿和 JSON 导入/导出；不改写机器结论或学习报告。
- MVP 3.8: 基于 OSMD 已验证书面序号的谱面与技术证据小节联动、前后导航、多谱表细框、不可定位回退与桌面/窄屏验证；不是音符级点击或新增和声结论。
- MVP 3.7: 可审计的逐片记谱音观察、新起音/延续音来源、保守最低记谱音比较、技术证据展示与最小 CI；旧和声分析不使用观察字段。
- MVP 3.6: 独立记谱时值时间轴、严格延音线基础、精确分数时间、逐音来源和可定位诊断；技术证据按小节查看。
- 重复小节显示编号不再被旧小节容器合并；新增书面顺序字段。

- Score Input Workspace for explaining supported and unsupported score sources.
- Score Input Workspace visual polish with distinct supported, export-first, research-only, and out-of-scope paths.
- Runtime MusicXML/XML upload and deterministic analysis.
- Learning Report download as a `.md` file.
- Isolated OMR feasibility research outside the production app.
- Conservative non-chord tone candidate hints (passing/neighbor tone candidates) for student learning.

## Near Term

- Improve visual polish and responsive layout.
- Improve Measure Walkthrough readability.
- Add clearer empty states and demo hints.
- Extend the licensed repertoire validation set only after provenance and independent expectations are recorded.
- Have a qualified music reviewer annotate ambiguous harmony in the current short excerpts; any future accuracy calculation requires a separately reviewed comparison design and independently verified coverage.
- Add screenshot-based demo documentation.
- Run isolated OMR feasibility experiments outside the production app.

## Mid Term

- Strengthen note-level analysis while remaining conservative.
- Evaluate future use of the notated timeline in harmony analysis; existing harmony still uses onset sets and within-measure carried context.
- Extend explicit support for cross-staff ties, asymmetric part grids, grace timing, concert-pitch conversion, and performance/repeat semantics only after separate validation.
- Expand supported chord and Roman numeral cases.
- Add more robust confidence and warning signals.
- Improve validation reporting and fixture coverage.

## Long Term

- Add PDF/image/OMR pipeline.
- Add optional LLM explanation provider that only explains deterministic analysis output.
- Evaluate a future shared human validation workflow and curated dataset process; current 3.9 review is local-only and does not synchronize.
- Explore note-level score linkage only after reliable source-to-graphic mapping is validated; current linkage is measure-level only.
- Add broader repertoire support.
- Add deployment packaging for demos.

## Current Boundary

The current score input is MusicXML/XML only. MVP 3.15 documents narrow-screen validation, not new score input or analysis. Conservative non-chord tone candidate hints remain learning aids; the runtime app still does not perform OMR, PDF/image upload, MIDI/audio analysis, local modulation, full classical non-chord tone classification, full sustained harmony inference, melody analysis, voice-leading analysis, or jazz/modern harmony analysis. Time-slice pitch observations are not harmony classifications.
