# ScoreMind 项目协作说明

## 项目现状

ScoreMind 是面向音乐学习者的确定性 MusicXML 乐谱分析系统。当前版本为 MVP 3.6，运行时仅接受 `.musicxml` 和 `.xml` 文件。

后端负责解析符号化乐谱并生成可审计的结构化分析；前端负责乐谱预览、学习视图、技术证据和 Markdown 学习报告。确定性后端输出是产品的事实来源，解释层和前端不得自行推断新的乐理结论。

开始工作前优先阅读：

- `README.md`：当前能力、运行方式和产品边界。
- `docs/ROADMAP.md`：已完成工作与后续方向。
- `docs/ARCHITECTURE.md`：模块职责和数据流。
- `docs/RELEASE_NOTES.md`：当前版本行为与兼容约束。
- `docs/VALIDATION.md`：验证方法和样例范围。

注意：`backend/README.md` 仍保留早期 MVP 0.4.1 描述。判断当前能力与版本时，以根目录 `README.md`、`docs/RELEASE_NOTES.md`、代码和测试为准。

## 当前能力边界

- 支持 MusicXML/XML 上传、浏览器乐谱预览和确定性分析。
- 支持基础三和弦、七和弦、转位、全局调性、保守的罗马数字与基础和声功能。
- 支持同一 offset 和小节内前序和弦上下文下的音符角色判断。
- MVP 3.6 新增独立 `notated_timeline`：记谱音高、Fraction 时间、逐音来源、安全 tie 链和半开时间片；旧和声/NCT 不使用该字段，音集合不能称作新和弦结论。
- 新时间轴来源以 XML part/staff/voice/instrument 标签为准，不用 music21 随机 ID 或跨小节上下文猜身份。书面小节顺序与显示编号独立，缺失身份或歧义 tie 必须诊断。
- MVP 3.5 提供经过音/辅助音候选提示；它们只是保守学习提示，置信度固定为 `low`，不能表述为最终乐理结论。MVP 3.6 的持续音时间轴不改变这条边界。
- 当前没有真实 LLM/OpenAI 调用、数据库、认证、用户系统或持久化任务队列。
- 当前产品不支持 PDF、图片、扫描谱、OMR、`.mxl`、MIDI、音频、局部转调、完整非和弦音分类、完整延续和声、旋律/声部进行或爵士和声。
- OMR 只存在于 `docs/OMR_EXPERIMENT.md` 和 `experiments/omr/` 的隔离研究中，不得把它描述成运行时能力。

## 关键代码入口

后端使用 Python 3.11+、FastAPI、Pydantic、music21 和 pytest：

- `backend/app/main.py`：FastAPI 应用和版本信息。
- `backend/app/api/v1/routes_analysis.py`：MusicXML 分析接口及响应组装。
- `backend/app/api/v1/routes_explanation.py`：基于已有分析 JSON 的解释接口。
- `backend/app/music/parser.py`：MusicXML 解析与内部事件模型。
- `backend/app/music/timeline_normalizer.py`：独立 XML 来源与精确记谱时间规范化。
- `backend/app/music/notated_timeline.py`：严格 tie 合并与持续音时间片。
- `backend/app/schemas/timeline.py`：独立时间轴契约；旧载荷缺省为 null，与计算后空结果不同。
- `backend/app/music/chord_analyzer.py`：确定性和弦识别。
- `backend/app/music/key_analyzer.py`：全局调性分析。
- `backend/app/music/roman_numeral_analyzer.py`：保守罗马数字与和声功能映射。
- `backend/app/music/note_analyzer.py`：音符角色、和声上下文和非和弦音候选。
- `backend/app/schemas/analysis.py`：分析响应契约。
- `backend/app/services/explanation_service.py`：模板解释；不调用 LLM。
- `backend/tests/test_musicxml_analysis.py`：主要回归测试。
- `backend/tests/test_notated_timeline.py`：真实 XML → parser → 时间轴 → API 的边界与兼容测试。

前端使用 Next.js 15、React 19、TypeScript 和 OpenSheetMusicDisplay：

- `frontend/app/page.tsx`：当前单页产品流程和主要 UI 逻辑。
- `frontend/app/globals.css`：全局样式。
- `frontend/app/NotatedTimeline.tsx`：按小节显示时间片、来源和诊断的技术证据视图。
- `frontend/public/samples/`：可下载演示样例，不代表转换能力。

## 开发约束

- 先扩展结构化分析契约和确定性规则，再更新解释与展示。
- 保持分析证据、警告、置信度和限制可见；不要把未知或不支持的情况强行归类。
- 和弦、调性、罗马数字、和声功能、音符角色及声部规则必须由确定性代码产生。未来 LLM 只能解释已存在的结构化结果。
- 修改 Pydantic schema 时检查解释接口对旧分析 JSON 的兼容性。现有测试覆盖缺失 `harmonic_context` 和 `non_chord_tone_candidate` 的旧载荷。
- 非和弦音候选继续使用谨慎措辞。除非规则、评估和产品范围同时升级，否则不要提高置信度或声称完整分类。
- 新增能力时同步更新根 `README.md`、`docs/ROADMAP.md`、`docs/RELEASE_NOTES.md`、相关版本字符串、API 警告和前端限制说明。
- 新增乐理规则时加入最小、明确、无歧义的 MusicXML fixture，并覆盖正确结果、未知结果和误报防护。
- 保持改动聚焦，不顺手重构无关模块，不覆盖用户已有修改。

## 本地验证

后端：

```bash
cd backend
python -m pytest
```

前端：

```bash
cd frontend
npm run build
```

需要手动联调时：

```bash
cd backend
uvicorn app.main:app --reload
```

```bash
cd frontend
npm run dev
```

默认后端地址为 `http://127.0.0.1:8000`，前端地址为 `http://localhost:3000`。前端可通过 `NEXT_PUBLIC_API_BASE_URL` 指向后端。

推荐使用 `backend/tests/fixtures/c_major_progression.musicxml` 和 `backend/tests/fixtures/carried_context_notes.musicxml` 做端到端检查。

完成代码修改后至少运行受影响侧的验证；分析契约或跨端行为变化时同时运行后端测试和前端构建。最终报告应说明实际执行的验证及尚未覆盖的风险。
