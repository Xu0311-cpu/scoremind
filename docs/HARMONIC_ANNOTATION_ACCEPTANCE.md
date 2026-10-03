# MVP 3.11 契约验收样例（待复审）

这些是**未来实现的测试向量，不是已经发生的专业人工校审或准确率结果**。示例内容直接依据仓库 MusicXML 的记谱元素或刻意标为不明确，绝不由 ScoreMind 分析输出生成“标准答案”。契约定义见 [HARMONIC_ANNOTATION_DESIGN.md](HARMONIC_ANNOTATION_DESIGN.md)。设计阶段不新增运行时代码、测试框架或乐谱 fixture。

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

期望：同一原文件可导入、导出并再次导入，严格结构和 ID 不变；第二至第四书面小节**无条目**，显示“未标注”，不显示“错误”或任何准确率。该包为测试向量，`basis` 字符串仅是模拟声明，不证明真有盲评专家。

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

## 实施验收矩阵

| 用例 | 操作/变体 | 期望 |
| --- | --- | --- |
| 独立录入 | 分析前只看 MusicXML 预览，录入依据；再显示机器结果 | 原判断不预填；显示机器后若编辑，先提示导出原快照，新/编辑条目的 `basis=machine_visible`，没有快照时不能声称可还原首次判断 |
| 多事件 | 一小节在 `offset_qn=0` 和 `2` 各录一事件 | 同一 `measure_index` 下保留两事件，不折叠成一个“主和弦”；重复或乱序 offset 拒绝 |
| 不明确 | `unclear` 且 `events=[]`、有原因；或 `partial` 且有事件和原因 | 允许保存；缺原因、`unclear` 带事件、`determined` 无事件均拒绝 |
| 重复显示号 | `timeline_meter_tuplets.musicxml` 的书面 2/3 均显示号 1，分别录入 | 两条记录、两个导航位置；导出/导入后仍不合并 |
| 跨版本独立性 | 机器分析版本改变而原文件字节不变 | 独立标注包仍按文件指纹验证；不与旧 `analysis_version` 绑定，不自动声称机器结果相同 |
| 隔离 | 导入旧 `scoremind-expert-review` 包到新入口，或反向导入 | 严格拒绝；新标注不出现在旧意见计数、API、解释或学习报告中 |
| 错谱/错结构 | 换一个 MusicXML；篡改 SHA、小节数、书面索引 | 导入原子性拒绝，现有草稿和表单不变；不按显示编号重定位 |
| 音高基准 | 标注包指定 `concert`，而当前机器证据只有不可安全比较的记谱基准 | 标注可独立保存并显示其基准，但不得声称字段可比或计算准确率 |
| 契约错误 | 未知 `format_version`/键、重复 entry ID/小节、非法分数、超出小节时值、罗马数字有值但缺 key context | 严格拒绝，提示定位字段；不静默修正 |
| 大小与安全 | 1 MiB 边界、长中文/HTML 字符串、禁用存储与容量不足 | 创建/保存/导出/读取/导入共用 UTF-8 限额；文本不执行；保存失败留内存并提示备份 |
| 往返 | 导出 JSON，确认实际落盘，再导回相同文件 | 包版本、文件指纹、ID、书面索引、依据、时间戳保持；导入替换前明确确认 |
| 无金标准 | 无条目、`unclear`、`machine_visible` 或字段为 null | UI 标“未评估”或“不明确”；**无自动准确率或隐含分母**，不产生 0%/100% |
| 边界页面 | 1280px 与 390px 查看/编辑/导入，换谱、刷新 | 长依据换行，无页面横向溢出；文件隔离；无虚假的音符级高亮 |

本轮只请求对契约与矩阵的复审。复审通过前，不实现 UI、导入器、比较器或版本升级。
