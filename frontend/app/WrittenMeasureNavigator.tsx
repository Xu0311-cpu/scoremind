"use client";

import type { WrittenMeasureOption } from "./scoreMeasureNavigation";
import { adjacentMeasureIndex } from "./scoreMeasureNavigation";

export default function WrittenMeasureNavigator({
  options, selected, onSelect, label,
}: {
  options: WrittenMeasureOption[];
  selected: number | null;
  onSelect: (index: number) => void;
  label: string;
}) {
  if (!options.length) return null;
  const previous = adjacentMeasureIndex(options, selected, -1);
  const next = adjacentMeasureIndex(options, selected, 1);
  return (
    <div className="written-measure-navigator" aria-label={label}>
      <button type="button" className="secondary-button" disabled={previous === null} onClick={() => previous !== null && onSelect(previous)} aria-label="上一个书面小节">← 上一个</button>
      <label>
        <span>按书面顺序选择小节</span>
        <select value={selected ?? ""} onChange={(event) => onSelect(Number(event.target.value))}>
          <option value="" disabled>选择小节</option>
          {options.map((option) => <option key={option.measureIndex} value={option.measureIndex}>{option.label}</option>)}
        </select>
      </label>
      <button type="button" className="secondary-button" disabled={next === null} onClick={() => next !== null && onSelect(next)} aria-label="下一个书面小节">下一个 →</button>
    </div>
  );
}
