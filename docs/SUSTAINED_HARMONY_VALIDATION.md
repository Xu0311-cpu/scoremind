# MVP 3.16 持续音和弦验证

## 2026-11-06 iPhone 用户反馈

实测提交 `b9bfc25`，iPhone 17 / iOS 26.3 / Safari；用户确认原始 `.musicxml` 可选且可分析，本文固定的 `[2,5/2)` 正例为 C 大三和弦/原位/持续 G3、可理解，相邻 `[3/2,2)` 保留未知，下一小节导航与谱面联动正常。仅记录这些实际项目，不计算准确率、不补造整矩阵结果。具体未测项见 [`MOBILE_VALIDATION_3_15.md`](MOBILE_VALIDATION_3_15.md)。Android 延期未验证，不作为本轮阻断。

本次收尾默认未知文案更温和，原始原因码和技术限制保留在展开依据；未修改识别规则、返回状态、置信度或报告的技术原因。新文案本身尚未做真机复测。

## 实施前固定预期

本分支从已独立复审的 `0aaf933` 建立，依赖尚未合并的 3.15 修复，不改变 PR #10。下列预期在实现新识别模块前记录，来自用户指定的原谱核对，不从程序结果反填。原件为仓库获许可的 `backend/tests/fixtures/professional/mozart_k157_opening.musicxml`，SHA-256 为 `ac43b91ee29b890f3258c40f5454172c9678b0be565635d1db9b6614c09fdb46`，不修改音符。

时间单位为四分音符，区间采用 `[start,end)`；本表只核定第一书面小节的两个指定区间，不代表整小节和声功能或整体准确率。

| 书面索引 | 小节内区间 | 原谱来源与记谱音 | 固定预期 |
| --- | --- | --- | --- |
| 1 | `[2,5/2)` | `p1:m1:n3` E4；`p2:m1:n3` C4；`p3:m1:n1` 从此前延续的 G3；`p4:m1:n5` C3 | C 大三和弦，最低记谱音 C3，原位。依据必须保留 G3。 |
| 1 | `[3/2,2)` | D4、B3、G3、C3 | 不强配三和弦/七和弦。不得删除音来匹配；结果应为未知并给出不支持集合的原因。 |

## 首版边界

- 新字段 `notated_harmony` 独立版本化，旧 `analysis_version=3.11.0`、`detected_chords` 和旧校审键保持原义；旧 JSON 缺少新字段表示未计算。
- 仅完整可靠的记谱时间轴可分析。partial/unsupported、移调、来源缺失或事件/区间不一致时拒绝新分析并给出原因。
- 严格匹配全部独立音级，允许同音/八度重复，不排除任何额外音。首版接受大/小/减三和弦，属七/大七/小七/半减七/小大七。增三和弦与减七和弦的旋转根音多解保守返回未知。
- 识别只描述该区间的完整持续音集合；不判断结构和弦与非和弦音，不新增罗马数字、功能、转调或声部进行结论。

## 实际结果与验证

### API 复现与前后对照

本机以原始 K.157 文件经 `POST /api/v1/analyze/musicxml` 上传。实施前在 `0aaf933` 保存完整响应，实施后逐字段比对：`measures`（含旧和弦、音符角色、NCT 和 harmonic_context）、`key_analysis`、`notated_timeline`、`analysis_version`、`analysis_scope` 均相同。警告文字与应用发布版本另行更新，不冒充旧算法升级。

以下为实际响应的字段投影，不是新增的 API 包装：旧路径在 offset `2` **没有和弦事件**；第一书面小节只有下列起音集合，未纳入 G3。

```json
{"offset":1.5,"beat":2.5,"pitches":["D4","B3","C3"],"root":null,"quality":"unknown","inversion":null}
```

新增 `notated_harmony` 元数据：

```json
{"schema_version":"1","analyzer_version":"3.16.0","legacy_analysis_version":"3.11.0","status":"available","pitch_basis":"written","time_unit":"quarter_note","time_encoding":"reduced_fraction_string","interval_convention":"[start,end)"}
```

正例 `notated_harmony.slices` 投影：

```json
{
  "slice_id":"notated-harmony:s5","measure_index":1,
  "start":"2","end":"5/2","local_start":"2","local_end":"5/2",
  "status":"recognized","root":"C","quality":"major","bass":"C3","inversion":0,
  "pitch_classes":["C","E","G"],"interval_pattern":[0,4,7],"reason_codes":[],
  "notes":[
    {"pitch":"E4","onset":"new","source_note_ids":["p1:m1:n3"]},
    {"pitch":"C4","onset":"new","source_note_ids":["p2:m1:n3"]},
    {"pitch":"G3","onset":"continuing","source_note_ids":["p3:m1:n1"]},
    {"pitch":"C3","onset":"new","source_note_ids":["p4:m1:n5"]}
  ]
}
```

每个 notes 条目在完整 API 中另有 `event_id`、`event_start`、`event_end` 与 `event_source_note_ids`。例如 G3 对应 `event:p3:m1:n1`、全曲持续 `[0,13/2)`、完整来源链 `p3:m1:n1 → p3:m2:n1 → p3:m2:n2`；当前片段与完整链分开保留，前端依据可分别展开。

反例投影：

```json
{"slice_id":"notated-harmony:s4","measure_index":1,"start":"3/2","end":"2","status":"unknown","root":null,"quality":null,"bass":"C3","inversion":null,"pitch_classes":["C","D","G","B"],"reason_codes":["unsupported_pitch_set"]}
```

反例的 notes 仍完整保留 D4、B3、G3、C3。`bass=C3` 只表示可靠的最低记谱音，不表示已经确定和弦。

### 自动回归范围

新增两份项目原创 MusicXML：`notated_harmony_inversions.musicxml`（三和弦/属七转位、小大七、拼写冲突、非重叠琶音）和 `notated_harmony_ties.musicxml`（跨小节安全 tie 长链、上声部重奏、静默）。原有获许可真实谱例不改音符。

新增上传 API 回归覆盖：

- 上述固定 K.157 正反例、完整来源引用与重复解析稳定性。
- 大/小/减三和弦、属七/大七/小七/半减七/小大七；C 大三和弦全部转位、G7 全部转位。
- 对称增三和弦/减七的多根音候选拒绝任意选根；拼写错误与同音异名冲突拒绝识别。
- 错开起音、结束边界、休止、不重叠琶音、同音重新起奏、跨小节 tie 的当前片段/完整来源链。
- 精确三分之一时间；重复显示编号不合并。完整来源谱例仅改变显示编号后仍保留全部 11 个书面索引和不同来源位置；既有时间轴会因 `repeated_measure_number` 标为 partial，故新模块按本轮契约拒绝分析，不擅自忽略诊断。
- partial/unsupported、移调、零时值普通音、歧义 tie、缺失身份、不一致小节网格和损坏引用均返回不可分析，不伪装成完整结果。
- 旧路径与新模块隔离、旧 JSON 缺少新字段仍可解释；回传的已识别条目若字段被置空，解释接口明确说明不完整，不补猜或报 500。

前端回归覆盖中文标签、转位、未知/静默/不可用/旧响应、书面索引、定位失败、来源链与报告隔离；原有盲态、未保存编辑、保存失败、导入与旧校审兼容测试保留。

### 本机浏览器结果

使用本机内置 Chromium 浏览器和生产构建、环回地址 `127.0.0.1:3000/8000`；**不是实体手机或局域网 HTTPS 验收**。

| 检查 | 实际结果 |
| --- | --- |
| K.157 原始 `.musicxml` 上传、分析、书面导航 | 成功；第一小节默认显示全部 8 个区间，正例为 C 大三和弦/原位/C3，反例未知；下一书面小节展示各自区间，不套用整小节唯一和声。 |
| 390px 展开正例依据 | 可见 G3 此前延续、事件 `[0,13/2)`、当前来源与三段完整链；专家区域默认不显示。 |
| 解释与报告 | 简短解释使用新模块摘要，完整解释默认收起且分开标旧结果；报告文本含 `[2,5/2)`、G3 来源和独立旧 3.11 技术参考。本轮未重新验证下载文件落盘。 |
| 宽度 320、390、430、844（横屏）、1280 | K.157 分别检查页面宽度，`documentElement.scrollWidth` 与视口宽度一致；完整解释展开后 390px 仍无整页横向溢出。缩放后谱面 SVG 仍存在，1280px 导航可定位。非 iPhone 字体或触控证明。 |
| K.80 原始谱例 | 可预览和分析；新模块因时间轴 partial 显示不可分析原因，未回填旧和弦。 |
| `timeline_meter_tuplets.musicxml` | 显示编号 0/1/1 按书面 1/2/3 导航；390px 定位第 3 个书面小节，不混同显示编号。新模块保守拒绝不完整时间轴。 |
| 新增转位谱例与盲态/草稿 | 分析前 `score_only_attested`、读谱区域无机器结论；临时文字经过模式往返仍存在。主动 Analyze 后为 `machine_visible`，文字仍在，未保存计数为 1、正式记录为 0。临时文字清空后脏态消失，没有创建人工金标准。 |

### 交付验证结果与限制

`ac0b322` 首次交付：后端基线 94 项，当时 **122 项通过**；前端基线 60 项，当时 **66 项通过**；`npm run build` 通过。本机 Python 为 `/opt/miniconda3/bin/python3` 3.13.11（满足 3.11+）；保留已有 RequestsDependencyWarning，没有添加或升级依赖。远端 Python 3.11 CI 未运行，本轮不推送。复审加固后的当前结果见下节。

初次交付时仍待实体 iPhone Safari 复测原扩展名、完整作品标题、简短解释，小米触控验收也未完成。本机浏览器不能替代设备型号/系统/浏览器版本及实际触控结果；后续只有本文顶部 2026-11-06 所列用户反馈得到确认，其余不自动升级。当前阶段 Android 延期、未验证，不作为本轮阻断。

首版不使用 partial 的局部片段，包含仅有重复显示编号诊断的情况；不转换实音，不选择对称集合的根音，不自动排除非和弦音，不添加罗马数字/功能/音符角色/置信度继承。全谱严格核对来源和网格；逐时间片结果未压缩，不跨越静默、未知、重奏或转位。没有整体准确率、结构和声、演奏时值、反复展开或声部进行的能力声明。

## ac0b322 复审加固

### 来源校验性能

复审提供的 `/private/tmp/scoremind-316-load-200.musicxml` 为 536376 字节，SHA-256 `bd070a5edd70aa6e11caf3c41f22d2397316d45d4a65e37a1bc7dfee19a72835`。它是 200 个 4/4 小节、每小节 8 次 C 大三和弦重奏的结构性压力输入，不是专业和声金标准；临时文件不提交仓库。测试通过 `repeated_chord_xml()` 从项目原创 fixture 生成相同规模的合法 XML，不扩充第三方素材。

同机 Python 3.13.11、单次调用计时；时间轴均以 `build_notated_timeline(normalize_musicxml(xml))` 构建，识别单独计 `analyze_notated_harmony(timeline)`，不计 JSON 序列化。100 小节样本从同一 XML 截取前 100 小节；修复前在 `ac0b322`，修复后在本次工作树测量。

| 小节 / 来源音 / 时间片 | 修复前时间轴 | 修复前新模块 | 修复后时间轴 | 修复后新模块 |
| --- | --- | --- | --- | --- |
| 100 / 2400 / 800 | 0.0595 s | 7.5265 s | 0.0682 s | 0.0899 s |
| 200 / 4800 / 1600 | 0.1211 s | 30.1025 s | 0.1373 s | 0.1773 s |

序列化 `json.dumps(result.model_dump(), sort_keys=True, ensure_ascii=False)` 后的 SHA-256 在前后完全相同：

```text
100: 8034b539526fa93ff569208eb6cca36211a7fcefe82f24aa5807761f79f85ec3
200: e4641f03298a02b4ca3269a685e3e3ce418530587fda6554af238580d758bbd7
```

实现保留完整校验：请求内缓存各规范 Fraction，独立扫描事件、原片段和小节的排序边界，先结束后起音；每片仍比较真实活动 ID、来源、静默状态和小节归属，不能跳过内部边界。来源到事件的索引替代逐次筛选完整 tie 链。识别规则、固定 K.157 正反例、输出契约和旧分析版本未改。

复现计时的核心命令（在 backend 下执行；临时文件不存在时可用测试中的 `repeated_chord_xml` 生成压力输入）：

```python
from pathlib import Path
import xml.etree.ElementTree as ET
from time import perf_counter
from app.music.timeline_normalizer import normalize_musicxml
from app.music.notated_timeline import build_notated_timeline
from app.music.notated_harmony import analyze_notated_harmony

raw = Path('/private/tmp/scoremind-316-load-200.musicxml').read_bytes()
for count in (100, 200):
    root = ET.fromstring(raw)
    for part in root.findall('part'):
        for measure in part.findall('measure')[count:]:
            part.remove(measure)
    xml = ET.tostring(root)
    start = perf_counter()
    timeline = build_notated_timeline(normalize_musicxml(xml))
    middle = perf_counter()
    result = analyze_notated_harmony(timeline)
    print(count, middle - start, perf_counter() - middle, result.status)
```

实际环回 HTTP 上传原临时 200 小节文件：200 OK，约 **1.7425 秒**（包含旧路径、组装、传输），返回 `available`、1600 片、4800 来源。响应体 **9575549 字节**；大响应、复杂长谱、长 tie 链证据量、多用户并发和手机网络均未由这一输入验证。没有修改同步请求架构，不宣称总耗时始终线性或所有长谱均已达标。

### 解释展示范围

K.157 的计数仍是全曲 32 片 / 16 个已识别区间。响应 summary 和新模块段落同时注明：

> 逐区间文字仅节选前 8/32 个时间片（书面第 1 小节）；其余 24 个时间片未展开。完整结果请按小节查看读谱或学习报告。

这不是把前 8 片当成整曲；不静默丢弃范围。少于或等于 8 片说明全部展示，跨书面小节的节选列明首尾索引，空或不可用结果不编造省略数量。学习报告本来就保留全部新模块区间，本轮不删减。

### 加固验证结果

- 后端 **135 项通过**，前端 **66 项通过**，生产构建与 `git diff --check` 通过。版本继续为 3.16.0 / 旧分析 3.11.0；没有新增依赖或修改前端代码。
- 新增 13 项回归：200 小节真实 XML 经上传 API、请求内分数只解析一次且不跨请求缓存、重复/缺失活动来源、遗漏内部起音/结束边界、静默跨小节、tie 内部来源边界、分区缺口，以及 32/14/短谱/空结果的解释范围。没有放宽已有拒绝断言。
- 补充直接载入 `ac0b322` 旧模块对照 K.157、K.80、转位、tie、错开起音、静默、损坏 tie、移调、零时值、重复编号、错位 part 和缺失身份共 12 份 fixture：新模块完整 `model_dump()` 前后相同；这是额外的输出等价核对，不计为新增 pytest 项数。
- 本机生产构建浏览器重新分析原始 K.157：正反例仍正确；展开模板后实际可读到前 8/32、书面第 1 小节、其余 24 片；390px 时展开状态下 `scrollWidth=innerWidth=390`。视口最后已恢复。非实体设备，不升级 3.15 的 iPhone/小米验收状态，本轮未做下载落盘回导。
