import type { OpenSheetMusicDisplay } from "opensheetmusicdisplay";

export type VerifiedScoreStructure = { measure_durations_qn: string[]; measure_numbers: string[] };

function children(node: Element, name: string): Element[] {
  return [...node.children].filter((child) => child.localName === name);
}

function gcd(a: bigint, b: bigint): bigint {
  while (b !== BigInt(0)) [a, b] = [b, a % b];
  return a;
}

function wholeNotesToQuarter(value: { GetExpandedNumerator(): number; Denominator: number }): string {
  const n = value.GetExpandedNumerator();
  const d = value.Denominator;
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d) || n <= 0 || d <= 0) throw Error("谱面小节时值无效。");
  let numerator = BigInt(n) * BigInt(4);
  let denominator = BigInt(d);
  const divisor = gcd(numerator, denominator);
  numerator /= divisor;
  denominator /= divisor;
  return denominator === BigInt(1) ? numerator.toString() : `${numerator}/${denominator}`;
}

export function verifiedScoreStructure(xml: string, osmd: OpenSheetMusicDisplay): VerifiedScoreStructure {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.querySelector("parsererror") || document.documentElement.localName !== "score-partwise") {
    throw Error("原 MusicXML 结构无法核验书面小节。");
  }
  const parts = children(document.documentElement, "part");
  const byPart = parts.map((part) => children(part, "measure"));
  const rawCount = byPart[0]?.length ?? 0;
  const source = osmd.Sheet?.SourceMeasures;
  if (!rawCount || !source || source.length !== rawCount || byPart.some((measures) => measures.length !== rawCount)) {
    throw Error("原谱各乐器与谱面预览的小节数量不一致，不能安全定位人工标注。");
  }
  const measure_numbers: string[] = [];
  const measure_durations_qn: string[] = [];
  for (let index = 0; index < rawCount; index++) {
    const number = byPart[0][index].getAttribute("number") ?? "";
    if (!byPart.every((measures) => (measures[index].getAttribute("number") ?? "") === number)) {
      throw Error(`书面第 ${index + 1} 小节的多乐器标号不一致。`);
    }
    if (source[index].measureListIndex !== index || !source[index].Duration || !source[index].AbsoluteTimestamp) {
      throw Error(`书面第 ${index + 1} 小节无法与 OSMD 来源小节一一对应。`);
    }
    if (/^-?\d+$/.test(number) && Number(number) !== source[index].MeasureNumberXML) {
      throw Error(`书面第 ${index + 1} 小节的原谱与预览标号不一致。`);
    }
    measure_numbers.push(number || "未提供");
    measure_durations_qn.push(wholeNotesToQuarter(source[index].Duration));
  }
  return { measure_durations_qn, measure_numbers };
}
