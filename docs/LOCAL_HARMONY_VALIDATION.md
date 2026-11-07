# MVP 3.17 局部持续音和弦：规则与验收

## 实施前固定的原谱预期（2026-11-07）

原件：`backend/tests/fixtures/professional/mozart_k80_opening.musicxml`，保留原字节，不修改音符。先检查原 XML 的 `duration/divisions`，再实现局部识别；以下不是新程序输出反填的标准答案。

原件 SHA-256：`732dd41d8051d6dcd8e0cabc08ec1345a61a11cfc8340a11a987baf8b7c6e9a1`。K.157 原件仍为 `ac43b91ee29b890f3258c40f5454172c9678b0be565635d1db9b6614c09fdb46`；两份真实谱例均未修改。

- 各 part 第 1 书面小节 divisions=24。P1 第一个音 D5，duration=24，即 `[0,1)`；P2 为 duration=72 的休止，即 `[0,3)`；P3 第一个音 B3 和 P4 第一个音 G3 均 duration=12，即 `[0,1/2)`。
- 所以第 1 书面小节 `[0,1/2)` 全部持续记谱音是 D5/B3/G3，没有 P2 音符；按基础三度拼写为 G-B-D，固定预期 **G 大三和弦、低音 G3、原位**。不固定整小节或后续小节的功能。
- `p1:m2:n1`、`p1:m4:n1`、`p3:m4:n1` 是无记谱时值的 grace；第 2、4 书面小节所有 part 必须跳过，不猜演奏时值。
- P2 第 3 小节 D6（duration=72，tie start）与第 4 小节 D6（duration=36，tie stop）相连。因此首版按整条跨小节事件依赖扩张，将第 3 小节也跳过；第 1、5–8 小节仍须独立通过全部结构和来源检查才计算。

## 诊断影响范围与拒绝规则

1. 不改 `notated_timeline`、旧和声、音符/NCT 或来源解析；原时间轴仍为 partial。只扩展独立 `notated_harmony`。
2. 只允许两种已知诊断进入严格校验：有可解析小节引用的 `grace_note_no_duration` 和 `repeated_measure_number`。诊断的所有来源引用必须存在且属于所指小节；grace 来源必须为零时值且没有 tie 标签。不存在的引用、无小节定位或其他诊断整份拒绝。
3. grace 隔离整个书面索引位置的全部 part。安全 tie 事件的来源若触及隔离小节，保守隔离该事件经过的全部小节，并传递闭包；不因后续片段换了来源 ID 而绕开依赖。损坏/歧义 tie 仍整份拒绝。
4. 重复显示编号不隔离，但必须先核实唯一 part/小节/音符/事件 ID、连续书面索引、各 part 的同一精确累计网格，以及所有正时值片段、完整事件链、时间片活动集合。显示编号从不参与身份或时间计算。
5. 零时值只允许被上述已定位 grace 诊断明确指认的片段；普通零时值仍拒绝。grace 不进入事件或活动集合，仍原样保留在时间轴中。
6. 全谱结构、来源、时间和分区校验失败，即使失败处本来会跳过，也整份拒绝；不以隔离掩盖坏数据。继续使用请求内 Fraction 缓存和边界扫描，不逐片扫描全谱。

## v2 增量契约与展示

- `notated_harmony.schema_version="2"`、模块/应用 `3.17.0`；解释仍接受 v1 JSON，缺少新字段仍可解释。把 partial、skipped 或隔离范围伪标为 v1 的载荷返回 422，不默默混用版本。旧 `analysis_version=3.11.0`、独立人工包 v1 和旧校审键不变。
- 整体 `available / partial / unavailable`：partial 表示通过核验但部分小节隔离；unavailable 无可安全网格或遇全局拒绝，仍无片段结论。
- 时间片保留原区间和来源；新增 `skipped` 与 recognized/unknown/silent 严格区分。skipped 没有根音、性质、低音或转位，不称静默、未知和弦或错误。
- 新增 `excluded_measures`：按书面索引列出全部 part 的小节 ID、原因和原始受影响小节 ID，便于审计依赖扩张；原诊断保留引用。
- 默认读谱显示安全小节结论；跳过位置只显示短原因，详细原因码及来源按需展开。摘要、模板解释、报告分别统计已分析（含未知/静默）、跳过、识别未知，不计算准确率。

## 验收矩阵（实施前）

- 原始 K.80 经上传 API：固定正例、原三条诊断不变、第 2/3/4 小节全部跳过，边界不渗漏；K.157 既有正反例不变。
- 项目自建 MusicXML：安全/隔离交界、跨小节长 tie 的传递闭包、不相连的重奏不扩大隔离、重复显示编号可区分；普通零时值、未知诊断、缺定位、坏来源、网格冲突仍拒绝。
- v1/缺字段载荷可解释；新 partial 的默认读谱、摘要、解释和报告计数一致，旧人工数据路径不变。
- 复测 100/200 小节新模块耗时与来源数量，并保留缓存/扫描断言；不以单机耗时声称总体性能。
- 桌面和 320–430px 浏览器检查 K.80 可用/隔离导航与报告；模拟窄屏不等于实体 iPhone Safari 通过，Android 继续延期。

## 实际结果

### 同一 K.80 的 API 前后对照

基线 `c80448c` 通过上传 API 的实际投影（实现前执行）：

```json
{"http":200,"notated_timeline_status":"partial","notated_harmony":{"schema_version":"1","analyzer_version":"3.16.0","status":"unavailable","slices":[],"diagnostics":[{"code":"timeline_not_complete"}]}}
```

3.17 同一原始文件经真实 HTTP `POST /api/v1/analyze/musicxml` 返回 200。原时间轴仍 partial，三条诊断及来源引用不变；新字段投影如下（不是全部响应）：

```json
{
  "schema_version":"2", "analyzer_version":"3.17.0", "status":"partial",
  "counts":{"analyzed":39,"skipped":21,"recognized":20,"unknown":19,"silent":0},
  "first_slice":{
    "measure_index":1,"start":"0","end":"1/2","local_start":"0","local_end":"1/2",
    "status":"recognized","root":"G","quality":"major","bass":"G3","inversion":0,
    "source_note_ids":["p1:m1:n1","p3:m1:n1","p4:m1:n1"]
  },
  "excluded_written_indices":[2,3,4]
}
```

`counts`、`first_slice.source_note_ids`、`excluded_written_indices` 是上述实际响应的审计投影，不是新增 API 字段；原 API 每片为 `notes[].source_note_ids`，隔离位置为 `excluded_measures[]`。跳过片段仍逐一保留，不压缩覆盖未知或静默。第 2 小节因 `p1:m2` 隔离；第 3 小节因 tie 依赖 `p1:m4/p3:m4` 隔离；第 4 小节本身因这两处 grace 隔离，每个位置均覆盖全部四个 part。

实际解释 HTTP POST 返回 200、版本 3.17.0，summary 明示“已分析 39 片，跳过 21 片；识别未知 19 片、记谱静默 0 片”，以及隔离小节 2/3/4。逐区间节选前 8/60 片、书面第 1 至 2 小节，另 52 片未展开；没有将 skip 计为无和声、错误或准确率。原旧分析版本仍 3.11.0。

### 自动回归和构建

- Python 3.13.11（满足 3.11+）：全量后端 **160 passed**，4.58 秒。保留既有 `RequestsDependencyWarning`，未为消除环境警告新增依赖。未在本轮运行远端 CI 或独立 Python 3.11 解释器。
- 前端 **70 passed**；`NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000 npm run build` 通过，包含类型检查。构建结束后才启动生产预览，没有并发写 `.next`。
- `git diff --check` 通过。AST 核对 `_recognize` 与 c80448c 完全相同；旧 chord/key/Roman/note、timeline/normalizer、人工包/旧校审/揭示闸门实现无差异。
- `test_local_harmony.py` 经真实 XML 上传覆盖 K.80 原始预期、全部 part 隔离、tie 传递闭包、同音重奏、安全边界、静默、全隔离时零已分析、grace rest、普通零时值拒绝、重复编号/分数网格与 v1 兼容。坏引用、诊断缺定位及网格损坏通过上传路径中的明确故障注入测试，不冒称它们均来自自然谱例。
- `local_harmony_grace.musicxml` 是项目自建结构 fixture，不是新增外部作品或专业答案；SHA-256 `7844f996fc09466a133373b52abc64c7a4f4d3628754286f4f6f7f4303ea0e32`。旧“重复编号一律拒绝”断言按本轮明确授权改为完整验证后允许；原显示序号与书面索引的断言仍保留。

### 100/200 小节负载复测

沿用 `test_notated_harmony.repeated_chord_xml` 的项目自建生成器，单次本机测量，单位秒：

| 小节 | XML 字节 | 来源音符 | 时间片 | 规范化+时间轴 | 新和弦模块 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 100 | 284426 | 2400 | 800 | 0.0737 | 0.0783 |
| 200 | 568626 | 4800 | 1600 | 0.1433 | 0.1587 |

两份所有片段均 recognized；200 小节整条上传 API 仍有自动回归。请求内各分数字符串只解析一次的既有计数测试、片内边界/分区/引用损坏拒绝测试仍通过。不是全部长谱、并发或响应大小保证，不设易抖动的墙钟性能断言。

### 本机生产浏览器检查（非实体 iPhone）

- 原始 K.80：无需人工记录，读谱即显示首片 G 大三和弦/G3/原位；第 2 小节显示 grace 未计算，第 3 小节显示跨小节依赖，第 5 小节恢复独立的识别和未知。下拉与按钮按书面索引联动谱面。
- 摘要、实际生成的模板解释和学习报告 textarea 均区分 39 已分析/21 跳过/19 未知；报告包含隔离的全部 part 和原始受影响位置。确认的是浏览器生成内容，本轮没有额外执行报告下载落盘或手机 JSON 往返。
- K.80 在实际读取到的 320/390/430/844/1280 CSS px 下 `documentElement.scrollWidth == innerWidth`，SVG 仍存在，重绘后保持书面小节定位；390px 展开首片来源可见 `p1:m1:n1` 且无整页横向溢出。浏览器日志本轮未见 warn/error。
- 原始 K.157 在 320px 和 1280px 核对 `[2,5/2)` C 大三和弦/原位/延续 G3 及 `[3/2,2)` 未知；图形与选择仍一致。一次预期 430px 的异步缩放采样实际仍读到 320px，因此不据该次采样声称 K.157 的 430px 已验证。
- 新结构 fixture 在 390px 将标号同为 1 的书面第 2、3 小节分开定位，分别呈现依赖隔离和直接 grace 隔离，没有按显示编号合并。
- 本地截图：`/private/tmp/scoremind-317-k80-390.jpg`（临时文件，390px 当前小节，不是手机照片或全矩阵证明）。

本轮未获得新的实体 iPhone 17 / iOS 26.3 / Safari 反馈；既往 3.16 真机项目不能升级为 3.17 通过。Android 继续延期。没有新增专业人工标注、金标准或准确率。
