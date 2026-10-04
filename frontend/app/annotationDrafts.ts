import type { HarmonyEntry, HarmonyEvent, HarmonyPackage } from "./harmonicAnnotations";

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

function sameEvent(left: HarmonyEvent, right: HarmonyEvent): boolean {
  return left.offset_qn === right.offset_qn && left.label === right.label && left.root === right.root
    && left.quality === right.quality && left.roman_numeral === right.roman_numeral
    && left.key_context === right.key_context && left.harmonic_function === right.harmonic_function
    && left.evidence === right.evidence;
}

export function isUnsavedMeasureDraft(draft: AnnotationDraft, entry: HarmonyEntry | null): boolean {
  const saved = draftForMeasure({}, entry?.measure_index ?? 0, entry);
  return draft.assessment !== saved.assessment || draft.unclearReason !== saved.unclearReason
    || draft.rationale !== saved.rationale || draft.events.length !== saved.events.length
    || draft.events.some((event, index) => !sameEvent(event, saved.events[index]));
}

export function unsavedMeasureIndices(drafts: AnnotationDrafts, savedPackage: HarmonyPackage | null): number[] {
  return Object.keys(drafts).map(Number).filter((index) =>
    isUnsavedMeasureDraft(drafts[index], savedPackage?.entries.find((entry) => entry.measure_index === index) ?? null));
}
