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
| 《Für Elise》开头 | 8 个书面小节；第一位置的显示号为 `0`，不可误作第 0 个数组元素；同一钢琴 part 有两个谱表。首小节上谱表 E5、D5 先后起音，下谱表为休止；两音不应凭相邻起音被合成同时发声。 | `unclear`：未独立核定简化和弦、全局调性或功能。 |
| K.157 开头 | 4 个书面小节、4 个独立弦乐 part。中提琴 P3 的 G3 在第 1 小节 `start`，第 2 小节依次 `stop+start`、`stop`；这是同一 part 的延音链。大提琴 P4 第一小节重复起奏 C3，不能仅因同音而连成一条 tie。 | `unclear`：四声部相邻起音不自动成为同一时刻的和弦结论。 |
| K.80/73f 开头 | 8 个书面小节、4 个独立弦乐 part。第二小提琴 P2 在第 1、2 小节为整小节休止；P2 的 D6 跨第 3→4 小节，P1 的 D6 与 P2 的 B5 分别跨第 6→7 小节，延音链不可跨 part 误连。 | `unclear`：暂不为多声部织体指定罗马数字或功能标准答案。 |

以上预期来自源文件的 `<part>`、`<measure>`、`<note>`、`<pitch>`、`<rest>`、`<voice>` 和 `<tie>`，不是 ScoreMind API 输出。短节选边界以完整 tie 链为准；不可截断未闭合 tie 后再把诊断当作引擎错误。

## 审核记录规则

1. 记录源 URL、固定提交、节选范围及本地文件 SHA-256；不得用没有明确再分发许可的文件替换 fixture。
2. 对每个被审字段单独记录 `correct`、`false_positive`、`false_negative`、`unsupported` 或 `unclear`，附书面小节索引、来源证据和人工依据。`unclear` 与 `unsupported` 不进入准确率分母。
3. 结构性测试断言上表已核定的事实。和弦/调性输出只能记录为**待校审的实际结果**，不能由同一次程序输出生成“预期”。
4. 在 UI 中按书面小节索引创建人工校审记录；多个意见保留各自状态。计数只汇总人工记录，不改变机器分析、解释或学习报告。
5. 如实记录程序与源文件不一致、预览无法定位或时间轴 `partial/unsupported`，留作后续问题；本轮不调整乐理算法。

本轮仅验证三个短节选。真实演奏重复、跨整曲调性、复杂和声与专业谱例总体表现均尚未评价。

## 实际运行记录（与上表预期分开）

在上述预期固定后，三份节选均经 `/api/v1/analyze/musicxml` 上传返回 HTTP 200。Beethoven 返回 8 个旧分析小节、时间轴 `complete`；K.157 返回 4 个旧分析小节、时间轴 `complete`，中提琴 G3 三段来源相连；K.80 返回 8 个旧分析小节、时间轴 `partial`，给出 `grace_note_no_duration` 诊断，保留三条跨小节 tie 链。K.80 的无时值装饰音未被补造为持续事件。当前观察不等于专业和声评估；本轮测试不把自动识别出的和弦、调性或功能作为标准答案。
