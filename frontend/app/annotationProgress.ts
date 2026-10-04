import type { HarmonyEntry, HarmonyPackage } from "./harmonicAnnotations";

export type AnnotationStatus = HarmonyEntry["assessment"] | "unannotated";
export type AnnotationFilter = AnnotationStatus | "all";
export type AnnotationPosition = {
  measureIndex: number;
  displayNumber: string;
  status: AnnotationStatus;
  basis: HarmonyEntry["basis"] | null;
};

export type AnnotationProgress = {
  positions: AnnotationPosition[];
  unannotatedPositions: number;
  unclearRecords: number;
  partialRecords: number;
  determinedRecords: number;
  scoreOnlyAttestedRecords: number;
  machineVisibleRecords: number;
};

export function summarizeAnnotationProgress(measureNumbers: string[], value: HarmonyPackage): AnnotationProgress {
  const byIndex = new Map(value.entries.map((entry) => [entry.measure_index, entry]));
  const positions: AnnotationPosition[] = measureNumbers.map((displayNumber, index) => {
    const entry = byIndex.get(index + 1);
    return { measureIndex: index + 1, displayNumber,
      status: entry?.assessment ?? "unannotated", basis: entry?.basis ?? null };
  });
  return {
    positions,
    unannotatedPositions: positions.filter((position) => position.status === "unannotated").length,
    unclearRecords: value.entries.filter((entry) => entry.assessment === "unclear").length,
    partialRecords: value.entries.filter((entry) => entry.assessment === "partial").length,
    determinedRecords: value.entries.filter((entry) => entry.assessment === "determined").length,
    scoreOnlyAttestedRecords: value.entries.filter((entry) => entry.basis === "score_only_attested").length,
    machineVisibleRecords: value.entries.filter((entry) => entry.basis === "machine_visible").length,
  };
}

export function filteredAnnotationPositions(positions: AnnotationPosition[], filter: AnnotationFilter): AnnotationPosition[] {
  return filter === "all" ? positions : positions.filter((position) => position.status === filter);
}

export function adjacentAnnotationIndex(positions: AnnotationPosition[], selected: number | null, direction: -1 | 1): number | null {
  if (!positions.length) return null;
  const indexes = positions.map((position) => position.measureIndex);
  if (selected === null) return direction === 1 ? indexes[0] : indexes[indexes.length - 1];
  if (direction === 1) return indexes.find((index) => index > selected) ?? indexes[0];
  return [...indexes].reverse().find((index) => index < selected) ?? indexes[indexes.length - 1];
}
