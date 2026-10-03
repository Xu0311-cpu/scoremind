import { revealStorageKey } from "./harmonicAnnotations";

export type RevealDecision = "revealed_persisted" | "revealed_session_only" | "cancelled";

export function readRevealMarker(storage: Storage, sha: string): boolean {
  const value = storage.getItem(revealStorageKey(sha));
  if (value !== null && value !== "true") throw new Error("已查看标志损坏，不能证明盲态。");
  return value === "true";
}

export function requestMachineReveal(storage: Storage | null, sha: string | null, confirmExit: () => boolean): RevealDecision {
  try {
    if (!storage || !sha) throw new Error("文件指纹或浏览器存储不可用。");
    storage.setItem(revealStorageKey(sha), "true");
    return "revealed_persisted";
  } catch {
    return confirmExit() ? "revealed_session_only" : "cancelled";
  }
}
