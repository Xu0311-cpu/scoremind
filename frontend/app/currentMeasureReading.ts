export type ReadingChord = {
  beat: number | null;
  pitches: string[];
  root: string | null;
  quality: string;
  roman_numeral: string | null;
  harmonic_function: string;
};

export type ReadingMeasure = {
  measure_index?: number | null;
  measure_number: number;
  detected_chords: ReadingChord[];
};

export type CurrentMeasureReading = {
  measure: ReadingMeasure | null;
  reason: string | null;
};

export function currentMeasureReading(measures: ReadingMeasure[], writtenIndex: number | null): CurrentMeasureReading {
  if (writtenIndex === null) return { measure: null, reason: "书面小节尚未可靠定位；暂不关联机器结论。" };
  const matches = measures.filter((measure) => measure.measure_index === writtenIndex);
  if (matches.length !== 1) {
    return { measure: null, reason: "分析结果没有唯一对应的书面小节索引；暂不关联机器结论。" };
  }
  return { measure: matches[0], reason: null };
}

export function chordEventLabel(chord: ReadingChord): string {
  return chord.root && chord.quality !== "unknown" ? `${chord.root} ${chord.quality}` : "未能确定和弦";
}
