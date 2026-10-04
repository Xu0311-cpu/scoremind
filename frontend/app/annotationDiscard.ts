export function confirmDraftDiscard(hasUnsavedDrafts: boolean, confirm: () => boolean): boolean {
  return !hasUnsavedDrafts || confirm();
}

export function restoreFileSelection(input: Pick<HTMLInputElement, "files">, previousFile: File | null,
  createTransfer: () => DataTransfer = () => new DataTransfer()): void {
  const transfer = createTransfer();
  if (previousFile) transfer.items.add(previousFile);
  input.files = transfer.files;
}

export function guardFileSelection(input: Pick<HTMLInputElement, "files">, previousFile: File | null,
  hasUnsavedDrafts: boolean, confirm: () => boolean,
  createTransfer?: () => DataTransfer): boolean {
  if (confirmDraftDiscard(hasUnsavedDrafts, confirm)) return true;
  restoreFileSelection(input, previousFile, createTransfer);
  return false;
}
