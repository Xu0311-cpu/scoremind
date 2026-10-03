# MVP 3.11 契约验收样例

这些是**契约测试向量，不是已经发生的专业人工校审或准确率结果**。示例内容直接依据仓库 MusicXML 的记谱元素或刻意标为不明确，绝不由 ScoreMind 分析输出生成“标准答案”。契约定义见 [HARMONIC_ANNOTATION_DESIGN.md](HARMONIC_ANNOTATION_DESIGN.md)。

## 可复核输入

| 乐谱 | 原始字节 SHA-256 | 书面索引与用途 |
| --- | --- | --- |
| `backend/tests/fixtures/simple_chords.musicxml` | `d954c063542c39b11ac271495c33d5a65ffd5b1c835b6cae81f0d1a0094531c5` | 首小节 XML 同起音 C4/E4/G4、`<chord/>`；仅供契约示意，不构成专业金标准 |
| `backend/tests/fixtures/timeline_meter_tuplets.musicxml` | `f304e5aee7dc547302eaa1aa4a451049da757df442cf625fbf764f79417e634c` | 3 个书面小节，显示编号 `0/1/1`；索引 2 和 3 必须分离 |
| `backend/tests/fixtures/professional/mozart_k157_opening.musicxml` | `ac43b91ee29b890f3258c40f5454172c9678b0be565635d1db9b6614c09fdb46` | 4 个书面小节、四声部；没有独立核定和声标签，应保持 `unclear` |

在项目根运行 `shasum -a 256 <对应文件>` 可复核哈希；用 XML `<part>/<measure>` 顺序核对索引，不用 `measure number` 字符串作键。下例时间和音高取自原始 `simple_chords.musicxml` 的首小节，并非 API 输出。`reviewer_label` 是示意化名，不应当作真实专业人士签署；该样例**不得用于准确率分母**。

## 合法包示例 A：明确位置，但非评测金标准

与 `simple_chords.musicxml` 原始字节匹配，首小节从记谱 C4/E4/G4 人工写下一个示意标签。没有独立确定调性，故 Roman numeral、key context 和功能均为 null。

```json
{
  "format": "scoremind-independent-harmony",
  "format_version": 1,
  "file_sha256": "d954c063542c39b11ac271495c33d5a65ffd5b1c835b6cae81f0d1a0094531c5",
  "measure_count": 4,
  "pitch_basis": "written",
  "annotation_set_id": "contract-example-a",
  "reviewer_label": "契约示例（非正式校审）",
  "entries": [
    {
      "id": "entry-1",
      "measure_index": 1,
      "basis": "score_only_attested",
      "assessment": "determined",
      "events": [
        {
          "offset_qn": "0",
          "label": "C major triad",
          "root": "C",
          "quality": "major",
          "roman_numeral": null,
          "key_context": null,
          "harmonic_function": null,
          "evidence": "首小节三个同起音的记谱音为 C4、E4、G4；后两个音有 <chord/>。"
        }
      ],
      "unclear_reason": null,
      "rationale": "仅演示从原谱记录首个同时音组；未给出整曲调性或后续小节判断。",
      "created_at": "2026-10-03T00:00:00.000Z",
      "updated_at": "2026-10-03T00:00:00.000Z"
    }
  ]
}
```

期望：同一原文件可导入、导出并再次导入，严格结构和 ID 不变；首小节的 `determined` 只说明**已录的 0 拍事件**有判断，不证明整小节穷尽；第二至第四书面小节**无条目**，显示“未标注”，不显示“错误”或任何准确率。该包为测试向量，`basis` 字符串仅是模拟声明，不证明真有盲评专家。

## 合法包示例 B：多声部但不明确

匹配专业谱例 K.157；不从现有机器 `detected_chords` 复制标签。

```json
{
  "format": "scoremind-independent-harmony",
  "format_version": 1,
  "file_sha256": "ac43b91ee29b890f3258c40f5454172c9678b0be565635d1db9b6614c09fdb46",
  "measure_count": 4,
  "pitch_basis": "written",
  "annotation_set_id": "contract-example-b",
  "reviewer_label": "契约示例（非正式校审）",
  "entries": [
    {
      "id": "entry-1",
      "measure_index": 1,
      "basis": "score_only_attested",
      "assessment": "unclear",
      "events": [],
      "unclear_reason": "四个声部的和声事件位置及功能尚未经独立专业核定。",
      "rationale": "仅记录待校审状态，不把本系统在此小节的输出当作预期。",
      "created_at": "2026-10-03T00:00:00.000Z",
      "updated_at": "2026-10-03T00:00:00.000Z"
    }
  ]
}
```

期望：导入后书面第 1 小节显示“不明确”，第 2–4 小节显示“未标注”；两种情况都**不计算准确率**，但语义必须区分。实际开展专业校审时需由校审者独立填写，不能将此示例升格为专业结论。

## 覆盖缺口验收例：漏录第二事件

实施测试可用**受控、人工编写的** 4/4 单小节 MusicXML（测试时再建，不作为真实专业谱例）：源 XML 在小节局部 `offset_qn=0` 记谱 C4/E4/G4 同起音，在 `offset_qn=2` 记谱 G3/B3/D4 同起音。先从 XML 核定这两个位置，不读取 ScoreMind 的 `detected_chords`。模拟标注者只在 offset `0` 写一个 C major 事件，`assessment="determined"`，未录 offset `2`。

期望：该包**契约有效**，因为已录事件有明确依据；UI 不显示“整小节已完整检查”。offset `2` 仍是**未独立标注**，即使机器只返回一处事件，也不得据此判它漏报、计算召回率或把第二处反推成人工预期。若校审者已注意到第二位置但无法判断，应选 `partial` 并在 `unclear_reason` 明示。此例只验证覆盖语义，不给两处和声贴专业金标准。

## 实施验收矩阵

| 用例 | 操作/变体 | 期望 |
| --- | --- | --- |
| 独立录入 | 分析前只看 MusicXML 预览，录入依据；再显示机器结果 | 原判断不预填；显示机器后若编辑，先提示导出原快照，新/编辑条目的 `basis=machine_visible`，没有快照时不能声称可还原首次判断 |
| 全页面盲态 | 分析前切换学生/技术视图、解释、学习报告、时间轴或旧校审区域；文件先前有残留分析状态 | 这些机器输出组件及旧校审入口均不挂载，DOM/辅助技术/复制与下载入口也不可读取旧结果；只保留原谱和独立标注 |
| 单向揭示 | 点击 Analyze 或任一可能显示/复制/下载机器内容的入口，请求随后成功或失败 | 先按当前文件 SHA 持久记录 `machine_revealed=true`，再进行动作；失败也不恢复盲态，不能通过切换标签绕过 |
| 普通分析独立可用 | 上传文件后不创建人工标注，直接点击 Analyze | 无需先填写或保存标注；按相同揭示闸门进入机器分析，新建人工条目只能是 `machine_visible` |
| 查看后刷新再编辑 | 同文件先盲存一条、查看机器、刷新并重上传相同字节，再编辑/新增 | 刷新后先恢复已查看标志；旧未修改条目保留原 `basis`，编辑/新增必须为 `machine_visible`，提示导出原快照；换谱不串状态，重传原谱也不能重置 |
| 存储不可用 | 禁用/拒绝 `localStorage` 后尝试盲存或点击 Analyze，分别取消与确认退出盲态，随后刷新 | 本次会话不得新存 `score_only_attested`；取消时不展示机器结果，确认后先标记当前会话已揭示再允许正常分析，新建/编辑条目只能为 `machine_visible`；旧未编辑条目不追溯改写。提示导出内存记录及刷新后无法证明查看历史；普通 Analyze 不因存储失败不可用，也不先泄露结果再确认 |
| 写入失败后刷新 | 已明确退出盲态、但揭示标志未能持久写入；刷新并重新上传同一文件 | 不把缺失标志当作“从未查看”的证明；存储仍不可用时继续禁用新的 `score_only_attested` 声明。说明本次查看历史不可复原，不自动把旧/新记录认定为独立金标准 |
| 多事件 | 一小节在 `offset_qn=0` 和 `2` 各录一事件 | 同一 `measure_index` 下保留两事件，不折叠成一个“主和弦”；重复或乱序 offset 拒绝 |
| 漏录第二事件 | 受控 XML 有 offset `0` 与 `2` 两处，人工只录 offset `0` 且为 `determined` | 合法但仅已录事件明确；offset `2` 未标注，不能判机器漏报或加入准确率分母 |
| 不明确 | `unclear` 且 `events=[]`、有原因；或 `partial` 且有事件和原因 | 允许保存；缺原因、`unclear` 带事件、`determined` 无事件均拒绝 |
| 重复显示号 | `timeline_meter_tuplets.musicxml` 的书面 2/3 均显示号 1，分别录入 | 两条记录、两个导航位置；导出/导入后仍不合并 |
| 跨版本独立性 | 机器分析版本改变而原文件字节不变 | 独立标注包仍按文件指纹验证；不与旧 `analysis_version` 绑定，不自动声称机器结果相同 |
| 导入持久化失败 | 同谱已有草稿 A，确认以有效包 B 替换时 `localStorage.setItem` 抛出配额/权限错误 | 保留 A 的内存、持久草稿和当前编辑表单；待确认 B 不清空，显示错误并可重试；刷新仍恢复 A |
| 基准锁定 | 以 `written` 保存含根音的明确事件，再试图切换到 `concert` | UI 禁用切换，契约更新函数亦拒绝；原根音、依据及 `score_only_attested` 不被重新解释。仅空事件集可改基准 |
| 隔离 | 导入旧 `scoremind-expert-review` 包到新入口，或反向导入 | 严格拒绝；新标注不出现在旧意见计数、API、解释或学习报告中 |
| 错谱/错结构 | 换一个 MusicXML；篡改 SHA、小节数、书面索引 | 导入原子性拒绝，现有草稿和表单不变；不按显示编号重定位 |
| 音高基准 | 标注包指定 `concert`，而当前机器证据只有不可安全比较的记谱基准 | 标注可独立保存并显示其基准，但不得声称字段可比或计算准确率 |
| 契约错误 | 未知 `format_version`/键、重复 entry ID/小节、非法分数、超出小节时值、罗马数字有值但缺 key context | 严格拒绝，提示定位字段；不静默修正 |
| 大小与安全 | 1 MiB 边界、长中文/HTML 字符串、禁用存储与容量不足 | 创建/保存/导出/读取/导入共用 UTF-8 限额；文本不执行；保存失败留内存并提示备份 |
| 往返 | 导出 JSON，确认实际落盘，再导回相同文件 | 包版本、文件指纹、ID、书面索引、依据、时间戳保持；导入替换前明确确认 |
| 无金标准 | 无条目、`unclear`、`machine_visible` 或字段为 null | UI 标“未评估”或“不明确”；**无自动准确率或隐含分母**，不产生 0%/100% |
| 边界页面 | 1280px 与 390px 查看/编辑/导入，换谱、刷新 | 长依据换行，无页面横向溢出；文件隔离；无虚假的音符级高亮 |

设计复审已通过；矩阵仍是 MVP 3.11 实施与独立复审的验收依据，不代表所有浏览器场景已经实测。实际执行情况见 [VALIDATION.md](VALIDATION.md)。
