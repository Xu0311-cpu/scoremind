# MVP 3.10 真实谱例初步验证

本页的**预期**先由上游 MusicXML 的记谱内容核对并写定，独立于 ScoreMind 的分析响应。它是短节选的结构性验证，不是专业乐理评测，也不能据此报告总体准确率。音高、节奏和延音线按记谱音高核对；和弦、罗马数字与功能若需上下文判断，暂记为 `unclear`，等待独立音乐专业校审。程序输出与预期不一致时记录差异，不修改预期以使测试通过。

## 再分发与来源

仅以下文件可作为随仓库分发的真实谱例 fixture。短节选保留上游 `identification/rights` 与作品信息，只删除每个 part 在所选范围之后的小节；不改写音符。上游完整文件不加入仓库。CC0 是**乐谱编码文件**的授权依据；作品与录音、另行出版的谱面图片不在本轮分发范围。

| 本仓库短节选 | 上游 MusicXML（固定提交） | 上游授权 | 选择范围 |
| --- | --- | --- | --- |
| `beethoven_fur_elise_opening.musicxml` | [OpenScore 编码的《Für Elise》](https://github.com/sightreader/sheet-music/blob/4eefd949bbc7a17983259e3df504fad6c38a8269/Beethoven%20-%20Bagatelle%20No.%2025%20%28Fur%20Elise%29.musicxml) | 文件内 `OpenScore (CC0)`；[OpenScore 的 CC0 声明](https://fourscoreandmore.org/openscore/)；镜像仓库为 [MIT](https://github.com/sightreader/sheet-music/blob/4eefd949bbc7a17983259e3df504fad6c38a8269/LICENSE) | 首 8 个书面小节，显示编号 0–7 |
| `mozart_k157_opening.musicxml` | [OSSQ-OMR K.157](https://github.com/MALerLab/ossq-omr/blob/7a17e45cddc0b7064fc3a179b62caeb57595e993/scores/Mozart,_Wolfgang_Amadeus/String_Quartet_No.4_in_C_major,_K.157/sq9199617.musicxml) | 文件内 `OpenScore (CC0)`；[OSSQ-OMR 明确覆盖源 MusicXML 的 CC0 声明](https://github.com/MALerLab/ossq-omr/blob/7a17e45cddc0b7064fc3a179b62caeb57595e993/README.md#license-and-acknowledgement) | 首 4 个书面小节 |
| `mozart_k80_opening.musicxml` | [OSSQ-OMR K.80/73f](https://github.com/MALerLab/ossq-omr/blob/7a17e45cddc0b7064fc3a179b62caeb57595e993/scores/Mozart,_Wolfgang_Amadeus/String_Quartet_No.1_in_G_major,_K.8073f/sq15230467.musicxml) | 同上 | 首 8 个书面小节 |

致谢：OpenScore、OpenScore String Quartets 与 OSSQ-OMR 的转录贡献者。另查过的 Mozart K.545 独奏镜像文件未给出足够明确的文件级授权链，**没有**收入本仓库。

固定节选 SHA-256：`beethoven_fur_elise_opening.musicxml` 为 `98d8f290c62da03be493fad9a333b96c830d6ba1ef79e582f40e622d9318bd46`；`mozart_k157_opening.musicxml` 为 `ac43b91ee29b890f3258c40f5454172c9678b0be565635d1db9b6614c09fdb46`；`mozart_k80_opening.musicxml` 为 `732dd41d8051d6dcd8e0cabc08ec1345a61a11cfc8340a11a987baf8b7c6e9a1`。节选方法：使用 Python 标准库 `xml.etree.ElementTree` 解析固定提交的原件，按每个 `<part>` 的**书面顺序**保留前 8 / 4 / 8 个 `<measure>`，删除后续小节，写出 UTF-8 XML；`identification/rights`、part 列表及保留范围内的音符未改动。

## 独立预期（运行 ScoreMind 前固定）

| 谱例 | 书面位置与可直接核对的预期 | 和声预期 |
| --- | --- | --- |
| 《Für Elise》开头 | 8 个书面小节；第一位置的显示号为 `0`，不可误作第 0 个数组元素；同一钢琴 part 有两个谱表。首小节上谱表 E5、D#5 先后起音，下谱表为休止；两音不应凭相邻起音被合成同时发声。 | `unclear`：未独立核定简化和弦、全局调性或功能。 |
| K.157 开头 | 4 个书面小节、4 个独立弦乐 part。中提琴 P3 的 G3 在第 1 小节 `start`，第 2 小节依次 `stop+start`、`stop`；这是同一 part 的延音链。大提琴 P4 第一小节重复起奏 C3，不能仅因同音而连成一条 tie。 | `unclear`：四声部相邻起音不自动成为同一时刻的和弦结论。 |
| K.80/73f 开头 | 8 个书面小节、4 个独立弦乐 part。第二小提琴 P2 在第 1、2 小节为整小节休止；P2 的 D6 跨第 3→4 小节，P1 的 D6 与 P2 的 B5 分别跨第 6→7 小节，延音链不可跨 part 误连。 | `unclear`：暂不为多声部织体指定罗马数字或功能标准答案。 |

勘误（2026-09-30）：原始预期摘要在提交 `2403bad` 中将《Für Elise》第二音误写为 **D5**，遗漏了原 MusicXML `P1:m1:n2` 的 `<alter>1</alter>`。依据原件修正为 **D#5**，与下方逐小节表一致；这不是根据 ScoreMind 输出调整预期，也不改变其他预期或判定。测试现直接断言原件升号。

以上预期来自源文件的 `<part>`、`<measure>`、`<note>`、`<pitch>`、`<rest>`、`<voice>` 和 `<tie>`，不是 ScoreMind API 输出。短节选边界以完整 tie 链为准；不可截断未闭合 tie 后再把诊断当作引擎错误。

### 逐小节结构预期（先于本轮 API 对照固定）

下表的书面索引从 1 开始，`P1` 等按原件 `<part>` 的书面顺序。`音符元素数` 包括 `<rest>` 和 `<grace>` 元素，不等于发声事件数；`首元素` 只是可回溯的结构采样，不代表和声。证据定位格式为 `P#:m#:n#`，指节选 XML 中该 part 的第 m 个 `<measure>` 内第 n 个 `<note>`；小节编号及元素数可在对应 `P#:m#` 直接复核。预期栏先由原件登记，实际栏随后经 `/api/v1/analyze/musicxml` 填写。API `notated_timeline.source_notes` 不返回休止元素，因此原件元素总数或休止类型无法从响应完整核对的行判为 `unsupported`，并列出 API 可见的有音高片段数；不能把两种不同计数硬判为匹配。这里的 `correct` 仅表示**该行结构字段**吻合，绝非整小节和声正确。

| 谱例 | 书面索引 | 字段 | 预期（原件） | 实际（API） | 判定 | 证据（原件位置及 API 来源） |
| --- | ---: | --- | --- | --- | --- | --- |
| Beethoven | 1 | 显示编号 | `0` | `measure_index=1, measure_number=0` | `correct` | P1:m1 `<measure number="0">`；API `p1:m1` |
| Beethoven | 1 | 音符元素数 | P1=3 | 来源音符 P1=2；休止未输出 | `unsupported` | P1:m1；API `source_notes` 仅有 n1–n2 |
| Beethoven | 1 | 首元素与休止 | E5、D#5 先后，第三元素为休止 | E5→D#5，两事件相接；无休止来源记录 | `unsupported`（音高匹配；休止不可核） | P1:m1:n1–n3；API `p1:m1:n1–n2` |
| Beethoven | 2 | 显示编号 | `1` | `measure_index=2, measure_number=1` | `correct` | P1:m2；API `p1:m2` |
| Beethoven | 2 | 音符元素数 | P1=7 | 来源音符 P1=6；休止未输出 | `unsupported` | P1:m2；API `p1:m2` 来源计数 |
| Beethoven | 2 | 首元素 | E5 | `p1:m2:n1=E5` | `correct` | P1:m2:n1；API 同 ID |
| Beethoven | 3 | 显示编号 | `2` | `measure_index=3, measure_number=2` | `correct` | P1:m3；API `p1:m3` |
| Beethoven | 3 | 音符元素数 | P1=10 | 来源音符 P1=7；休止未输出 | `unsupported` | P1:m3；API `p1:m3` 来源计数 |
| Beethoven | 3 | 首元素 | A4 | `p1:m3:n1=A4` | `correct` | P1:m3:n1；API 同 ID |
| Beethoven | 4 | 显示编号 | `3` | `measure_index=4, measure_number=3` | `correct` | P1:m4；API `p1:m4` |
| Beethoven | 4 | 音符元素数 | P1=10 | 来源音符 P1=7；休止未输出 | `unsupported` | P1:m4；API `p1:m4` 来源计数 |
| Beethoven | 4 | 首元素 | B4 | `p1:m4:n1=B4` | `correct` | P1:m4:n1；API 同 ID |
| Beethoven | 5 | 显示编号 | `4` | `measure_index=5, measure_number=4` | `correct` | P1:m5；API `p1:m5` |
| Beethoven | 5 | 音符元素数 | P1=10 | 来源音符 P1=7；休止未输出 | `unsupported` | P1:m5；API `p1:m5` 来源计数 |
| Beethoven | 5 | 首元素 | C5 | `p1:m5:n1=C5` | `correct` | P1:m5:n1；API 同 ID |
| Beethoven | 6 | 显示编号 | `5` | `measure_index=6, measure_number=5` | `correct` | P1:m6；API `p1:m6` |
| Beethoven | 6 | 音符元素数 | P1=7 | 来源音符 P1=6；休止未输出 | `unsupported` | P1:m6；API `p1:m6` 来源计数 |
| Beethoven | 6 | 首元素 | E5 | `p1:m6:n1=E5` | `correct` | P1:m6:n1；API 同 ID |
| Beethoven | 7 | 显示编号 | `6` | `measure_index=7, measure_number=6` | `correct` | P1:m7；API `p1:m7` |
| Beethoven | 7 | 音符元素数 | P1=10 | 来源音符 P1=7；休止未输出 | `unsupported` | P1:m7；API `p1:m7` 来源计数 |
| Beethoven | 7 | 首元素 | A4 | `p1:m7:n1=A4` | `correct` | P1:m7:n1；API 同 ID |
| Beethoven | 8 | 显示编号 | `7` | `measure_index=8, measure_number=7` | `correct` | P1:m8；API `p1:m8` |
| Beethoven | 8 | 音符元素数 | P1=10 | 来源音符 P1=7；休止未输出 | `unsupported` | P1:m8；API `p1:m8` 来源计数 |
| Beethoven | 8 | 首元素 | B4 | `p1:m8:n1=B4` | `correct` | P1:m8:n1；API 同 ID |
| K.157 | 1 | 显示编号 | `1` | 4 part 均为书面索引 1、显示号 1 | `correct` | P1–P4:m1；API `p1:m1`–`p4:m1` |
| K.157 | 1 | 音符元素数 | P1/P2/P3/P4=`4/4/1/8` | 来源音符 `4/4/1/8` | `correct` | P1–P4:m1；API `source_notes` 按 part/索引 |
| K.157 | 1 | 延音/重奏 | P3 G3 `start`；P4 八次 C3 均无 tie | P3 `p3:m1:n1` 为 `start`；P4 八条独立 C3 事件 | `correct` | P3:m1:n1；P4:m1:n1–n8；API 同 ID |
| K.157 | 2 | 显示编号 | `2` | 4 part 均为书面索引 2、显示号 2 | `correct` | P1–P4:m2；API 同 ID |
| K.157 | 2 | 音符元素数 | P1/P2/P3/P4=`6/6/5/6` | 来源音符 `5/5/5/5`；休止未输出 | `unsupported` | P1–P4:m2；API 来源计数 |
| K.157 | 2 | 延音中段 | P3 G3 先 `stop+start` 后 `stop` | P3 n1 标签含 `start` 与 `stop`，n2 为 `stop`；事件链跨 P3:m1–m2 共 3 片段 | `correct` | P3:m2:n1–n2；API `p3:m1:n1 → p3:m2:n1 → p3:m2:n2` |
| K.157 | 3 | 显示编号 | `3` | 4 part 均为书面索引 3、显示号 3 | `correct` | P1–P4:m3；API 同 ID |
| K.157 | 3 | 音符元素数 | P1/P2/P3/P4=`4/4/1/8` | 来源音符 `4/4/1/8` | `correct` | P1–P4:m3；API 来源计数 |
| K.157 | 3 | 首元素 | P1 D4；P3 G3 无 tie | `p1:m3:n1=D4`；`p3:m3:n1=G3, tie=[]` | `correct` | P1/P3:m3:n1；API 同 ID |
| K.157 | 4 | 显示编号 | `4` | 4 part 均为书面索引 4、显示号 4 | `correct` | P1–P4:m4；API 同 ID |
| K.157 | 4 | 音符元素数 | P1/P2/P3/P4=`6/6/5/6` | 来源音符 `5/5/5/5`；休止未输出 | `unsupported` | P1–P4:m4；API 来源计数 |
| K.157 | 4 | 首元素 | P1 F4；P4 C3 | `p1:m4:n1=F4`；`p4:m4:n1=C3` | `correct` | P1/P4:m4:n1；API 同 ID |
| K.80 | 1 | 显示编号 | `1` | 4 part 均为书面索引 1、显示号 1 | `correct` | P1–P4:m1；API 同 ID |
| K.80 | 1 | 音符元素数 | P1/P2/P3/P4=`3/1/6/6` | 来源音符 `3/0/6/6`；休止未输出 | `unsupported` | P1–P4:m1；API 来源计数 |
| K.80 | 1 | 休止 | P2 第 1 元素为休止 | P2:m1 无来源音符，API 不提供休止元素 | `unsupported` | P2:m1:n1；API `source_notes` 无 `p2:m1:*` |
| K.80 | 2 | 显示编号 | `2` | 4 part 均为书面索引 2、显示号 2 | `correct` | P1–P4:m2；API 同 ID |
| K.80 | 2 | 音符元素数 | P1/P2/P3/P4=`4/1/6/6` | 来源音符 `4/0/6/6`；休止未输出 | `unsupported` | P1–P4:m2；API 来源计数 |
| K.80 | 2 | 装饰音/休止 | P1 首元素 A5 为无记谱时值 grace；P2 休止 | `p1:m2:n1=A5, duration=0`；`grace_note_no_duration` 指向 `p1:m2:n1`；P2 无来源 | `unsupported`（grace 正确；休止不输出） | P1/P2:m2:n1；API 诊断 `measure_ids=[p1:m2]` |
| K.80 | 3 | 显示编号 | `3` | 4 part 均为书面索引 3、显示号 3 | `correct` | P1–P4:m3；API 同 ID |
| K.80 | 3 | 音符元素数 | P1/P2/P3/P4=`4/1/6/6` | 来源音符 `4/1/6/6` | `correct` | P1–P4:m3；API 来源计数 |
| K.80 | 3 | 延音起点 | P2 D6 `start` | `p2:m3:n1=D6, tie=[start]`；与 P2:m4:n1 为同一持续事件 | `correct` | P2:m3:n1；API `source_note_ids=[p2:m3:n1,p2:m4:n1]` |
| K.80 | 4 | 显示编号 | `4` | 4 part 均为书面索引 4、显示号 4 | `correct` | P1–P4:m4；API 同 ID |
| K.80 | 4 | 音符元素数 | P1/P2/P3/P4=`4/7/4/6` | 来源音符 `3/7/3/6`；休止未输出 | `unsupported` | P1–P4:m4；API 来源计数 |
| K.80 | 4 | 延音终点/装饰音 | P2 D6 `stop`；P1 D5 与 P3 B3 首元素是 grace | `p2:m4:n1=D6, tie=[stop]`；P1/P3 n1 `duration=0`，各有定位诊断 | `correct`（仅此两类字段） | P2/P1/P3:m4:n1；API `measure_ids=[p1:m4]`、`[p3:m4]` |
| K.80 | 5 | 显示编号 | `5` | 4 part 均为书面索引 5、显示号 5 | `correct` | P1–P4:m5；API 同 ID |
| K.80 | 5 | 音符元素数 | P1/P2/P3/P4=`8/8/1/6` | 来源音符 `8/8/0/6`；休止未输出 | `unsupported` | P1–P4:m5；API 来源计数 |
| K.80 | 5 | 休止 | P3 第 1 元素为休止 | P3:m5 无来源音符，API 不提供休止元素 | `unsupported` | P3:m5:n1；API `source_notes` 无 `p3:m5:*` |
| K.80 | 6 | 显示编号 | `6` | 4 part 均为书面索引 6、显示号 6 | `correct` | P1–P4:m6；API 同 ID |
| K.80 | 6 | 音符元素数 | P1/P2/P3/P4=`9/9/7/8` | 来源音符 `9/9/6/8`；休止未输出 | `unsupported` | P1–P4:m6；API 来源计数 |
| K.80 | 6 | 延音起点 | P1 D6、P2 B5 的第 9 元素各为 `start` | `p1:m6:n9=D6`、`p2:m6:n9=B5` 均 `tie=[start]`，各自跨至 m7 | `correct` | P1/P2:m6:n9；API 两条独立 `source_note_ids` 链 |
| K.80 | 7 | 显示编号 | `7` | 4 part 均为书面索引 7、显示号 7 | `correct` | P1–P4:m7；API 同 ID |
| K.80 | 7 | 音符元素数 | P1/P2/P3/P4=`5/5/6/6` | 来源音符 `5/5/6/6` | `correct` | P1–P4:m7；API 来源计数 |
| K.80 | 7 | 延音终点 | P1 D6、P2 B5 的首元素各为 `stop` | `p1:m7:n1=D6`、`p2:m7:n1=B5` 均 `tie=[stop]`，承接各自 m6 链 | `correct` | P1/P2:m7:n1；API 同 ID |
| K.80 | 8 | 显示编号 | `8` | 4 part 均为书面索引 8、显示号 8 | `correct` | P1–P4:m8；API 同 ID |
| K.80 | 8 | 音符元素数 | P1/P2/P3/P4=`3/3/3/5` | 来源音符 `2/2/1/4`；休止未输出 | `unsupported` | P1–P4:m8；API 来源计数 |
| K.80 | 8 | 休止 | P1/P2 第 3 元素为休止 | API 无 `p1:m8:n3` 或 `p2:m8:n3` 来源音符；不输出休止类型 | `unsupported` | P1/P2:m8:n3；API `source_notes` |

### 逐小节和声观察（无独立标准答案）

下表只抄录 API 的 `measures[书面索引-1].detected_chords`，重复输出按出现次数保留；`?` 表示根音或罗马数字为 null/unknown。它**不是**人工预期或正确性认证。三份谱例的全局调性也仅记录实际值：Beethoven `A minor`，K.157 `C major`，K.80 `G major`；均无本轮独立标注的标准答案。所有和声行判为 `unclear`，不进入准确率分母。

| 谱例 | 书面索引 | 字段 | 独立预期 | 实际（API 和弦 / 罗马数字） | 判定 | 证据 |
| --- | ---: | --- | --- | --- | --- | --- |
| Beethoven | 1 | 和弦/罗马数字 | 无人工标准答案 | 0 个 detected chord | `unclear` | API `measures[0].detected_chords` |
| Beethoven | 2 | 和弦/罗马数字 | 无人工标准答案 | 0 个 detected chord | `unclear` | API `measures[1].detected_chords` |
| Beethoven | 3 | 和弦/罗马数字 | 无人工标准答案 | 0 个 detected chord | `unclear` | API `measures[2].detected_chords` |
| Beethoven | 4 | 和弦/罗马数字 | 无人工标准答案 | 0 个 detected chord | `unclear` | API `measures[3].detected_chords` |
| Beethoven | 5 | 和弦/罗马数字 | 无人工标准答案 | 0 个 detected chord | `unclear` | API `measures[4].detected_chords` |
| Beethoven | 6 | 和弦/罗马数字 | 无人工标准答案 | 0 个 detected chord | `unclear` | API `measures[5].detected_chords` |
| Beethoven | 7 | 和弦/罗马数字 | 无人工标准答案 | 0 个 detected chord | `unclear` | API `measures[6].detected_chords` |
| Beethoven | 8 | 和弦/罗马数字 | 无人工标准答案 | 0 个 detected chord | `unclear` | API `measures[7].detected_chords` |
| K.157 | 1 | 和弦/罗马数字 | 无人工标准答案 | 1 个 `? / null` | `unclear` | API `measures[0].detected_chords` |
| K.157 | 2 | 和弦/罗马数字 | 无人工标准答案 | 5 个：C major / I64 ×2；G major / V ×2；`? / null` ×1 | `unclear` | API `measures[1].detected_chords` |
| K.157 | 3 | 和弦/罗马数字 | 无人工标准答案 | 4 个：G major / V；C major / I64；`? / null` ×2 | `unclear` | API `measures[2].detected_chords` |
| K.157 | 4 | 和弦/罗马数字 | 无人工标准答案 | 4 个：C major / I ×2；`? / null` ×2 | `unclear` | API `measures[3].detected_chords` |
| K.80 | 1 | 和弦/罗马数字 | 无人工标准答案 | 2 个 G major / I | `unclear` | API `measures[0].detected_chords` |
| K.80 | 2 | 和弦/罗马数字 | 无人工标准答案 | `? / null`；F# diminished / null | `unclear` | API `measures[1].detected_chords` |
| K.80 | 3 | 和弦/罗马数字 | 无人工标准答案 | D major / V6 ×2；F# diminished / null | `unclear` | API `measures[2].detected_chords` |
| K.80 | 4 | 和弦/罗马数字 | 无人工标准答案 | 1 个 `? / null` | `unclear` | API `measures[3].detected_chords` |
| K.80 | 5 | 和弦/罗马数字 | 无人工标准答案 | C major / IV64 ×2；`? / null` ×2 | `unclear` | API `measures[4].detected_chords` |
| K.80 | 6 | 和弦/罗马数字 | 无人工标准答案 | G major / I ×2；C major / IV64 | `unclear` | API `measures[5].detected_chords` |
| K.80 | 7 | 和弦/罗马数字 | 无人工标准答案 | `? / null`；A minor / ii6；C# half-diminished seventh / null | `unclear` | API `measures[6].detected_chords` |
| K.80 | 8 | 和弦/罗马数字 | 无人工标准答案 | 1 个 G major / I64 | `unclear` | API `measures[7].detected_chords` |

## 审核记录规则

1. 记录源 URL、固定提交、节选范围及本地文件 SHA-256；不得用没有明确再分发许可的文件替换 fixture。
2. 对每个被审字段单独记录 `correct`、`false_positive`、`false_negative`、`unsupported` 或 `unclear`，附书面小节索引、来源证据和人工依据。`unclear` 与 `unsupported` 不进入准确率分母。
3. 结构性测试断言上表部分代表性事实及 K.80 诊断的具体来源；逐小节表是人工审计记录，并非每一行都已有独立自动测试。和弦/调性输出只能记录为**待校审的实际结果**，不能由同一次程序输出生成“预期”。
4. 在 UI 中按书面小节索引创建人工校审记录；多个意见保留各自状态。计数只汇总人工记录，不改变机器分析、解释或学习报告。
5. 如实记录程序与源文件不一致、预览无法定位或时间轴 `partial/unsupported`，留作后续问题；本轮不调整乐理算法。

本轮仅验证三个短节选。真实演奏重复、跨整曲调性、复杂和声与专业谱例总体表现均尚未评价。

## 实际运行记录（与上表预期分开）

在上述预期固定后，三份节选均经 `/api/v1/analyze/musicxml` 上传返回 HTTP 200。Beethoven 返回 8 个旧分析小节、时间轴 `complete`；K.157 返回 4 个旧分析小节、时间轴 `complete`，中提琴 G3 三段来源相连；K.80 返回 8 个旧分析小节、时间轴 `partial`，保留三条跨小节 tie 链。K.80 的 `grace_note_no_duration` 明确落在**书面第 2 小节** P1 `p1:m2:n1`，以及**书面第 4 小节** P1 `p1:m4:n1`、P3 `p3:m4:n1`；其他小节不应因这三条诊断被描述为各自含装饰音。当前 `partial` 是整份时间轴的保守状态，不代表第 1/3/5–8 小节全部结构错误。无时值装饰音未被补造为持续事件。上方逐行列出响应的结构与和声观察；后者不等于专业和声评估，测试不把自动识别出的和弦、调性或功能作为标准答案。
