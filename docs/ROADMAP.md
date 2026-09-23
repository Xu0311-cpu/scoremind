# Roadmap

This roadmap describes future work. Items listed here are not current MVP 3.8 capabilities unless explicitly implemented elsewhere.

## Current / Completed

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
- Add more small validation fixtures.
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
- Add human validation workflow for quality review and dataset building.
- Explore note-level score linkage only after reliable source-to-graphic mapping is validated; current linkage is measure-level only.
- Add broader repertoire support.
- Add deployment packaging for demos.

## Current Boundary

The current system is MusicXML/XML only. MVP 3.8 retains conservative non-chord tone candidate hints (possible passing tone, possible neighbor tone) for student learning, but the runtime app still does not perform OMR, PDF/image upload, MIDI/audio analysis, local modulation, full classical non-chord tone classification, full sustained harmony inference, melody analysis, voice-leading analysis, or jazz/modern harmony analysis. Time-slice pitch observations are not harmony classifications.
