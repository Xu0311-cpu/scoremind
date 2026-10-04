import type { HarmonyEntry, HarmonyEvent } from "./harmonicAnnotations";

export type AnnotationDraft = {
  assessment: HarmonyEntry["assessment"];
  events: HarmonyEvent[];
  unclearReason: string;
  rationale: string;
};

export type AnnotationDrafts = Record<number, AnnotationDraft>;

export function draftForMeasure(drafts: AnnotationDrafts, measureIndex: number, entry: HarmonyEntry | null): AnnotationDraft {
  return drafts[measureIndex] ?? {
    assessment: entry?.assessment ?? "unclear",
    events: entry?.events ?? [],
    unclearReason: entry?.unclear_reason ?? "",
    rationale: entry?.rationale ?? "",
  };
}

export function updateMeasureDraft(drafts: AnnotationDrafts, measureIndex: number, entry: HarmonyEntry | null,
  changes: Partial<AnnotationDraft>): AnnotationDrafts {
  return { ...drafts, [measureIndex]: { ...draftForMeasure(drafts, measureIndex, entry), ...changes } };
}

export function clearMeasureDraft(drafts: AnnotationDrafts, measureIndex: number): AnnotationDrafts {
  const next = { ...drafts };
  delete next[measureIndex];
  return next;
}
