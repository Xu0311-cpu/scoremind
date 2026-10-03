# MVP 3.11 独立和声标注设计（待复审）

状态：**设计稿，尚未实现**。基线为 `main/24850f5`（MVP 3.10）。本文件固定拟议的数据契约和验收边界，不表示当前应用已经能创建或导入这种标注。验收向量见 [HARMONIC_ANNOTATION_ACCEPTANCE.md](HARMONIC_ANNOTATION_ACCEPTANCE.md)。复审确认后才实施；届时再更新版本、README、架构、验证说明和发布说明。

## 目标与非目标

专业音乐人依据**乐谱本身**，按书面小节索引记录和声判断、明确的记谱位置、文字依据及不明确原因。一个小节可有多个和声事件；不可因为 UI 需要一张卡片就强迫选出“主和弦”。新标注独立于确定性 API 结果，也不同于 MVP 3.9 的 `scoremind-expert-review`：旧记录评价机器输出是否正确，新记录陈述校审者自己的判断。两者互不迁移、互不覆盖、互不合并成共识。

本轮不修改和弦、调性、罗马数字、音符角色、NCT 或时间轴算法；不做自动准确率统计、专家共识、云同步、账号、OMR、LLM 或谱面音符级点击。运行时上传继续只接受 `.musicxml/.xml`。没有独立标注的书面小节、字段或位置一律为**未评估**，不能把未标注、`unclear`、`partial` 或缺失值算成正确/错误，也不能产生 0%、100% 等准确率。

## 独立性与工作流

1. 上传现有 MusicXML/XML，记录原始字节 SHA-256；从可信的书面小节顺序建立导航，显示乐谱预览。**首次填写阶段隐藏机器和声、罗马数字和功能结果**；不从机器字段预填任何人工判断。显示小节号只作辅助文案，主键始终为 1 起的 `measure_index`。
2. 每份 JSON 是一个校审者的一份标注集。校审者对每小节选择 `determined`（位置均已明确）、`partial`（仅部分位置明确）或 `unclear`（无足够依据）。明确事件必须附原谱依据；不明确必须附具体原因。先保存并提示导出首次人工标注，再可主动查看机器分析作对照；查看之后新增或修改的条目必须标记为 `machine_visible`，不得伪称为首次独立标注。v1 不提供不可篡改的历史：覆盖编辑会失去原先的本地独立版本，因此编辑前必须提示导出快照；不具备原快照时不能重建先前判断。
3. `score_only_attested` 是校审者对“填写时未看机器结果”的**自我声明**，不是防篡改证明。刷新页面或导入外部包不能证明其真实先后；UI 必须如实说明。即使自我声明独立，本轮也不自动把它升格为金标准或计算准确率。
4. 本地草稿与原有人工意见使用不同状态变量、不同 `localStorage` 键、不同 JSON `format`。新包不写入分析 API、解释请求、学习报告、旧校审 JSON 或算法置信度。禁用存储、配额不足或隐私模式时保留当前页面内存、显示风险并提示导出，不声称云同步。

## JSON 契约 v1

以下字段为**拟议**严格契约。所有字符串均为纯文本，不解释为 HTML/Markdown 指令。示例 JSON 和反例在验收文档中。

| 路径 | 类型/约束 | 语义 |
| --- | --- | --- |
| `format` | 固定 `scoremind-independent-harmony` | 与 `scoremind-expert-review` 和分析 JSON 严格隔离 |
| `format_version` | 整数 `1` | 只接受明确支持的版本；未来版本须显式迁移，不能静默忽略字段 |
| `file_sha256` | 64 位小写十六进制 | 原始上传文件字节；不是文件名或乐谱标题 |
| `measure_count` | 正安全整数 | 与已核实的书面小节数量一致；不是最大显示小节号 |
| `pitch_basis` | `written` 或 `concert` | 根音及调性参照采用记谱音还是实音；不得混用，移调情形不能凭机器字段猜换算 |
| `annotation_set_id` | 1–80 字符，字母/数字/连字符 | 一份校审者标注集的稳定 ID；不自动代表真实身份 |
| `reviewer_label` | 去空白后 1–80 字符 | 自填姓名或化名；导出会携带，UI 应提示隐私风险 |
| `entries` | 数组；同一 `measure_index` 至多一条 | 一条是该标注集对一个书面小节的判断；允许空数组 |
| `entries[].id` | 唯一、稳定，1–80 字符，字母/数字/连字符 | 编辑不改 ID；禁止重复 |
| `entries[].measure_index` | `1..measure_count` | 按**书面顺序**，绝不按显示编号或数组猜测 |
| `entries[].basis` | `score_only_attested` 或 `machine_visible` | 记录填写/最后编辑时是否已显示机器结果；导入值仅为自述 |
| `entries[].assessment` | `determined`、`partial`、`unclear` | 不等于机器置信度，也不等于旧校审的正确/错误 |
| `entries[].events` | 数组；见下文 | 该小节内已明确的人工和声事件；可多于一个 |
| `entries[].unclear_reason` | 字符串或 null；最大 2000 字符 | `partial`、`unclear` 时为非空；`determined` 时必须为 null |
| `entries[].rationale` | 去空白后非空，最大 2000 字符 | 小节级依据、保留的歧义和乐理前提 |
| `entries[].created_at/updated_at` | UTC ISO 8601 毫秒字符串 | 可复核修改时间；`updated_at >= created_at` |
| `events[].offset_qn` | 规范约分非负分数字符串 | 从该书面小节起点计，单位四分音符；如 `"0"`、`"2/3"` |
| `events[].label` | 去空白后 1–120 字符 | 人工和声描述，不被强行映射到机器支持集合 |
| `events[].root` | `A`–`G` 加可选 `#`/`b`，或 null | 校审者明确给出的记谱拼写；null 表示未判断此字段 |
| `events[].quality` | 现有基础和弦质量枚举，或 null | null 可用于其他和声；自由描述保留在 `label` |
| `events[].roman_numeral` | 去空白后 1–40 字符，或 null | 必须有人工写明的调性参照；null 不是机器识别失败 |
| `events[].key_context` | 去空白后 1–80 字符，或 null | Roman numeral 非 null 时必填，明示其参考调性；不借用机器全局调性 |
| `events[].harmonic_function` | `tonic`、`predominant`、`dominant`、`unknown`，或 null | 仅为校审者明确给出的字段；null 不等于 unknown |
| `events[].evidence` | 去空白后非空，最大 2000 字符 | 直接指向乐谱的文字依据，如声部、记谱音、拍点；不靠机器事件 ID 填写 |

`entries` 按 `measure_index` 严格递增，同一小节不可重复。`determined` 至少一个 event，`unclear_reason=null`；`partial` 至少一个 event 且有不明确原因；`unclear` 必须 `events=[]` 且有不明确原因。同一条记录的 `events[].offset_qn` 严格递增且不可重复。分数须为约分后的整数或 `正分子/正分母`，分母大于 1，整数 `0` 唯一表示零；拒绝负值、浮点、`0/1`、`2/4`、前导零及零分母。`quality` 枚举拟沿用现有 `major/minor/diminished/augmented/dominant_seventh/major_seventh/minor_seventh/half_diminished_seventh/diminished_seventh/minor_major_seventh`，但**不要求**专业判断落入这个集合；无法表达时保留自由 `label`、`quality=null`。罗马数字若缺明确的人工调性上下文必须为 null。移调乐器、跨谱表歧义和时间轴 `partial/unsupported` 不得用看似精确的机器字段填空。

精确时间需以独立于和声结论的可靠 MusicXML 书面结构核验：`0 <= offset_qn < measure_duration_qn`，无拍点或结构无法可靠定位时只允许整小节 `unclear`/理由，不能猜测 offset。`pitch_basis` 固定一份标注集的音高基准；未来比较时若机器与人工基准不一致，则记 `not_evaluated`，本轮不实现移调换算。`file_sha256` 与已核实的小节数共同校验身份；来源音符 ID **不作为 v1 必填字段**，因为盲标注不能依赖机器时间轴 ID。若标注者在证据文本中写 ID，它只是文字，不自动建立可机器校验的来源关系。

## 导入、导出与存储

- 紧凑 UTF-8 JSON，顶层、entry、event 均拒绝未知键和错误类型。上限沿用旧校审的 **1 MiB**，最多 5000 条书面小节 entry、每小节最多 32 个 event；创建、编辑、内存状态、本地草稿、导出、读取和导入均执行同一限制，字节数按 UTF-8 而非 JavaScript 字符数计算。必须测试边界值，不能只限制导入。
- 导入前先校验格式/版本、文件 SHA、小节数、书面索引、唯一 ID、状态组合、规范分数与位置范围、文字和时间戳，再展示记录数与“替换当前标注集”确认。任一失败时**原草稿和表单保持不变**；绝不静默合并不同校审者意见，也不执行 JSON 内文字。原始 MusicXML 字节不进入标注包。
- 导出文件名可带固定 `scoremind-harmony-` 前缀及文件哈希前缀；下载与重新导入必须能往返。JSON 字段顺序和记录排序确定，`annotation_set_id`、记录 ID 与时间戳导出再导入不变化。不依赖下载事件就声称已落盘，需浏览器实际验证。
- 本地键拟为 `scoremind:independent-harmony:v1:<file_sha256>`，与旧 `scoremind:expert-review:v1:<sha>:<analysis_version>` 分离；同一浏览器每个文件只保留一个草稿，不是多人协作。导入其他标注集必须明确确认替换，先导出现有草稿。新契约**不绑定** `analysis_version`：升级机器算法不能改写或自动作废独立人工判断；未来比较报告另记被比较的分析版本。
- 旧的人工意见 JSON、新包格式、分析响应互相不能互导。旧 JSON 和旧解释接口保持原样；没有新字段混入后端 `MusicXMLAnalysisResponse`。前端若没有可靠书面小节映射，只显示不可标注原因，不根据显示编号猜位置。

## 评估门槛与复审决策

MVP 3.11 **只收集和复核标注，不计算自动准确率**。将来若设计离线比较：需有已核实的独立标注、明确的人工事件 offset、同一文件指纹、同一书面索引、可比的音高基准/调性语境及预先定义的字段级对齐规则；无标注、`unclear`、`machine_visible`、无法对齐的多和弦或 null 字段都记 `not_evaluated`，不进分母。多位标注者意见保留为不同包，冲突不投票变成机器真值。任何准确率算法须另行复审，不属于本设计阶段。

请复审重点确认：①一份标注集每书面小节一条、内部可多事件；②`score_only_attested` 仅是声明，查看机器后的编辑降为 `machine_visible`；③v1 不绑定分析版本、不引用机器来源 ID；④本轮不计算准确率。这四项确认后再实施。

## 复审通过后的实施顺序（本提交不执行）

1. 在独立前端模块实现契约解析、规范化、容量检查和原子导入/导出，先用两个示例包、重复显示编号和拒绝矩阵写无依赖测试。沿用现有测试工具，不修改 `reviewRecords.ts` 的旧格式。
2. 增加只看原谱的和声标注视图。书面小节位置由可信 MusicXML/OSMD 结构核对，不能从机器 `detected_chords` 预填；结构不可靠时仅说明不能安全定位，不猜位置。结果可见后的编辑须降级 `basis`，独立标注与旧校审、机器结果分栏且分开保存。
3. 用真实 `.musicxml` 在桌面与 390px 浏览器走导出落盘→导入往返、换谱隔离、存储失败、长文本和 HTML 字符串测试；同时重跑后端测试和前端构建。只在实施阶段将版本升到 3.11 并更新 README、架构、路线图、发布说明、验证说明和 AGENTS.md。
